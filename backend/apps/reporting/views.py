"""
Engagement summary PDF report.

Builds a branded, printable engagement summary combining
core engagement data with the scheduling, evidence,
non-conformance, and checklist modules. This is an internal
working summary — it is not an auditor's report and does
not express an audit opinion.
"""

from io import BytesIO

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from apps.engagements.models import Engagement


def _fmt_date(value):
    if value is None:
        return "—"
    return value.strftime("%d %b %Y")


def _fmt_datetime(value):
    if value is None:
        return "—"
    return timezone.localtime(value).strftime("%d %b %Y %H:%M")


def build_engagement_summary_pdf(engagement):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title=f"Engagement Summary - {engagement.engagement_code}",
        author="AUD Audit Platform",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    heading = styles["Heading1"]
    sub_heading = styles["Heading2"]
    body = styles["BodyText"]

    header_bg = colors.HexColor("#1e3a8a")
    row_bg = colors.HexColor("#f1f5f9")

    def styled_table(rows, widths=None):
        table = Table(rows, colWidths=widths, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, row_bg]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return table

    story = [
        Paragraph("Engagement Summary Report", heading),
        Paragraph(
            "Internal working summary generated "
            f"{_fmt_datetime(timezone.now())}. This document does "
            "not constitute an auditor's report or an audit opinion.",
            body,
        ),
        Spacer(1, 8 * mm),
    ]

    # ----------------------------------------------------
    # Engagement details
    # ----------------------------------------------------
    story.append(Paragraph("Engagement Details", sub_heading))
    story.append(styled_table([
        ["Field", "Value"],
        ["Engagement code", engagement.engagement_code],
        ["Title", engagement.title],
        ["Client", engagement.client.legal_name],
        ["Type", engagement.get_engagement_type_display()],
        ["Status", engagement.get_status_display()],
        ["Phase", engagement.get_current_phase_display()],
        ["Risk level", engagement.get_risk_level_display()],
        ["Lead auditor", (
            engagement.lead_auditor.get_full_name()
            or engagement.lead_auditor.username
            if engagement.lead_auditor else "—"
        )],
        ["Start date", _fmt_date(engagement.start_date)],
        ["Planned end", _fmt_date(engagement.planned_end_date)],
        ["Financial year end", _fmt_date(engagement.financial_year_end)],
        ["Progress", f"{engagement.progress_percentage}%"],
    ], widths=[55 * mm, 115 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ----------------------------------------------------
    # Audit team
    # ----------------------------------------------------
    story.append(Paragraph("Audit Team", sub_heading))
    team_rows = [["Name", "Role", "Budgeted hours", "Key member"]]
    for member in engagement.audit_team_members.select_related("user"):
        team_rows.append([
            member.user.get_full_name() or member.user.username,
            member.get_role_display(),
            str(member.budgeted_hours),
            "Yes" if member.is_key_member else "No",
        ])
    if len(team_rows) == 1:
        team_rows.append(["No team members recorded.", "", "", ""])
    story.append(styled_table(team_rows, widths=[55 * mm, 55 * mm, 30 * mm, 30 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ----------------------------------------------------
    # Scheduled audits
    # ----------------------------------------------------
    story.append(Paragraph("Scheduled Audits", sub_heading))
    schedule_rows = [["Title", "Type", "Start", "End", "Status"]]
    for schedule in engagement.schedules.all():
        schedule_rows.append([
            schedule.title,
            schedule.get_audit_type_display(),
            _fmt_datetime(schedule.scheduled_start),
            _fmt_datetime(schedule.scheduled_end),
            schedule.get_status_display(),
        ])
    if len(schedule_rows) == 1:
        schedule_rows.append(["No scheduled audits.", "", "", "", ""])
    story.append(styled_table(schedule_rows))
    story.append(Spacer(1, 6 * mm))

    # ----------------------------------------------------
    # Non-conformances
    # ----------------------------------------------------
    story.append(Paragraph("Non-Conformance Register", sub_heading))
    nc_queryset = engagement.nonconformances.all()
    open_count = nc_queryset.exclude(status="closed").count()
    story.append(Paragraph(
        f"{nc_queryset.count()} recorded, {open_count} open.",
        body,
    ))
    story.append(Spacer(1, 2 * mm))
    nc_rows = [["Ref", "Title", "Severity", "Status", "Due"]]
    for nc in nc_queryset[:25]:
        nc_rows.append([
            nc.reference,
            nc.title[:60],
            nc.get_severity_display(),
            nc.get_status_display(),
            _fmt_date(nc.due_date),
        ])
    if len(nc_rows) == 1:
        nc_rows.append(["No non-conformances recorded.", "", "", "", ""])
    story.append(styled_table(nc_rows, widths=[20 * mm, 70 * mm, 25 * mm, 32 * mm, 23 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ----------------------------------------------------
    # Checklist scores
    # ----------------------------------------------------
    story.append(Paragraph("Checklist Scores", sub_heading))
    checklist_rows = [["Checklist", "Status", "Answered", "Score", "Rating"]]
    for checklist in engagement.checklists.all():
        score = checklist.compute_score()
        checklist_rows.append([
            checklist.name,
            checklist.get_status_display(),
            f"{score['answered']} / {score['total_questions']}",
            f"{score['percent']}%" if score["percent"] is not None else "—",
            score["rating"],
        ])
    if len(checklist_rows) == 1:
        checklist_rows.append(["No checklists recorded.", "", "", "", ""])
    story.append(styled_table(checklist_rows, widths=[50 * mm, 28 * mm, 28 * mm, 22 * mm, 42 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ----------------------------------------------------
    # Evidence register
    # ----------------------------------------------------
    story.append(Paragraph("Evidence Register", sub_heading))
    evidence_rows = [["File", "Section", "Uploaded by", "Uploaded at"]]
    for evidence in engagement.evidence_files.select_related("uploaded_by")[:40]:
        evidence_rows.append([
            evidence.original_filename[:50],
            evidence.section or "—",
            (
                evidence.uploaded_by.username
                if evidence.uploaded_by else "—"
            ),
            _fmt_datetime(evidence.uploaded_at),
        ])
    if len(evidence_rows) == 1:
        evidence_rows.append(["No evidence files uploaded.", "", "", ""])
    story.append(styled_table(evidence_rows, widths=[62 * mm, 40 * mm, 30 * mm, 38 * mm]))

    document.build(story)
    buffer.seek(0)
    return buffer


class EngagementSummaryReportView(APIView):
    """
    GET /api/reporting/engagements/<engagement_id>/summary.pdf

    Downloads the engagement summary report as a PDF file.
    """

    def get(self, request, engagement_id):
        engagement = get_object_or_404(
            Engagement.objects.select_related(
                "client", "lead_auditor"
            ),
            pk=engagement_id,
        )

        buffer = build_engagement_summary_pdf(engagement)

        filename = (
            f"engagement-summary-"
            f"{engagement.engagement_code}.pdf"
        )
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )


# ============================================================
# MANAGEMENT LETTER
# ============================================================

def build_management_letter_pdf(engagement):
    """
    A formal management letter: findings with their clause,
    severity, corrective action, and the entity's management
    response. Not an auditor's report or opinion.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title=f"Management Letter - {engagement.engagement_code}",
        author="AUD Audit Platform",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    heading = styles["Heading1"]
    sub_heading = styles["Heading2"]
    body = styles["BodyText"]

    header_bg = colors.HexColor("#1e3a8a")
    row_bg = colors.HexColor("#f1f5f9")

    story = [
        Paragraph("Management Letter", heading),
        Paragraph(
            f"To the management of {engagement.client.legal_name} — "
            f"engagement {engagement.engagement_code}: "
            f"{engagement.title}. Generated "
            f"{_fmt_datetime(timezone.now())}.",
            body,
        ),
        Paragraph(
            "This letter communicates findings and recommendations "
            "identified during the engagement, together with "
            "management's recorded responses. It is not an auditor's "
            "report and does not express an audit opinion.",
            body,
        ),
        Spacer(1, 6 * mm),
    ]

    findings = (
        engagement.nonconformances
        .exclude(finding_type="observation")
        .order_by("-severity", "reference")
    )

    if not findings.exists():
        story.append(Paragraph(
            "No non-conformances were recorded for this engagement.",
            body,
        ))
    else:
        for index, nc in enumerate(findings, start=1):
            story.append(Paragraph(
                f"Finding {index}: {nc.reference} — {nc.title}",
                sub_heading,
            ))
            rows = [
                ["Classification", nc.get_finding_type_display()],
                ["Severity", nc.get_severity_display()],
                ["Category", nc.get_category_display()],
                ["Requirement", nc.requirement_reference or "—"],
                ["Status", nc.get_status_display()],
                ["Finding", nc.description],
                ["Root cause", nc.root_cause or "—"],
                ["Recommendation (corrective action)", nc.corrective_action or "—"],
                ["Management response", nc.management_response or "Not recorded"],
            ]
            table = Table(rows, colWidths=[45 * mm, 125 * mm], hAlign="LEFT")
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), header_bg),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, row_bg]),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(table)
            story.append(Spacer(1, 5 * mm))

    document.build(story)
    buffer.seek(0)
    return buffer


class ManagementLetterView(APIView):
    """
    GET /api/reporting/engagements/<engagement_id>/management-letter.pdf
    """

    def get(self, request, engagement_id):
        engagement = get_object_or_404(
            Engagement.objects.select_related("client"),
            pk=engagement_id,
        )

        buffer = build_management_letter_pdf(engagement)

        filename = (
            f"management-letter-{engagement.engagement_code}.pdf"
        )
        return FileResponse(
            buffer,
            as_attachment=True,
            filename=filename,
            content_type="application/pdf",
        )


# ============================================================
# CONSOLIDATED FIRM-WIDE REPORT
# ============================================================

def build_consolidated_pdf():
    """
    Cross-engagement consolidated findings report: systemic
    patterns first, then per-engagement finding statistics,
    open monitoring alerts, and checklist scores.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    from django.db.models import Count, Q

    from apps.monitoring.models import MonitoringAlert
    from apps.nonconformance.models import NonConformance

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title="Consolidated Findings Report",
        author="AUD Audit Platform",
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    heading = styles["Heading1"]
    sub_heading = styles["Heading2"]
    body = styles["BodyText"]

    header_bg = colors.HexColor("#1e3a8a")
    row_bg = colors.HexColor("#f1f5f9")

    def styled_table(rows, widths=None):
        table = Table(rows, colWidths=widths, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, row_bg]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return table

    story = [
        Paragraph("Consolidated Findings Report", heading),
        Paragraph(
            "Key findings consolidated across all engagements, "
            f"generated {_fmt_datetime(timezone.now())}. Internal "
            "working document — not an auditor's report.",
            body,
        ),
        Spacer(1, 8 * mm),
    ]

    # ------------------------------------------------------
    # Systemic patterns
    # ------------------------------------------------------
    story.append(Paragraph("Systemic Finding Patterns", sub_heading))
    pattern_rows = [["Category", "Findings", "Open", "Engagements", "Systemic"]]
    patterns = (
        NonConformance.objects
        .exclude(finding_type="observation")
        .values("category")
        .annotate(
            total=Count("id"),
            engagement_count=Count("engagement", distinct=True),
            open_count=Count("id", filter=~Q(status="closed")),
        )
        .order_by("-engagement_count", "-total")
    )
    category_labels = dict(NonConformance.Category.choices)
    for row in patterns:
        pattern_rows.append([
            category_labels.get(row["category"], row["category"]),
            str(row["total"]),
            str(row["open_count"]),
            str(row["engagement_count"]),
            "Yes" if row["engagement_count"] >= 2 else "No",
        ])
    if len(pattern_rows) == 1:
        pattern_rows.append(["No findings recorded.", "", "", "", ""])
    story.append(styled_table(pattern_rows, widths=[45 * mm, 25 * mm, 22 * mm, 30 * mm, 25 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ------------------------------------------------------
    # Per-engagement statistics
    # ------------------------------------------------------
    story.append(Paragraph("Findings by Engagement", sub_heading))
    engagement_rows = [["Engagement", "Total", "Open", "Critical/Major", "Closed"]]
    per_engagement = (
        NonConformance.objects
        .values("engagement__engagement_code")
        .annotate(
            total=Count("id"),
            open_count=Count("id", filter=~Q(status="closed")),
            high_severity=Count(
                "id",
                filter=Q(severity__in=("major", "critical")),
            ),
            closed=Count("id", filter=Q(status="closed")),
        )
        .order_by("engagement__engagement_code")
    )
    for row in per_engagement:
        engagement_rows.append([
            row["engagement__engagement_code"],
            str(row["total"]),
            str(row["open_count"]),
            str(row["high_severity"]),
            str(row["closed"]),
        ])
    if len(engagement_rows) == 1:
        engagement_rows.append(["No findings recorded.", "", "", "", ""])
    story.append(styled_table(engagement_rows, widths=[42 * mm, 25 * mm, 25 * mm, 35 * mm, 25 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ------------------------------------------------------
    # Open monitoring alerts
    # ------------------------------------------------------
    story.append(Paragraph("Open Monitoring Alerts", sub_heading))
    alert_rows = [["Engagement", "Alert", "Severity", "Raised"]]
    open_alerts = (
        MonitoringAlert.objects
        .select_related("engagement")
        .filter(status="open")
        .order_by("-created_at")[:30]
    )
    for alert in open_alerts:
        alert_rows.append([
            alert.engagement.engagement_code,
            alert.title[:60],
            alert.severity.capitalize(),
            _fmt_datetime(alert.created_at),
        ])
    if len(alert_rows) == 1:
        alert_rows.append(["No open monitoring alerts.", "", "", ""])
    story.append(styled_table(alert_rows, widths=[30 * mm, 80 * mm, 25 * mm, 35 * mm]))
    story.append(Spacer(1, 6 * mm))

    # ------------------------------------------------------
    # Checklist scores
    # ------------------------------------------------------
    story.append(Paragraph("Checklist Scores by Engagement", sub_heading))
    checklist_rows = [["Engagement", "Checklist", "Score", "Rating"]]
    from apps.checklists.models import EngagementChecklist

    for checklist in (
        EngagementChecklist.objects
        .select_related("engagement")
        .filter(status="completed")
        .order_by("engagement__engagement_code")[:50]
    ):
        score = checklist.compute_score()
        checklist_rows.append([
            checklist.engagement.engagement_code,
            checklist.name[:50],
            f"{score['percent']}%" if score["percent"] is not None else "—",
            score["rating"],
        ])
    if len(checklist_rows) == 1:
        checklist_rows.append(["No completed checklists.", "", "", ""])
    story.append(styled_table(checklist_rows, widths=[30 * mm, 70 * mm, 25 * mm, 45 * mm]))

    document.build(story)
    buffer.seek(0)
    return buffer


class ConsolidatedReportView(APIView):
    """
    GET /api/reporting/consolidated.pdf

    Firm-wide consolidated findings report (all engagements).
    Restricted to manager/admin/partner roles.
    """

    def get(self, request):
        user = request.user
        if not user.is_superuser and user.role not in (
            "admin",
            "manager",
            "partner",
        ):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Only managers and administrators can generate "
                "the consolidated report."
            )

        buffer = build_consolidated_pdf()
        return FileResponse(
            buffer,
            as_attachment=True,
            filename="consolidated-findings-report.pdf",
            content_type="application/pdf",
        )
