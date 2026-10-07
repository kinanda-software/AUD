import math
from datetime import date

from rest_framework import serializers

from .models import SummaryReview


SUMMARY_FIELDS = {
    "reviewAreas": "review_areas",
    "judgments": "judgments",
    "reviewComments": "review_comments",
    "engagementTeamReview": "engagement_team_review",
    "partnerReview": "partner_review",
    "eqrReview": "eqr_review",
    "financialStatementProcedures": "financial_statement_confirmations",
    "uncorrectedMisstatements": "uncorrected_misstatements",
    "overallConclusion": "overall_conclusion",
    "approvalComments": "approval_comments",
    "completionChecklist": "completion_checklist",
}


class SummaryReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SummaryReview
        fields = "__all__"
        read_only_fields = ["id", "engagement", "created_at", "updated_at", "completed_at"]


def strings(*names):
    return dict.fromkeys(names, str)


SCHEMAS = {
    "evaluate-misstatements": {
        **dict.fromkeys(["overallMateriality", "performanceMateriality", "clearlyTrivialThreshold", "priorPeriodUncorrected"], float),
        **strings("qualitativeConsiderations", "managementConclusion", "auditorConclusion"),
        "misstatements": [{"id": int, **strings("reference", "description", "financialStatementArea", "account", "managementResponse"),
                          "amount": float, "status": ("Corrected", "Uncorrected"), "qualitative": bool}],
    },
    "financial-statement-procedures": {
        "disclosureItems": [{"id": int, **strings("reference", "area", "requirement", "comments"),
                             "status": ("Not Reviewed", "Reviewed", "Issue Identified")}],
        "subsequentEvents": [{"id": int, **strings("reference", "eventDate", "description", "financialImpact", "conclusion"),
                              "treatment": ("No Adjustment", "Adjustment Required", "Disclosure Required")}],
        "comparativeReview": {"period": str, "reviewed": bool, "agreesToPriorFS": bool, "consistencyConfirmed": bool, "comments": str},
        "analyticalReview": {"performed": bool, **strings("overallReasonableness", "unexpectedRelationships", "unusualFluctuations", "consistencyWithUnderstanding", "conclusion")},
        **strings("issuesIdentified", "overallConclusion"),
    },
    "client-communications": {
        "deficiencies": [{"id": str, **strings("title", "description", "affectedArea", "managementResponse", "communicatedTo", "communicationDate"),
                          "severity": ("Significant Deficiency", "Material Weakness", "Other Deficiency"),
                          "status": ("Draft", "Communicated", "Cleared")}],
        "governanceMatters": [{"id": str, **strings("matterType", "title", "description", "communicatedTo", "communicationDate", "response"),
                               "status": ("Draft", "Communicated", "Cleared")}],
        "representationItems": [{"id": str, **strings("representation", "responsiblePerson", "requestedDate", "receivedDate", "notes"),
                                 "status": ("Requested", "Received", "Outstanding")}],
        **strings("managementResponses", "auditorCommunicationConclusion", "finalCommunicationDate", "communicationResponsiblePerson"),
        "finalReviewCompleted": bool,
    },
    "opinion-report": {
        "deficiencies": [{"id": int, **strings("reference", "financialStatementArea", "description", "potentialEffect", "managementResponse", "auditorRecommendation"),
                          "classification": ("Not a Deficiency", "Deficiency", "Significant Deficiency"),
                          "communicationStatus": ("Not Communicated", "Drafted", "Communicated")}],
        "governanceMatters": [{"id": int, **strings("reference", "matterCommunicated", "significance", "communicationMethod", "recipient", "communicationDate", "responseOutcome"),
                               "communicationStatus": ("Not Communicated", "Drafted", "Communicated")}],
        "representations": [{"id": int, **strings("reference", "representation", "responsiblePerson", "expectedDate", "receivedDate", "comments"),
                             "status": ("Pending", "Received", "Exception")}],
        **strings("governanceMeetingDate", "primaryGovernanceContact", "writtenRepresentationLetterDate", "writtenRepresentationConclusion",
                  "managementMeetingDate", "primaryManagementContact", "communicationSummary", "outstandingMatters", "auditorConclusion"),
        "governanceCommunicationCompleted": bool, "managementCommunicationCompleted": bool, "outstandingMattersCleared": bool,
        "representationStatus": ("Pending", "Received", "Exception"),
    },
    "risk-reassessment": strings("riskArea", "assertion", "originalRisk", "newEvidence", "unexpectedResults",
                                "controlExceptions", "misstatements", "confirmationExceptions", "reassessedRisk",
                                "riskChangeReason", "additionalProcedures", "conclusion"),
    "inventory": {
        "risks": [{"id": int, **strings("area", "risk", "assertion", "response"), "level": ("", "Low", "Medium", "High")}],
    },
    "summary-review": {
        "reviewAreas": [{"id": str, **strings("area", "description", "reviewer", "reviewDate", "comments"),
                         "status": ("Open", "Reviewed", "Follow-up Required")}],
        "judgments": [{"id": str, **strings("judgment", "description", "reviewer", "comments"),
                       "status": ("Not Reviewed", "Reviewed", "Follow-up Required")}],
        "reviewComments": [{"id": str, **strings("area", "comment", "reviewer", "response"), "status": ("Open", "Cleared")}],
        "engagementTeamReview": {"completed": bool, **strings("completedBy", "completedDate", "comments")},
        "partnerReview": {"completed": bool, **strings("partnerName", "reviewDate", "approvalComments")},
        "eqrReview": {"required": bool, "completed": bool, **strings("reviewerName", "reviewDate", "comments")},
        "financialStatementProcedures": {"completed": bool, **strings("reviewer", "reviewDate", "comments")},
        "uncorrectedMisstatements": {"reviewed": bool, "aggregateEvaluated": bool, "representationsObtained": bool},
        "overallConclusion": str,
        "approvalComments": str,
        "completionChecklist": dict,
    },
}


