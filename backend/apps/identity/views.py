from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import (
    force_bytes,
    force_str,
)
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
import json
from django.shortcuts import get_object_or_404
from django.db.models.deletion import ProtectedError

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from .models import User
from .permissions import (
    IsAdministrator,
    CanViewAuditTeamUsers,
)
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
)


def cors_response(data, status=200, methods="GET, POST, OPTIONS"):
    response = JsonResponse(data, status=status)

    response["Access-Control-Allow-Methods"] = methods
    response["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, X-CSRFToken"
    )

    return response


@ensure_csrf_cookie
def csrf_token_view(request):
    return JsonResponse(
        {"detail": "CSRF cookie set."},
        status=200,
    )


@csrf_exempt
def login_view(request):

    # ---------------------------------------------------------
    # HANDLE BROWSER CORS PREFLIGHT
    # ---------------------------------------------------------
    if request.method == "OPTIONS":
        return cors_response(
            {"message": "CORS preflight successful."},
            status=200,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # ONLY POST IS ALLOWED FOR LOGIN
    # ---------------------------------------------------------
    if request.method != "POST":
        return cors_response(
            {"error": "Only POST requests are allowed."},
            status=405,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # READ JSON BODY
    # ---------------------------------------------------------
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return cors_response(
            {"error": "Invalid JSON."},
            status=400,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # GET USERNAME AND PASSWORD
    # ---------------------------------------------------------
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return cors_response(
            {
                "error": "Username and password are required."
            },
            status=400,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # AUTHENTICATE USER
    # ---------------------------------------------------------
    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None:
        return cors_response(
            {
                "error": "Invalid username or password."
            },
            status=401,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # CHECK ACTIVE STATUS
    # ---------------------------------------------------------
    if not user.is_active:
        return cors_response(
            {
                "error": "This account is inactive."
            },
            status=403,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # CREATE / GET DRF API TOKEN
    #
    # This is required because the audit API uses:
    #
    # Authorization: Token <token>
    #
    # TokenAuthentication
    # ---------------------------------------------------------
    token, _ = Token.objects.get_or_create(
        user=user
    )

    # ---------------------------------------------------------
    # CREATE DJANGO SESSION
    #
    # This keeps /api/auth/me/ working with browser sessions.
    # ---------------------------------------------------------
    login(request, user)

    # ---------------------------------------------------------
    # SUCCESS
    # ---------------------------------------------------------
    return cors_response(
        {
            "message": "Login successful.",

            # IMPORTANT:
            # Frontend stores this as audit-token.
            "token": token.key,

            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "role": user.role,
            },
        },
        status=200,
        methods="POST, OPTIONS",
    )


@csrf_exempt
def logout_view(request):

    # ---------------------------------------------------------
    # HANDLE CORS PREFLIGHT
    # ---------------------------------------------------------
    if request.method == "OPTIONS":
        return cors_response(
            {"message": "CORS preflight successful."},
            status=200,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # ONLY POST IS ALLOWED
    # ---------------------------------------------------------
    if request.method != "POST":
        return cors_response(
            {"error": "Only POST requests are allowed."},
            status=405,
            methods="POST, OPTIONS",
        )

    # ---------------------------------------------------------
    # LOGOUT
    # ---------------------------------------------------------
    logout(request)

    return cors_response(
        {
            "message": "Logout successful."
        },
        status=200,
        methods="POST, OPTIONS",
    )


@api_view(["GET", "OPTIONS"])
@permission_classes([AllowAny])
def current_user_view(request):

    # ---------------------------------------------------------
    # HANDLE CORS PREFLIGHT
    # ---------------------------------------------------------
    if request.method == "OPTIONS":
        return cors_response(
            {"message": "CORS preflight successful."},
            status=200,
            methods="GET, OPTIONS",
        )

    # ---------------------------------------------------------
    # ONLY GET IS ALLOWED
    # ---------------------------------------------------------
    if request.method != "GET":
        return cors_response(
            {"error": "Only GET requests are allowed."},
            status=405,
            methods="GET, OPTIONS",
        )

    # ---------------------------------------------------------
    # CHECK AUTHENTICATION
    # ---------------------------------------------------------
    if not request.user.is_authenticated:
        return cors_response(
            {
                "authenticated": False
            },
            status=401,
            methods="GET, OPTIONS",
        )

    # ---------------------------------------------------------
    # RETURN CURRENT USER
    # ---------------------------------------------------------
    return cors_response(
        {
            "authenticated": True,
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "email": request.user.email,
                "role": request.user.role,
            },
        },
        status=200,
        methods="GET, OPTIONS",
    )


# =========================================================
# AUDIT TEAM USER SELECTION
# =========================================================

@api_view(["GET"])
@permission_classes([CanViewAuditTeamUsers])
def audit_team_users_view(request):
    """
    Return active users who can be selected for an audit team.

    This endpoint is separate from the administrator-only
    /users/ endpoint.
    """

    users = (
        User.objects
        .filter(is_active=True)
        .order_by(
            "first_name",
            "last_name",
            "username",
        )
    )

    serializer = UserSerializer(
        users,
        many=True,
    )

    return Response(
        {
            "count": users.count(),
            "users": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# =========================================================
# USER MANAGEMENT
# =========================================================

@api_view(["GET", "POST"])
@permission_classes([IsAdministrator])
def users_view(request):

    # -----------------------------------------------------
    # LIST USERS
    # -----------------------------------------------------
    if request.method == "GET":
        users = User.objects.all().order_by("-date_joined")

        serializer = UserSerializer(
            users,
            many=True,
        )

        return Response(
            {
                "count": users.count(),
                "users": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------
    serializer = UserCreateSerializer(
        data=request.data,
    )

    if serializer.is_valid():
        user = serializer.save()

        return Response(
            {
                "message": "User created successfully.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {
            "error": "Unable to create user.",
            "details": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAdministrator])
def user_detail_view(request, user_id):

    user = get_object_or_404(
        User,
        id=user_id,
    )

    # -----------------------------------------------------
    # GET USER
    # -----------------------------------------------------
    if request.method == "GET":
        serializer = UserSerializer(user)

        return Response(
            {
                "user": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # -----------------------------------------------------
    # UPDATE USER
    # -----------------------------------------------------
    if request.method in ["PUT", "PATCH"]:

        partial = request.method == "PATCH"

        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=partial,
        )

        if serializer.is_valid():
            updated_user = serializer.save()

            return Response(
                {
                    "message": "User updated successfully.",
                    "user": UserSerializer(updated_user).data,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "error": "Unable to update user.",
                "details": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # -----------------------------------------------------
    # DELETE USER
    # -----------------------------------------------------
    if request.method == "DELETE":

        # Prevent administrator from deleting their own account.
        if user.id == request.user.id:
            return Response(
                {
                    "error": "You cannot delete your own account."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = user.username

        try:
            user.delete()
        except ProtectedError:
            return Response(
                {
                    "error": (
                        "This user is linked to audit review records and cannot be deleted. "
                        "Deactivate the account instead to preserve the audit history."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "message": f"User '{username}' deleted successfully."
            },
            status=status.HTTP_200_OK,
        )
# =========================================================
# PASSWORD RESET
# =========================================================

@csrf_exempt
def password_reset_request_view(request):
    """
    Request a password reset link using the user's email address.

    The response intentionally does not reveal whether the email
    exists. In DEBUG mode, a reset URL is also returned to make
    local development/testing easy.
    """

    if request.method == "OPTIONS":
        return cors_response(
            {"message": "CORS preflight successful."},
            status=200,
            methods="POST, OPTIONS",
        )

    if request.method != "POST":
        return cors_response(
            {"error": "Only POST requests are allowed."},
            status=405,
            methods="POST, OPTIONS",
        )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return cors_response(
            {"error": "Invalid JSON."},
            status=400,
            methods="POST, OPTIONS",
        )

    email = str(data.get("email", "")).strip().lower()

    if not email:
        return cors_response(
            {"error": "Email address is required."},
            status=400,
            methods="POST, OPTIONS",
        )

    users = User.objects.filter(
        email__iexact=email,
        is_active=True,
    ).order_by("id")

    reset_url = None

    user = users.first()

    if user:
        uid = urlsafe_base64_encode(
            force_bytes(user.pk)
        )

        token = default_token_generator.make_token(
            user
        )

        frontend_url = getattr(
            settings,
            "FRONTEND_URL",
            "http://localhost:3000",
        ).rstrip("/")

        reset_url = (
            f"{frontend_url}/reset-password/"
            f"{uid}/{token}"
        )

        message = (
            f"Hello {user.first_name or user.username},\n\n"
            f"You requested a password reset for your AUD Platform account.\n\n"
            f"Open this link to set a new password:\n"
            f"{reset_url}\n\n"
            f"If you did not request this reset, you can ignore this email.\n\n"
            f"AUD Platform"
        )

        try:
            send_mail(
                subject="AUD Platform Password Reset",
                message=message,
                from_email=getattr(
                    settings,
                    "DEFAULT_FROM_EMAIL",
                    "no-reply@aud.local",
                ),
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as exc:
            print(
                "PASSWORD RESET EMAIL ERROR:",
                exc,
            )

    response_data = {
        "message": (
            "If an active account exists for that email address, "
            "a password reset link has been sent."
        )
    }

    # Development convenience only.
    if settings.DEBUG and reset_url:
        response_data["reset_url"] = reset_url

    return cors_response(
        response_data,
        status=200,
        methods="POST, OPTIONS",
    )


@csrf_exempt
def password_reset_confirm_view(request):
    """
    Confirm a password reset using Django's secure UID/token pair.
    """

    if request.method == "OPTIONS":
        return cors_response(
            {"message": "CORS preflight successful."},
            status=200,
            methods="POST, OPTIONS",
        )

    if request.method != "POST":
        return cors_response(
            {"error": "Only POST requests are allowed."},
            status=405,
            methods="POST, OPTIONS",
        )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return cors_response(
            {"error": "Invalid JSON."},
            status=400,
            methods="POST, OPTIONS",
        )

    uidb64 = str(data.get("uid", "")).strip()
    token = str(data.get("token", "")).strip()
    new_password = str(
        data.get("new_password", "")
    )

    if not uidb64 or not token:
        return cors_response(
            {"error": "Invalid password reset link."},
            status=400,
            methods="POST, OPTIONS",
        )

    if not new_password:
        return cors_response(
            {"error": "New password is required."},
            status=400,
            methods="POST, OPTIONS",
        )

    try:
        uid = force_str(
            urlsafe_base64_decode(uidb64)
        )

        user = User.objects.get(
            pk=uid,
            is_active=True,
        )
    except (
        TypeError,
        ValueError,
        OverflowError,
        User.DoesNotExist,
    ):
        return cors_response(
            {"error": "Invalid or expired password reset link."},
            status=400,
            methods="POST, OPTIONS",
        )

    if not default_token_generator.check_token(
        user,
        token,
    ):
        return cors_response(
            {"error": "Invalid or expired password reset link."},
            status=400,
            methods="POST, OPTIONS",
        )

    try:
        validate_password(
            new_password,
            user=user,
        )
    except Exception as exc:
        messages = [
            str(message)
            for message in getattr(
                exc,
                "messages",
                [],
            )
        ]

        return cors_response(
            {
                "error": (
                    messages[0]
                    if messages
                    else "The new password does not meet the password requirements."
                )
            },
            status=400,
            methods="POST, OPTIONS",
        )

    user.set_password(new_password)
    user.save(
        update_fields=["password"]
    )

    # Force API re-authentication after password reset.
    Token.objects.filter(
        user=user
    ).delete()

    return cors_response(
        {
            "message": (
                "Your password has been reset successfully. "
                "Please sign in with your new password."
            )
        },
        status=200,
        methods="POST, OPTIONS",
    )
