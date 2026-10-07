import hashlib
import json
from collections import defaultdict
from datetime import date
from decimal import Decimal, localcontext

from django.db.models import Prefetch
from rest_framework.exceptions import ValidationError

from .accounting_controls import locked_policy
from .models import FinancialIntelligenceRun, JournalEntry, JournalLine
from .workflow_services import record_financial_event


VERSION = "journal-screen-v1"
MAX_JOURNALS = 10000
MAX_LINES = 50000
RULES = (
    "large_journal", "weekend_date", "round_amount", "missing_preparer",
    "missing_recorded_approval", "self_approval", "potential_duplicate",
    "unbalanced_journal", "incomplete_ledger_provenance",
)
ZERO = Decimal("0.00")


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def fingerprint(value):
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def journal_snapshot(journal):
    lines = []
    for line in journal.lines.all():
        if line.account.engagement_id != journal.engagement_id:
            raise ValidationError("A scoped journal contains an account from another engagement. Correct its provenance before saving a run.")
        dimensions = sorted(line.dimensions.all(), key=lambda dimension: dimension.pk)
        if any(dimension.engagement_id != journal.engagement_id for dimension in dimensions):
            raise ValidationError("A scoped journal contains a dimension from another engagement. Correct it before saving a run.")
        ledger = getattr(line, "ledger_entry", None)
        consistent = bool(
            ledger and ledger.status == "posted" and ledger.engagement_id == journal.engagement_id
            and ledger.account_id == line.account_id and ledger.transaction_date == journal.transaction_date
            and ledger.debit == line.debit and ledger.credit == line.credit
        )
        lines.append({
            "id": line.pk, "account": line.account_id, "account_code": line.account.account_code,
            "account_name": line.account.account_name, "account_type": line.account.account_type,
            "account_engagement": line.account.engagement_id,
            "debit": format(line.debit, ".2f"), "credit": format(line.credit, ".2f"),
            "dimensions": [{
                "id": dimension.pk, "name": dimension.name, "type": dimension.dimension_type,
            } for dimension in dimensions],
            "ledger_id": ledger.pk if ledger else None,
            "ledger_consistent": consistent,
        })
    with localcontext() as context:
        context.prec = 60
        debit = sum((Decimal(line["debit"]) for line in lines), ZERO)
        credit = sum((Decimal(line["credit"]) for line in lines), ZERO)
    return {
        "id": journal.pk, "entry_number": journal.entry_number,
        "transaction_date": journal.transaction_date.isoformat(), "reference": journal.reference,
        "description": journal.description, "source": journal.source, "status": journal.status,
        "created_by": journal.created_by_id,
        "preparer": journal.created_by.get_username() if journal.created_by_id else None,
        "approved_by": journal.approved_by_id,
        "approver": journal.approved_by.get_username() if journal.approved_by_id else None,
        "approved_at": journal.approved_at.isoformat() if journal.approved_at else None,
        "created_at": journal.created_at.isoformat(), "updated_at": journal.updated_at.isoformat(),
        "reversal_of": journal.reversal_of_id,
        "total_debit": format(debit, ".2f"), "total_credit": format(credit, ".2f"),
        "lines": lines,
    }


def screen_population(population, parameters):
    enabled = set(parameters["rules"])
    findings = []
    duplicates = defaultdict(list)

    def add(rule, journal_ids, message):
        if rule in enabled:
            findings.append({"rule": rule, "journal_ids": journal_ids, "message": message})

    threshold = Decimal(parameters["amount_threshold"])
    increment = Decimal(parameters["round_increment"])
    for journal in population:
        ids = [journal["id"]]
        total = Decimal(journal["total_debit"])
        if total >= threshold:
            add("large_journal", ids, "Total debit meets the selected review threshold.")
        # Journal transaction dates, not posting timestamps, determine weekend screening.
        if date.fromisoformat(journal["transaction_date"]).weekday() >= 5:
            add("weekend_date", ids, "Transaction date falls on Saturday or Sunday; this may be legitimate.")
        with localcontext() as context:
            context.prec = 60
            if total >= threshold and total % increment == ZERO:
                add("round_amount", ids, "Total debit is an exact multiple of the selected round-amount increment.")
        if journal["created_by"] is None:
            add("missing_preparer", ids, "No preparer identity is recorded.")
        if journal["approved_by"] is None or journal["approved_at"] is None:
            add("missing_recorded_approval", ids,
                "No complete approval record; approval may not have been required when this journal was posted.")
        if journal["created_by"] is not None and journal["created_by"] == journal["approved_by"]:
            add("self_approval", ids, "Recorded preparer and approver are the same user.")
        lines = journal["lines"]
        if (
            len(lines) < 2 or total != Decimal(journal["total_credit"])
            or any(
                Decimal(line["debit"]) < 0 or Decimal(line["credit"]) < 0
                or (Decimal(line["debit"]) > 0 and Decimal(line["credit"]) > 0)
                or line["account_engagement"] != parameters["engagement"]
                for line in lines
            )
        ):
            add("unbalanced_journal", ids, "Journal totals, line count, line signs or account engagement require investigation.")
        if not lines or any(not line["ledger_consistent"] for line in lines):
            add("incomplete_ledger_provenance", ids,
                "At least one line lacks a consistent posted-ledger link; legacy posting provenance may be unavailable.")
        if journal["reference"].strip():
            signature = (
                journal["transaction_date"], journal["reference"].strip().casefold(),
                journal["description"].strip().casefold(), journal["source"],
                tuple(sorted(
                    (line["account"], line["debit"], line["credit"],
                     tuple(dimension["id"] for dimension in line["dimensions"]))
                    for line in lines
                )),
            )
            duplicates[signature].append(journal["id"])
    for ids in duplicates.values():
        if len(ids) > 1:
            add("potential_duplicate", ids,
                "Date, nonempty reference, description, source, accounts, amounts and dimensions match. Legitimate repeats are possible.")
    return findings


