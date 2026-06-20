from django.db import models

class GuitarSong(models.Model):
    title = models.CharField(max_length=255, default='New Song')
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    transpose_offset = models.IntegerField(default=0)

    def __str__(self):
        return self.title

class TabSection(models.Model):
    song = models.ForeignKey(GuitarSong, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=100, default='Intro')
    capo = models.IntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    
    # Store measures, chords, and lyrics as JSON arrays
    measures = models.JSONField(help_text="3D array [measureIndex][stringIndex][column]")
    chords = models.JSONField(help_text="2D array [measureIndex][columnIdx]")
    lyrics = models.JSONField(help_text="2D array [measureIndex][columnIdx]")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.song.title})"

class CustomChord(models.Model):
    song = models.ForeignKey(GuitarSong, on_delete=models.CASCADE, related_name='custom_chords')
    name = models.CharField(max_length=50)
    frets = models.JSONField(help_text="Array of 6 numbers or nulls representing frets")

    def __str__(self):
        return f"{self.name} ({self.song.title})"


class GlobalChord(models.Model):
    name = models.CharField(max_length=50, unique=True)
    frets = models.JSONField(help_text="Array of 6 numbers or nulls representing frets")

    class Meta:
        db_table = 'guitarflow_globalchord'
        managed = False

    def __str__(self):
        return self.name
