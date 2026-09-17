from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
import json
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

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

    response["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response["Access-Control-Allow-Credentials"] = "true"
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
    # CREATE DJANGO SESSION
    # ---------------------------------------------------------
    login(request, user)

    # ---------------------------------------------------------
    # SUCCESS
    # ---------------------------------------------------------
    return cors_response(
        {
            "message": "Login successful.",
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

        user.delete()

        return Response(
            {
                "message": f"User '{username}' deleted successfully."
            },
            status=status.HTTP_200_OK,
        )