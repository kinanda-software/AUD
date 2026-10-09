"""
Read-only audit analytics over existing financial data:
Benford's Law, stratification, aging, and audit sampling.
No source records are ever modified.
"""

import math
import random
from datetime import date
from decimal import Decimal

from apps.financials.models import (
    FinancialDocument,
    GeneralLedger,
)

ZERO = Decimal("0.00")

BENFORD_EXPECTED = {
    digit: math.log10(1 + 1 / digit)
    for digit in range(1, 10)
}

DEFAULT_BANDS = [
    (ZERO, Decimal("10000"), "Up to 10K"),
    (Decimal("10000"), Decimal("100000"), "10K – 100K"),
    (Decimal("100000"), Decimal("1000000"), "100K – 1M"),
    (Decimal("1000000"), Decimal("10000000"), "1M – 10M"),
    (Decimal("10000000"), None, "Over 10M"),
]


def _posted_ledger(engagement_id, account_id=None):
    queryset = (
        GeneralLedger.objects
        .select_related("account")
        .filter(
            engagement_id=engagement_id,
            status=GeneralLedger.Status.POSTED,
        )
        .order_by("id")
    )
    if account_id:
        queryset = queryset.filter(account_id=account_id)
    return queryset


def _entry_amount(entry):
    return max(entry.debit, entry.credit)


# ============================================================
# BENFORD'S LAW
# ============================================================

def build_benford_analysis(engagement_id, account_id=None):
    """
    First-digit distribution of posted ledger amounts against
    Benford's expected frequencies, with chi-square and MAD
    conformity statistics.
    """
    amounts = [
        _entry_amount(entry)
        for entry in _posted_ledger(engagement_id, account_id)
    ]
    amounts = [a for a in amounts if a > ZERO]

    population = len(amounts)
    counts = {digit: 0 for digit in range(1, 10)}
    for amount in amounts:
        first = str(amount.normalize())[
            0
        ] if amount == amount.to_integral_value() else None
        if first is None:
            normalized = f"{amount:.2f}".lstrip("0.")
            first = normalized[0] if normalized else "0"
        if first in "123456789":
            counts[int(first)] += 1

    digits = []
    chi_square = 0.0
    mad_sum = 0.0
    for digit in range(1, 10):
        observed = counts[digit] / population if population else 0.0
        expected = BENFORD_EXPECTED[digit]
        if expected:
            chi_square += (
                population * (observed - expected) ** 2 / expected
            )
        mad_sum += abs(observed - expected)
        digits.append({
            "digit": digit,
            "count": counts[digit],
            "observed_percent": round(observed * 100, 2),
            "expected_percent": round(expected * 100, 2),
        })

    mad = mad_sum / 9
    if population < 100:
        verdict = "Population too small for a reliable conclusion"
    elif mad < 0.006:
        verdict = "Close conformity"
    elif mad < 0.012:
        verdict = "Acceptable conformity"
    elif mad < 0.015:
        verdict = "Marginal conformity — review digits above expectation"
    else:
        verdict = "Nonconformity — investigate the digit distribution"

    return {
        "population": population,
        "digits": digits,
        "chi_square": round(chi_square, 1),
        "mad": round(mad, 5),
        "verdict": verdict,
    }


# ============================================================
# STRATIFICATION
# ============================================================

def build_stratification(engagement_id, account_id=None):
    """
    Amount-band profile of the posted ledger population,
    plus top-10 concentration.
    """
    entries = list(_posted_ledger(engagement_id, account_id))
    total_value = sum(
        (_entry_amount(entry) for entry in entries), ZERO
    )
    total_count = len(entries)

    bands = []
    for lower, upper, label in DEFAULT_BANDS:
        members = [
            entry for entry in entries
            if _entry_amount(entry) >= lower
            and (upper is None or _entry_amount(entry) < upper)
        ]
        band_value = sum(
            (_entry_amount(entry) for entry in members), ZERO
        )
        bands.append({
            "label": label,
            "count": len(members),
            "total": float(band_value),
            "percent_of_value": (
                round(float(band_value / total_value * 100), 1)
                if total_value > 0 else 0.0
            ),
            "percent_of_count": (
                round(len(members) / total_count * 100, 1)
                if total_count else 0.0
            ),
        })

    top_entries = sorted(
        entries, key=_entry_amount, reverse=True
    )[:10]
    top_value = sum(
        (_entry_amount(entry) for entry in top_entries), ZERO
    )

    return {
        "population_count": total_count,
        "population_value": float(total_value),
        "bands": bands,
        "top_10_concentration_percent": (
            round(float(top_value / total_value * 100), 1)
            if total_value > 0 else 0.0
        ),
        "top_10": [
            {
                "id": entry.id,
                "account_code": entry.account.account_code,
                "transaction_date": entry.transaction_date.isoformat(),
                "reference": entry.reference,
                "description": entry.description[:80],
                "amount": float(_entry_amount(entry)),
            }
            for entry in top_entries
        ],
    }


