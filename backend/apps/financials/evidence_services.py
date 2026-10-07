import hashlib
import logging

from django.db.models import Q
from rest_framework.exceptions import APIException, ValidationError

from .models import (
    Adjustment, FinancialDocument, FinancialEvidence, FinancialEvidenceLink,
    FinancialIntelligenceRun, FinancialPayment, FixedAsset, FixedAssetEvent,
    GeneralLedger, InventoryItem, InventoryMovement, JournalEntry,
    LeadSchedule, SupportingDetail, TrialBalance,
)
from .workflow_services import record_financial_event
from .pbc_services import ensure_pbc_linkable


logger = logging.getLogger(__name__)
MAX_EVIDENCE_SIZE = 10 * 1024 * 1024
TYPES = {
    "pdf": ("application/pdf", b"%PDF-"),
    "png": ("image/png", b"\x89PNG\r\n\x1a\n"),
    "jpg": ("image/jpeg", b"\xff\xd8\xff"),
    "jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    "csv": ("text/csv", None),
    "txt": ("text/plain", None),
}


def validate_upload(upload):
    filename = upload.name.replace("\\", "/").split("/")[-1]
    if not filename or len(filename) > 200 or any(ord(character) < 32 or ord(character) == 127 for character in filename):
        raise ValidationError({"file": "Use a filename of 1-200 characters without control characters."})
    extension = filename.rsplit(".", 1)[-1].lower()
    if extension not in TYPES:
        raise ValidationError({"file": "Allowed formats: PDF, PNG, JPEG, UTF-8 CSV and TXT."})
    if upload.size <= 0 or upload.size > MAX_EVIDENCE_SIZE:
        raise ValidationError({"file": "Evidence must be nonempty and no larger than 10 MB."})
    upload.seek(0)
    content = upload.read(MAX_EVIDENCE_SIZE + 1)
    if not content or len(content) > MAX_EVIDENCE_SIZE:
        raise ValidationError({"file": "Evidence must be nonempty and no larger than 10 MB."})
    content_type, signature = TYPES[extension]
    if signature is not None and not content.startswith(signature):
        raise ValidationError({"file": "File signature does not match its extension."})
    if signature is None:
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValidationError({"file": "CSV/TXT evidence must use UTF-8 encoding."}) from exc
        if "\x00" in text:
            raise ValidationError({"file": "CSV/TXT evidence cannot contain null bytes."})
    return filename, content_type, content


def upload_evidence(data, actor, validated_file):
    filename, content_type, content = validated_file
    evidence = FinancialEvidence.objects.create(
        engagement=data["engagement"], title=data["title"], description=data.get("description", ""),
        filename=filename, content_type=content_type, size=len(content),
        sha256=hashlib.sha256(content).hexdigest(), content=content, uploaded_by=actor,
    )
    record_financial_event(
        engagement_id=evidence.engagement_id, actor=actor, action="created",
        object_type="financial_evidence", object_id=evidence.pk,
        details={
            "title": evidence.title, "filename": filename, "size": evidence.size,
            "sha256": evidence.sha256, "content_type": content_type,
        },
    )
    return evidence


