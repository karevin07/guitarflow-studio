from rest_framework import serializers
from django.contrib.auth.models import User
from .models import GuitarSong, TabSection, CustomChord, GlobalChord, Setlist


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


def clean_tags(value):
    if not isinstance(value, list):
        raise serializers.ValidationError('Expected a list of tags.')
    tags = []
    for tag in value:
        if not isinstance(tag, str):
            raise serializers.ValidationError('Tags must be strings.')
        cleaned = tag.strip()[:24]
        if cleaned and cleaned not in tags:
            tags.append(cleaned)
    return tags[:12]


MAX_FORM_ENTRIES = 64
MAX_REPEAT = 8


def validate_form(value):
    if not isinstance(value, list) or len(value) > MAX_FORM_ENTRIES:
        raise serializers.ValidationError(f'Expected a list of up to {MAX_FORM_ENTRIES} entries.')
    form = []
    for entry in value:
        section = entry.get('section') if isinstance(entry, dict) else None
        repeat = entry.get('repeat', 1) if isinstance(entry, dict) else None
        if not isinstance(section, int) or isinstance(section, bool) or section < 0:
            raise serializers.ValidationError('Each entry needs a section index.')
        if not isinstance(repeat, int) or isinstance(repeat, bool) or not 1 <= repeat <= MAX_REPEAT:
            raise serializers.ValidationError(f'Repeat must be between 1 and {MAX_REPEAT}.')
        form.append({'section': section, 'repeat': repeat})
    return form


def validate_melody_range(value):
    if value is None:
        return None
    low = value.get('low') if isinstance(value, dict) else None
    high = value.get('high') if isinstance(value, dict) else None
    if not all(isinstance(note, int) and not isinstance(note, bool) and 24 <= note <= 96 for note in (low, high)) or low >= high:
        raise serializers.ValidationError('Expected {"low": <MIDI note>, "high": <higher MIDI note>}.')
    return {'low': low, 'high': high}


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
    createdAt = serializers.SerializerMethodField()
    sections = TabSectionSerializer(many=True, read_only=True)
    customChords = CustomChordSerializer(source='custom_chords', many=True, read_only=True)
    transposeOffset = serializers.IntegerField(source='transpose_offset', required=False, default=0)
    voicingPlan = serializers.JSONField(source='voicing_plan', required=False)
    bpm = serializers.IntegerField(required=False, allow_null=True, min_value=30, max_value=300)
    artist = serializers.CharField(required=False, allow_blank=True, max_length=120)
    originalKey = serializers.CharField(source='original_key', required=False, allow_blank=True, max_length=12)
    tags = serializers.JSONField(required=False)
    favorite = serializers.BooleanField(required=False)
    melodyRange = serializers.JSONField(source='melody_range', required=False, allow_null=True)
    form = serializers.JSONField(required=False)

    class Meta:
        model = GuitarSong
        fields = (
            'id',
            'title',
            'lastModified',
            'createdAt',
            'sections',
            'customChords',
            'voicingPlan',
            'transposeOffset',
            'bpm',
            'artist',
            'originalKey',
            'tags',
            'favorite',
            'melodyRange',
            'form',
        )

    def get_id(self, obj):
        return str(obj.pk)

    def get_lastModified(self, obj):
        return int(obj.last_modified.timestamp() * 1000)

    def get_createdAt(self, obj):
        return int(obj.created_at.timestamp() * 1000)

    def validate_voicingPlan(self, value):
        return validate_voicing_plan(value)

    def validate_tags(self, value):
        return clean_tags(value)

    def validate_form(self, value):
        return validate_form(value)

    def validate_melodyRange(self, value):
        return validate_melody_range(value)

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
        # Song info (artist, key, tags, favorite) changes only through SongInfoSerializer,
        # so an editor autosave holding an older copy cannot undo a change made in the library.
        instance.title = validated_data.get('title', instance.title)
        instance.transpose_offset = validated_data.get('transpose_offset', instance.transpose_offset)
        instance.voicing_plan = validated_data.get('voicing_plan', instance.voicing_plan)
        if 'bpm' in validated_data:
            instance.bpm = validated_data['bpm']
        if 'form' in validated_data:
            instance.form = validated_data['form']
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


class SongInfoSerializer(serializers.ModelSerializer):
    """Library-level details that can change without sending the whole song."""
    originalKey = serializers.CharField(source='original_key', required=False, allow_blank=True, max_length=12)
    tags = serializers.JSONField(required=False)
    melodyRange = serializers.JSONField(source='melody_range', required=False, allow_null=True)

    class Meta:
        model = GuitarSong
        fields = ('title', 'artist', 'originalKey', 'tags', 'favorite', 'melodyRange')
        extra_kwargs = {'title': {'required': False}, 'artist': {'required': False}}

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Title cannot be empty.')
        return value

    def validate_tags(self, value):
        return clean_tags(value)

    def validate_melodyRange(self, value):
        return validate_melody_range(value)


class SetlistSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    songIds = serializers.JSONField(source='song_ids', required=False)
    lastModified = serializers.SerializerMethodField()

    class Meta:
        model = Setlist
        fields = ('id', 'name', 'songIds', 'lastModified')

    def get_id(self, obj):
        return str(obj.pk)

    def get_lastModified(self, obj):
        return int(obj.last_modified.timestamp() * 1000)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be empty.')
        return value

    def validate_songIds(self, value):
        if not isinstance(value, list) or len(value) > 200:
            raise serializers.ValidationError('Expected a list of up to 200 song ids.')
        return [str(song_id) for song_id in value if isinstance(song_id, (str, int)) and str(song_id).strip()]


class GlobalChordSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalChord
        fields = ('id', 'name', 'frets')
