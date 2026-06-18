from rest_framework import serializers
from .models import GuitarSong, TabSection, CustomChord
import time

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
        # Convert datetime to timestamp in milliseconds
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
        if request:
            sections_data = request.data.get('sections', [])
            custom_chords_data = request.data.get('customChords', [])

            # Recreate sections to maintain sync and ordering
            instance.sections.all().delete()
            for i, sec_data in enumerate(sections_data):
                TabSection.objects.create(
                    song=instance,
                    title=sec_data.get('title', 'Intro'),
                    capo=sec_data.get('capo', 0),
                    order=i,
                    measures=sec_data.get('measures', []),
                    chords=sec_data.get('chords', []),
                    lyrics=sec_data.get('lyrics', [])
                )

            # Recreate custom chords
            instance.custom_chords.all().delete()
            for chord_data in custom_chords_data:
                CustomChord.objects.create(
                    song=instance,
                    name=chord_data.get('name'),
                    frets=chord_data.get('frets')
                )

        return instance
