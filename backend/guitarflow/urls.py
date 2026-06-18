from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GuitarSongViewSet

router = DefaultRouter()
router.register(r'songs', GuitarSongViewSet, basename='song')

urlpatterns = [
    path('', include(router.urls)),
]
