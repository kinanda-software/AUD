from decimal import Decimal, ROUND_HALF_UP, localcontext
from uuid import uuid4

from rest_framework.exceptions import ValidationError

from .accounting_controls import ensure_open, locked_policy
from .models import (
    FinancialDocumentLine, FinancialPayment,
    JournalEntry, JournalLine,
)


ZERO = Decimal("0.00")
MAX_MONEY = Decimal("9999999999999999.99")
# This phase supports only currencies with two decimal minor units.
CURRENCIES = ("TZS", "USD", "EUR", "GBP", "KES", "ZAR", "AUD", "CAD")


def money(value):
    with localcontext() as context:
        context.prec = 60
        result = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if abs(result) > MAX_MONEY:
        raise ValidationError("Calculated amount exceeds the supported monetary range.")
    return result


def totals(document):
    lines = list(document.lines.all())
    net = sum((line.net_amount for line in lines), ZERO)
    tax = sum((line.tax_amount for line in lines), ZERO)
    base_net = sum((line.base_net for line in lines), ZERO)
    base_tax = sum((line.base_tax for line in lines), ZERO)
    return {
        "net": money(net), "tax": money(tax), "total": money(net + tax),
        "base_net": money(base_net), "base_tax": money(base_tax),
        "base_total": money(base_net + base_tax),
    }


def posted(document):
    return bool(document.journal_id and document.journal.status == JournalEntry.Status.POSTED)


def balance(document, as_of=None, reserved=False):
    credits = document.credit_notes.select_related("journal").prefetch_related("lines")
    payments = document.payments.select_related("journal", "journal__reversal")
    if as_of is not None:
        credits = credits.filter(transaction_date__lte=as_of)
        payments = payments.filter(transaction_date__lte=as_of)
    statuses = ("draft", "submitted", "approved", "posted") if reserved else ("posted",)
    credit_amount = sum(
        (totals(credit)["total"] for credit in credits
         if credit.journal_id and credit.journal.status in statuses), ZERO,
    )
    credit_base = sum(
        (totals(credit)["base_total"] for credit in credits
         if credit.journal_id and credit.journal.status in statuses), ZERO,
    )
    paid = sum((payment.amount for payment in payments if payment.journal.status in statuses), ZERO)
    paid_base = sum(
        (payment.control_base_amount for payment in payments if payment.journal.status in statuses), ZERO,
    )
    # Pending refunds do not release settlement capacity before posting.
    refunded = [
        payment for payment in payments
        if payment.journal.status == "posted"
        and hasattr(payment.journal, "reversal")
        and payment.journal.reversal.status == "posted"
        and (as_of is None or payment.journal.reversal.transaction_date <= as_of)
    ]
    paid -= sum((payment.amount for payment in refunded), ZERO)
    paid_base -= sum((payment.control_base_amount for payment in refunded), ZERO)
    amounts = totals(document)
    return money(amounts["total"] - credit_amount - paid), money(amounts["base_total"] - credit_base - paid_base)


def validate_rate(policy, currency, rate):
    if not policy.base_currency:
        raise ValidationError("Configure and confirm the engagement's base currency in Accounting Controls first.")
    if currency not in CURRENCIES:
        raise ValidationError({"currency": "Select a supported two-decimal currency."})
    if rate <= 0:
        raise ValidationError({"exchange_rate": "The exchange rate must be greater than zero."})
    if currency == policy.base_currency and rate != 1:
        raise ValidationError({"exchange_rate": "Base-currency transactions must use an exchange rate of 1."})


def check_account(account, engagement_id, types):
    if account.engagement_id != engagement_id or not account.is_active:
        raise ValidationError("Every account must be active and belong to this engagement.")
    if account.account_type not in types:
        raise ValidationError(f"Account {account.account_code} must have type: {', '.join(types)}.")


def is_sales(document):
    return document.kind in ("invoice", "sales_credit")


def is_credit(document):
    return document.kind in ("sales_credit", "purchase_credit")


def create_document_lines(document, lines):
    for line in lines:
        tax_code = line.get("tax_code")
        rate = tax_code.rate if tax_code else ZERO
        net = line["net_amount"]
        tax = money(net * rate / 100)
        FinancialDocumentLine.objects.create(
            document=document, account=line["account"], description=line["description"],
            net_amount=net, tax_code=tax_code, tax_rate=rate, tax_amount=tax,
            base_net=money(net * document.exchange_rate),
            base_tax=money(tax * document.exchange_rate),
        )
    if totals(document)["base_total"] <= ZERO:
        raise ValidationError("Document total rounds to zero in base currency.")