def resolve_target(kind, target_id, selector, engagement_id):
    if kind in ("run", "run_finding"):
        run = FinancialIntelligenceRun.objects.defer("results").filter(pk=target_id, engagement_id=engagement_id).first()
        if run is None:
            raise ValidationError("The saved run must belong to the evidence engagement.")
        snapshot = {"label": run.name, "id": run.pk, "population_fingerprint": run.population_fingerprint}
        if kind == "run_finding":
            findings = run.results["findings"]
            if selector < 0 or selector >= len(findings):
                raise ValidationError("The finding index is outside the saved run.")
            snapshot["finding_index"] = selector
            snapshot["finding"] = findings[selector]
        elif selector != -1:
            raise ValidationError("Run links do not use a selector.")
        return snapshot
    if kind == "account_trace":
        tb = TrialBalance.objects.filter(pk=target_id, engagement_id=engagement_id).first()
        if tb is None:
            raise ValidationError("The trial balance must belong to the evidence engagement.")
        line = tb.lines.filter(account_id=selector, account__engagement_id=engagement_id).select_related("account").first()
        adjustment = Adjustment.objects.filter(
            trial_balance=tb, engagement_id=engagement_id,
        ).filter(
            Q(debit_account_id=selector) | Q(credit_account_id=selector)
        ).first()
        account = line.account if line else (
            adjustment.debit_account if adjustment and adjustment.debit_account_id == selector
            else adjustment.credit_account if adjustment else None
        )
        if account is None or account.engagement_id != engagement_id:
            raise ValidationError("Select an account present in this trial balance or its adjustments.")
        return {
            "label": f"TB {tb.pk}: {account.account_code} - {account.account_name}",
            "trial_balance": tb.pk, "account": account.pk, "currency": tb.currency,
            "period_start": tb.period_start.isoformat(), "period_end": tb.period_end.isoformat(),
        }
    if selector != -1:
        raise ValidationError("Only account traces and run findings use a selector.")
    if kind == "pbc_request":
        request = ensure_pbc_linkable(target_id, engagement_id)
        return {"label": request.title, "id": request.pk, "due_date": request.due_date.isoformat()}
    targets = {
        "ledger": (GeneralLedger, "engagement_id", "description"),
        "journal": (JournalEntry, "engagement_id", "entry_number"),
        "adjustment": (Adjustment, "engagement_id", "adjustment_number"),
        "lead_schedule": (LeadSchedule, "engagement_id", "schedule_name"),
        "supporting_detail": (SupportingDetail, "lead_schedule__engagement_id", "description"),
        "document": (FinancialDocument, "engagement_id", "number"),
        "payment": (FinancialPayment, "document__engagement_id", "reference"),
        "asset": (FixedAsset, "engagement_id", "asset_number"),
        "asset_event": (FixedAssetEvent, "asset__engagement_id", "kind"),
        "inventory_item": (InventoryItem, "engagement_id", "sku"),
        "inventory_movement": (InventoryMovement, "item__engagement_id", "reference"),
    }
    if kind not in targets:
        raise ValidationError("Unsupported evidence target.")
    model, engagement_field, label_field = targets[kind]
    record = model.objects.filter(pk=target_id, **{engagement_field: engagement_id}).first()
    if record is None:
        raise ValidationError("The target must exist and belong to the evidence engagement.")
    return {"label": str(getattr(record, label_field)), "id": record.pk}


def create_evidence_link(data, actor):
    evidence = data["evidence"]
    snapshot = resolve_target(data["target_kind"], data["target_id"], data["selector"], evidence.engagement_id)
    if FinancialEvidenceLink.objects.filter(
        evidence=evidence, target_kind=data["target_kind"], target_id=data["target_id"], selector=data["selector"],
    ).exists():
        raise ValidationError("This evidence is already linked to that target.")
    link = FinancialEvidenceLink.objects.create(
        evidence=evidence, target_kind=data["target_kind"], target_id=data["target_id"],
        selector=data["selector"], target_snapshot=snapshot, note=data["note"], linked_by=actor,
    )
    record_financial_event(
        engagement_id=evidence.engagement_id, actor=actor, action="created",
        object_type="financial_evidence_link", object_id=link.pk,
        details={
            "evidence": evidence.pk, "target_kind": link.target_kind, "target_id": link.target_id,
            "selector": link.selector, "target_snapshot": snapshot, "note": link.note,
        },
    )
    return link


def checked_evidence_content(evidence):
    content = bytes(evidence.content)
    if len(content) != evidence.size or hashlib.sha256(content).hexdigest() != evidence.sha256:
        logger.error("Financial evidence integrity check failed for record %s", evidence.pk)
        raise APIException("Evidence integrity verification failed. Contact an administrator.")
    return content
