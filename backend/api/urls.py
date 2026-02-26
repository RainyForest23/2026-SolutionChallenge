from django.urls import path
from . import views

urlpatterns = [
    path("analyze", views.analyze, name="analyze"),
    path("status", views.status, name="status"),
    path("result", views.result, name="result"),
    path("me", views.me, name="me"),
]