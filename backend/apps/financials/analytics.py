from collections import defaultdict
from decimal import Decimal


ZERO = Decimal("0.00")


def _money(value):
    return format(value, ".2f")


def build_financial_analysis(
    trial_balance,
    current_lines,
    comparison,
    comparison_lines,
    ledger_entries,
    journal_entries,
    amount_threshold,
    percent_threshold,
    reconcile_ledger,
):
    """Build read-only, explainable review candidates from financial records."""
    current = {line.account_id: line for line in current_lines}
    previous = {line.account_id: line for line in comparison_lines}
    entries_by_account = defaultdict(lambda: ZERO)
    duplicate_groups = defaultdict(list)
    findings = []

    def add_finding(
        rule, severity, message, account=None, amount=None, entry_ids=None,
        journal_entry_ids=None,
    ):
        findings.append({
            "rule": rule,
            "severity": severity,
            "message": message,
            "account_id": account.id if account else None,
            "account_code": account.account_code if account else None,
            "amount": _money(amount) if amount is not None else None,
            "ledger_entry_ids": entry_ids or [],
            "journal_entry_ids": journal_entry_ids or [],
        })

    total_debit = sum((line.debit for line in current_lines), ZERO)
    total_credit = sum((line.credit for line in current_lines), ZERO)
    if not current_lines:
        add_finding("empty_trial_balance", "high", "No trial balance lines are available.")
    if total_debit != total_credit:
        add_finding(
            "unbalanced_trial_balance",
            "high",
            "Trial balance debits and credits do not agree.",
            amount=total_debit - total_credit,
        )

    for entry in ledger_entries:
        entries_by_account[entry.account_id] += entry.debit - entry.credit
        reference = entry.reference.strip().casefold()
        if reference:
            signature = (
                entry.account_id,
                entry.transaction_date,
                reference,
                entry.debit,
                entry.credit,
                entry.description.strip().casefold(),
                entry.source,
            )
            duplicate_groups[signature].append(entry)
        if (
            amount_threshold > ZERO
            and entry.source == "manual"
            and max(entry.debit, entry.credit) >= amount_threshold
        ):
            add_finding(
                "large_manual_ledger_entry",
                "medium",
                "Manual posted ledger entry meets the review threshold; inspect its source and support.",
                entry.account,
                max(entry.debit, entry.credit),
                [entry.id],
            )

    for group in duplicate_groups.values():
        if len(group) > 1:
            entry = group[0]
            add_finding(
                "potential_duplicate_ledger_lines",
                "medium",
                "Posted ledger lines share account, date, reference, description, source and amounts. "
                "Legitimate repeated entries are possible; verify before changing records.",
                entry.account,
                max(entry.debit, entry.credit),
                [item.id for item in group],
            )

    for journal in journal_entries:
        if (
            journal.source == "manual"
            and amount_threshold > ZERO
            and journal.total_debit >= amount_threshold
        ):
            add_finding(
                "large_manual_journal",
                "medium",
                "Posted manual journal meets the review threshold; inspect purpose, authorization and supporting evidence.",
                amount=journal.total_debit,
                journal_entry_ids=[journal.id],
            )

        if journal.source != "manual" or not journal.reference.strip():
            continue
        lines_signature = tuple(sorted(
            (line.account_id, line.debit, line.credit)
            for line in journal.lines.all()
        ))
        signature = (
            journal.transaction_date,
            journal.reference.strip().casefold(),
            journal.description.strip().casefold(),
            journal.source,
            journal.total_debit,
            journal.total_credit,
            lines_signature,
        )
        duplicate_groups[("journal", *signature)].append(journal)

    for key, group in duplicate_groups.items():
        if key[0] == "journal" and len(group) > 1:
            journal = group[0]
            add_finding(
                "potential_duplicate_manual_journals",
                "medium",
                "Posted manual journals share date, reference, description, totals and account-line amounts. "
                "Legitimate repeated journals are possible; verify before changing records.",
                amount=journal.total_debit,
                journal_entry_ids=[item.id for item in group],
            )

    account_ids = set(current) | set(previous)
    if reconcile_ledger:
        account_ids |= set(entries_by_account)
    ledger_accounts = {entry.account_id: entry.account for entry in ledger_entries}
    rows = []
    for account_id in account_ids:
        line = current.get(account_id)
        old_line = previous.get(account_id)
        account = (
            line.account if line else old_line.account if old_line
            else ledger_accounts[account_id]
        )
        balance = line.debit - line.credit if line else ZERO
        prior_balance = old_line.debit - old_line.credit if old_line else ZERO
        movement = balance - prior_balance
        percentage = (
            movement / abs(prior_balance) * 100
            if prior_balance != ZERO else None
        )
        row = {
            "account_id": account_id,
            "account_code": account.account_code,
            "account_name": account.account_name,
            "account_type": account.account_type,
            "current_balance": _money(balance),
            "comparison_balance": _money(prior_balance) if comparison else None,
            "movement": _money(movement) if comparison else None,
            "movement_percent": _money(percentage) if percentage is not None else None,
            "presence": (
                "both" if line and old_line
                else "current_only" if line else "comparison_only"
            ) if comparison else "current_only",
            "ledger_net": _money(entries_by_account[account_id]) if reconcile_ledger else None,
            "ledger_difference": (
                _money(balance - entries_by_account[account_id])
                if reconcile_ledger else None
            ),
        }
        rows.append(row)

        debit_normal = account.account_type in ("asset", "expense")
        credit_normal = account.account_type in ("liability", "equity", "revenue")
        if abs(balance) >= amount_threshold and balance != ZERO and (
            (debit_normal and balance < ZERO)
            or (credit_normal and balance > ZERO)
        ):
            add_finding(
                "unexpected_balance_side",
                "medium",
                "Balance is opposite the usual side for this account type. Contra accounts may legitimately have this balance.",
                account,
                balance,
            )

        if comparison and movement != ZERO and abs(movement) >= amount_threshold:
            if prior_balance == ZERO:
                add_finding(
                    "new_nonzero_balance",
                    "medium",
                    "Account has a nonzero current balance against a zero or absent comparison balance.",
                    account,
                    movement,
                )
            elif percentage is not None and abs(percentage) >= percent_threshold:
                add_finding(
                    "large_period_movement",
                    "medium",
                    f"Movement meets both configured thresholds ({_money(percentage)}%). "
                    "Check period lengths and the account explanation.",
                    account,
                    movement,
                )

        if (
            reconcile_ledger
            and balance != entries_by_account[account_id]
        ):
            add_finding(
                "trial_balance_ledger_difference",
                "high",
                "Original TB net balance differs from posted period ledger net activity. "
                "Check opening balances, completeness and posted adjustments.",
                account,
                balance - entries_by_account[account_id],
            )

    rows.sort(key=lambda row: (row["account_code"], row["account_id"]))
    findings.sort(key=lambda item: (
        0 if item["severity"] == "high" else 1,
        item["rule"],
        item["account_code"] or "",
    ))
    return {
        "trial_balance_id": trial_balance.id,
        "comparison_id": comparison.id if comparison else None,
        "currency": trial_balance.currency,
        "period_start": trial_balance.period_start.isoformat(),
        "period_end": trial_balance.period_end.isoformat(),
        "comparison_period_start": comparison.period_start.isoformat() if comparison else None,
        "comparison_period_end": comparison.period_end.isoformat() if comparison else None,
        "amount_threshold": _money(amount_threshold),
        "percent_threshold": _money(percent_threshold),
        "reconcile_ledger": reconcile_ledger,
        "total_debit": _money(total_debit),
        "total_credit": _money(total_credit),
        "difference": _money(total_debit - total_credit),
        "ledger_entry_count": len(ledger_entries),
        "journal_entry_count": len(journal_entries),
        "accounts": rows,
        "findings": findings,
        "summary": {
            "account_count": len(rows),
            "finding_count": len(findings),
            "high_count": sum(finding["severity"] == "high" for finding in findings),
            "medium_count": sum(finding["severity"] == "medium" for finding in findings),
        },
        "limitations": [
            "Automated rules identify review candidates, not confirmed errors, fraud or an audit opinion.",
            "Positive net balances are debit balances; negative balances are credit balances.",
            "Contra accounts and legitimate repeated postings may be flagged and require professional judgment.",
            "Only posted ledger and journal entries within the selected trial-balance period are inspected.",
            "Ledger rows do not contain currency. Confirm that ledger amounts use the trial-balance currency.",
            "Period lengths are not normalized in movement percentages.",
            "TB-to-ledger comparison is opt-in because a closing trial balance may include opening balances absent from period movements.",
            "Analysis is calculated on demand; exported results are not persisted reviewer sign-off.",
        ],
    }
