import json
from contextvars import ContextVar

from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models.signals import m2m_changed, post_delete, post_save, pre_delete, pre_save
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    AccountingPolicy, Adjustment, ChartOfAccount, FinancialAuditEvent,
    GeneralLedger, JournalEntry, JournalLine, LeadSchedule,
    SupportingDetail, TrialBalance, TrialBalanceLine,
    FinancialContact, FinancialTaxCode, FinancialDocument, FinancialDocumentLine, FinancialPayment,
    FinancialBudget, BankStatement, FixedAsset, FixedAssetEvent, InventoryItem, InventoryMovement,
    FinancialAccountMapping,
)


financial_request = ContextVar("financial_request", default=None)
CORE_MODELS = (
    AccountingPolicy, Adjustment, ChartOfAccount, GeneralLedger, JournalEntry,
    JournalLine, LeadSchedule, SupportingDetail, TrialBalance, TrialBalanceLine,
    FinancialContact, FinancialTaxCode, FinancialDocument, FinancialDocumentLine, FinancialPayment,
    FixedAsset, FixedAssetEvent, InventoryItem, InventoryMovement,
    FinancialAccountMapping,
)


def require_manager(user):
    if not user.is_superuser and user.role not in ("admin", "manager"):
        raise PermissionDenied("Only a manager or administrator can perform this action.")


def locked_policy(engagement_id):
    AccountingPolicy.objects.get_or_create(engagement_id=engagement_id)
    return AccountingPolicy.objects.select_for_update().get(engagement_id=engagement_id)


def ensure_open(policy, transaction_date):
    if policy.closed_through and transaction_date <= policy.closed_through:
        raise ValidationError({
            "transaction_date": f"Books are closed through {policy.closed_through}.",
        })


def engagement_id(instance):
    if isinstance(instance, InventoryMovement):
        return instance.item.engagement_id
    if isinstance(instance, FixedAssetEvent):
        return instance.asset.engagement_id
    if isinstance(instance, (FinancialDocumentLine, FinancialPayment)):
        return instance.document.engagement_id
    if isinstance(instance, (JournalLine, TrialBalanceLine)):
        parent = (
            instance.journal_entry if isinstance(instance, JournalLine)
            else instance.trial_balance
        )
        return parent.engagement_id
    if isinstance(instance, SupportingDetail):
        return instance.lead_schedule.engagement_id
    return instance.engagement_id


def snapshot(instance):
    values = {
        field.attname: getattr(instance, field.attname)
        for field in instance._meta.concrete_fields
    }
    return json.loads(json.dumps(values, cls=DjangoJSONEncoder))


def check_mutation(instance, old=None, deleting=False):
    for record in (old, instance):
        if isinstance(record, InventoryMovement):
            ensure_open(locked_policy(record.item.engagement_id), record.transaction_date)
        if isinstance(record, FixedAsset):
            date = record.depreciation_start if record.registration_mode == "existing" else record.acquisition_date
            ensure_open(locked_policy(record.engagement_id), date)
        if isinstance(record, FixedAssetEvent):
            ensure_open(locked_policy(record.asset.engagement_id), record.transaction_date)
        if isinstance(record, (FinancialDocument, FinancialDocumentLine, FinancialPayment)):
            document = record.document if isinstance(record, (FinancialDocumentLine, FinancialPayment)) else record
            ensure_open(locked_policy(document.engagement_id), record.transaction_date if isinstance(record, FinancialPayment) else document.transaction_date)
    if isinstance(instance, JournalLine) and source_journal(instance.journal_entry):
        raise ValidationError("Source-document journal lines are immutable. Correct the source document.")
    for record in (old, instance):
        if record is None:
            continue
        if isinstance(record, (GeneralLedger, JournalEntry, JournalLine)):
            journal = record.journal_entry if isinstance(record, JournalLine) else record
            policy = locked_policy(engagement_id(record))
            ensure_open(policy, journal.transaction_date)
            if policy.opening_journal_id:
                opening = policy.opening_journal
                if journal.transaction_date < opening.transaction_date:
                    raise ValidationError("Transactions cannot precede the opening-balance date.")
                if isinstance(record, GeneralLedger) and record.status == GeneralLedger.Status.POSTED:
                    if (
                        opening.status != JournalEntry.Status.POSTED
                        and (not record.journal_line_id
                             or record.journal_line.journal_entry_id != opening.pk)
                    ):
                        raise ValidationError("Post the opening-balance journal before other ledger activity.")
            if (
                isinstance(record, GeneralLedger)
                and record.status == GeneralLedger.Status.POSTED
                and policy.require_journal_approval
                and not record.journal_line_id
            ):
                raise ValidationError("Approval-enabled engagements must post through approved journals.")
    if isinstance(instance, GeneralLedger) and old and old.status == GeneralLedger.Status.POSTED:
        raise ValidationError("Posted ledger entries are immutable. Use a reversing journal.")
    if isinstance(instance, JournalLine):
        for record in (old, instance):
            if record and record.journal_entry.status != JournalEntry.Status.DRAFT:
                raise ValidationError("Only draft journal lines can be changed.")
            if (
                record and getattr(record.journal_entry, "opening_policy", None)
                and record.account.account_type not in ("asset", "liability", "equity")
            ):
                raise ValidationError("Opening journals use balance-sheet accounts only.")
    if isinstance(instance, JournalEntry) and deleting and instance.status != JournalEntry.Status.DRAFT:
        raise ValidationError("Only draft journals can be deleted.")
    if (
        isinstance(instance, JournalEntry) and deleting
        and AccountingPolicy.objects.filter(opening_journal=instance).exists()
    ):
        raise ValidationError("Edit the draft opening journal rather than deleting its baseline.")


