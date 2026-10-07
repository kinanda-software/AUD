from django.db import transaction
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from .accounting_controls import locked_policy
from .models import FinancialEvidenceLink, FinancialPBCEvent, FinancialPBCRequest
from .workflow_services import record_financial_event


PBC_STATES = {
    "submit": "submitted", "accept": "accepted", "return": "returned", "reopen": "open", "cancel": "cancelled",
}


class StalePBC(APIException):
    status_code = 409
    default_detail = "This PBC request changed since it was loaded. Refresh it before submitting."


def pbc_state(event):
    return PBC_STATES[event.action] if event else "open"


def require_staff(actor):
    if actor.role not in ("staff", "auditor", "manager", "admin"):
        raise PermissionDenied("Only staff, auditors, managers or admins can record PBC activity.")


def ensure_pbc_linkable(request_id, engagement_id):
    request = FinancialPBCRequest.objects.filter(pk=request_id, engagement_id=engagement_id).first()
    if request is None:
        raise ValidationError("The PBC request must belong to the evidence engagement.")
    latest = request.events.first()
    if pbc_state(latest) not in ("open", "returned"):
        raise ValidationError("Add documents only to open or returned PBC requests. Reopen accepted requests first.")
    return request


@transaction.atomic
def create_pbc_request(data, actor):
    require_staff(actor)
    locked_policy(data["engagement"].pk)
    request = FinancialPBCRequest.objects.create(**data, created_by=actor)
    record_financial_event(
        engagement_id=request.engagement_id, actor=actor, action="created",
        object_type="financial_pbc_request", object_id=request.pk,
        details={
            "title": request.title, "description": request.description,
            "requested_from": request.requested_from, "responsible_name": request.responsible_name,
            "due_date": request.due_date.isoformat(), "priority": request.priority,
        },
    )
    return request


@transaction.atomic
def record_pbc_event(data, actor):
    require_staff(actor)
    request = data["request"]
    locked_policy(request.engagement_id)
    previous = request.events.first()
    if data["expected_previous"] != (previous.pk if previous else None):
        raise StalePBC()
    state = pbc_state(previous)
    action = data["action"]
    if action != "submit" and actor.role not in ("manager", "admin"):
        raise PermissionDenied("Only a manager or admin can accept, return, reopen or cancel PBC requests.")
    if state == "cancelled":
        raise ValidationError("Cancelled PBC requests cannot receive further workflow actions.")
    if action == "submit":
        if state not in ("open", "returned"):
            raise ValidationError("Documents can be submitted only for open or returned requests.")
        ids = data.get("evidence_link_ids", [])
        if not ids:
            raise ValidationError({"evidence_link_ids": "Select at least one request-linked attachment to submit."})
        if len(ids) != len(set(ids)):
            raise ValidationError({"evidence_link_ids": "Select each evidence link only once."})
        links = FinancialEvidenceLink.objects.filter(
            pk__in=ids, target_kind="pbc_request", target_id=request.pk, selector=-1,
            evidence__engagement_id=request.engagement_id,
        )
        if links.count() != len(ids):
            raise ValidationError({"evidence_link_ids": "All submitted links must belong to this PBC request and engagement."})
        ids = sorted(ids)
    else:
        if "evidence_link_ids" in data:
            raise ValidationError("Only submissions can supply evidence link IDs.")
        if action in ("accept", "return") and state != "submitted":
            raise ValidationError("Accept or return requires a submitted document package.")
        if action == "reopen" and state != "accepted":
            raise ValidationError("Only accepted requests can be reopened.")
        ids = previous.evidence_link_ids if previous else []
    event = FinancialPBCEvent.objects.create(
        request=request, action=action, note=data["note"], evidence_link_ids=ids, previous=previous,
        actor=actor, actor_identifier=actor.pk, actor_name=actor.username, actor_role=actor.role,
    )
    record_financial_event(
        engagement_id=request.engagement_id, actor=actor, action=action,
        object_type="financial_pbc_event", object_id=event.pk,
        details={
            "request": request.pk, "previous": previous.pk if previous else None,
            "state": pbc_state(event), "note": event.note, "evidence_link_ids": ids,
        },
    )
    return event
