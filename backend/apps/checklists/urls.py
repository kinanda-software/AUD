from rest_framework.routers import DefaultRouter

from .views import (
    ChecklistItemViewSet,
    ChecklistTemplateViewSet,
    EngagementChecklistViewSet,
)


router = DefaultRouter()

router.register(
    "checklist-templates",
    ChecklistTemplateViewSet,
    basename="checklist-template",
)

router.register(
    "checklist-items",
    ChecklistItemViewSet,
    basename="checklist-item",
)

router.register(
    "engagement-checklists",
    EngagementChecklistViewSet,
    basename="engagement-checklist",
)

urlpatterns = router.urls
