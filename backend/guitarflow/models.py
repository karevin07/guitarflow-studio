from django.db import models
from django.contrib.auth.models import User

class GuitarSong(models.Model):
    SOURCE_GFLOW = 'gflow'
    SOURCE_IMPORTED = 'imported'
    SOURCE_CHOICES = [
        (SOURCE_GFLOW, 'GFlow'),
        (SOURCE_IMPORTED, 'Imported'),
    ]

    title = models.CharField(max_length=255, default='New Song')
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    transpose_offset = models.IntegerField(default=0)
    voicing_plan = models.JSONField(default=dict, blank=True)
    bpm = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Song tempo; null uses the player default")
    artist = models.CharField(max_length=120, blank=True, default='')
    original_key = models.CharField(max_length=12, blank=True, default='', help_text="Key of the original recording, e.g. 'E' or 'C#m'")
    tags = models.JSONField(default=list, blank=True, help_text="Short labels such as '民謠' or '表演'")
    favorite = models.BooleanField(default=False)
    # Lowest and highest sung note of the original recording as MIDI numbers: {"low": 50, "high": 66}.
    melody_range = models.JSONField(null=True, blank=True)
    # Play order: [{"section": <index into sections>, "repeat": 1-8}, ...]; empty plays sections as written.
    form = models.JSONField(default=list, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_GFLOW)
    import_format = models.CharField(max_length=20, null=True, blank=True)
    import_file_name = models.CharField(max_length=255, null=True, blank=True)
    import_file = models.FileField(upload_to='imports/%Y/%m/', null=True, blank=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='songs',
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.title

class TabSection(models.Model):
    song = models.ForeignKey(GuitarSong, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=100, default='Intro')
    capo = models.IntegerField(default=0)
    time_signature = models.JSONField(default=list, blank=True, help_text="[numerator, denominator], default 4/4")
    order = models.PositiveIntegerField(default=0)
    # Accompaniment rhythm, e.g. "↓ ↓↑ -↑ ↓↑" or "T1 21 31 21"; empty means no pattern.
    pattern = models.CharField(max_length=120, blank=True, default='')
    
    # Store measures, chords, and lyrics as JSON arrays
    measures = models.JSONField(help_text="3D array [measureIndex][stringIndex][column]")
    chords = models.JSONField(help_text="2D array [measureIndex][columnIdx]")
    lyrics = models.JSONField(help_text="2D array [measureIndex][columnIdx]")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.song.title})"

class Setlist(models.Model):
    """An ordered list of songs to play through, e.g. for a gig."""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='setlists')
    name = models.CharField(max_length=120)
    song_ids = models.JSONField(default=list, blank=True, help_text="Song ids in play order")
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_modified']

    def __str__(self):
        return self.name


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
