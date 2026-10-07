from collections import defaultdict
from io import BytesIO
from xml.sax.saxutils import escape

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from rest_framework.exceptions import ValidationError

from .accounting_controls import ensure_open, locked_policy, require_manager
from .models import FinancialDocument, JournalEntry
from .subledger_services import ZERO, balance, create_source_journal, posted, totals
from .workflow_services import record_financial_event


def invoice_pdf(document):
    if document.kind != "invoice":
        raise ValidationError("PDF delivery is available for sales invoices only.")
    styles = getSampleStyleSheet()
    def text(value):
        return Paragraph(escape(str(value)), styles["Normal"])
    output = BytesIO()
    amounts = totals(document)
    story = [
        Paragraph(
            "Sales invoice" if posted(document) else
            "CANCELLED - Sales invoice" if document.journal_id and document.journal.status == "void" else
            "DRAFT - Sales invoice", styles["Title"],
        ),
        text(document.engagement.client.legal_name),
        text(f"Invoice: {document.number}"),
        text(f"Customer: {document.contact.name}"),
        text(f"Date: {document.transaction_date} | Due: {document.due_date}"),
        text(f"Currency: {document.currency}"),
        Spacer(1, 0.2 * inch),
    ]
    rows = [[text(value) for value in ("Description", "Net", "Tax", "Total")]]
    for line in document.lines.all():
        rows.append([
            text(line.description), text(f"{line.net_amount:.2f}"),
            text(f"{line.tax_amount:.2f}"), text(f"{line.net_amount + line.tax_amount:.2f}"),
        ])
    table = Table(rows, colWidths=[3.1 * inch, inch, inch, inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
    ]))
    story.extend([table, Spacer(1, 0.2 * inch)])
    for label in ("net", "tax", "total"):
        story.append(text(f"{label.title()}: {document.currency} {amounts[label]:.2f}"))
    if posted(document):
        story.append(text(f"Outstanding at generation: {document.currency} {balance(document)[0]:.2f}"))
    SimpleDocTemplate(output, pagesize=(8.5 * inch, 11 * inch)).build(story)
    return output.getvalue()


def delivery_content(document, kind):
    if document.kind != "invoice" or not posted(document):
        raise ValidationError("Only posted sales invoices can be emailed.")
    amount = balance(document)[0]
    if kind == "reminder" and (document.due_date >= timezone.localdate() or amount <= ZERO):
        raise ValidationError("Reminders require an overdue invoice with an outstanding balance.")
    if not document.contact.email:
        raise ValidationError("Set the customer's email address before sending.")
    subject = f"{'Overdue reminder' if kind == 'reminder' else 'Invoice'}: {document.number}"
    body = (
        f"Dear {document.contact.name},\n\n"
        f"Please find invoice {document.number} from {document.engagement.client.legal_name} attached.\n"
        f"Due date: {document.due_date}\n"
        f"Outstanding: {document.currency} {amount:.2f}\n\n"
        "Please contact us if you have any questions."
    )
    return {"recipient": document.contact.email, "subject": subject, "body": body}


def send_invoice(document, kind, reviewed, actor):
    content = delivery_content(document, kind)
    if content != reviewed:
        raise ValidationError("Invoice delivery details changed. Preview and review the message again.")
    if settings.EMAIL_BACKEND not in (
        "django.core.mail.backends.smtp.EmailBackend",
    ):
        raise ValidationError("Invoice sending requires an SMTP email backend; console/test delivery is disabled.")
    email = EmailMessage(
        content["subject"], content["body"], settings.DEFAULT_FROM_EMAIL, [content["recipient"]],
        connection=get_connection(timeout=30),
    )
    email.attach(f"invoice-{document.pk}.pdf", invoice_pdf(document), "application/pdf")
    if email.send(fail_silently=False) != 1:
        raise ValidationError("The email backend did not accept the message.")
    record_financial_event(
        engagement_id=document.engagement_id, actor=actor, action="sent",
        object_type="invoice_delivery", object_id=document.pk,
        details={"kind": kind, **content, "transport": "smtp", "scope": "accepted by SMTP, not recipient delivery"},
    )
    return {"status": "accepted_by_smtp", **content}


def customer_statement(contact, as_of):
    if contact.kind != "customer":
        raise ValidationError("Select a customer, not a supplier.")
    rows = []
    currencies = defaultdict(lambda: ZERO)
    documents = FinancialDocument.objects.filter(
        contact=contact, kind="invoice", journal__status="posted", transaction_date__lte=as_of,
    ).select_related("journal").prefetch_related("lines").order_by("transaction_date", "pk")
    for document in documents:
        amount, _ = balance(document, as_of=as_of)
        currencies[document.currency] += amount
        rows.append({
            "id": document.pk, "number": document.number, "date": document.transaction_date,
            "due_date": document.due_date, "currency": document.currency,
            "total": f"{totals(document)['total']:.2f}", "outstanding": f"{amount:.2f}",
        })
    return {
        "contact": contact.pk, "customer": contact.name, "as_of": as_of, "rows": rows,
        "totals_by_currency": {currency: f"{amount:.2f}" for currency, amount in currencies.items()},
        "basis": "Posted invoices with posted credits, receipts and receipt reversals through the as-of date.",
    }


def statement_pdf(contact, report):
    styles = getSampleStyleSheet()

    def text(value):
        return Paragraph(escape(str(value)), styles["Normal"])

    output = BytesIO()
    rows = [[text(value) for value in ("Invoice", "Due", "Currency", "Total", "Outstanding")]]
    for row in report["rows"]:
        rows.append([text(row[key]) for key in ("number", "due_date", "currency", "total", "outstanding")])
    table = Table(rows, colWidths=[1.8 * inch, 1.1 * inch, 0.8 * inch, 1.2 * inch, 1.3 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
    ]))
    story = [
        Paragraph("Customer statement", styles["Title"]),
        text(contact.engagement.client.legal_name),
        text(f"Customer: {contact.name} | As of: {report['as_of']}"),
        Spacer(1, 0.2 * inch), table, Spacer(1, 0.2 * inch),
        text(report["basis"]),
    ]
    for currency, amount in report["totals_by_currency"].items():
        story.append(text(f"Outstanding: {currency} {amount}"))
    SimpleDocTemplate(output, pagesize=(8.5 * inch, 11 * inch)).build(story)
    return output.getvalue()


def refund_receipt(payment, data, actor):
    require_manager(actor)
    policy = locked_policy(payment.document.engagement_id)
    ensure_open(policy, data["transaction_date"])
    original = payment.journal
    if payment.document.kind != "invoice" or original.status != "posted":
        raise ValidationError("Full receipt refunds require a posted sales-invoice receipt.")
    if JournalEntry.objects.filter(reversal_of=original).exists():
        raise ValidationError("This receipt already has a refund journal.")
    if data["transaction_date"] < payment.transaction_date:
        raise ValidationError("The refund cannot precede the receipt.")
    if original.lines.filter(ledger_entry__isnull=True).exists() or not original.lines.exists():
        raise ValidationError("The receipt lacks complete posted-ledger provenance.")
    refund = create_source_journal(
        original.engagement_id, data["transaction_date"],
        f"Full receipt refund #{payment.pk}: {data['reason']}", original.reference, actor,
        [(line.account, line.credit - line.debit) for line in original.lines.select_related("account")],
        reversal_of=original,
    )
    record_financial_event(
        engagement_id=original.engagement_id, actor=actor, action="created",
        object_type="receipt_refund", object_id=payment.pk,
        details={"journal": refund.pk, "reason": data["reason"], "amount": str(payment.amount)},
    )
    return refund
