from rest_framework import serializers
from .models import GuitarSong, TabSection, CustomChord, GlobalChord


def normalize_time_signature(value):
    if isinstance(value, list) and len(value) == 2:
        num, den = value
        if isinstance(num, int) and isinstance(den, int) and num > 0 and den > 0:
            return [num, den]
    return [4, 4]


class TabSectionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    timeSignature = serializers.JSONField(source='time_signature', required=False)

    class Meta:
        model = TabSection
        fields = ('id', 'title', 'capo', 'timeSignature', 'measures', 'chords', 'lyrics')

    def get_id(self, obj):
        return str(obj.pk)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        ts = data.get('timeSignature')
        if not ts or not isinstance(ts, list) or len(ts) != 2:
            data['timeSignature'] = [4, 4]
        return data


class CustomChordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChord
        fields = ('name', 'frets')


class GuitarSongSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    lastModified = serializers.SerializerMethodField()
    sections = TabSectionSerializer(many=True, read_only=True)
    customChords = CustomChordSerializer(source='custom_chords', many=True, read_only=True)
    transposeOffset = serializers.IntegerField(source='transpose_offset', required=False, default=0)
    source = serializers.ChoiceField(
        choices=GuitarSong.SOURCE_CHOICES,
        required=False,
        default=GuitarSong.SOURCE_GFLOW,
    )
    importFormat = serializers.CharField(source='import_format', read_only=True)
    fileName = serializers.CharField(source='import_file_name', read_only=True)

    class Meta:
        model = GuitarSong
        fields = (
            'id',
            'title',
            'lastModified',
            'sections',
            'customChords',
            'transposeOffset',
            'source',
            'importFormat',
            'fileName',
        )

    def get_id(self, obj):
        return str(obj.pk)

    def get_lastModified(self, obj):
        return int(obj.last_modified.timestamp() * 1000)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.source == GuitarSong.SOURCE_IMPORTED:
            data['sections'] = []
            data['customChords'] = []
        return data

    def create(self, validated_data):
        validated_data.pop('source', None)
        request = self.context.get('request')
        sections_data = request.data.get('sections', []) if request else []
        custom_chords_data = request.data.get('customChords', []) if request else []

        song = GuitarSong.objects.create(**validated_data)

        for i, sec_data in enumerate(sections_data):
            TabSection.objects.create(
                song=song,
                title=sec_data.get('title', 'Intro'),
                capo=sec_data.get('capo', 0),
                time_signature=normalize_time_signature(sec_data.get('timeSignature')),
                order=i,
                measures=sec_data.get('measures', []),
                chords=sec_data.get('chords', []),
                lyrics=sec_data.get('lyrics', []),
            )

        for chord_data in custom_chords_data:
            CustomChord.objects.create(
                song=song,
                name=chord_data.get('name'),
                frets=chord_data.get('frets'),
            )

        return song

    def update(self, instance, validated_data):
        validated_data.pop('source', None)

        if instance.source == GuitarSong.SOURCE_IMPORTED:
            instance.title = validated_data.get('title', instance.title)
            instance.save()
            return instance

        instance.title = validated_data.get('title', instance.title)
        instance.transpose_offset = validated_data.get('transpose_offset', instance.transpose_offset)
        instance.save()

        request = self.context.get('request')
        if not request:
            return instance

        sections_data = request.data.get('sections', [])
        custom_chords_data = request.data.get('customChords', [])

        existing_sections = {str(s.pk): s for s in instance.sections.all()}
        incoming_ids = set()

        for i, sec_data in enumerate(sections_data):
            sec_id = sec_data.get('id')
            if sec_id and sec_id in existing_sections:
                sec = existing_sections[sec_id]
                sec.title = sec_data.get('title', sec.title)
                sec.capo = sec_data.get('capo', sec.capo)
                sec.time_signature = normalize_time_signature(
                    sec_data.get('timeSignature', sec.time_signature)
                )
                sec.order = i
                sec.measures = sec_data.get('measures', sec.measures)
                sec.chords = sec_data.get('chords', sec.chords)
                sec.lyrics = sec_data.get('lyrics', sec.lyrics)
                sec.save()
                incoming_ids.add(sec_id)
            else:
                new_sec = TabSection.objects.create(
                    song=instance,
                    title=sec_data.get('title', 'Intro'),
                    capo=sec_data.get('capo', 0),
                    time_signature=normalize_time_signature(sec_data.get('timeSignature')),
                    order=i,
                    measures=sec_data.get('measures', []),
                    chords=sec_data.get('chords', []),
                    lyrics=sec_data.get('lyrics', []),
                )
                incoming_ids.add(str(new_sec.pk))

        for sec_id, sec in existing_sections.items():
            if sec_id not in incoming_ids:
                sec.delete()

        existing_chords = {c.name: c for c in instance.custom_chords.all()}
        incoming_chord_names = set()

        for chord_data in custom_chords_data:
            name = chord_data.get('name')
            if not name:
                continue
            if name in existing_chords:
                chord = existing_chords[name]
                chord.frets = chord_data.get('frets', chord.frets)
                chord.save()
            else:
                CustomChord.objects.create(
                    song=instance,
                    name=name,
                    frets=chord_data.get('frets', []),
                )
            incoming_chord_names.add(name)

        for name, chord in existing_chords.items():
            if name not in incoming_chord_names:
                chord.delete()

        return instance


class GlobalChordSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalChord
        fields = ('id', 'name', 'frets')
