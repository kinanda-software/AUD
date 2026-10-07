from decimal import Decimal

from django.db.models import Q, Sum
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from .models import (
    AccountingPolicy, Adjustment, ChartOfAccount, FinancialDocument, FinancialPayment,
    FixedAsset, FixedAssetEvent, GeneralLedger, InventoryMovement, LeadSchedule,
)


ZERO = Decimal("0.00")


class TraceParameters(serializers.Serializer):
    account = serializers.IntegerField(min_value=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=25)
    ledger_offset = serializers.IntegerField(min_value=0, default=0)
    adjustment_offset = serializers.IntegerField(min_value=0, default=0)


def amount(value):
    return format(value, ".2f")


def source_records(journals, engagement):
    records = {}

    def add(journal, kind, pk, label, path, evidence_target_kind):
        records.setdefault(journal, []).append({
            "kind": kind, "id": pk, "label": label, "path": path,
            "relationship": "explicit_journal_link",
            "evidence_target_kind": evidence_target_kind,
        })

    for document in FinancialDocument.objects.filter(journal_id__in=journals, engagement_id=engagement):
        add(document.journal_id, document.kind, document.pk, document.number, "/financials/invoices-bills", "document")
    for payment in FinancialPayment.objects.filter(
        journal_id__in=journals, document__engagement_id=engagement,
    ).select_related("document"):
        add(payment.journal_id, "payment", payment.pk,
            f"Payment {payment.pk} for {payment.document.number}", "/financials/invoices-bills", "payment")
    for payment in FinancialPayment.objects.filter(
        journal__reversal__pk__in=journals, document__engagement_id=engagement,
    ).select_related("document", "journal__reversal"):
        add(payment.journal.reversal.pk, "receipt_refund", payment.pk,
            f"Full receipt refund {payment.pk} for {payment.document.number}", "/financials/invoices-bills", "payment")
    for asset in FixedAsset.objects.filter(acquisition_journal_id__in=journals, engagement_id=engagement):
        add(asset.acquisition_journal_id, "asset_acquisition", asset.pk, asset.asset_number, "/financials/fixed-assets", "asset")
    for event in FixedAssetEvent.objects.filter(
        journal_id__in=journals, asset__engagement_id=engagement,
    ).select_related("asset"):
        add(event.journal_id, f"asset_{event.kind}", event.pk, event.asset.asset_number, "/financials/fixed-assets", "asset_event")
    for movement in InventoryMovement.objects.filter(
        journal_id__in=journals, item__engagement_id=engagement,
    ).select_related("item"):
        add(movement.journal_id, "inventory_movement", movement.pk,
            f"{movement.item.sku}: {movement.kind}", "/financials/inventory", "inventory_movement")
    return records


