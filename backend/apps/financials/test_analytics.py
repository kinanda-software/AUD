from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest import TestCase

from .analytics import build_financial_analysis


def make_account(id=1, account_type="asset"):
    return SimpleNamespace(
        id=id,
        account_code=str(id),
        account_name=f"Account {id}",
        account_type=account_type,
    )


def make_line(account, balance):
    balance = Decimal(balance)
    return SimpleNamespace(
        account_id=account.id,
        account=account,
        debit=max(balance, Decimal("0.00")),
        credit=max(-balance, Decimal("0.00")),
    )


def make_ledger_entry(
    account, balance, id=1, reference="REF", source="import",
):
    return SimpleNamespace(
        **vars(make_line(account, balance)),
        id=id,
        reference=reference,
        transaction_date=date(2026, 6, 1),
        description="Payment",
        source=source,
    )


def make_journal_entry(
    account, balance="100", id=1, reference="REF", source="manual",
):
    line = make_line(account, balance)
    return SimpleNamespace(
        id=id,
        source=source,
        reference=reference,
        description="Accrual",
        transaction_date=date(2026, 6, 1),
        total_debit=line.debit,
        total_credit=line.credit,
        lines=SimpleNamespace(all=lambda: [line]),
    )


class FinancialAnalysisTests(TestCase):
    def analyze(self, current=(), previous=None, ledger=(), journals=(), **overrides):
        trial_balance = SimpleNamespace(
            id=1,
            currency="TZS",
            period_start=date(2026, 1, 1),
            period_end=date(2026, 12, 31),
        )
        comparison = (
            SimpleNamespace(
                id=2,
                period_start=date(2025, 1, 1),
                period_end=date(2025, 12, 31),
            )
            if previous is not None else None
        )
        options = {
            "amount_threshold": Decimal("0.00"),
            "percent_threshold": Decimal("25.00"),
            "reconcile_ledger": False,
            **overrides,
        }
        return build_financial_analysis(
            trial_balance,
            list(current),
            comparison,
            list(previous or ()),
            list(ledger),
            list(journals),
            **options,
        )

    def rules(self, result):
        return [finding["rule"] for finding in result["findings"]]

    def test_decimal_precision_and_balanced_trial_balance(self):
        result = self.analyze([
            make_line(make_account(), "9999999999999999.99"),
            make_line(make_account(2, "equity"), "-9999999999999999.99"),
        ])
        self.assertEqual(result["total_debit"], "9999999999999999.99")
        self.assertEqual(result["difference"], "0.00")
        self.assertEqual(result["summary"]["finding_count"], 0)

    def test_empty_and_unbalanced_trial_balances_are_reported(self):
        self.assertIn("empty_trial_balance", self.rules(self.analyze()))
        result = self.analyze([make_line(make_account(), "42.50")])
        self.assertIn("unbalanced_trial_balance", self.rules(result))
        self.assertEqual(result["difference"], "42.50")

    def test_movement_requires_both_thresholds(self):
        account = make_account()
        result = self.analyze(
            [make_line(account, "125")],
            [make_line(account, "100")],
            amount_threshold=Decimal("25"),
            percent_threshold=Decimal("25"),
        )
        self.assertIn("large_period_movement", self.rules(result))
        self.assertEqual(result["accounts"][0]["movement_percent"], "25.00")
        result = self.analyze(
            [make_line(account, "125")],
            [make_line(account, "100")],
            amount_threshold=Decimal("25.01"),
        )
        self.assertNotIn("large_period_movement", self.rules(result))

    def test_new_and_removed_account_presence(self):
        result = self.analyze(
            [make_line(make_account(1), "10")],
            [make_line(make_account(2), "20")],
        )
        self.assertEqual(result["accounts"][0]["presence"], "current_only")
        self.assertEqual(result["accounts"][1]["presence"], "comparison_only")
        self.assertIn("new_nonzero_balance", self.rules(result))
        self.assertEqual(result["accounts"][0]["movement_percent"], None)
        self.assertEqual(result["accounts"][1]["movement_percent"], "-100.00")

    def test_credit_movement_uses_absolute_prior_denominator(self):
        account = make_account(account_type="revenue")
        result = self.analyze(
            [make_line(account, "-125")],
            [make_line(account, "-100")],
        )
        self.assertEqual(result["accounts"][0]["movement_percent"], "-25.00")

    def test_unexpected_balance_side_respects_amount_threshold(self):
        account = make_account()
        result = self.analyze(
            [make_line(account, "-10")],
            amount_threshold=Decimal("10"),
        )
        self.assertIn("unexpected_balance_side", self.rules(result))
        result = self.analyze(
            [make_line(account, "-10")],
            amount_threshold=Decimal("10.01"),
        )
        self.assertNotIn("unexpected_balance_side", self.rules(result))

    def test_potential_ledger_duplicates_require_a_reference_and_full_signature(self):
        account = make_account()
        result = self.analyze(ledger=[
            make_ledger_entry(account, "10", id=1),
            make_ledger_entry(account, "10", id=2, reference=" ref "),
            make_ledger_entry(account, "10", id=3, reference=""),
            make_ledger_entry(account, "10", id=4, reference=" "),
            make_ledger_entry(account, "11", id=5),
        ])
        findings = [
            finding for finding in result["findings"]
            if finding["rule"] == "potential_duplicate_ledger_lines"
        ]
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["ledger_entry_ids"], [1, 2])

    def test_manual_journal_screening_and_duplicate_signature(self):
        account = make_account()
        journals = [
            make_journal_entry(account, id=1),
            make_journal_entry(account, id=2),
        ]
        result = self.analyze(
            journals=journals,
            amount_threshold=Decimal("100"),
        )
        self.assertIn("large_manual_journal", self.rules(result))
        duplicate = next(
            finding for finding in result["findings"]
            if finding["rule"] == "potential_duplicate_manual_journals"
        )
        self.assertEqual(duplicate["journal_entry_ids"], [1, 2])

    def test_zero_threshold_disables_manual_entry_checks(self):
        account = make_account()
        result = self.analyze(
            ledger=[make_ledger_entry(account, "100", source="manual")],
            journals=[make_journal_entry(account)],
        )
        self.assertNotIn("large_manual_ledger_entry", self.rules(result))
        self.assertNotIn("large_manual_journal", self.rules(result))

    def test_ledger_comparison_is_opt_in_and_includes_ledger_only_accounts(self):
        tb_account = make_account()
        ledger_account = make_account(2)
        ledger = [make_ledger_entry(ledger_account, "10")]
        result = self.analyze([make_line(tb_account, "10")], ledger=ledger)
        self.assertNotIn("trial_balance_ledger_difference", self.rules(result))
        result = self.analyze(
            [make_line(tb_account, "10")],
            ledger=ledger,
            reconcile_ledger=True,
        )
        self.assertEqual(len(result["accounts"]), 2)
        self.assertEqual(
            self.rules(result).count("trial_balance_ledger_difference"), 2,
        )

    def test_matching_ledger_net_has_no_difference(self):
        account = make_account()
        result = self.analyze(
            current=[make_line(account, "0.30")],
            ledger=[
                make_ledger_entry(account, "0.10", id=1),
                make_ledger_entry(account, "0.20", id=2),
            ],
            reconcile_ledger=True,
        )
        self.assertNotIn("trial_balance_ledger_difference", self.rules(result))
        self.assertEqual(result["accounts"][0]["ledger_difference"], "0.00")

    def test_comparison_is_not_fabricated_when_omitted(self):
        result = self.analyze([make_line(make_account(), "10")])
        account = result["accounts"][0]
        self.assertIsNone(result["comparison_id"])
        self.assertIsNone(account["comparison_balance"])
        self.assertIsNone(account["movement"])
        self.assertNotIn("new_nonzero_balance", self.rules(result))