def create_source_journal(engagement_id, date, description, reference, actor, postings, *, reversal_of=None):
    policy = locked_policy(engagement_id)
    ensure_open(policy, date)
    # Generated numbers are reserved; users can still enter their own manual journal numbers.
    journal = JournalEntry.objects.create(
        engagement_id=engagement_id, entry_number=f"SL-{uuid4().hex}",
        transaction_date=date, description=description, reference=reference,
        source="other", created_by=actor,
    )
    for account, signed in postings:
        if signed == ZERO:
            continue
        JournalLine.objects.create(
            journal_entry=journal, account=account,
            debit=max(signed, ZERO), credit=max(-signed, ZERO),
        )
    if not journal.is_balanced or journal.line_count < 2:
        raise ValidationError("Generated source journal must have at least two balanced lines.")
    if reversal_of:
        journal.reversal_of = reversal_of
    if policy.require_journal_approval:
        journal.status = JournalEntry.Status.SUBMITTED
    if policy.require_journal_approval or reversal_of:
        journal.save()
    return journal


def prepare_document(document, actor):
    policy = locked_policy(document.engagement_id)
    ensure_open(policy, document.transaction_date)
    validate_rate(policy, document.currency, document.exchange_rate)
    if document.journal_id:
        raise ValidationError("This document already has a journal.")
    if not document.contact.is_active:
        raise ValidationError("The contact is inactive.")
    check_account(document.control_account, document.engagement_id, ("asset",) if is_sales(document) else ("liability",))
    if is_credit(document):
        original = document.original
        if not posted(original):
            raise ValidationError("Credit notes require a posted original document.")
        available, base_available = balance(original, reserved=True)
        if totals(document)["total"] > available or totals(document)["base_total"] > base_available:
            raise ValidationError("Credit exceeds the unallocated original balance (including pending settlements).")
    sign = Decimal("-1") if is_sales(document) else Decimal("1")
    if is_credit(document):
        sign = -sign
    postings = []
    for line in document.lines.select_related("account", "tax_code"):
        check_account(line.account, document.engagement_id, ("revenue",) if is_sales(document) else ("expense", "asset"))
        postings.append((line.account, sign * line.base_net))
        if line.tax_code and not line.tax_code.is_active:
            raise ValidationError("A selected tax code is inactive.")
        if line.base_tax:
            account = line.tax_code.sales_account if is_sales(document) else line.tax_code.purchase_account
            check_account(account, document.engagement_id, ("liability",) if is_sales(document) else ("asset",))
            postings.append((account, sign * line.base_tax))
    postings.append((document.control_account, -sign * totals(document)["base_total"]))
    document.journal = create_source_journal(
        document.engagement_id, document.transaction_date,
        f"{document.get_kind_display()} {document.number}", document.number, actor, postings,
    )
    document.save()
    return document


def create_payment(document, data, actor):
    policy = locked_policy(document.engagement_id)
    ensure_open(policy, data["transaction_date"])
    if document.kind not in ("invoice", "bill") or not posted(document):
        raise ValidationError("Payments require a posted invoice or bill.")
    if data["transaction_date"] < document.transaction_date:
        raise ValidationError("A payment cannot precede its document date.")
    validate_rate(policy, document.currency, data["exchange_rate"])
    check_account(data["bank_account"], document.engagement_id, ("asset",))
    if data["bank_account"].pk == document.control_account_id:
        raise ValidationError("Bank and receivable/payable control accounts must differ.")
    available, base_available = balance(document, reserved=True)
    if data["amount"] > available:
        raise ValidationError("Payment exceeds the available balance (including pending settlements).")
    amounts = totals(document)
    control_base = base_available if data["amount"] == available else money(
        data["amount"] * amounts["base_total"] / amounts["total"]
    )
    bank_base = money(data["amount"] * data["exchange_rate"])
    if bank_base <= ZERO or control_base <= ZERO:
        raise ValidationError("Payment rounds to zero in base currency.")
    direction = Decimal("1") if is_sales(document) else Decimal("-1")
    fx_difference = direction * (control_base - bank_base)
    fx_account = data.get("fx_account")
    if fx_account:
        check_account(fx_account, document.engagement_id, ("expense", "revenue"))
    if fx_difference:
        if fx_account is None:
            raise ValidationError({"fx_account": "Select an FX gain or loss account for this payment."})
        check_account(
            fx_account, document.engagement_id,
            ("expense",) if fx_difference > ZERO else ("revenue",),
        )
    postings = [
        (data["bank_account"], direction * bank_base),
        (document.control_account, -direction * control_base),
    ]
    if fx_difference:
        postings.append((fx_account, fx_difference))
    journal = create_source_journal(
        document.engagement_id, data["transaction_date"],
        f"Payment for {document.number}", data.get("reference", ""), actor, postings,
    )
    return FinancialPayment.objects.create(
        document=document, journal=journal, created_by=actor,
        base_amount=bank_base, control_base_amount=control_base,
        fx_difference=fx_difference, **data,
    )
