from decimal import Decimal, ROUND_HALF_UP, localcontext

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .accounting_controls import ensure_open, locked_policy, require_manager
from .models import InventoryMovement
from .subledger_services import ZERO, check_account, create_source_journal, money


MAX_QUANTITY = Decimal("99999999999999.9999")


def stock_quantity(value):
    if value < 0 or value > MAX_QUANTITY:
        raise ValidationError("Stock quantity exceeds the supported range.")
    return value.quantize(Decimal("0.0001"))


def recognised_movements(item):
    return item.movements.filter(Q(register_only=True) | Q(journal__status="posted"))


def stock_state(item):
    latest = recognised_movements(item).order_by("-transaction_date", "-id").first()
    quantity = latest.quantity_after if latest else Decimal("0.0000")
    value = latest.value_after if latest else ZERO
    with localcontext() as context:
        context.prec = 60
        average = (value / quantity if quantity else ZERO).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    return {
        "quantity": quantity, "value": value, "average_unit_cost": average,
        "last_movement_date": latest.transaction_date if latest else None,
        "pending_movement": item.movements.filter(journal__status__in=("draft", "submitted", "approved")).exists(),
    }


def check_inventory_accounts(item):
    check_account(item.inventory_account, item.engagement_id, ("asset",))
    check_account(item.expense_account, item.engagement_id, ("expense",))


def prepare_movement(item, data, actor):
    policy = locked_policy(item.engagement_id)
    date = data["transaction_date"]
    ensure_open(policy, date)
    if not policy.base_currency:
        raise ValidationError("Configure the base currency before recording stock.")
    if not item.is_active:
        raise ValidationError("This stock item is inactive.")
    check_inventory_accounts(item)
    state = stock_state(item)
    if state["pending_movement"]:
        raise ValidationError("Post or cancel this item's pending movement before preparing another.")
    if state["last_movement_date"] and date < state["last_movement_date"]:
        raise ValidationError("Stock movements cannot be backdated before this item's last posted movement.")
    if policy.opening_journal_id:
        if policy.opening_journal.status != "posted" or date < policy.opening_journal.transaction_date:
            raise ValidationError("Post the opening journal first; stock dates cannot precede it.")
    kind = data["kind"]
    register_only = data.get("register_only", False)
    if kind in ("opening", "increase", "decrease"):
        require_manager(actor)
    if kind == "opening" and recognised_movements(item).exists():
        raise ValidationError("Opening stock is permitted only before the item's first posted movement.")
    if register_only:
        if kind != "opening":
            raise ValidationError("Only opening stock can be registered without a journal.")
        if not data.get("confirm_existing_balance"):
            raise ValidationError("Confirm that this opening stock value is already included in the base-currency ledger.")
        if data.get("offset_account"):
            raise ValidationError("Register-only opening stock does not use an offset account.")
    incoming = kind in ("opening", "receipt", "increase")
    quantity = data["quantity"]
    if incoming:
        if "total_value" not in data:
            raise ValidationError("Incoming stock requires its total capitalised base-currency value.")
        amount = data["total_value"]
        quantity_after = stock_quantity(state["quantity"] + quantity)
        value_after = money(state["value"] + amount)
    else:
        if "total_value" in data:
            raise ValidationError("Outgoing stock is valued by the server at moving weighted-average cost.")
        if quantity > state["quantity"]:
            raise ValidationError("Insufficient stock. Negative inventory is not permitted.")
        with localcontext() as context:
            context.prec = 60
            amount = state["value"] if quantity == state["quantity"] else money(
                state["value"] * quantity / state["quantity"],
            )
        if amount <= ZERO:
            raise ValidationError("The issue cost rounds to zero. Combine quantities into a larger movement.")
        quantity_after = stock_quantity(state["quantity"] - quantity)
        value_after = money(state["value"] - amount)
        if quantity_after and value_after == ZERO:
            raise ValidationError("This issue would leave stock with zero rounded value. Issue the full remaining quantity instead.")
    offset = data.get("offset_account")
    journal = None
    if not register_only:
        if kind == "issue":
            if offset and offset.pk != item.expense_account_id:
                raise ValidationError("Stock issues use the item's configured cost-of-goods-sold/expense account.")
            offset = item.expense_account
        if offset is None:
            raise ValidationError("Select an offset account for this movement.")
        types = {
            "opening": ("equity",), "receipt": ("asset", "liability"),
            "issue": ("expense",), "increase": ("expense", "revenue", "equity"),
            "decrease": ("expense",),
        }
        check_account(offset, item.engagement_id, types[kind])
        if offset.pk == item.inventory_account_id:
            raise ValidationError("The offset account must differ from the inventory account.")
        sign = Decimal("1") if incoming else Decimal("-1")
        journal = create_source_journal(
            item.engagement_id, date, f"Stock {kind}: {item.sku}", data.get("reference", ""),
            actor, [(item.inventory_account, sign * amount), (offset, -sign * amount)],
        )
    return InventoryMovement.objects.create(
        item=item, kind=kind, transaction_date=date, quantity=quantity, value=amount,
        quantity_before=state["quantity"], quantity_after=quantity_after,
        value_before=state["value"], value_after=value_after,
        offset_account=offset, reference=data.get("reference", ""), reason=data["reason"],
        register_only=register_only, journal=journal, created_by=actor,
    )


def validate_inventory_posting(journal):
    movement = InventoryMovement.objects.filter(journal=journal).select_related("item").first()
    if movement is None:
        return
    state = stock_state(movement.item)
    if (
        state["quantity"] != movement.quantity_before
        or state["value"] != movement.value_before
        or (state["last_movement_date"] and movement.transaction_date < state["last_movement_date"])
    ):
        raise ValidationError("Inventory balances changed after preparation. Cancel and prepare the movement again.")
