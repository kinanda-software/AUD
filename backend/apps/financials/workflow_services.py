import csv
import io
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher
import re

from rest_framework.exceptions import ValidationError

from .models import BANK_MATCH_DATE_WINDOW_DAYS, FinancialAuditEvent


ZERO = Decimal("0.00")
MAX_STATEMENT_SIZE = 10 * 1024 * 1024
MAX_STATEMENT_ROWS = 10000


def _normalize_match_text(value):
    return " ".join(re.findall(r"[a-z0-9]+", (value or "").casefold()))


def build_bank_match_candidates(statement_lines, ledger_entries, matched_entry_ids):
    entries_by_amount = defaultdict(list)
    for entry in ledger_entries:
        entries_by_amount[entry.debit - entry.credit].append(entry)

    matched_ids = set(matched_entry_ids)
    results = []
    for line in statement_lines:
        if line.matched_entry_id is not None:
            continue

        line_reference = _normalize_match_text(line.reference)
        line_description = _normalize_match_text(line.description)
        candidates = []
        for entry in entries_by_amount[line.amount]:
            if entry.id in matched_ids:
                continue
            date_difference = (entry.transaction_date - line.transaction_date).days
            if abs(date_difference) > BANK_MATCH_DATE_WINDOW_DAYS:
                continue

            entry_reference = _normalize_match_text(entry.reference)
            entry_description = _normalize_match_text(entry.description)
            reference_similarity = (
                SequenceMatcher(None, line_reference, entry_reference, autojunk=False).ratio()
                if line_reference and entry_reference else 0
            )
            description_similarity = (
                SequenceMatcher(None, line_description, entry_description, autojunk=False).ratio()
                if line_description and entry_description else 0
            )
            reasons = ["Exact signed amount"]
            if date_difference == 0:
                reasons.append("Same transaction date")
            else:
                reasons.append(
                    f"Ledger date differs by {abs(date_difference)} day(s)"
                )
            if line_reference and line_reference == entry_reference:
                reasons.append("Reference matches")
            elif reference_similarity >= 0.8:
                reasons.append("Reference is similar")
            if description_similarity >= 0.8:
                reasons.append("Description is similar")

            candidates.append({
                "id": entry.id,
                "date": entry.transaction_date.isoformat(),
                "reference": entry.reference,
                "description": entry.description,
                "amount": format(entry.debit - entry.credit, ".2f"),
                "match_type": "exact" if date_difference == 0 else "near_date",
                "date_difference_days": date_difference,
                "match_reasons": reasons,
                "_sort_key": (
                    abs(date_difference),
                    -(line_reference == entry_reference and bool(line_reference)),
                    -max(reference_similarity, description_similarity),
                    entry.id,
                ),
            })
        candidates.sort(key=lambda candidate: candidate["_sort_key"])
        for candidate in candidates:
            del candidate["_sort_key"]
        results.append({"line_id": line.id, "candidates": candidates})
    return results


def record_financial_event(
    *,
    engagement_id,
    actor,
    action,
    object_type,
    object_id,
    details=None,
):
    return FinancialAuditEvent.objects.create(
        engagement_id=engagement_id,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action,
        object_type=object_type,
        object_id=str(object_id),
        details=details or {},
    )


def parse_statement_csv(upload, statement):
    if upload.size > MAX_STATEMENT_SIZE:
        raise ValidationError({"file": "CSV file exceeds the 10 MB limit."})
    try:
        content = upload.read().decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValidationError({"file": "CSV must use UTF-8 encoding."}) from error
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        raise ValidationError({"file": "CSV must include a header row."})
    headers = [header.strip().casefold() for header in reader.fieldnames]
    required = {"date", "description", "reference", "amount"}
    if len(headers) != len(set(headers)) or not required.issubset(headers):
        raise ValidationError({
            "file": "CSV must have unique columns named date, description, reference and amount."
        })
    reader.fieldnames = headers
    rows = []
    for row_number, row in enumerate(reader, start=2):
        if row_number > MAX_STATEMENT_ROWS + 1:
            raise ValidationError({"file": "CSV exceeds the 10,000 transaction limit."})
        if None in row:
            raise ValidationError({"file": f"CSV row {row_number} has more values than header columns."})
        try:
            transaction_date = date.fromisoformat((row.get("date") or "").strip())
            amount = Decimal((row.get("amount") or "").strip())
        except (ValueError, InvalidOperation) as error:
            raise ValidationError({"file": f"CSV row {row_number} has an invalid date or amount."}) from error
        if not amount.is_finite() or amount == ZERO or amount.as_tuple().exponent < -2:
            raise ValidationError({"file": f"CSV row {row_number} amount must be nonzero with at most two decimal places."})
        description = (row.get("description") or "").strip()
        reference = (row.get("reference") or "").strip()
        if not description or len(description) > 500 or len(reference) > 100:
            raise ValidationError({"file": f"CSV row {row_number} has an empty/oversized description or oversized reference."})
        if not statement.period_start <= transaction_date <= statement.period_end:
            raise ValidationError({"file": f"CSV row {row_number} date falls outside the statement period."})
        rows.append({
            "statement": statement,
            "row_number": row_number,
            "transaction_date": transaction_date,
            "description": description,
            "reference": reference,
            "amount": amount,
        })
    if not rows:
        raise ValidationError({"file": "CSV contains no transaction rows."})
    return rows


