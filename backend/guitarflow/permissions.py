from rest_framework.permissions import BasePermission


class IsSongOwner(BasePermission):
    """Only the song owner may read or change it; the queryset already hides other users' songs."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return obj.owner_id == request.user.id

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
