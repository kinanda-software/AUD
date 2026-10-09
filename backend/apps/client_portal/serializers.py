from rest_framework import serializers

from .models import ClientRegistration


class ClientRegistrationPublicSerializer(serializers.ModelSerializer):
    """Payload accepted from the public registration form."""

    class Meta:
        model = ClientRegistration
        fields = (
            "legal_name",
            "registration_number",
            "license_authority",
            "license_expiry_date",
            "industry",
            "contact_person",
            "contact_email",
            "contact_phone",
            "address",
        )


class ClientRegistrationSerializer(serializers.ModelSerializer):
    """Staff-facing representation (never exposes the OTP)."""

    client_code = serializers.CharField(
        source="client.client_code",
        read_only=True,
    )

    class Meta:
        model = ClientRegistration
        fields = (
            "id",
            "reference",
            "legal_name",
            "registration_number",
            "license_authority",
            "license_expiry_date",
            "industry",
            "contact_person",
            "contact_email",
            "contact_phone",
            "address",
            "status",
            "review_notes",
            "client",
            "client_code",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reference",
            "status",
            "client",
            "created_at",
            "updated_at",
        )
