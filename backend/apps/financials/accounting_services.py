from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError

from .accounting_controls import ensure_open, locked_policy
from .models import GeneralLedger, JournalEntry
from .inventory_services import validate_inventory_posting


def post_journal(journal):
    policy = locked_policy(journal.engagement_id)
    ensure_open(policy, journal.transaction_date)
    if policy.require_journal_approval and journal.status != JournalEntry.Status.APPROVED:
        raise ValidationError("Submit this journal for independent approval before posting.")
    if journal.status not in (JournalEntry.Status.DRAFT, JournalEntry.Status.APPROVED):
        raise ValidationError("Only a draft or approved journal can be posted.")
    validate_inventory_posting(journal)
    if policy.opening_journal_id == journal.pk and journal.lines.exclude(
        account__account_type__in=["asset", "liability", "equity"],
    ).exists():
        raise ValidationError("Opening journals use balance-sheet accounts only.")
    try:
        journal.validate_for_posting()
    except DjangoValidationError as exc:
        raise ValidationError({"detail": exc.messages}) from exc
    for line in journal.lines.all():
        ledger_entry = GeneralLedger.objects.create(
            engagement_id=journal.engagement_id,
            journal_line=line, account=line.account,
            transaction_date=journal.transaction_date,
            reference=journal.reference, description=journal.description,
            debit=line.debit, credit=line.credit,
            source=GeneralLedger.Source.JOURNAL,
            status=GeneralLedger.Status.POSTED,
        )
        ledger_entry.dimensions.set(line.dimensions.all())
    journal.status = JournalEntry.Status.POSTED
    journal.save(update_fields=["status", "updated_at"])