def select_sample(population, parameters):
    if parameters["sampling_method"] == "seeded_random":
        # Hash ranking is stable across Python versions and does not depend on PRNG state.
        ranked = sorted(population, key=lambda journal: (
            fingerprint({"seed": parameters["seed"], "journal_id": journal["id"], "version": VERSION}),
            journal["id"],
        ))
    else:
        ranked = sorted(population, key=lambda journal: (-Decimal(journal["total_debit"]), journal["id"]))
    return [journal["id"] for journal in ranked[:parameters["sample_size"]]]


def create_intelligence_run(data, actor):
    engagement = data["engagement"]
    policy = locked_policy(engagement.pk)
    journals = JournalEntry.objects.filter(
        engagement=engagement, status="posted",
        transaction_date__gte=data["date_from"], transaction_date__lte=data["date_to"],
    )
    if data["source"] != "all":
        journals = journals.filter(source=data["source"])
    count = journals.count()
    if not count:
        raise ValidationError("No posted journals match this scope. No empty run was saved.")
    if count > MAX_JOURNALS:
        raise ValidationError(f"Scope exceeds {MAX_JOURNALS} journals. Narrow the date range or source.")
    if data["sample_size"] > count:
        raise ValidationError({"sample_size": f"Sample size cannot exceed the population of {count} journals."})
    if JournalLine.objects.filter(journal_entry__in=journals).count() > MAX_LINES:
        raise ValidationError(f"Scope exceeds {MAX_LINES} journal lines. Narrow the population.")
    journals = journals.select_related("created_by", "approved_by").prefetch_related(
        Prefetch("lines", queryset=JournalLine.objects.select_related(
            "account", "ledger_entry",
        ).prefetch_related("dimensions").order_by("id")),
    ).order_by("id")
    population = [journal_snapshot(journal) for journal in journals]
    parameters = {
        "engagement": engagement.pk, "date_from": data["date_from"].isoformat(),
        "date_to": data["date_to"].isoformat(), "source": data["source"],
        "sampling_method": data["sampling_method"], "sample_size": data["sample_size"],
        "seed": data["seed"], "amount_threshold": format(data["amount_threshold"], ".2f"),
        "round_increment": format(data["round_increment"], ".2f"),
        "rules": sorted(data["rules"]), "base_currency": policy.base_currency or None,
        "approval_required_at_run": policy.require_journal_approval,
    }
    findings = screen_population(population, parameters)
    sampled_ids = select_sample(population, parameters)
    with localcontext() as context:
        context.prec = 60
        population_total = sum((Decimal(journal["total_debit"]) for journal in population), ZERO)
        selected = set(sampled_ids)
        sample_total = sum((Decimal(journal["total_debit"]) for journal in population if journal["id"] in selected), ZERO)
    result = {
        "population": population, "sampled_journal_ids": sampled_ids, "findings": findings,
        "population_total_debit": format(population_total, ".2f"),
        "sample_total_debit": format(sample_total, ".2f"),
        "warnings": [
            "Screening produces review candidates, not confirmed errors, fraud findings or audit assurance.",
            "Population is posted journal headers/lines by transaction date, not all general-ledger imports or source documents.",
            "Sample size and thresholds are auditor inputs; no statistical confidence or monetary-unit sampling assurance is calculated.",
            "Seeded random uses SHA-256 ranking without replacement; high-value selection is targeted and non-statistical.",
            "Approval policy captured now does not establish the policy in force when historical journals were posted.",
            "Snapshots preserve this run's captured records; live record screens may subsequently differ.",
        ],
    }
    if not policy.base_currency:
        result["warnings"].append("Base currency is not configured; confirm all population amounts share a currency before relying on value-based screening.")
    run = FinancialIntelligenceRun.objects.create(
        engagement=engagement, name=data["name"], algorithm_version=VERSION, parameters=parameters,
        population_fingerprint=fingerprint(population), population_count=len(population),
        sample_count=len(sampled_ids), finding_count=len(findings), results=result, created_by=actor,
    )
    record_financial_event(
        engagement_id=engagement.pk, actor=actor, action="created",
        object_type="financial_intelligence_run", object_id=run.pk,
        details={
            "algorithm_version": VERSION, "population_fingerprint": run.population_fingerprint,
            "population_count": run.population_count, "sample_count": run.sample_count,
            "finding_count": run.finding_count, "parameters": parameters,
        },
    )
    return run
