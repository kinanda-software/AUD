from decimal import Decimal
from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone

from .engine import _extract_amount, _rule_matches
from .models import MonitoringRule


def _event(object_type="generalledger", action="created"):
    return SimpleNamespace(
        object_type=object_type,
        action=action,
        created_at=timezone.now(),
    )


class RuleEngineTests(TestCase):
    def test_large_amount_matches_above_threshold(self):
        rule = MonitoringRule(
            name="t",
            rule_type=MonitoringRule.RuleType.LARGE_AMOUNT,
            parameters={"threshold": 1000},
        )
        matched, evidence = _rule_matches(
            rule, _event(), {"debit": "5000.00", "credit": "0.00"}
        )
        self.assertTrue(matched)
        self.assertIn("threshold", evidence)

    def test_large_amount_ignores_small(self):
        rule = MonitoringRule(
            name="t",
            rule_type=MonitoringRule.RuleType.LARGE_AMOUNT,
            parameters={"threshold": 1000},
        )
        matched, _ = _rule_matches(
            rule, _event(), {"debit": "50.00", "credit": "0.00"}
        )
        self.assertFalse(matched)

    def test_round_number_matches(self):
        rule = MonitoringRule(
            name="t",
            rule_type=MonitoringRule.RuleType.ROUND_NUMBER,
            parameters={"min_amount": 1000},
        )
        matched, _ = _rule_matches(
            rule, _event(), {"amount": "250000.00"}
        )
        self.assertTrue(matched)

    def test_round_number_rejects_non_round(self):
        rule = MonitoringRule(
            name="t",
            rule_type=MonitoringRule.RuleType.ROUND_NUMBER,
            parameters={"min_amount": 1000},
        )
        matched, _ = _rule_matches(
            rule, _event(), {"amount": "250123.45"}
        )
        self.assertFalse(matched)

    def test_backdated_matches(self):
        rule = MonitoringRule(
            name="t",
            rule_type=MonitoringRule.RuleType.BACKDATED,
            parameters={"max_age_days": 30},
        )
        old_date = (
            timezone.now() - timezone.timedelta(days=90)
        ).date().isoformat()
        matched, evidence = _rule_matches(
            rule, _event(), {"transaction_date": old_date}
        )
        self.assertTrue(matched)
        self.assertIn("90", evidence)

    def test_amount_extraction(self):
        self.assertEqual(
            _extract_amount({"debit": "12.50", "credit": "0"}),
            Decimal("12.50"),
        )
        self.assertIsNone(_extract_amount({"description": "x"}))
