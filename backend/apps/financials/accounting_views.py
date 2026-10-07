from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.engagements.models import Engagement
from .accounting_controls import FinancialControlMixin, ensure_open, locked_policy, require_manager
from .models import AccountingPolicy, GeneralLedger, JournalEntry, FinancialDocument, TrialBalance, FinancialBudget, BankStatement, FixedAsset
from .asset_services import asset_state
from .subledger_services import CURRENCIES
from .serializers import JournalEntrySerializer


class PolicyConfigurationSerializer(serializers.Serializer):
    require_journal_approval = serializers.BooleanField()
    base_currency = serializers.ChoiceField(choices=CURRENCIES, required=False)
    confirm_legacy_currency = serializers.BooleanField(default=False)


class CloseSerializer(serializers.Serializer):
    closed_through = serializers.DateField()
    reason = serializers.CharField(max_length=500)


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500)


class OpeningSerializer(JournalEntrySerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        lines = attrs.get("lines", [])
        if len(lines) < 2:
            raise ValidationError({"lines": "Opening balances require at least two lines."})
        if sum((line.get("debit", Decimal("0")) for line in lines), Decimal("0")) != sum(
            (line.get("credit", Decimal("0")) for line in lines), Decimal("0")
        ):
            raise ValidationError({"lines": "Opening balances must balance."})
        if any(
            line["account"].account_type not in ("asset", "liability", "equity")
            for line in lines
        ):
            raise ValidationError({"lines": "Opening balances use balance-sheet accounts only."})
        return attrs


class AccountingControlViewSet(FinancialControlMixin, viewsets.GenericViewSet):
    queryset = Engagement.objects.all()
    serializer_class = PolicyConfigurationSerializer

    def data(self, engagement, policy):
        return {
            "engagement": engagement.pk,
            "require_journal_approval": policy.require_journal_approval if policy else False,
            "base_currency": policy.base_currency if policy else "",
            "supported_currencies": CURRENCIES,
            "closed_through": policy.closed_through if policy else None,
            "opening_journal": policy.opening_journal_id if policy else None,
            "opening_journal_status": (
                policy.opening_journal.status if policy and policy.opening_journal_id else None
            ),
            "can_manage": (
                self.request.user.is_superuser
                or self.request.user.role in ("admin", "manager")
            ),
        }

    def retrieve(self, request, pk=None):
        engagement = self.get_object()
        policy = AccountingPolicy.objects.filter(engagement=engagement).first()
        return Response(self.data(engagement, policy))

    @action(detail=True, methods=["post"])
    def configure(self, request, pk=None):
        require_manager(request.user)
        engagement = self.get_object()
        parameters = PolicyConfigurationSerializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        policy = locked_policy(engagement.pk)
        if JournalEntry.objects.filter(
            engagement=engagement, status__in=["submitted", "approved"],
        ).exists():
            raise ValidationError("Resolve submitted and approved journals before changing approval policy.")
        policy.require_journal_approval = parameters.validated_data["require_journal_approval"]
        currency = parameters.validated_data.get("base_currency")
        if currency and currency != policy.base_currency:
            if policy.base_currency:
                raise ValidationError("The established base currency cannot be changed.")
            if GeneralLedger.objects.filter(engagement=engagement).exists() and not parameters.validated_data["confirm_legacy_currency"]:
                raise ValidationError("Confirm that all legacy ledger amounts already use the selected base currency.")
            for model in (TrialBalance, FinancialBudget, BankStatement):
                if model.objects.filter(engagement=engagement).exclude(currency=currency).exists():
                    raise ValidationError(
                        "Existing trial balances, budgets and bank statements must use the chosen base currency. "
                        "Resolve currency mismatches before configuring it."
                    )
            policy.base_currency = currency
        policy.save()
        return Response(self.data(engagement, policy))

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        require_manager(request.user)
        engagement = self.get_object()
        parameters = CloseSerializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        policy = locked_policy(engagement.pk)
        date = parameters.validated_data["closed_through"]
        if policy.closed_through and date <= policy.closed_through:
            raise ValidationError("The new closing date must be later than the current closing date.")
        if JournalEntry.objects.filter(
            engagement=engagement, transaction_date__lte=date,
            status__in=["draft", "submitted", "approved"],
        ).exists():
            raise ValidationError("Post or remove pending journals before closing this period.")
        for asset in FixedAsset.objects.filter(engagement=engagement).select_related("acquisition_journal"):
            if asset.registration_mode == "new" and not asset.acquisition_journal_id and asset.acquisition_date <= date:
                raise ValidationError("Prepare or remove draft asset acquisitions before closing this period.")
            state = asset_state(asset)
            if state["registered"] and state["next_depreciation_date"] and state["next_depreciation_date"] <= date:
                raise ValidationError("Post scheduled asset depreciation before closing this period.")
        if FinancialDocument.objects.filter(
            engagement=engagement, transaction_date__lte=date, journal__isnull=True,
        ).exists():
            raise ValidationError("Resolve draft invoices, bills and credit notes before closing.")
        ledger = GeneralLedger.objects.filter(
            engagement=engagement, transaction_date__lte=date,
            status=GeneralLedger.Status.POSTED,
        ).aggregate(debit=Sum("debit"), credit=Sum("credit"))
        if (ledger["debit"] or Decimal("0")) != (ledger["credit"] or Decimal("0")):
            raise ValidationError("Posted ledger debits and credits must balance before closing.")
        policy.closed_through = date
        policy._control_reason = parameters.validated_data["reason"]
        policy.save()
        return Response(self.data(engagement, policy))

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        require_manager(request.user)
        engagement = self.get_object()
        parameters = ReasonSerializer(data=request.data)
        parameters.is_valid(raise_exception=True)
        policy = locked_policy(engagement.pk)
        if not policy.closed_through:
            raise ValidationError("Books are not closed.")
        policy.closed_through = None
        policy._control_reason = parameters.validated_data["reason"]
        policy.save()
        return Response(self.data(engagement, policy))

    @action(detail=True, methods=["post"], url_path="opening-balances")
    def opening_balances(self, request, pk=None):
        require_manager(request.user)
        engagement = self.get_object()
        policy = locked_policy(engagement.pk)
        if policy.opening_journal_id:
            raise ValidationError("An opening-balance journal already exists for this engagement.")
        if request.data.get("status", "draft") != "draft":
            raise ValidationError("Opening journals must be created as drafts.")
        serializer = OpeningSerializer(
            data={**request.data, "engagement": engagement.pk, "status": "draft"},
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        ensure_open(policy, serializer.validated_data["transaction_date"])
        if GeneralLedger.objects.filter(
            engagement=engagement, status=GeneralLedger.Status.POSTED,
        ).exists():
            raise ValidationError(
                "Set opening balances before posting ledger activity. Existing engagements "
                "need an explicit conversion reconciliation, not an additional opening journal."
            )
        journal = serializer.save(created_by=request.user)
        policy.opening_journal = journal
        policy.save()
        return Response(JournalEntrySerializer(journal).data, status=201)
