from django.apps import AppConfig


class FinancialsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.financials"
    verbose_name = "Financials"

    def ready(self):
        from .accounting_controls import connect_financial_signals

        connect_financial_signals()
