import random
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ClientRegistration
from .serializers import (
    ClientRegistrationPublicSerializer,
    ClientRegistrationSerializer,
)

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def _generate_otp(registration):
    registration.otp_code = f"{random.randint(0, 999999):06d}"
    registration.otp_expires_at = (
        timezone.now() + timedelta(minutes=OTP_TTL_MINUTES)
    )
    registration.otp_attempts = 0
    registration.save(
        update_fields=[
            "otp_code",
            "otp_expires_at",
            "otp_attempts",
            "updated_at",
        ]
    )


def _send_otp_email(registration):
    message = (
        f"Hello {registration.contact_person},\n\n"
        f"Your AUD Platform client registration code is:\n\n"
        f"    {registration.otp_code}\n\n"
        f"The code expires in {OTP_TTL_MINUTES} minutes.\n"
        f"Reference: {registration.reference}\n\n"
        f"If you did not start this registration, ignore this email.\n\n"
        f"AUD Platform"
    )
    try:
        send_mail(
            subject="AUD Platform Client Registration Code",
            message=message,
            from_email=getattr(
                settings,
                "DEFAULT_FROM_EMAIL",
                "no-reply@aud.local",
            ),
            recipient_list=[registration.contact_email],
            fail_silently=False,
        )
    except Exception as exc:  # pragma: no cover - dev console backend
        print("CLIENT PORTAL OTP EMAIL ERROR:", exc)


def _require_staff(user):
    if not user.is_superuser and user.role not in (
        "admin",
        "manager",
        "partner",
        "auditor",
    ):
        raise PermissionDenied(
            "Only firm staff can review client registrations."
        )


class ClientRegisterView(APIView):
    """
    POST /api/client-portal/register/

    Public endpoint: a prospective client submits company and
    contact details. An OTP is emailed for verification.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = ClientRegistrationPublicSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data[
            "contact_email"
        ].lower()

        existing = ClientRegistration.objects.filter(
            contact_email__iexact=email,
            status__in=(
                ClientRegistration.Status.PENDING,
                ClientRegistration.Status.VERIFIED,
            ),
        ).first()

        if existing is not None:
            # Refresh the OTP for the in-flight registration
            # instead of creating a duplicate.
            for field, value in serializer.validated_data.items():
                setattr(existing, field, value)
            existing.contact_email = email
            existing.status = ClientRegistration.Status.PENDING
            existing.save()
            registration = existing
        else:
            registration = serializer.save(
                contact_email=email
            )

        _generate_otp(registration)
        _send_otp_email(registration)

        response_data = {
            "registration_id": registration.id,
            "reference": registration.reference,
            "message": (
                "Registration received. A verification code has "
                "been sent to the contact email address."
            ),
        }
        # Development convenience only.
        if settings.DEBUG:
            response_data["otp"] = registration.otp_code

        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
        )


class ClientVerifyView(APIView):
    """
    POST /api/client-portal/verify/

    Public endpoint: verify the emailed OTP. Limited attempts
    and a 10-minute expiry protect the code.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        registration_id = request.data.get("registration_id")
        code = str(request.data.get("otp") or "").strip()

        if not registration_id or not code:
            raise ValidationError(
                "registration_id and otp are required."
            )

        try:
            registration = ClientRegistration.objects.get(
                pk=registration_id
            )
        except ClientRegistration.DoesNotExist:
            raise ValidationError("Registration not found.")

        if registration.status == ClientRegistration.Status.VERIFIED:
            return Response({
                "status": registration.status,
                "message": "This registration is already verified.",
            })

        if (
            registration.otp_expires_at is None
            or registration.otp_expires_at < timezone.now()
        ):
            raise ValidationError(
                "The verification code has expired. "
                "Request a new one."
            )

        if registration.otp_attempts >= OTP_MAX_ATTEMPTS:
            raise ValidationError(
                "Too many attempts. Request a new code."
            )

        if code != registration.otp_code:
            registration.otp_attempts += 1
            registration.save(
                update_fields=["otp_attempts", "updated_at"]
            )
            raise ValidationError("Incorrect verification code.")

        registration.status = ClientRegistration.Status.VERIFIED
        registration.otp_code = ""
        registration.otp_expires_at = None
        registration.save(
            update_fields=[
                "status",
                "otp_code",
                "otp_expires_at",
                "updated_at",
            ]
        )

        return Response({
            "status": registration.status,
            "message": (
                "Email verified. The firm will review your "
                "registration."
            ),
        })


class ClientResendOtpView(APIView):
    """POST /api/client-portal/resend/ — issue a fresh OTP."""

    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        registration_id = request.data.get("registration_id")

        try:
            registration = ClientRegistration.objects.get(
                pk=registration_id
            )
        except ClientRegistration.DoesNotExist:
            raise ValidationError("Registration not found.")

        if registration.status != ClientRegistration.Status.PENDING:
            raise ValidationError(
                "This registration is no longer pending verification."
            )

        _generate_otp(registration)
        _send_otp_email(registration)

        response_data = {
            "message": "A new verification code has been sent."
        }
        if settings.DEBUG:
            response_data["otp"] = registration.otp_code
        return Response(response_data)


class ClientRegistrationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Staff-facing registration review list with approve and
    reject actions. Approving creates the Client record.
    """

    queryset = ClientRegistration.objects.select_related(
        "client"
    ).all()
    serializer_class = ClientRegistrationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        _require_staff(request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        registration = self.get_object()

        if registration.status == ClientRegistration.Status.APPROVED:
            raise ValidationError("Already approved.")
        if registration.status != ClientRegistration.Status.VERIFIED:
            raise ValidationError(
                "Only email-verified registrations can be approved."
            )

        from apps.clients.models import Client

        base_code = (
            registration.registration_number.strip()
            or f"REG{registration.pk:05d}"
        )
        client_code = base_code
        suffix = 1
        while Client.objects.filter(
            client_code=client_code
        ).exists():
            suffix += 1
            client_code = f"{base_code}-{suffix}"

        client = Client.objects.create(
            client_code=client_code,
            legal_name=registration.legal_name,
            registration_number=registration.registration_number,
            license_authority=registration.license_authority,
            license_expiry_date=registration.license_expiry_date,
            industry=registration.industry,
            contact_person=registration.contact_person,
            contact_email=registration.contact_email,
            contact_phone=registration.contact_phone,
            address=registration.address,
            status=Client.ClientStatus.ONBOARDING,
        )

        registration.status = ClientRegistration.Status.APPROVED
        registration.client = client
        registration.review_notes = request.data.get(
            "review_notes", registration.review_notes
        )
        registration.save(
            update_fields=[
                "status",
                "client",
                "review_notes",
                "updated_at",
            ]
        )

        return Response(
            ClientRegistrationSerializer(registration).data
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        registration = self.get_object()

        if registration.status == ClientRegistration.Status.APPROVED:
            raise ValidationError(
                "An approved registration cannot be rejected."
            )

        registration.status = ClientRegistration.Status.REJECTED
        registration.review_notes = request.data.get(
            "review_notes", registration.review_notes
        )
        registration.save(
            update_fields=["status", "review_notes", "updated_at"]
        )

        return Response(
            ClientRegistrationSerializer(registration).data
        )
