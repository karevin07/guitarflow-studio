from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GuitarSongViewSet, GlobalChordViewSet

router = DefaultRouter()
router.register(r'songs', GuitarSongViewSet, basename='song')
router.register(r'global-chords', GlobalChordViewSet, basename='global-chord')

urlpatterns = [
    path('', include(router.urls)),
]
