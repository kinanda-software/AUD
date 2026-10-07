from rest_framework.exceptions import ValidationError


def validate_archive_completion(data):
    if not isinstance(data, dict):
        raise ValidationError("Save the documentation archive workpaper before locking it.")
    flags = (
        "subsequentEventsReviewed", "finalReviewCompleted", "partnerApprovalCompleted",
        "archiveChecklistDocumentationComplete", "archiveChecklistOutstandingMattersResolved",
        "archiveChecklistFinalReviewComplete", "archiveChecklistPartnerApprovalComplete",
        "archiveChecklistRetentionConfirmed",
    )
    if not all(data.get(key) is True for key in flags):
        raise ValidationError("Complete all documentation, review and archive confirmations before locking.")
    for key in ("documentationAreas", "assemblySections"):
        rows = data.get(key)
        if not isinstance(rows, list) or not rows or not all(
            isinstance(row, dict) and row.get("completed") is True for row in rows
        ):
            raise ValidationError("Complete all documentation and assembly sections before locking.")
    matters = data.get("outstandingMatters")
    if not isinstance(matters, list) or not all(
        isinstance(row, dict) and row.get("resolved") is True for row in matters
    ):
        raise ValidationError("Resolve all outstanding matters before locking.")
