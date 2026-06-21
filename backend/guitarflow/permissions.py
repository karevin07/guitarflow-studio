from rest_framework.permissions import BasePermission


class IsSongOwner(BasePermission):
    """Only the song owner may modify; legacy songs (owner=null) are shared among authenticated users."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if obj.owner_id is None:
            return True
        return obj.owner_id == request.user.id

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