def build_budget_actuals(budget, budget_lines, ledger_entries):
    budgets = defaultdict(lambda: ZERO)
    accounts = {}
    dimensions_by_key = {}
    for line in budget_lines:
        month = line.period.replace(day=1)
        dimensions = sorted(
            list(line.dimensions.all()) if hasattr(line, "dimensions") else [],
            key=lambda dimension: dimension.id,
        )
        dimension_ids = tuple(dimension.id for dimension in dimensions)
        budgets[(line.account_id, dimension_ids, month)] += line.amount
        accounts[line.account_id] = line.account
        dimensions_by_key[(line.account_id, dimension_ids)] = dimensions

    actuals = defaultdict(lambda: ZERO)
    for entry in ledger_entries:
        account = entry.account
        month = entry.transaction_date.replace(day=1)
        dimensions = sorted(
            list(entry.dimensions.all()) if hasattr(entry, "dimensions") else [],
            key=lambda dimension: dimension.id,
        )
        dimension_ids = tuple(dimension.id for dimension in dimensions)
        amount = (
            entry.credit - entry.debit
            if account.account_type == "revenue"
            else entry.debit - entry.credit
        )
        actuals[(account.id, dimension_ids, month)] += amount
        accounts[account.id] = account
        dimensions_by_key[(account.id, dimension_ids)] = dimensions

    months = [
        date(budget.fiscal_year, month, 1)
        for month in range(1, 13)
    ]
    rows = []
    account_dimension_keys = {
        (account_id, dimension_ids)
        for account_id, dimension_ids, _ in budgets
    }
    account_dimension_keys.update(
        (account_id, dimension_ids)
        for account_id, dimension_ids, _ in actuals
    )
    for account_id, dimension_ids in sorted(
        account_dimension_keys,
        key=lambda key: (
            accounts[key[0]].account_code,
            key[0],
            tuple(
                (dimension.dimension_type, dimension.name, dimension.id)
                for dimension in dimensions_by_key[key]
            ),
        ),
    ):
        account = accounts[account_id]
        month_rows = []
        annual_budget = ZERO
        annual_actual = ZERO
        for month in months:
            budget_amount = budgets[(account_id, dimension_ids, month)]
            actual_amount = actuals[(account_id, dimension_ids, month)]
            variance = actual_amount - budget_amount
            annual_budget += budget_amount
            annual_actual += actual_amount
            month_rows.append({
                "period": month.isoformat(),
                "budget": format(budget_amount, ".2f"),
                "actual": format(actual_amount, ".2f"),
                "variance": format(variance, ".2f"),
                "favorable": (
                    variance >= ZERO
                    if account.account_type == "revenue"
                    else variance <= ZERO
                ),
            })
        annual_variance = annual_actual - annual_budget
        rows.append({
            "account_id": account_id,
            "account_code": account.account_code,
            "account_name": account.account_name,
            "account_type": account.account_type,
            "dimensions": [
                {
                    "id": dimension.id,
                    "dimension_type": dimension.dimension_type,
                    "name": dimension.name,
                }
                for dimension in dimensions_by_key[(account_id, dimension_ids)]
            ],
            "annual_budget": format(annual_budget, ".2f"),
            "annual_actual": format(annual_actual, ".2f"),
            "annual_variance": format(annual_variance, ".2f"),
            "annual_favorable": (
                annual_variance >= ZERO
                if account.account_type == "revenue"
                else annual_variance <= ZERO
            ),
            "months": month_rows,
        })
    return {
        "budget_id": budget.id,
        "engagement_id": budget.engagement_id,
        "name": budget.name,
        "fiscal_year": budget.fiscal_year,
        "currency": budget.currency,
        "actual_source": "posted general-ledger entries only",
        "accounts": rows,
    }


def build_bank_reconciliation_summary(statement, statement_lines, ledger_entries, matched_entry_ids):
    statement_lines = list(statement_lines)
    ledger_entries = list(ledger_entries)
    statement_movement = sum((line.amount for line in statement_lines), ZERO)
    statement_difference = statement.closing_balance - (
        statement.opening_balance + statement_movement
    )
    matched_ids = set(matched_entry_ids)
    unmatched_statement = sum(line.matched_entry_id is None for line in statement_lines)
    unmatched_ledger = sum(entry.id not in matched_ids for entry in ledger_entries)
    book_closing = None
    book_difference = None
    if statement.book_opening_balance is not None:
        book_movement = sum(
            (entry.debit - entry.credit for entry in ledger_entries),
            ZERO,
        )
        book_closing = statement.book_opening_balance + book_movement
        book_difference = statement.closing_balance - book_closing
    can_reconcile = (
        statement_difference == ZERO
        and statement.book_opening_balance is not None
        and book_difference == ZERO
        and unmatched_statement == 0
        and unmatched_ledger == 0
    )
    return {
        "statement_id": statement.id,
        "currency": statement.currency,
        "opening_balance": format(statement.opening_balance, ".2f"),
        "statement_movement": format(statement_movement, ".2f"),
        "calculated_closing_balance": format(
            statement.opening_balance + statement_movement, ".2f",
        ),
        "closing_balance": format(statement.closing_balance, ".2f"),
        "statement_difference": format(statement_difference, ".2f"),
        "book_opening_balance": (
            format(statement.book_opening_balance, ".2f")
            if statement.book_opening_balance is not None else None
        ),
        "posted_ledger_closing_balance": (
            format(book_closing, ".2f") if book_closing is not None else None
        ),
        "bank_less_ledger_difference": (
            format(book_difference, ".2f") if book_difference is not None else None
        ),
        "statement_line_count": len(statement_lines),
        "matched_statement_line_count": len(statement_lines) - unmatched_statement,
        "unmatched_statement_line_count": unmatched_statement,
        "posted_ledger_line_count": len(ledger_entries),
        "unmatched_posted_ledger_line_count": unmatched_ledger,
        "can_reconcile": can_reconcile,
    }