def validate_shape(value, schema, path="data"):
    if isinstance(schema, dict):
        if not isinstance(value, dict) or set(value) != set(schema):
            raise serializers.ValidationError(f"{path}: required fields do not match the workpaper schema.")
        for key, child in schema.items():
            validate_shape(value[key], child, f"{path}.{key}")
    elif isinstance(schema, list):
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{path}: expected a list.")
        ids = []
        for index, item in enumerate(value):
            validate_shape(item, schema[0], f"{path}[{index}]")
            ids.append(item["id"])
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(f"{path}: duplicate row identities.")
    elif isinstance(schema, tuple):
        if value not in schema:
            raise serializers.ValidationError(f"{path}: invalid choice.")
    elif schema is float:
        if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
            raise serializers.ValidationError(f"{path}: expected a finite non-negative number.")
    elif type(value) is not schema:
        raise serializers.ValidationError(f"{path}: invalid value type.")
    if isinstance(value, str) and value and path.endswith(("Date", "completedDate")):
        try:
            date.fromisoformat(value)
        except ValueError:
            raise serializers.ValidationError(f"{path}: expected an ISO date.")


def validate_completion(section, data, engagement):
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    def text(key, source=data):
        require(bool(source.get(key, "").strip()), f"{key} is required.")

    def rows(key, required, status_key=None, statuses=()):
        for row in data[key]:
            for field in required:
                text(field, row)
            if status_key:
                require(row[status_key] in statuses, f"{key}: unresolved {row['id']}.")

    if section == "evaluate-misstatements":
        require(data["overallMateriality"] > 0 and 0 < data["performanceMateriality"] <= data["overallMateriality"]
                and data["clearlyTrivialThreshold"] <= data["performanceMateriality"], "Valid materiality thresholds are required.")
        for key in ["qualitativeConsiderations", "managementConclusion", "auditorConclusion"]:
            text(key)
        rows("misstatements", ["reference", "description", "financialStatementArea", "account", "managementResponse"])
    elif section == "financial-statement-procedures":
        require(bool(data["disclosureItems"]), "Disclosure review is required.")
        rows("disclosureItems", ["comments"], "status", ("Reviewed",))
        rows("subsequentEvents", ["eventDate", "description", "conclusion"])
        require(all(data["comparativeReview"][k] for k in ["reviewed", "agreesToPriorFS", "consistencyConfirmed"]), "Comparative review must be completed.")
        text("comments", data["comparativeReview"])
        require(data["analyticalReview"]["performed"], "Analytical review must be performed.")
        for key in ["overallReasonableness", "conclusion"]:
            text(key, data["analyticalReview"])
        text("overallConclusion")
        text("issuesIdentified")
    elif section == "client-communications":
        rows("deficiencies", ["title", "description", "affectedArea", "communicatedTo", "communicationDate"], "status", ("Communicated", "Cleared"))
        rows("governanceMatters", ["title", "description", "communicatedTo", "communicationDate"], "status", ("Communicated", "Cleared"))
        require(bool(data["representationItems"]), "Written representations must be documented.")
        rows("representationItems", ["representation", "responsiblePerson", "receivedDate"], "status", ("Received",))
        for key in ["auditorCommunicationConclusion", "finalCommunicationDate", "communicationResponsiblePerson"]:
            text(key)
        require(data["finalReviewCompleted"], "Final communication review must be completed.")
    elif section == "opinion-report":
        rows("deficiencies", ["description", "financialStatementArea"], "communicationStatus", ("Communicated",))
        rows("governanceMatters", ["matterCommunicated", "recipient", "communicationDate", "responseOutcome"], "communicationStatus", ("Communicated",))
        require(bool(data["representations"]), "Written representations must be documented.")
        rows("representations", ["representation", "responsiblePerson", "receivedDate"], "status", ("Received",))
        require(data["managementCommunicationCompleted"] and data["governanceCommunicationCompleted"], "Management and governance communications must be completed.")
        require(data["representationStatus"] == "Received", "Representation letter must be received.")
        require(data["outstandingMattersCleared"], "Outstanding matters clearance must be confirmed.")
        for key in ["governanceMeetingDate", "primaryGovernanceContact", "managementMeetingDate", "primaryManagementContact",
                    "writtenRepresentationLetterDate", "writtenRepresentationConclusion", "communicationSummary", "outstandingMatters", "auditorConclusion"]:
            text(key)
    elif section == "risk-reassessment":
        for key in ["riskArea", "assertion", "originalRisk", "newEvidence", "reassessedRisk", "riskChangeReason", "additionalProcedures", "conclusion"]:
            text(key)
        require(data["originalRisk"] in ("Low", "Moderate", "High", "Significant")
                and data["reassessedRisk"] in ("Low", "Moderate", "High", "Significant"), "Select valid original and reassessed risk levels.")
    elif section == "inventory":
        require(bool(data["risks"]), "Inventory risks must be documented.")
        rows("risks", ["area", "risk", "assertion", "response"], "level", ("Low", "Medium", "High"))
    elif section == "summary-review":
        require(bool(data["reviewAreas"]) and bool(data["judgments"]), "Review areas and judgments are required.")
        rows("reviewAreas", ["reviewer", "reviewDate", "comments"], "status", ("Reviewed",))
        rows("judgments", ["reviewer", "comments"], "status", ("Reviewed",))
        rows("reviewComments", ["reviewer", "response"], "status", ("Cleared",))
        expected = {f"assignment-{pk}" for pk in engagement.review_assignments.values_list("pk", flat=True)}
        actual = {row["id"] for row in data["reviewAreas"]}
        require(expected <= actual, "All engagement review assignments must be included.")
        for key, fields in [
            ("engagementTeamReview", ["completedBy", "completedDate", "comments"]),
            ("partnerReview", ["partnerName", "reviewDate", "approvalComments"]),
            ("financialStatementProcedures", ["reviewer", "reviewDate", "comments"]),
            ("eqrReview", ["reviewerName", "reviewDate", "comments"]),
        ]:
            if key == "eqrReview" and not data[key]["required"]:
                text("comments", data[key])
                continue
            require(data[key]["completed"], f"{key} must be completed.")
            for field in fields:
                text(field, data[key])
        require(all(data["uncorrectedMisstatements"].values()), "All misstatement review confirmations are required.")
        text("overallConclusion")
    if errors:
        raise serializers.ValidationError({"completion": errors})


class WorkpaperInputSerializer(serializers.Serializer):
    data = serializers.JSONField()
    complete = serializers.BooleanField(default=False)

    def validate_data(self, value):
        validate_shape(value, SCHEMAS[self.context["section"]])
        return value

    def validate(self, attrs):
        if attrs["complete"]:
            validate_completion(self.context["section"], attrs["data"], self.context["engagement"])
        return attrs
