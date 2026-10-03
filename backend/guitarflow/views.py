from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import GuitarSong, GlobalChord, Setlist
from .pagination import SongListPagination
from .permissions import IsSongOwner
from .serializers import GuitarSongSerializer, GlobalChordSerializer, SetlistSerializer, SongInfoSerializer


class GuitarSongViewSet(viewsets.ModelViewSet):
    serializer_class = GuitarSongSerializer
    permission_classes = [IsAuthenticated, IsSongOwner]
    pagination_class = SongListPagination

    def get_queryset(self):
        user = self.request.user
        qs = GuitarSong.objects.filter(Q(owner=user) | Q(owner__isnull=True)).order_by('-last_modified')
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(artist__icontains=search))
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'], url_path='claim')
    def claim(self, request, pk=None):
        song = self.get_object()
        if song.owner_id is not None:
            return Response({'detail': 'Song is already owned.'}, status=status.HTTP_400_BAD_REQUEST)
        song.owner = request.user
        song.save(update_fields=['owner'])
        serializer = self.get_serializer(song)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='info')
    def info(self, request, pk=None):
        song = self.get_object()
        serializer = SongInfoSerializer(song, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self.get_serializer(song).data)

    @action(detail=False, methods=['post'], url_path='claim-legacy')
    def claim_legacy(self, request):
        claimed = GuitarSong.objects.filter(owner__isnull=True).update(owner=request.user)
        return Response({'claimed': claimed})


class SetlistViewSet(viewsets.ModelViewSet):
    serializer_class = SetlistSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Setlist.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class GlobalChordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GlobalChord.objects.all().order_by('name')
    serializer_class = GlobalChordSerializer
    permission_classes = [AllowAny]
