from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .auth_views import LoginView, LogoutView, MeView, RegisterView
from .views import GuitarSongViewSet, GlobalChordViewSet, SetlistViewSet

router = DefaultRouter()
router.register(r'songs', GuitarSongViewSet, basename='song')
router.register(r'setlists', SetlistViewSet, basename='setlist')
router.register(r'global-chords', GlobalChordViewSet, basename='global-chord')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]
