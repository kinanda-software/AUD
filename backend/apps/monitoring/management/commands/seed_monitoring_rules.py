"""
Seed default firm-wide continuous-monitoring rules.

Usage:
    python manage.py seed_monitoring_rules

Idempotent — existing rules with the same name and scope
are left untouched.
"""

from django.core.management.base import BaseCommand

from apps.monitoring.models import MonitoringRule


DEFAULT_RULES = [
    {
        "name": "Large posting over 1,000,000",
        "rule_type": MonitoringRule.RuleType.LARGE_AMOUNT,
        "parameters": {"threshold": 1000000},
        "severity": MonitoringRule.Severity.HIGH,
    },
    {
        "name": "Round-number amount (100,000+)",
        "rule_type": MonitoringRule.RuleType.ROUND_NUMBER,
        "parameters": {"min_amount": 100000},
        "severity": MonitoringRule.Severity.MEDIUM,
    },
    {
        "name": "Weekend or off-hours posting",
        "rule_type": MonitoringRule.RuleType.OFF_HOURS,
        "parameters": {},
        "severity": MonitoringRule.Severity.MEDIUM,
    },
    {
        "name": "Backdated transaction (30+ days)",
        "rule_type": MonitoringRule.RuleType.BACKDATED,
        "parameters": {"max_age_days": 30},
        "severity": MonitoringRule.Severity.LOW,
    },
]


class Command(BaseCommand):
    help = "Seed default global continuous-monitoring rules."

    def handle(self, *args, **options):
        created_count = 0
        for definition in DEFAULT_RULES:
            _, created = MonitoringRule.objects.get_or_create(
                name=definition["name"],
                engagement=None,
                defaults={
                    "rule_type": definition["rule_type"],
                    "parameters": definition["parameters"],
                    "severity": definition["severity"],
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created rule: {definition['name']}"
                    )
                )
            else:
                self.stdout.write(
                    f"Skipped existing rule: {definition['name']}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created_count} monitoring rule(s)."
            )
        )
