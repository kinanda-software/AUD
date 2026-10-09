"""
Wires continuous monitoring into the financials app's
existing audit-event pipeline: every financial mutation
already produces a FinancialAuditEvent; monitoring simply
listens for those events and evaluates rules against them.
"""

from django.db.models.signals import post_save


def connect_monitoring_signals():
    from apps.financials.models import FinancialAuditEvent

    post_save.connect(
        _on_financial_event,
        sender=FinancialAuditEvent,
        weak=False,
        dispatch_uid="monitoring.evaluate_financial_event",
    )


def _on_financial_event(sender, instance, created, **kwargs):
    if not created:
        return
    from .engine import evaluate_event

    evaluate_event(instance)


connect_monitoring_signals()
