from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("review_workflow", "0002_summaryreview"),
    ]
    operations = [
        migrations.AddField(
            model_name="summaryreview", name="review_areas",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name="EngagementWorkpaper",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("section", models.CharField(max_length=64)),
                ("data", models.JSONField(default=dict)),
                ("completion_status", models.CharField(default="In Progress", max_length=30)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("engagement", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="structured_workpapers", to="engagements.engagement")),
            ],
            options={"constraints": [
                models.UniqueConstraint(fields=("engagement", "section"), name="unique_engagement_workpaper"),
            ]},
        ),
    ]
