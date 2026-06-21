from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .import_utils import detect_import_format, is_allowed_import_file, title_from_file_name
from .models import GuitarSong, GlobalChord
from .serializers import GuitarSongSerializer, GlobalChordSerializer


class GuitarSongViewSet(viewsets.ModelViewSet):
    queryset = GuitarSong.objects.all().order_by('-last_modified')
    serializer_class = GuitarSongSerializer

    def get_queryset(self):
        qs = GuitarSong.objects.all().order_by('-last_modified')
        source = self.request.query_params.get('source')
        if source:
            qs = qs.filter(source=source)
        return qs

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
