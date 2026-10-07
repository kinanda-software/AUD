import hashlib
import json
from decimal import Decimal, localcontext

from django.db import transaction
from django.db.models import Count
from rest_framework.exceptions import PermissionDenied, ValidationError

from .accounting_controls import locked_policy, require_manager
from .models import (
    Adjustment, FinancialStatementApproval, FinancialStatementLine, FinancialStatementMapping,
    FinancialStatementVersion,
)
from .workflow_services import record_financial_event


ZERO = Decimal("0.00")
GROUPS = ("asset", "liability", "equity", "revenue", "expense")


def require_preparer(actor):
    if actor.role not in ("staff", "auditor", "manager", "admin"):
        raise PermissionDenied("Only financial staff, auditors, managers or admins can prepare statement versions.")


def adjusted_accounts(tb):
    # Reuse the existing adjusted-TB producer, including adjustment-only accounts.
    from .views import TrialBalanceViewSet
    if tb.period_start > tb.period_end:
        raise ValidationError("Trial balance period dates are invalid.")
    if tb.lines.exclude(account__engagement_id=tb.engagement_id).exists():
        raise ValidationError("Trial balance contains a foreign-engagement account.")
    if tb.lines.values("account_id").annotate(count=Count("id")).filter(count__gt=1).exists():
        raise ValidationError("Trial balance contains duplicate account rows. Correct the import before reporting.")
    adjustments = Adjustment.objects.filter(trial_balance=tb, status="posted")
    if (
        adjustments.exclude(engagement_id=tb.engagement_id).exists()
        or adjustments.exclude(debit_account__engagement_id=tb.engagement_id).exists()
        or adjustments.exclude(credit_account__engagement_id=tb.engagement_id).exists()
    ):
        raise ValidationError("Posted adjustments contain foreign-engagement metadata.")
    result = TrialBalanceViewSet()._calculate_adjusted_lines(tb)
    accounts = {}
    for row in result["lines"]:
        if row["account_type"] not in GROUPS:
            raise ValidationError("Trial balance contains an unsupported account type.")
        accounts[row["account"]] = {
            "id": row["account"], "code": row["account_code"], "name": row["account_name"],
            "group": row["account_type"],
            "original": row["original_debit"] - row["original_credit"],
            "adjustment": row["adjustment_debit"] - row["adjustment_credit"],
            "adjusted": row["adjusted_debit"] - row["adjusted_credit"],
        }
    return accounts, result["posted_adjustment_count"]


def money(value):
    return format(value, ".2f")


def tb_metadata(tb):
    return {
        "id": tb.pk, "engagement": tb.engagement_id, "period_start": tb.period_start.isoformat(),
        "period_end": tb.period_end.isoformat(), "currency": tb.currency,
    }


