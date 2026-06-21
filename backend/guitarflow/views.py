from django.db.models import Q
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .import_utils import detect_import_format, is_allowed_import_file, title_from_file_name
from .models import GuitarSong, GlobalChord
from .pagination import SongListPagination
from .permissions import IsSongOwner
from .serializers import GuitarSongSerializer, GlobalChordSerializer


class GuitarSongViewSet(viewsets.ModelViewSet):
    serializer_class = GuitarSongSerializer
    permission_classes = [IsAuthenticated, IsSongOwner]
    pagination_class = SongListPagination

    def get_queryset(self):
        user = self.request.user
        qs = GuitarSong.objects.filter(Q(owner=user) | Q(owner__isnull=True)).order_by('-last_modified')
        source = self.request.query_params.get('source')
        if source:
            qs = qs.filter(source=source)
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(title__icontains=search)
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

    @action(detail=False, methods=['post'], url_path='claim-legacy')
    def claim_legacy(self, request):
        claimed = GuitarSong.objects.filter(owner__isnull=True).update(owner=request.user)
        return Response({'claimed': claimed})

    @action(
        detail=False,
        methods=['post'],
        url_path='import-score',
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_score(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_allowed_import_file(upload.name):
            return Response(
                {'detail': 'Unsupported file type. Upload a Guitar Pro or MusicXML file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = (request.data.get('title') or '').strip() or title_from_file_name(upload.name)
        import_format = detect_import_format(upload.name)

        song = GuitarSong.objects.create(
            title=title,
            source=GuitarSong.SOURCE_IMPORTED,
            import_format=import_format,
            import_file_name=upload.name,
            import_file=upload,
            owner=request.user,
        )

        serializer = self.get_serializer(song)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='score-file')
    def score_file(self, request, pk=None):
        song = self.get_object()
        if song.source != GuitarSong.SOURCE_IMPORTED or not song.import_file:
            return Response({'detail': 'Score file not found.'}, status=status.HTTP_404_NOT_FOUND)

        file_handle = song.import_file.open('rb')
        response = FileResponse(file_handle, as_attachment=False)
        response['Content-Type'] = 'application/octet-stream'
        if song.import_file_name:
            response['Content-Disposition'] = f'inline; filename="{song.import_file_name}"'
        return response


class GlobalChordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GlobalChord.objects.all().order_by('name')
    serializer_class = GlobalChordSerializer
    permission_classes = [AllowAny]
