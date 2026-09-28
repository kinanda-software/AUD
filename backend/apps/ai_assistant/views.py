
import os

from django.conf import settings
from django.middleware.csrf import get_token

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from openai import OpenAI


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def csrf_token(request):
    return Response({
        "csrfToken": get_token(request),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    """
    AUD AI Assistant endpoint.

    Receives:
        {
            "message": "What are the main risks in revenue?"
        }

    Returns:
        {
            "reply": "..."
        }
    """

    message = request.data.get("message", "").strip()

    if not message:
        return Response(
            {
                "error": "Message is required."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get the API key from Django settings.
    # Fall back to the environment variable if necessary.
    api_key = (
        getattr(settings, "OPENAI_API_KEY", None)
        or os.getenv("OPENAI_API_KEY")
    )

    if not api_key:
        return Response(
            {
                "error": "OpenAI API key is not configured on the server."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Remove accidental spaces/newlines around the key.
    api_key = api_key.strip()

    try:
        client = OpenAI(
            api_key=api_key
        )

        response = client.responses.create(
            model="gpt-5.6-luna",
            instructions="""
You are the AUD AI Assistant, an AI assistant built into an
Audit Management System.

Your role is to assist auditors with:

- Audit planning
- Risk assessment
- Audit procedures
- Internal controls
- Audit evidence
- Audit findings
- Misstatements
- Financial statement auditing
- Compliance auditing
- IT auditing
- Audit documentation
- Review and approval workflows
- Audit reporting
- Professional audit concepts

Give clear, practical and structured answers.

When useful, organize answers using:

1. Objective
2. Risk
3. Recommended procedure
4. Evidence
5. Expected conclusion

Do not pretend to have reviewed audit evidence, client documents,
financial records, or system data unless that information has
actually been provided to you.

Do not invent facts.

You are an advisory assistant. The auditor remains responsible
for professional judgment, conclusions, and final audit decisions.

Use simple professional language unless the user asks for
technical detail.
""",
            input=message,
        )

        return Response(
            {
                "reply": response.output_text,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        error_text = str(exc)

        # Do not expose the API key itself to the frontend.
        if "invalid_api_key" in error_text.lower():
            return Response(
                {
                    "error": "OpenAI authentication failed.",
                    "details": (
                        "The OpenAI API key was rejected. "
                        "Check the OPENAI_API_KEY value in the server environment."
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "error": "The AI Assistant could not process your request.",
                "details": error_text,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

