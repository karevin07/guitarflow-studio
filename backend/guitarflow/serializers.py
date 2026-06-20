from rest_framework import serializers
from .models import GuitarSong, TabSection, CustomChord


class TabSectionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = TabSection
        fields = ('id', 'title', 'capo', 'measures', 'chords', 'lyrics')

    def get_id(self, obj):
        return str(obj.pk)


class CustomChordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChord
        fields = ('name', 'frets')


class GuitarSongSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    lastModified = serializers.SerializerMethodField()
    sections = TabSectionSerializer(many=True, read_only=True)
    customChords = CustomChordSerializer(source='custom_chords', many=True, read_only=True)
    transposeOffset = serializers.IntegerField(source='transpose_offset')

    class Meta:
        model = GuitarSong
        fields = ('id', 'title', 'lastModified', 'sections', 'customChords', 'transposeOffset')

    def get_id(self, obj):
        return str(obj.pk)

    def get_lastModified(self, obj):
        return int(obj.last_modified.timestamp() * 1000)

    def create(self, validated_data):
        request = self.context.get('request')
        sections_data = request.data.get('sections', []) if request else []
        custom_chords_data = request.data.get('customChords', []) if request else []

        song = GuitarSong.objects.create(**validated_data)

        for i, sec_data in enumerate(sections_data):
            TabSection.objects.create(
                song=song,
                title=sec_data.get('title', 'Intro'),
                capo=sec_data.get('capo', 0),
                order=i,
                measures=sec_data.get('measures', []),
                chords=sec_data.get('chords', []),
                lyrics=sec_data.get('lyrics', [])
            )

        for chord_data in custom_chords_data:
            CustomChord.objects.create(
                song=song,
                name=chord_data.get('name'),
                frets=chord_data.get('frets')
            )

        return song

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.transpose_offset = validated_data.get('transpose_offset', instance.transpose_offset)
        instance.save()

        request = self.context.get('request')
        if not request:
            return instance

        sections_data = request.data.get('sections', [])
        custom_chords_data = request.data.get('customChords', [])

        # --- Diff-and-patch sections ---
        # Build a map of existing sections by their PK (sent as string IDs from frontend)
        existing_sections = {str(s.pk): s for s in instance.sections.all()}
        incoming_ids = set()

        for i, sec_data in enumerate(sections_data):
            sec_id = sec_data.get('id')  # may be None for brand-new sections
            if sec_id and sec_id in existing_sections:
                # Update in-place to preserve the PK
                sec = existing_sections[sec_id]
                sec.title = sec_data.get('title', sec.title)
                sec.capo = sec_data.get('capo', sec.capo)
                sec.order = i
                sec.measures = sec_data.get('measures', sec.measures)
                sec.chords = sec_data.get('chords', sec.chords)
                sec.lyrics = sec_data.get('lyrics', sec.lyrics)
                sec.save()
                incoming_ids.add(sec_id)
            else:
                # New section — create it
                new_sec = TabSection.objects.create(
                    song=instance,
                    title=sec_data.get('title', 'Intro'),
                    capo=sec_data.get('capo', 0),
                    order=i,
                    measures=sec_data.get('measures', []),
                    chords=sec_data.get('chords', []),
                    lyrics=sec_data.get('lyrics', [])
                )
                incoming_ids.add(str(new_sec.pk))

        # Delete sections that were removed by the user
        for sec_id, sec in existing_sections.items():
            if sec_id not in incoming_ids:
                sec.delete()

        # --- Diff-and-patch custom chords (keyed by name) ---
        existing_chords = {c.name: c for c in instance.custom_chords.all()}
        incoming_chord_names = set()

        for chord_data in custom_chords_data:
            name = chord_data.get('name')
            if not name:
                continue
            if name in existing_chords:
                # Update frets in-place
                chord = existing_chords[name]
                chord.frets = chord_data.get('frets', chord.frets)
                chord.save()
            else:
                CustomChord.objects.create(
                    song=instance,
                    name=name,
                    frets=chord_data.get('frets', [])
                )
            incoming_chord_names.add(name)

        # Delete chords that were removed
        for name, chord in existing_chords.items():
            if name not in incoming_chord_names:
                chord.delete()

        return instance
