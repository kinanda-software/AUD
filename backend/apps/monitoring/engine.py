"""
Real-time rule evaluation for continuous controls monitoring.

Rules are evaluated the moment a FinancialAuditEvent is
recorded by the financials app's existing signal pipeline —
no changes to financial code were required. Only "created"
events with an "after" snapshot are evaluated.
"""

from datetime import date
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.utils import timezone

from .models import MonitoringAlert, MonitoringRule

# Model names whose snapshots carry amounts.
AMOUNT_OBJECTS = (
    "generalledger",
    "journalline",
    "adjustment",
    "financialpayment",
)

# Off-hours window: before 06:00 or at/after 20:00 local time.
WORKDAY_START_HOUR = 6
WORKDAY_END_HOUR = 20


def _decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _extract_amount(after):
    """Best-effort amount from an event snapshot."""
    amount = _decimal(after.get("amount"))
    if amount is not None:
        return abs(amount)
    debit = _decimal(after.get("debit")) or Decimal("0")
    credit = _decimal(after.get("credit")) or Decimal("0")
    amount = max(debit, credit)
    return amount if amount > 0 else None


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _rule_matches(rule, event, after):
    """
    Return (matched: bool, evidence: str). `after` is the
    JSON snapshot of the triggering record.
    """
    params = rule.parameters or {}

    if rule.rule_type == MonitoringRule.RuleType.LARGE_AMOUNT:
        if event.object_type not in AMOUNT_OBJECTS:
            return False, ""
        amount = _extract_amount(after)
        threshold = _decimal(params.get("threshold")) or Decimal(
            "1000000"
        )
        if amount is not None and amount > threshold:
            return True, (
                f"Amount {amount:,.2f} exceeds the monitoring "
                f"threshold of {threshold:,.2f}."
            )
        return False, ""

    if rule.rule_type == MonitoringRule.RuleType.ROUND_NUMBER:
        if event.object_type not in AMOUNT_OBJECTS:
            return False, ""
        amount = _extract_amount(after)
        minimum = _decimal(params.get("min_amount")) or Decimal(
            "100000"
        )
        if (
            amount is not None
            and amount >= minimum
            and amount == amount.to_integral_value()
            and int(amount) % 1000 == 0
        ):
            return True, (
                f"Round amount {amount:,.2f} — review for "
                "estimated or manual figures."
            )
        return False, ""

    if rule.rule_type == MonitoringRule.RuleType.OFF_HOURS:
        local_time = timezone.localtime(event.created_at)
        if (
            local_time.weekday() >= 5
            or local_time.hour < WORKDAY_START_HOUR
            or local_time.hour >= WORKDAY_END_HOUR
        ):
            return True, (
                f"Recorded {local_time:%A %d %b %Y at %H:%M} — "
                "outside normal working hours."
            )
        return False, ""

    if rule.rule_type == MonitoringRule.RuleType.BACKDATED:
        if event.object_type not in (
            "generalledger",
            "journalentry",
            "financialdocument",
            "financialpayment",
        ):
            return False, ""
        transaction_date = _parse_date(after.get("transaction_date"))
        max_age = int(params.get("max_age_days") or 30)
        if transaction_date is None:
            return False, ""
        age = (event.created_at.date() - transaction_date).days
        if age > max_age:
            return True, (
                f"Transaction dated {transaction_date} was "
                f"recorded {age} days later (limit {max_age})."
            )
        return False, ""

    return False, ""


def _notify_engagement_lead(event, alert):
    from apps.notifications.models import Notification

    engagement = event.engagement
    recipients = set()
    if engagement.lead_auditor_id:
        recipients.add(engagement.lead_auditor)
    for member in engagement.audit_team_members.select_related(
        "user"
    ).filter(
        role__in=("engagement_partner", "engagement_manager")
    ):
        recipients.add(member.user)

    for user in recipients:
        Notification.objects.create(
            recipient=user,
            notification_type="audit",
            title=f"Monitoring alert: {alert.title}",
            message=(
                f"{alert.details.get('evidence', '')} "
                f"Rule: {alert.rule.name}. "
                f"Engagement: {engagement.engagement_code}."
            ),
        )


def evaluate_event(event):
    """
    Evaluate all active rules (global + engagement-scoped)
    against one freshly recorded financial event, creating
    alerts for matches.
    """
    if event.action != "created":
        return

    after = (event.details or {}).get("after")
    if not isinstance(after, dict):
        return

    rules = (
        MonitoringRule.objects
        .filter(is_active=True)
        .filter(
            Q(engagement_id=event.engagement_id)
            | Q(engagement__isnull=True)
        )
    )

    for rule in rules:
        matched, evidence = _rule_matches(rule, event, after)
        if not matched:
            continue
        alert = MonitoringAlert.objects.create(
            rule=rule,
            engagement_id=event.engagement_id,
            title=f"{rule.get_rule_type_display()}",
            object_type=event.object_type,
            object_id=event.object_id,
            severity=rule.severity,
            details={
                "evidence": evidence,
                "event_id": event.id,
                "operation": (event.details or {}).get("operation"),
                "snapshot": after,
            },
        )
        _notify_engagement_lead(event, alert)