def before_save(sender, instance, raw=False, **kwargs):
    if raw or financial_request.get() is None:
        return
    old = sender.objects.filter(pk=instance.pk).first() if instance.pk else None
    check_mutation(instance, old)
    instance._financial_before = snapshot(old) if old else None


def after_save(sender, instance, created, raw=False, **kwargs):
    if raw or financial_request.get() is None:
        return
    request, action = financial_request.get()
    FinancialAuditEvent.objects.create(
        engagement_id=engagement_id(instance),
        actor=request.user if getattr(request.user, "pk", None) else None,
        action="created" if created else "updated",
        object_type=sender._meta.model_name,
        object_id=str(instance.pk),
        details={
            "operation": action,
            "reason": getattr(instance, "_control_reason", None),
            "before": getattr(instance, "_financial_before", None),
            "after": snapshot(instance),
        },
    )


def before_delete(sender, instance, **kwargs):
    if financial_request.get() is not None:
        check_mutation(instance, instance, deleting=True)


def after_delete(sender, instance, **kwargs):
    if financial_request.get() is None:
        return
    request, action = financial_request.get()
    FinancialAuditEvent.objects.create(
        engagement_id=engagement_id(instance),
        actor=request.user if getattr(request.user, "pk", None) else None,
        action="deleted", object_type=sender._meta.model_name,
        object_id=str(instance.pk),
        details={"operation": action, "before": snapshot(instance), "after": None},
    )


def dimensions_changed(sender, instance, action, reverse, pk_set, **kwargs):
    if financial_request.get() is None:
        return
    if reverse:
        raise ValidationError("Change dimensions through the financial record.")
    if action.startswith("pre_"):
        check_mutation(instance)
        instance._financial_dimensions_before = list(
            instance.dimensions.values_list("pk", flat=True)
        )
        request, operation = financial_request.get()
        if isinstance(instance, GeneralLedger) and instance.status == GeneralLedger.Status.POSTED:
            if operation not in ("post_entry", "reverse"):
                raise ValidationError("Posted ledger dimensions cannot be changed.")
    if action.startswith("post_"):
        request, operation = financial_request.get()
        FinancialAuditEvent.objects.create(
            engagement_id=engagement_id(instance),
            actor=request.user if getattr(request.user, "pk", None) else None,
            action="dimensions_changed", object_type=instance._meta.model_name,
            object_id=str(instance.pk),
            details={
                "operation": operation,
                "before_dimension_ids": getattr(instance, "_financial_dimensions_before", []),
                "dimension_ids": list(instance.dimensions.values_list("pk", flat=True)),
            },
        )


def connect_financial_signals():
    for model in CORE_MODELS:
        for signal, receiver in (
            (pre_save, before_save), (post_save, after_save),
            (pre_delete, before_delete), (post_delete, after_delete),
        ):
            signal.connect(receiver, sender=model, weak=False,
                           dispatch_uid=f"financials.{model._meta.model_name}.{receiver.__name__}")
    for model in (GeneralLedger, JournalLine):
        m2m_changed.connect(
            dimensions_changed, sender=model.dimensions.through, weak=False,
            dispatch_uid=f"financials.{model._meta.model_name}.dimensions",
        )
    for model in (TrialBalance, FinancialBudget, BankStatement):
        pre_save.connect(currency_before_save, sender=model, weak=False,
                         dispatch_uid=f"financials.{model._meta.model_name}.currency")


def currency_before_save(sender, instance, raw=False, **kwargs):
    if raw or financial_request.get() is None:
        return
    policy = locked_policy(instance.engagement_id)
    if policy.base_currency and instance.currency != policy.base_currency:
        raise ValidationError({
            "currency": "Trial balances, budgets and bank reconciliations use the engagement's base currency.",
        })


def source_journal(journal):
    return (
        FinancialDocument.objects.filter(journal_id=journal.pk).exists()
        or FinancialPayment.objects.filter(journal_id=journal.pk).exists()
        or FinancialPayment.objects.filter(journal_id=journal.reversal_of_id).exists()
        or FixedAsset.objects.filter(acquisition_journal_id=journal.pk).exists()
        or FixedAssetEvent.objects.filter(journal_id=journal.pk).exists()
        or InventoryMovement.objects.filter(journal_id=journal.pk).exists()
    )


class FinancialControlMixin:
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            if getattr(request.user, "role", None) == "guest":
                raise PermissionDenied("Guests have read-only financial access.")
            self._financial_token = financial_request.set((request, self.action))

    def dispatch(self, request, *args, **kwargs):
        self._financial_token = None
        try:
            if request.method in ("GET", "HEAD", "OPTIONS"):
                return super().dispatch(request, *args, **kwargs)
            with transaction.atomic():
                response = super().dispatch(request, *args, **kwargs)
                if response.status_code >= 400:
                    transaction.set_rollback(True)
                return response
        finally:
            if self._financial_token is not None:
                financial_request.reset(self._financial_token)