def build_mapped_statements(current, comparison=None):
    if comparison and (
        comparison.engagement_id != current.engagement_id or comparison.currency != current.currency
        or comparison.period_end >= current.period_start
    ):
        raise ValidationError("Comparison must be an earlier non-overlapping TB from the same engagement and currency.")
    with localcontext() as context:
        context.prec = 60
        now, current_count = adjusted_accounts(current)
        prior, prior_count = adjusted_accounts(comparison) if comparison else ({}, 0)
        lines = list(FinancialStatementLine.objects.filter(engagement_id=current.engagement_id))
        mappings = {
            mapping.account_id: mapping
            for mapping in FinancialStatementMapping.objects.filter(
                account__engagement_id=current.engagement_id,
            ).select_related("line", "account")
        }
        line_rows = {line.pk: {
            "id": line.pk, "code": line.code, "label": line.label, "group": line.group,
            "note_reference": line.note_reference, "order": line.order,
            "current": ZERO, "comparison": ZERO if comparison else None, "accounts": [],
        } for line in lines}
        unmapped = []
        totals = {period: {group: ZERO for group in GROUPS} for period in ("current", "comparison")}
        for account_id in sorted(set(now) | set(prior), key=lambda pk: (now.get(pk) or prior[pk])["code"]):
            account = now.get(account_id) or prior[account_id]
            mapping = mappings.get(account_id)
            valid = bool(
                mapping and mapping.line_id in line_rows and mapping.line.group == account["group"]
                and mapping.line.group == mapping.account.account_type
            )
            item = {"id": account_id, "code": account["code"], "name": account["name"], "group": account["group"]}
            for period, population in (("current", now), ("comparison", prior)):
                row = population.get(account_id)
                sign = Decimal("-1") if account["group"] in ("liability", "equity", "revenue") else Decimal("1")
                values = {key: money(row[key]) if row else "0.00" for key in ("original", "adjustment", "adjusted")}
                item[period] = {**values, "display": money((row["adjusted"] if row else ZERO) * sign),
                                "present": row is not None} if period == "current" or comparison else None
                totals[period][account["group"]] += (row["adjusted"] if row else ZERO) * sign
                if valid and (period == "current" or comparison):
                    line_rows[mapping.line_id][period] += (row["adjusted"] if row else ZERO) * sign
            if valid:
                line_rows[mapping.line_id]["accounts"].append(item)
            else:
                item["reason"] = "No explicit mapping" if not mapping else "Mapping group/engagement is inconsistent"
                unmapped.append(item)
        checks = {}
        for period, population in (("current", now), ("comparison", prior)):
            if period == "comparison" and not comparison:
                checks[period] = None
                continue
            profit = totals[period]["revenue"] - totals[period]["expense"]
            difference = totals[period]["asset"] - totals[period]["liability"] - totals[period]["equity"] - profit
            mapped_net = sum((
                sum(Decimal(account[period]["adjusted"]) for account in row["accounts"])
                for row in line_rows.values()
            ), ZERO)
            net = sum((row["adjusted"] for row in population.values()), ZERO)
            checks[period] = {
                "groups": {key: money(value) for key, value in totals[period].items()},
                "profit": money(profit), "tb_difference": money(net), "position_difference": money(difference),
                "mapped_net": money(mapped_net), "unmapped_net": money(net - mapped_net),
                "account_count": len(population), "posted_adjustment_count": current_count if period == "current" else prior_count,
            }
        warnings = [
            "Current and comparative columns use the current engagement mapping, not a historical mapping.",
            "Statement totals include unmapped accounts; line totals omit them until explicitly mapped.",
            "Current period profit is shown separately in equity reconciliation, not posted to retained earnings.",
            "This is not a statutory disclosure checklist, cash-flow statement or audit opinion.",
        ]
        if comparison and (current.period_end - current.period_start) != (comparison.period_end - comparison.period_start):
            warnings.append("Period lengths differ; comparison amounts are not normalized.")
        ready = not unmapped and bool(now) and (bool(prior) if comparison else True) and all(
            data["tb_difference"] == "0.00" and data["position_difference"] == "0.00"
            for data in checks.values() if data is not None
        )
        for row in line_rows.values():
            row["current"] = money(row["current"])
            row["comparison"] = money(row["comparison"]) if row["comparison"] is not None else None
        return {
            "current_tb": tb_metadata(current), "comparison_tb": tb_metadata(comparison) if comparison else None,
            "lines": list(line_rows.values()), "unmapped": unmapped, "checks": checks,
            "ready_for_approval": ready, "warnings": warnings,
            "sign_convention": "Account original/adjustment/adjusted are debit-positive; displayed liability, equity and revenue are credit-positive.",
        }


@transaction.atomic
def save_statement_version(data, actor):
    require_preparer(actor)
    current = data["current"]
    locked_policy(current.engagement_id)
    result = build_mapped_statements(current, data.get("comparison"))
    fingerprint = hashlib.sha256(json.dumps(result, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    version = FinancialStatementVersion.objects.create(
        engagement=current.engagement, name=data["name"], current_tb_id=current.pk,
        comparison_tb_id=data["comparison"].pk if data.get("comparison") else None,
        results=result, fingerprint=fingerprint, created_by=actor, preparer_identifier=actor.pk,
    )
    record_financial_event(
        engagement_id=current.engagement_id, actor=actor, action="created",
        object_type="financial_statement_version", object_id=version.pk,
        details={"name": version.name, "fingerprint": fingerprint, "ready_for_approval": result["ready_for_approval"]},
    )
    return version


@transaction.atomic
def approve_statement(version, actor, note):
    require_manager(actor)
    locked_policy(version.engagement_id)
    if version.preparer_identifier == actor.pk:
        raise PermissionDenied("Statement approval requires a manager/admin other than its preparer.")
    if not version.results["ready_for_approval"]:
        raise ValidationError("This saved version has unmapped, empty or unbalanced data. Correct the data and save a new version.")
    if FinancialStatementApproval.objects.filter(version=version).exists():
        raise ValidationError("This statement version is already approved.")
    approval = FinancialStatementApproval.objects.create(
        version=version, actor=actor, actor_identifier=actor.pk, actor_name=actor.username, note=note,
    )
    record_financial_event(
        engagement_id=version.engagement_id, actor=actor, action="approved",
        object_type="financial_statement_version", object_id=version.pk,
        details={"fingerprint": version.fingerprint, "approval": approval.pk, "note": note},
    )
    return approval
