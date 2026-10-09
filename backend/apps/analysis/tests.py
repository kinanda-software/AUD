from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.clients.models import Client
from apps.engagements.models import Engagement
from apps.financials.models import (
    ChartOfAccount,
    FinancialContact,
    FinancialDocument,
    FinancialDocumentLine,
)

from .services import (
    build_aging,
    build_stratification,
    draw_sample,
)


def _entry(pk, amount, day=None):
    return SimpleNamespace(
        id=pk,
        account=SimpleNamespace(
            account_code="1000",
            account_name="Cash",
        ),
        transaction_date=day or date(2026, 9, 15),
        reference=f"REF-{pk}",
        description=f"Entry {pk}",
        debit=amount,
        credit=Decimal("0.00"),
    )


class SamplingTests(TestCase):
    def setUp(self):
        self.population = [
            _entry(i, Decimal(100 * i))
            for i in range(1, 51)
        ]

    def test_random_sample_is_reproducible(self):
        first, _ = draw_sample(self.population, "random", 5, seed=42)
        second, _ = draw_sample(self.population, "random", 5, seed=42)
        self.assertEqual(
            [item["id"] for item in first],
            [item["id"] for item in second],
        )
        self.assertEqual(len(first), 5)

    def test_systematic_covers_population(self):
        items, interval = draw_sample(
            self.population, "systematic", 10, seed=7
        )
        self.assertEqual(len(items), 10)
        self.assertIsNotNone(interval)

    def test_mus_prefers_large_items(self):
        items, interval = draw_sample(
            self.population, "mus", 5, seed=11
        )
        self.assertTrue(items)
        self.assertIsNotNone(interval)
        # MUS over cumulative amounts picks proportionally
        # larger items — the smallest entry should not appear.
        ids = [item["id"] for item in items]
        self.assertNotIn(1, ids)


class StratificationTests(TestCase):
    def test_bands_and_concentration(self):
        user = get_user_model().objects.create_user(
            username="analyst", password="pass1234"
        )
        client_record = Client.objects.create(
            client_code="CL-AN", legal_name="Analysis Co"
        )
        engagement = Engagement.objects.create(
            engagement_code="ENG-AN",
            client=client_record,
            title="Analysis Engagement",
            start_date=date(2026, 1, 1),
        )
        account = ChartOfAccount.objects.create(
            engagement=engagement,
            account_code="1000",
            account_name="Cash",
            account_type="asset",
        )
        from apps.financials.models import GeneralLedger

        for index, amount in enumerate(
            [Decimal("500"), Decimal("50000"), Decimal("5000000")],
            start=1,
        ):
            GeneralLedger.objects.create(
                engagement=engagement,
                account=account,
                transaction_date=date(2026, 9, index),
                description=f"Entry {index}",
                debit=amount,
                credit=Decimal("0"),
                status=GeneralLedger.Status.POSTED,
            )

        result = build_stratification(engagement.id)

        self.assertEqual(result["population_count"], 3)
        self.assertEqual(result["bands"][0]["count"], 1)
        self.assertEqual(result["bands"][1]["count"], 1)
        self.assertEqual(result["bands"][2]["count"], 0)
        self.assertEqual(result["bands"][3]["count"], 1)
        self.assertGreater(
            result["top_10_concentration_percent"], 90
        )


class AgingTests(TestCase):
    def test_buckets_overdue_documents(self):
        client_record = Client.objects.create(
            client_code="CL-AGE", legal_name="Aging Co"
        )
        engagement = Engagement.objects.create(
            engagement_code="ENG-AGE",
            client=client_record,
            title="Aging Engagement",
            start_date=date(2026, 1, 1),
        )
        account = ChartOfAccount.objects.create(
            engagement=engagement,
            account_code="1200",
            account_name="Receivables",
            account_type="asset",
        )
        contact = FinancialContact.objects.create(
            engagement=engagement,
            kind="customer",
            name="Customer A",
        )

        as_of = date(2026, 10, 9)
        document = FinancialDocument.objects.create(
            engagement=engagement,
            kind="invoice",
            number="INV-1",
            contact=contact,
            transaction_date=as_of - timedelta(days=100),
            due_date=as_of - timedelta(days=70),
            currency="TZS",
            exchange_rate=Decimal("1"),
            control_account=account,
        )
        FinancialDocumentLine.objects.create(
            document=document,
            account=account,
            description="Sale",
            net_amount=Decimal("1000.00"),
            base_net=Decimal("1000.00"),
            base_tax=Decimal("0.00"),
        )

        result = build_aging(engagement.id, as_of, "receivable")

        self.assertEqual(result["total_outstanding"], 1000.0)
        self.assertEqual(result["documents"][0]["bucket"], "days_61_90")
        self.assertEqual(
            result["buckets"][3]["total"], 1000.0
        )