# ============================================================
# AGING (AR / AP)
# ============================================================

RECEIVABLE_KINDS = (
    FinancialDocument.Kind.INVOICE,
    FinancialDocument.Kind.SALES_CREDIT,
)

PAYABLE_KINDS = (
    FinancialDocument.Kind.BILL,
    FinancialDocument.Kind.PURCHASE_CREDIT,
)

BUCKETS = (
    ("current", "Not yet due"),
    ("days_1_30", "1–30 days overdue"),
    ("days_31_60", "31–60 days overdue"),
    ("days_61_90", "61–90 days overdue"),
    ("over_90", "Over 90 days overdue"),
)


def build_aging(engagement_id, as_of: date, side="receivable"):
    """
    Outstanding-document aging. Outstanding = document base
    total minus payments dated on or before `as_of`.
    """
    kinds = RECEIVABLE_KINDS if side == "receivable" else PAYABLE_KINDS

    documents = (
        FinancialDocument.objects
        .select_related("contact")
        .prefetch_related("lines", "payments")
        .filter(engagement_id=engagement_id, kind__in=kinds)
    )

    totals = {key: ZERO for key, _ in BUCKETS}
    rows = []

    for document in documents:
        total = sum(
            (line.base_net + line.base_tax for line in document.lines.all()),
            ZERO,
        )
        # Credit notes reduce the balance.
        if document.kind in (
            FinancialDocument.Kind.SALES_CREDIT,
            FinancialDocument.Kind.PURCHASE_CREDIT,
        ):
            total = -total

        paid = sum(
            (
                payment.base_amount
                for payment in document.payments.all()
                if payment.transaction_date <= as_of
            ),
            ZERO,
        )
        outstanding = total - paid
        if outstanding <= ZERO:
            continue

        days_overdue = (as_of - document.due_date).days
        if days_overdue <= 0:
            bucket = "current"
        elif days_overdue <= 30:
            bucket = "days_1_30"
        elif days_overdue <= 60:
            bucket = "days_31_60"
        elif days_overdue <= 90:
            bucket = "days_61_90"
        else:
            bucket = "over_90"

        totals[bucket] += outstanding
        rows.append({
            "document_id": document.id,
            "number": document.number,
            "contact": document.contact.name,
            "transaction_date": document.transaction_date.isoformat(),
            "due_date": document.due_date.isoformat(),
            "days_overdue": max(days_overdue, 0),
            "outstanding": float(outstanding),
            "bucket": bucket,
        })

    rows.sort(key=lambda row: row["outstanding"], reverse=True)

    grand_total = sum(totals.values(), ZERO)
    return {
        "side": side,
        "as_of": as_of.isoformat(),
        "total_outstanding": float(grand_total),
        "buckets": [
            {
                "key": key,
                "label": label,
                "total": float(totals[key]),
                "percent": (
                    round(float(totals[key] / grand_total * 100), 1)
                    if grand_total > 0 else 0.0
                ),
            }
            for key, label in BUCKETS
        ],
        "documents": rows[:200],
    }


# ============================================================
# SAMPLING (random / systematic / monetary-unit)
# ============================================================

def draw_sample(population, method, sample_size, seed):
    """
    Draw a reproducible sample from posted ledger entries.

    Returns (items, interval). Population entries must each
    expose id/account/transaction_date/reference/description/
    debit/credit (GeneralLedger rows).
    """
    rng = random.Random(seed)
    interval = None

    if method == "random":
        chosen = rng.sample(
            population, min(sample_size, len(population))
        )

    elif method == "systematic":
        if not population:
            chosen = []
        else:
            interval = Decimal(len(population)) / Decimal(
                max(sample_size, 1)
            )
            start = rng.uniform(0, float(interval))
            indices = []
            position = start
            while position < len(population) and len(indices) < sample_size:
                indices.append(int(position))
                position += float(interval)
            chosen = [population[i] for i in indices]

    elif method == "mus":
        total_value = sum(
            (_entry_amount(entry) for entry in population), ZERO
        )
        if total_value <= ZERO:
            chosen = []
        else:
            interval = (total_value / max(sample_size, 1)).quantize(
                Decimal("0.01")
            )
            position = Decimal(str(rng.uniform(0, float(interval))))
            chosen = []
            cumulative = ZERO
            for entry in population:
                cumulative += _entry_amount(entry)
                while (
                    position <= cumulative
                    and len(chosen) < sample_size
                    and entry not in chosen
                ):
                    chosen.append(entry)
                    position += interval
    else:
        raise ValueError(f"Unknown sampling method: {method}")

    items = [
        {
            "id": entry.id,
            "account_code": entry.account.account_code,
            "account_name": entry.account.account_name,
            "transaction_date": entry.transaction_date.isoformat(),
            "reference": entry.reference,
            "description": entry.description[:120],
            "debit": float(entry.debit),
            "credit": float(entry.credit),
            "amount": float(_entry_amount(entry)),
        }
        for entry in chosen
    ]
    return items, interval
