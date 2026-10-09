from rest_framework.routers import DefaultRouter

from .views import ReviewPointViewSet


router = DefaultRouter()

router.register(
    "review-points",
    ReviewPointViewSet,
    basename="review-point",
)

urlpatterns = router.urls
