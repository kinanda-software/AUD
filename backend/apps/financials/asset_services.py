from calendar import monthrange
from datetime import date
from decimal import Decimal

from rest_framework.exceptions import ValidationError

from .accounting_controls import ensure_open, locked_policy
from .models import FixedAssetEvent
from .subledger_services import ZERO, check_account, create_source_journal, money


def month_end(start, offset=0):
    index = start.year * 12 + start.month - 1 + offset
    year, month = divmod(index, 12)
    if year > 9999:
        raise ValidationError("The depreciation schedule exceeds the supported date range.")
    return date(year, month + 1, monthrange(year, month + 1)[1])


def active_events(asset):
    return asset.events.exclude(journal__status="void").select_related("journal")


def registered(asset):
    return asset.registration_mode == "existing" or (
        asset.acquisition_journal_id and asset.acquisition_journal.status == "posted"
    )


def asset_state(asset):
    events = active_events(asset)
    depreciation = asset.opening_depreciation + sum(
        (event.amount for event in events if event.kind == "depreciation" and event.journal.status == "posted"), ZERO,
    )
    disposal = next((event for event in events if event.kind == "disposal"), None)
    count = sum(1 for event in events if event.kind == "depreciation" and event.journal.status == "posted")
    disposed = bool(disposal and disposal.journal.status == "posted")
    return {
        "registered": bool(registered(asset)), "disposed": disposed,
        "disposal_pending": bool(disposal and not disposed),
        "accumulated_depreciation": money(depreciation),
        "net_book_value": ZERO if disposed else money(asset.cost - depreciation),
        "next_depreciation_date": (
            month_end(asset.depreciation_start, count)
            if count < asset.depreciation_months and not disposal
            and asset.cost > asset.residual_value + asset.opening_depreciation else None
        ),
        "posted_months": count,
    }


def check_asset_accounts(asset):
    check_account(asset.asset_account, asset.engagement_id, ("asset",))
    check_account(asset.accumulated_account, asset.engagement_id, ("asset",))
    check_account(asset.expense_account, asset.engagement_id, ("expense",))
    if asset.asset_account_id == asset.accumulated_account_id:
        raise ValidationError("Asset cost and accumulated depreciation require distinct accounts.")


def prepare_acquisition(asset, actor):
    policy = locked_policy(asset.engagement_id)
    ensure_open(policy, asset.acquisition_date)
    if not policy.base_currency:
        raise ValidationError("Configure the engagement's base currency first.")
    if asset.registration_mode != "new" or asset.acquisition_journal_id:
        raise ValidationError("Only an unprepared new acquisition can generate an acquisition journal.")
    check_asset_accounts(asset)
    check_account(asset.funding_account, asset.engagement_id, ("asset", "liability", "equity"))
    if asset.funding_account_id in (asset.asset_account_id, asset.accumulated_account_id):
        raise ValidationError("The funding account must differ from the asset accounts.")
    asset.acquisition_journal = create_source_journal(
        asset.engagement_id, asset.acquisition_date, f"Asset acquisition: {asset.name}",
        asset.asset_number, actor,
        [(asset.asset_account, asset.cost), (asset.funding_account, -asset.cost)],
    )
    asset.save()
    return asset


def ready_for_event(asset):
    locked_policy(asset.engagement_id)
    if not registered(asset):
        raise ValidationError("Post the acquisition journal before recording asset activity.")
    check_asset_accounts(asset)
    events = active_events(asset)
    if events.filter(kind="disposal").exists():
        raise ValidationError("This asset has a posted or pending disposal.")
    if events.exclude(journal__status="posted").exists():
        raise ValidationError("Post or cancel the pending depreciation journal first.")


def prepare_depreciation(asset, period_end, actor):
    ready_for_event(asset)
    state = asset_state(asset)
    if period_end != state["next_depreciation_date"]:
        raise ValidationError("Depreciation must follow the next scheduled month-end, with no skipped or duplicate months.")
    ensure_open(locked_policy(asset.engagement_id), period_end)
    months = state["posted_months"] + 1
    basis = asset.cost - asset.residual_value - asset.opening_depreciation
    target = money(basis * Decimal(months) / Decimal(asset.depreciation_months))
    previous = state["accumulated_depreciation"] - asset.opening_depreciation
    amount = money(target - previous)
    journal = create_source_journal(
        asset.engagement_id, period_end, f"Depreciation: {asset.name}",
        asset.asset_number, actor,
        [(asset.expense_account, amount), (asset.accumulated_account, -amount)],
    )
    return FixedAssetEvent.objects.create(
        asset=asset, kind="depreciation", transaction_date=period_end,
        amount=amount, journal=journal, created_by=actor,
    )


def prepare_disposal(asset, data, actor):
    ready_for_event(asset)
    disposal_date = data["transaction_date"]
    ensure_open(locked_policy(asset.engagement_id), disposal_date)
    if disposal_date < asset.acquisition_date:
        raise ValidationError("Disposal cannot precede acquisition.")
    if asset.registration_mode == "existing" and disposal_date < asset.depreciation_start:
        raise ValidationError("Disposal cannot precede the opening register month.")
    state = asset_state(asset)
    posted_months = state["posted_months"]
    if posted_months and month_end(asset.depreciation_start, posted_months - 1) >= disposal_date.replace(day=1):
        raise ValidationError("No depreciation is charged in the disposal month. Choose a later disposal month.")
    next_date = state["next_depreciation_date"]
    if next_date and next_date < disposal_date.replace(day=1):
        raise ValidationError("Post depreciation through the month before disposal first.")
    proceeds = data["proceeds"]
    gain = money(proceeds - state["net_book_value"])
    postings = [
        (asset.asset_account, -asset.cost),
        (asset.accumulated_account, state["accumulated_depreciation"]),
    ]
    bank = data.get("bank_account")
    if proceeds:
        if bank is None:
            raise ValidationError("Select a bank/cash account for disposal proceeds.")
        check_account(bank, asset.engagement_id, ("asset",))
        if bank.pk in (asset.asset_account_id, asset.accumulated_account_id):
            raise ValidationError("Disposal proceeds require a separate bank/cash account.")
        postings.append((bank, proceeds))
    if gain:
        account = data.get("gain_loss_account")
        if account is None:
            raise ValidationError("Select a revenue account for a gain or an expense account for a loss.")
        check_account(account, asset.engagement_id, ("revenue",) if gain > 0 else ("expense",))
        postings.append((account, -gain))
    journal = create_source_journal(
        asset.engagement_id, disposal_date, f"Asset disposal: {asset.name}",
        asset.asset_number, actor, postings,
    )
    return FixedAssetEvent.objects.create(
        asset=asset, kind="disposal", transaction_date=disposal_date,
        amount=proceeds, journal=journal, created_by=actor,
    )
