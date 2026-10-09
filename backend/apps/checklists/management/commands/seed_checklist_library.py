"""
Seed the checklist library with prebuilt ISA-aligned
substantive test and fieldwork guidance templates.

Usage:
    python manage.py seed_checklist_library

Idempotent — existing templates with the same name are
left untouched.
"""

from django.core.management.base import BaseCommand

from apps.checklists.models import ChecklistItem, ChecklistTemplate


CONTENT_PACKS = [
    {
        "name": "Revenue Cycle — Substantive Tests",
        "category": "Substantive tests",
        "description": (
            "Fieldwork guidance for substantive testing of "
            "revenue, aligned with ISA 500/505/520."
        ),
        "items": [
            ("Obtain the revenue listing and agree totals to the trial balance.", "yes_no_na", 2, None, ""),
            ("Perform analytical procedures: compare current-year revenue by month/product to prior year and expectations.", "yes_no_na", 2, None, ""),
            ("Document and investigate fluctuations above the performance materiality threshold.", "yes_no_na", 2, "Perform analytical procedures: compare current-year revenue by month/product to prior year and expectations.", "no"),
            ("Test a sample of sales invoices to dispatch/delivery evidence for occurrence.", "yes_no_na", 3, None, ""),
            ("Perform cut-off testing around year-end on dispatch records and invoices.", "yes_no_na", 3, None, ""),
            ("Send receivable confirmations and evaluate responses (ISA 505).", "yes_no_na", 2, None, ""),
            ("Document alternative procedures for unanswered confirmations.", "yes_no_na", 1, "Send receivable confirmations and evaluate responses (ISA 505).", "no"),
            ("Review post-year-end credit notes for evidence of overstated revenue.", "yes_no_na", 2, None, ""),
            ("Assess revenue recognition policy against the applicable framework (IFRS 15).", "yes_no_na", 2, None, ""),
            ("Overall conclusion on revenue assertions.", "rating", 2, None, ""),
        ],
    },
    {
        "name": "Inventory — Substantive Tests",
        "category": "Substantive tests",
        "description": (
            "Substantive procedures for existence, completeness, "
            "and valuation of inventory (ISA 501)."
        ),
        "items": [
            ("Attend the physical inventory count and perform test counts (floor-to-sheet and sheet-to-floor).", "yes_no_na", 3, None, ""),
            ("Document count observations, including damaged or obsolete items.", "yes_no_na", 2, "Attend the physical inventory count and perform test counts (floor-to-sheet and sheet-to-floor).", "no"),
            ("Agree final inventory listing to the general ledger and trial balance.", "yes_no_na", 2, None, ""),
            ("Test inventory valuation: compare cost to net realisable value for a sample.", "yes_no_na", 3, None, ""),
            ("Review inventory provisioning policy and test its computation.", "yes_no_na", 2, None, ""),
            ("Perform cut-off testing on goods received and dispatched around year-end.", "yes_no_na", 2, None, ""),
            ("Confirm inventory held at third parties.", "yes_no_na", 1, None, ""),
            ("Overall conclusion on inventory assertions.", "rating", 2, None, ""),
        ],
    },
    {
        "name": "Payroll Cycle — Fieldwork Checklist",
        "category": "Fieldwork guidance",
        "description": (
            "Step-by-step payroll fieldwork guidance covering "
            "occurrence, accuracy, and authorisation."
        ),
        "items": [
            ("Obtain the payroll register and cast/verify totals to the general ledger.", "yes_no_na", 2, None, ""),
            ("Reconcile payroll expense per TB to payroll records.", "yes_no_na", 2, None, ""),
            ("Test a sample of employees to contracts/HR records for existence and rate accuracy.", "yes_no_na", 3, None, ""),
            ("Verify statutory deductions (PAYE, social security) computations and remittances.", "yes_no_na", 3, None, ""),
            ("Test joiners and leavers for correct start/termination pay.", "yes_no_na", 2, None, ""),
            ("Review segregation of duties between HR, payroll processing, and payment approval.", "yes_no_na", 2, None, ""),
            ("Document any control deficiencies identified for the NC register.", "yes_no_na", 1, "Review segregation of duties between HR, payroll processing, and payment approval.", "no"),
            ("Perform analytical review of monthly payroll costs.", "yes_no_na", 1, None, ""),
            ("Overall conclusion on payroll assertions.", "rating", 2, None, ""),
        ],
    },
    {
        "name": "IT General Controls (ITGC)",
        "category": "Information systems audit",
        "description": (
            "IT general controls review covering security, data "
            "integrity, availability, and privacy — aligned with "
            "IS-audit assurance over systems development, "
            "implementation, support, and maintenance."
        ),
        "items": [
            ("Review logical access: user provisioning, de-provisioning, and periodic access reviews are documented.", "yes_no_na", 3, None, ""),
            ("Verify privileged/administrator accounts are restricted and monitored.", "yes_no_na", 3, None, ""),
            ("Inspect the change-management process: changes are requested, approved, tested, and migrated by separate roles.", "yes_no_na", 3, None, ""),
            ("Document deficiencies where developers can migrate code to production directly.", "yes_no_na", 2, "Inspect the change-management process: changes are requested, approved, tested, and migrated by separate roles.", "no"),
            ("Verify backup schedules, off-site storage, and restoration tests are performed and evidenced.", "yes_no_na", 3, None, ""),
            ("Review the disaster-recovery plan and the date of its last live test.", "yes_no_na", 2, None, ""),
            ("Assess data-integrity controls: input validation, interface reconciliations, and error logs are reviewed.", "yes_no_na", 2, None, ""),
            ("Confirm system availability monitoring and incident tracking with resolution times.", "yes_no_na", 2, None, ""),
            ("Review password/authentication policy against the security policy (MFA where applicable).", "yes_no_na", 2, None, ""),
            ("Verify personal-data handling meets privacy requirements (access logs, retention, sharing).", "yes_no_na", 2, None, ""),
            ("Review vendor/third-party IT service agreements and their monitoring.", "yes_no_na", 1, None, ""),
            ("Overall conclusion on IT general controls.", "rating", 2, None, ""),
        ],
    },
]


class Command(BaseCommand):
    help = (
        "Seed the checklist library with prebuilt ISA-aligned "
        "substantive test templates (idempotent)."
    )

    def handle(self, *args, **options):
        created_count = 0

        for pack in CONTENT_PACKS:
            template, created = (
                ChecklistTemplate.objects.get_or_create(
                    name=pack["name"],
                    defaults={
                        "category": pack["category"],
                        "description": pack["description"],
                    },
                )
            )

            if not created:
                self.stdout.write(
                    f"Skipped existing template: {template.name}"
                )
                continue

            id_map = {}
            for order, row in enumerate(pack["items"], start=1):
                (
                    question,
                    response_type,
                    weight,
                    parent_question,
                    condition_value,
                ) = row
                item = ChecklistItem.objects.create(
                    template=template,
                    order=order,
                    question=question,
                    response_type=response_type,
                    weight=weight,
                    condition_value=condition_value,
                )
                id_map[question] = item

            for row in pack["items"]:
                question, _, _, parent_question, _ = row
                if parent_question and parent_question in id_map:
                    id_map[question].parent = id_map[parent_question]
                    id_map[question].save(update_fields=["parent"])

            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created template: {template.name} "
                    f"({len(pack['items'])} questions)"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created_count} checklist template(s)."
            )
        )
