from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ClientRegisterView,
    ClientRegistrationViewSet,
    ClientResendOtpView,
    ClientVerifyView,
)


router = DefaultRouter()

router.register(
    "client-portal/registrations",
    ClientRegistrationViewSet,
    basename="client-registration",
)

urlpatterns = [
    path(
        "client-portal/register/",
        ClientRegisterView.as_view(),
        name="client-portal-register",
    ),
    path(
        "client-portal/verify/",
        ClientVerifyView.as_view(),
        name="client-portal-verify",
    ),
    path(
        "client-portal/resend/",
        ClientResendOtpView.as_view(),
        name="client-portal-resend",
    ),
] + router.urls
