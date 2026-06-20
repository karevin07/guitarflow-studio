from rest_framework import viewsets
from .models import GuitarSong, GlobalChord
from .serializers import GuitarSongSerializer, GlobalChordSerializer

class GuitarSongViewSet(viewsets.ModelViewSet):
    queryset = GuitarSong.objects.all().order_by('-last_modified')
    serializer_class = GuitarSongSerializer

class GlobalChordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GlobalChord.objects.all().order_by('name')
    serializer_class = GlobalChordSerializer