def build_account_trace(trial_balance, data):
    account = ChartOfAccount.objects.filter(
        pk=data["account"], engagement_id=trial_balance.engagement_id,
    ).first()
    if account is None:
        raise NotFound("Account not found in this trial balance's engagement.")
    original = trial_balance.lines.filter(account=account).first()
    adjustments = Adjustment.objects.filter(
        engagement_id=trial_balance.engagement_id, trial_balance=trial_balance,
    ).filter(Q(debit_account=account) | Q(credit_account=account)).order_by("id")
    if original is None and not adjustments.exists():
        raise NotFound("This account has no trial balance line or linked audit adjustment.")
    posted = adjustments.filter(status="posted")
    adjustment_debit = posted.filter(debit_account=account).aggregate(total=Sum("amount"))["total"] or ZERO
    adjustment_credit = posted.filter(credit_account=account).aggregate(total=Sum("amount"))["total"] or ZERO
    original_debit = original.debit if original else ZERO
    original_credit = original.credit if original else ZERO
    original_net = original_debit - original_credit
    adjusted_net = original_net + adjustment_debit - adjustment_credit
    policy = AccountingPolicy.objects.filter(
        engagement_id=trial_balance.engagement_id,
    ).select_related("opening_journal").first()
    start = trial_balance.period_start
    includes_opening = bool(
        policy and policy.opening_journal_id and policy.opening_journal.status == "posted"
        and policy.opening_journal.transaction_date <= trial_balance.period_start
    )
    if includes_opening:
        start = policy.opening_journal.transaction_date
    ledger = GeneralLedger.objects.filter(
        engagement_id=trial_balance.engagement_id, account=account, status="posted",
        transaction_date__gte=start, transaction_date__lte=trial_balance.period_end,
    ).order_by("transaction_date", "id")
    ledger_totals = ledger.aggregate(debit=Sum("debit"), credit=Sum("credit"))
    ledger_net = (ledger_totals["debit"] or ZERO) - (ledger_totals["credit"] or ZERO)
    ledger_count = ledger.count()
    missing_count = ledger.filter(journal_line__isnull=True).count()
    size = data["page_size"]
    offset = data["ledger_offset"]
    entries = list(ledger.select_related(
        "journal_line__journal_entry__created_by", "journal_line__journal_entry__approved_by",
    )[offset:offset + size])
    journals = {entry.journal_line.journal_entry_id for entry in entries if entry.journal_line_id}
    sources = source_records(journals, trial_balance.engagement_id)
    ledger_rows = []
    for entry in entries:
        journal_data = None
        provenance = "missing"
        if entry.journal_line_id:
            line = entry.journal_line
            journal = line.journal_entry
            valid = (
                journal.engagement_id == trial_balance.engagement_id and line.account_id == account.pk
                and line.debit == entry.debit and line.credit == entry.credit
                and journal.transaction_date == entry.transaction_date and journal.status == "posted"
            )
            provenance = "verified" if valid else "inconsistent"
            if journal.engagement_id == trial_balance.engagement_id:
                journal_data = {
                    "id": journal.pk, "entry_number": journal.entry_number, "status": journal.status,
                    "transaction_date": journal.transaction_date, "description": journal.description,
                    "created_by": journal.created_by.get_username() if journal.created_by_id else None,
                    "approved_by": journal.approved_by.get_username() if journal.approved_by_id else None,
                    "approved_at": journal.approved_at, "journal_line": line.pk,
                    "sources": sources.get(journal.pk, []),
                }
        ledger_rows.append({
            "id": entry.pk, "transaction_date": entry.transaction_date, "reference": entry.reference,
            "description": entry.description, "debit": amount(entry.debit), "credit": amount(entry.credit),
            "source": entry.source, "provenance": provenance, "journal": journal_data,
        })
    adjustment_count = adjustments.count()
    adjustment_offset = data["adjustment_offset"]
    adjustment_rows = [{
        "id": adjustment.pk, "number": adjustment.adjustment_number, "description": adjustment.description,
        "status": adjustment.status, "included": adjustment.status == "posted",
        "side": "debit" if adjustment.debit_account_id == account.pk else "credit",
        "amount": amount(adjustment.amount),
        "debit_account": adjustment.debit_account_id, "credit_account": adjustment.credit_account_id,
    } for adjustment in adjustments[adjustment_offset:adjustment_offset + size]]
    leads = []
    for lead in LeadSchedule.objects.filter(
        engagement_id=trial_balance.engagement_id, trial_balance=trial_balance, account=account,
    ):
        support = lead.supporting_details.order_by("id")
        support_total = support.aggregate(total=Sum("amount"))["total"] or ZERO
        leads.append({
            "id": lead.pk, "name": lead.schedule_name, "reference": lead.reference, "status": lead.status,
            "opening_balance": amount(lead.opening_balance), "adjustments": amount(lead.adjustments),
            "adjusted_balance": amount(lead.adjusted_balance),
            "difference_to_current_adjusted_tb": amount(lead.adjusted_balance - adjusted_net),
            "conclusion": lead.conclusion, "auditor_notes": lead.auditor_notes,
            "support_total": amount(support_total),
            "support_difference": amount(lead.adjusted_balance - support_total),
            "support_count": support.count(),
            "support_limit": 100,
            "support": [{
                "id": detail.pk, "description": detail.description, "reference": detail.reference,
                "amount": amount(detail.amount), "status": detail.status, "audit_notes": detail.audit_notes,
            } for detail in support[:100]],
        })
    warnings = [
        "Ledger entries are account/date candidates, not an explicit import lineage from this trial balance.",
        "Matching totals alone do not establish source completeness or audit assurance.",
        "Audit adjustments affect the adjusted trial balance; they are not assumed to be ledger postings.",
        "Supporting-detail references are recorded text, not verified attached evidence or procedure links.",
    ]
    currency_confirmed = bool(policy and policy.base_currency == trial_balance.currency)
    if not currency_confirmed:
        warnings.append("Ledger currency is not confirmed against this trial balance. Net differences are diagnostic only.")
    if not includes_opening:
        warnings.append("No applicable posted opening journal: ledger candidates cover period activity only.")
    if original_net != ledger_net:
        warnings.append("Original trial balance and candidate ledger net amounts differ.")
    if missing_count:
        warnings.append("Some candidate ledger entries have no explicit journal-line provenance.")
    if any(row["provenance"] == "inconsistent" for row in ledger_rows):
        warnings.append("This ledger page includes inconsistent journal-line links. Investigate before relying on source provenance.")
    return {
        "trial_balance": {
            "id": trial_balance.pk, "engagement": trial_balance.engagement_id,
            "period_start": trial_balance.period_start, "period_end": trial_balance.period_end,
            "currency": trial_balance.currency, "status": trial_balance.status,
        },
        "account": {
            "id": account.pk, "code": account.account_code, "name": account.account_name,
            "type": account.account_type, "financial_statement_section": account.financial_statement_section,
        },
        "calculation": {
            "original_line": original.pk if original else None,
            "original_debit": amount(original_debit), "original_credit": amount(original_credit),
            "original_net": amount(original_net), "adjustment_debit": amount(adjustment_debit),
            "adjustment_credit": amount(adjustment_credit), "adjusted_net": amount(adjusted_net),
            "adjusted_debit": amount(max(adjusted_net, ZERO)), "adjusted_credit": amount(max(-adjusted_net, ZERO)),
        },
        "ledger_scope": {
            "date_from": start, "date_to": trial_balance.period_end, "includes_opening": includes_opening,
            "currency_confirmed": currency_confirmed, "relationship": "account_date_candidates",
            "debit": amount(ledger_totals["debit"] or ZERO), "credit": amount(ledger_totals["credit"] or ZERO),
            "net": amount(ledger_net), "difference_to_original_tb": amount(original_net - ledger_net),
            "missing_provenance_count": missing_count,
        },
        "ledger": {
            "count": ledger_count, "offset": offset, "page_size": size, "rows": ledger_rows,
            "next_offset": offset + size if offset + size < ledger_count else None,
        },
        "adjustments": {
            "count": adjustment_count, "offset": adjustment_offset, "page_size": size, "rows": adjustment_rows,
            "next_offset": adjustment_offset + size if adjustment_offset + size < adjustment_count else None,
        },
        "lead_schedules": leads, "warnings": warnings,
    }
