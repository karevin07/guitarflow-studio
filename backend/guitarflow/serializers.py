from rest_framework import serializers
from django.contrib.auth.models import User
from .models import GuitarSong, TabSection, CustomChord, GlobalChord


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')


def normalize_time_signature(value):
    if isinstance(value, list) and len(value) == 2:
        num, den = value
        if isinstance(num, int) and isinstance(den, int) and num > 0 and den > 0:
            return [num, den]
    return [4, 4]


def validate_voicing_plan(value):
    if not isinstance(value, dict):
        raise serializers.ValidationError('Expected an object keyed by chord symbol.')

    valid_positions = {'recommended', 'low', 'middle', 'high'}
    normalized = {}
    for chord_symbol, preference in value.items():
        if not isinstance(chord_symbol, str) or not chord_symbol.strip():
            raise serializers.ValidationError('Chord symbols must be non-empty strings.')
        if not isinstance(preference, dict) or preference.get('position') not in valid_positions:
            raise serializers.ValidationError(f'Invalid voicing preference for {chord_symbol}.')

        item = {'position': preference['position']}
        locked = preference.get('lockedShape')
        if locked is not None:
            if (
                not isinstance(locked, dict)
                or not isinstance(locked.get('symbol'), str)
                or not locked['symbol'].strip()
            ):
                raise serializers.ValidationError(f'Invalid locked shape for {chord_symbol}.')
            frets = locked.get('frets')
            if (
                not isinstance(frets, list)
                or len(frets) != 6
                or any(fret is not None and (not isinstance(fret, int) or fret < 0 or fret > 24) for fret in frets)
            ):
                raise serializers.ValidationError(f'Locked shape for {chord_symbol} must contain six valid frets.')
            locked_symbol = locked['symbol'].strip()
            locked_name = locked.get('name')
            item['lockedShape'] = {
                'symbol': locked_symbol,
                'name': locked_name.strip() if isinstance(locked_name, str) and locked_name.strip() else locked_symbol,
                'frets': frets,
            }
            fingers = locked.get('fingers')
            if fingers is not None:
                if not isinstance(fingers, list) or any(not isinstance(finger, int) or finger < 0 or finger > 4 for finger in fingers):
                    raise serializers.ValidationError(f'Invalid fingers for {chord_symbol}.')
                item['lockedShape']['fingers'] = fingers
            barres = locked.get('barres')
            if barres is not None:
                if not isinstance(barres, list) or any(
                    not isinstance(barre, dict)
                    or not isinstance(barre.get('fret'), int)
                    or barre['fret'] < 0
                    or barre['fret'] > 24
                    or not isinstance(barre.get('fromString'), int)
                    or not isinstance(barre.get('toString'), int)
                    or not 1 <= barre['fromString'] <= 6
                    or not 1 <= barre['toString'] <= 6
                    for barre in barres
                ):
                    raise serializers.ValidationError(f'Invalid barres for {chord_symbol}.')
                item['lockedShape']['barres'] = barres
        normalized[chord_symbol.strip()] = item
    return normalized


def clean_pattern(value):
    return value.strip()[:120] if isinstance(value, str) else ''


class TabSectionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    timeSignature = serializers.JSONField(source='time_signature', required=False)

    class Meta:
        model = TabSection
        fields = ('id', 'title', 'capo', 'timeSignature', 'pattern', 'measures', 'chords', 'lyrics')

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
    voicingPlan = serializers.JSONField(source='voicing_plan', required=False)
    bpm = serializers.IntegerField(required=False, allow_null=True, min_value=30, max_value=300)
    source = serializers.ChoiceField(
        choices=GuitarSong.SOURCE_CHOICES,
        required=False,
        default=GuitarSong.SOURCE_GFLOW,
    )
    importFormat = serializers.CharField(source='import_format', read_only=True)
    fileName = serializers.CharField(source='import_file_name', read_only=True)
    isLegacy = serializers.SerializerMethodField()

    class Meta:
        model = GuitarSong
        fields = (
            'id',
            'title',
            'lastModified',
            'sections',
            'customChords',
            'voicingPlan',
            'transposeOffset',
            'bpm',
            'source',
            'importFormat',
            'fileName',
            'isLegacy',
        )

    def get_isLegacy(self, obj):
        return obj.owner_id is None

    def get_id(self, obj):
        return str(obj.pk)

    def get_lastModified(self, obj):
        return int(obj.last_modified.timestamp() * 1000)

    def validate_voicingPlan(self, value):
        return validate_voicing_plan(value)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.source == GuitarSong.SOURCE_IMPORTED:
            data['sections'] = []
            data['customChords'] = []
            data['voicingPlan'] = {}
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
                pattern=clean_pattern(sec_data.get('pattern')),
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
        instance.voicing_plan = validated_data.get('voicing_plan', instance.voicing_plan)
        if 'bpm' in validated_data:
            instance.bpm = validated_data['bpm']
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
                if 'pattern' in sec_data:
                    sec.pattern = clean_pattern(sec_data.get('pattern'))
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
                    pattern=clean_pattern(sec_data.get('pattern')),
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
