from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest import TestCase

from rest_framework.exceptions import ValidationError

from .workflow_services import (
    build_bank_match_candidates,
    build_bank_reconciliation_summary,
    build_budget_actuals,
    parse_statement_csv,
)


class Upload:
    def __init__(self, content):
        self.content = content
        self.size = len(content)
        self.name = "statement.csv"

    def read(self):
        return self.content


class FinancialWorkflowServiceTests(TestCase):
    def test_statement_csv_parses_signed_amounts_and_utf8_bom(self):
        statement = SimpleNamespace(
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
        )
        rows = parse_statement_csv(
            Upload(
                b"\xef\xbb\xbfdate,description,reference,amount\n"
                b"2026-01-03,Customer receipt,R-1,100.25\n"
                b"2026-01-04,Bank charge,F-2,-5.00\n"
            ),
            statement,
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["amount"], Decimal("100.25"))
        self.assertEqual(rows[1]["amount"], Decimal("-5.00"))
        self.assertEqual(rows[1]["row_number"], 3)

    def test_statement_csv_rejects_bad_columns_dates_amounts_and_periods(self):
        statement = SimpleNamespace(
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
        )
        invalid_files = [
            b"date,description,reference\n2026-01-01,Payment,R1\n",
            b"date,date,description,reference,amount\n2026-01-01,2026-01-01,Payment,R1,2\n",
            b"date,description,reference,amount\nnot-a-date,Payment,R1,2\n",
            b"date,description,reference,amount\n2026-01-01,Payment,R1,NaN\n",
            b"date,description,reference,amount\n2026-01-01,Payment,R1,1.234\n",
            b"date,description,reference,amount\n2026-02-01,Payment,R1,2\n",
            b"date,description,reference,amount\n2026-01-01,Payment,R1,0\n",
        ]
        for content in invalid_files:
            with self.subTest(content=content):
                with self.assertRaises(ValidationError):
                    parse_statement_csv(Upload(content), statement)

    def test_statement_csv_enforces_size_and_nonempty_rows(self):
        statement = SimpleNamespace(
            period_start=date(2026, 1, 1),
            period_end=date(2026, 1, 31),
        )
        too_large = Upload(b"date,description,reference,amount\n")
        too_large.size = 10 * 1024 * 1024 + 1
        with self.assertRaises(ValidationError):
            parse_statement_csv(too_large, statement)
        with self.assertRaises(ValidationError):
            parse_statement_csv(
                Upload(b"date,description,reference,amount\n"),
                statement,
            )

    def test_reconciliation_requires_complete_matches_and_zero_differences(self):
        statement = SimpleNamespace(
            id=1,
            currency="TZS",
            opening_balance=Decimal("100.00"),
            closing_balance=Decimal("150.00"),
            book_opening_balance=Decimal("100.00"),
        )
        statement_line = SimpleNamespace(
            amount=Decimal("50.00"),
            matched_entry_id=10,
        )
        ledger_entry = SimpleNamespace(
            id=10,
            debit=Decimal("50.00"),
            credit=Decimal("0.00"),
        )
        result = build_bank_reconciliation_summary(
            statement, [statement_line], [ledger_entry], {10},
        )
        self.assertTrue(result["can_reconcile"])
        self.assertEqual(result["statement_difference"], "0.00")
        self.assertEqual(result["bank_less_ledger_difference"], "0.00")

    def test_reconciliation_exposes_unmatched_and_missing_book_opening(self):
        statement = SimpleNamespace(
            id=1,
            currency="TZS",
            opening_balance=Decimal("100.00"),
            closing_balance=Decimal("150.00"),
            book_opening_balance=None,
        )
        statement_line = SimpleNamespace(
            amount=Decimal("50.00"),
            matched_entry_id=None,
        )
        ledger_entry = SimpleNamespace(
            id=10,
            debit=Decimal("50.00"),
            credit=Decimal("0.00"),
        )
        result = build_bank_reconciliation_summary(
            statement, [statement_line], [ledger_entry], set(),
        )
        self.assertFalse(result["can_reconcile"])
        self.assertEqual(result["unmatched_statement_line_count"], 1)
        self.assertEqual(result["unmatched_posted_ledger_line_count"], 1)
        self.assertIsNone(result["bank_less_ledger_difference"])

    def test_bank_match_candidates_rank_exact_and_near_date_matches(self):
        statement_lines = [
            SimpleNamespace(
                id=1,
                matched_entry_id=None,
                transaction_date=date(2026, 1, 10),
                reference="PAY-102",
                description="Supplier payment",
                amount=Decimal("-50.00"),
            ),
        ]
        ledger_entries = [
            SimpleNamespace(
                id=8,
                transaction_date=date(2026, 1, 12),
                reference="PAY 102",
                description="Supplier payment",
                debit=Decimal("0.00"),
                credit=Decimal("50.00"),
            ),
            SimpleNamespace(
                id=9,
                transaction_date=date(2026, 1, 10),
                reference="UNRELATED",
                description="Different transaction",
                debit=Decimal("0.00"),
                credit=Decimal("50.00"),
            ),
            SimpleNamespace(
                id=10,
                transaction_date=date(2026, 1, 14),
                reference="PAY-102",
                description="Supplier payment",
                debit=Decimal("0.00"),
                credit=Decimal("50.00"),
            ),
        ]

        result = build_bank_match_candidates(statement_lines, ledger_entries, set())

        self.assertEqual(
            [candidate["id"] for candidate in result[0]["candidates"]],
            [9, 8],
        )
        self.assertEqual(result[0]["candidates"][0]["match_type"], "exact")
        self.assertIn("Exact signed amount", result[0]["candidates"][0]["match_reasons"])
        self.assertEqual(result[0]["candidates"][1]["match_type"], "near_date")
        self.assertIn("Reference matches", result[0]["candidates"][1]["match_reasons"])

    def test_bank_match_candidates_exclude_used_amount_and_distant_entries(self):
        statement_lines = [
            SimpleNamespace(
                id=1,
                matched_entry_id=None,
                transaction_date=date(2026, 1, 10),
                reference="",
                description="Deposit",
                amount=Decimal("50.00"),
            ),
        ]
        ledger_entries = [
            SimpleNamespace(
                id=8,
                transaction_date=date(2026, 1, 13),
                reference="",
                description="Deposit",
                debit=Decimal("50.00"),
                credit=Decimal("0.00"),
            ),
            SimpleNamespace(
                id=9,
                transaction_date=date(2026, 1, 14),
                reference="",
                description="Deposit",
                debit=Decimal("50.00"),
                credit=Decimal("0.00"),
            ),
        ]

        result = build_bank_match_candidates(statement_lines, ledger_entries, {8})

        self.assertEqual(
            [candidate["id"] for candidate in result[0]["candidates"]],
            [],
        )

    def test_budget_actuals_use_posted_statement_signs_and_variance_rules(self):
        revenue = SimpleNamespace(
            id=1, account_code="400", account_name="Revenue", account_type="revenue",
        )
        expense = SimpleNamespace(
            id=2, account_code="500", account_name="Expense", account_type="expense",
        )
        budget = SimpleNamespace(
            id=4, engagement_id=8, name="Operating", fiscal_year=2026, currency="TZS",
        )
        budget_lines = [
            SimpleNamespace(account_id=1, account=revenue, period=date(2026, 1, 1), amount=Decimal("90")),
            SimpleNamespace(account_id=2, account=expense, period=date(2026, 1, 1), amount=Decimal("100")),
        ]
        entries = [
            SimpleNamespace(account=revenue, transaction_date=date(2026, 1, 5), debit=Decimal("0"), credit=Decimal("100")),
            SimpleNamespace(account=expense, transaction_date=date(2026, 1, 7), debit=Decimal("130"), credit=Decimal("0")),
        ]
        report = build_budget_actuals(budget, budget_lines, entries)
        self.assertEqual(report["accounts"][0]["annual_variance"], "10.00")
        self.assertTrue(report["accounts"][0]["annual_favorable"])
        self.assertEqual(report["accounts"][1]["annual_variance"], "30.00")
        self.assertFalse(report["accounts"][1]["annual_favorable"])
        self.assertEqual(report["accounts"][0]["months"][0]["actual"], "100.00")
        self.assertEqual(len(report["accounts"][0]["months"]), 12)

    def test_budget_actuals_match_exact_dimension_combinations(self):
        revenue = SimpleNamespace(
            id=1, account_code="400", account_name="Revenue", account_type="revenue",
        )
        north = SimpleNamespace(id=11, dimension_type="location", name="North")
        project = SimpleNamespace(id=21, dimension_type="project", name="Project A")
        budget = SimpleNamespace(
            id=4, engagement_id=8, name="Operating", fiscal_year=2026, currency="TZS",
        )
        budget_lines = [
            SimpleNamespace(
                account_id=1,
                account=revenue,
                period=date(2026, 1, 1),
                amount=Decimal("100"),
                dimensions=SimpleNamespace(all=lambda: [north, project]),
            ),
            SimpleNamespace(
                account_id=1,
                account=revenue,
                period=date(2026, 1, 1),
                amount=Decimal("50"),
                dimensions=SimpleNamespace(all=lambda: [north]),
            ),
        ]
        entries = [
            SimpleNamespace(
                account=revenue,
                transaction_date=date(2026, 1, 5),
                debit=Decimal("0"),
                credit=Decimal("120"),
                dimensions=SimpleNamespace(all=lambda: [project, north]),
            ),
            SimpleNamespace(
                account=revenue,
                transaction_date=date(2026, 1, 7),
                debit=Decimal("0"),
                credit=Decimal("65"),
                dimensions=SimpleNamespace(all=lambda: [north]),
            ),
        ]

        report = build_budget_actuals(budget, budget_lines, entries)

        self.assertEqual(len(report["accounts"]), 2)
        project_row = next(
            row for row in report["accounts"]
            if len(row["dimensions"]) == 2
        )
        location_row = next(
            row for row in report["accounts"]
            if len(row["dimensions"]) == 1
        )
        self.assertEqual(project_row["annual_variance"], "20.00")
        self.assertEqual(location_row["annual_variance"], "15.00")
