from django.urls import path

from .views import ai_chat, csrf_token


urlpatterns = [
    path("csrf/", csrf_token, name="ai-csrf-token"),
    path("chat/", ai_chat, name="ai-chat"),
]