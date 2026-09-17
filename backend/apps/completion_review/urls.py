from rest_framework.routers import DefaultRouter
from .views import CompletionReviewViewSet


router = DefaultRouter()

router.register(
    r"completion-reviews",
    CompletionReviewViewSet,
    basename="completion-review",
)

urlpatterns = router.urls
