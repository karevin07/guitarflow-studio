from rest_framework import viewsets
from .models import GuitarSong
from .serializers import GuitarSongSerializer

class GuitarSongViewSet(viewsets.ModelViewSet):
    queryset = GuitarSong.objects.all().order_by('-last_modified')
    serializer_class = GuitarSongSerializer
