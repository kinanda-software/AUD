from django.db import transaction
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from .accounting_controls import locked_policy
from .models import FinancialEvidenceLink, FinancialFindingReview, FinancialIntelligenceRun
from .workflow_services import record_financial_event


class StaleReview(APIException):
    status_code = 409
    default_detail = "This finding changed since it was loaded. Refresh the review before submitting."

REVIEW_STATES = {
    "review": "reviewed", "sign_off": "signed_off", "return": "returned", "reopen": "reopened",
}


def review_state(review):
    if review is None:
        return "unreviewed"
    return REVIEW_STATES[review.action]


@transaction.atomic
def record_finding_review(data, actor):
    if actor.role not in ("staff", "auditor", "manager", "admin"):
        raise PermissionDenied("Only financial staff, auditors, managers or admins can record review actions.")
    run_id = data["run"].pk
    locked_policy(data["run"].engagement_id)
    run = FinancialIntelligenceRun.objects.get(pk=run_id)
    index = data["finding_index"]
    if index >= len(run.results["findings"]):
        raise ValidationError({"finding_index": "Select a finding in this saved run."})
    previous = FinancialFindingReview.objects.filter(run=run, finding_index=index).first()
    if data["expected_previous"] != (previous.pk if previous else None):
        raise StaleReview()
    action = data["action"]
    state = review_state(previous)
    if action != "review" and actor.role not in ("manager", "admin"):
        raise PermissionDenied("Only a manager or admin can sign off, return or reopen findings.")
    if action == "review":
        if state == "signed_off":
            raise ValidationError("A manager/admin must reopen this finding before recording a new outcome.")
        if not data.get("outcome") or not data.get("conclusion"):
            raise ValidationError("A review outcome and conclusion are required.")
        outcome = data["outcome"]
        conclusion = data["conclusion"]
        evidence_ids = list(FinancialEvidenceLink.objects.filter(
            evidence__engagement_id=run.engagement_id, target_kind="run_finding",
            target_id=run.pk, selector=index,
        ).order_by("id").values_list("id", flat=True))
    else:
        if "outcome" in data or "conclusion" in data:
            raise ValidationError("Only review actions can supply an outcome or conclusion.")
        if action in ("sign_off", "return") and state != "reviewed":
            raise ValidationError("Record a review outcome before sign-off or return.")
        if action == "reopen" and state != "signed_off":
            raise ValidationError("Only signed-off findings can be reopened.")
        if action == "sign_off":
            if previous.actor_identifier == actor.pk:
                raise PermissionDenied("Sign-off must be performed by a different manager/admin from the outcome preparer.")
            if previous.outcome == "follow_up":
                raise ValidationError("Complete further work and record a resolved outcome before sign-off.")
        outcome = previous.outcome
        conclusion = previous.conclusion
        evidence_ids = previous.evidence_link_ids
    review = FinancialFindingReview.objects.create(
        run=run, finding_index=index, action=action, outcome=outcome, conclusion=conclusion,
        note=data["note"], evidence_link_ids=evidence_ids, previous=previous,
        actor=actor, actor_identifier=actor.pk, actor_name=actor.username, actor_role=actor.role,
    )
    record_financial_event(
        engagement_id=run.engagement_id, actor=actor, action=action,
        object_type="financial_finding_review", object_id=review.pk,
        details={
            "run": run.pk, "finding_index": index, "previous": previous.pk if previous else None,
            "state": review_state(review), "outcome": outcome, "conclusion": conclusion,
            "note": review.note, "evidence_link_ids": evidence_ids,
            "population_fingerprint": run.population_fingerprint,
        },
    )
    return review
