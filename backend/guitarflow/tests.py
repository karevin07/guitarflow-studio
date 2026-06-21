from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from .models import GuitarSong, TabSection, CustomChord

class GuitarSongAPITests(APITestCase):
    def setUp(self):
        self.song_url = reverse('song-list')

    def test_create_song_with_sections(self):
        """Test creating a song with nested sections and custom chords."""
        data = {
            'title': 'Test Song',
            'transposeOffset': 2,
            'sections': [
                {
                    'title': 'Intro',
                    'capo': 1,
                    'measures': [[['-'] * 16] * 6],
                    'chords': [[None] * 16],
                    'lyrics': [[None] * 16]
                }
            ],
            'customChords': [
                {
                    'name': 'Cmaj7',
                    'frets': [None, 3, 2, 0, 0, 0]
                }
            ]
        }
        
        response = self.client.post(self.song_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db contents
        self.assertEqual(GuitarSong.objects.count(), 1)
        song = GuitarSong.objects.first()
        self.assertEqual(song.title, 'Test Song')
        self.assertEqual(song.transpose_offset, 2)
        
        # Sections
        self.assertEqual(song.sections.count(), 1)
        section = song.sections.first()
        self.assertEqual(section.title, 'Intro')
        self.assertEqual(section.capo, 1)
        self.assertEqual(section.order, 0)
        self.assertEqual(len(section.measures), 1)
        
        # Custom Chords
        self.assertEqual(song.custom_chords.count(), 1)
        chord = song.custom_chords.first()
        self.assertEqual(chord.name, 'Cmaj7')
        self.assertEqual(chord.frets, [None, 3, 2, 0, 0, 0])

    def test_create_song_persists_time_signature(self):
        data = {
            'title': 'Time Sig Song',
            'transposeOffset': 0,
            'sections': [
                {
                    'title': 'Verse',
                    'capo': 0,
                    'timeSignature': [3, 4],
                    'measures': [[['-'] * 16] * 6],
                    'chords': [[None] * 16],
                    'lyrics': [[None] * 16],
                }
            ],
            'customChords': [],
        }

        response = self.client.post(self.song_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sections'][0]['timeSignature'], [3, 4])

        song_id = response.data['id']
        detail = self.client.get(reverse('song-detail', args=[song_id]))
        self.assertEqual(detail.data['sections'][0]['timeSignature'], [3, 4])

    def test_update_song_diff_and_patch(self):
        """Test that updating a song uses diff-and-patch on sections/chords and preserves PKs."""
        # Pre-populate a song with 2 sections and 1 chord
        song = GuitarSong.objects.create(title='Old Title', transpose_offset=0)
        sec1 = TabSection.objects.create(
            song=song, title='Sec 1', capo=0, order=0,
            measures=[[['-'] * 16] * 6], chords=[[None] * 16], lyrics=[[None] * 16]
        )
        sec2 = TabSection.objects.create(
            song=song, title='Sec 2', capo=0, order=1,
            measures=[[['-'] * 16] * 6], chords=[[None] * 16], lyrics=[[None] * 16]
        )
        chord1 = CustomChord.objects.create(
            song=song, name='C', frets=[0, 1, 0, 2, 3, None]
        )

        detail_url = reverse('song-detail', args=[song.pk])
        
        # We will:
        # 1. Update sec1 title (passing its ID)
        # 2. Delete sec2 (by omitting it)
        # 3. Add a new section (no ID)
        # 4. Update chord1 (by sending same name 'C' but different frets)
        # 5. Add new chord 'D'
        data = {
            'title': 'New Title',
            'transposeOffset': -1,
            'sections': [
                {
                    'id': str(sec1.pk),
                    'title': 'Sec 1 Updated',
                    'capo': 2,
                    'measures': sec1.measures,
                    'chords': sec1.chords,
                    'lyrics': sec1.lyrics
                },
                {
                    # New section
                    'title': 'New Section',
                    'capo': 0,
                    'measures': [[['-'] * 16] * 6],
                    'chords': [[None] * 16],
                    'lyrics': [[None] * 16]
                }
            ],
            'customChords': [
                {
                    'name': 'C',
                    'frets': [0, 1, 0, 2, 3, 3] # modified
                },
                {
                    'name': 'D',
                    'frets': [2, 3, 2, 0, None, None]
                }
            ]
        }
        
        response = self.client.put(detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify updates
        song.refresh_from_db()
        self.assertEqual(song.title, 'New Title')
        self.assertEqual(song.transpose_offset, -1)
        
        # Verify sections
        # Total sections should be 2 (sec1 updated, and new section). sec2 should be deleted.
        self.assertEqual(song.sections.count(), 2)
        
        # sec1 PK should be preserved!
        self.assertTrue(song.sections.filter(pk=sec1.pk).exists())
        updated_sec1 = song.sections.get(pk=sec1.pk)
        self.assertEqual(updated_sec1.title, 'Sec 1 Updated')
        self.assertEqual(updated_sec1.capo, 2)
        self.assertEqual(updated_sec1.order, 0)
        
        # sec2 should be deleted
        self.assertFalse(song.sections.filter(pk=sec2.pk).exists())
        
        # New section
        new_sec = song.sections.exclude(pk=sec1.pk).first()
        self.assertEqual(new_sec.title, 'New Section')
        self.assertEqual(new_sec.order, 1)

        # Verify chords
        self.assertEqual(song.custom_chords.count(), 2)
        updated_chord1 = song.custom_chords.get(name='C')
        self.assertEqual(updated_chord1.frets, [0, 1, 0, 2, 3, 3])
        new_chord = song.custom_chords.get(name='D')
        self.assertEqual(new_chord.frets, [2, 3, 2, 0, None, None])

    def test_delete_song_cascades(self):
        """Test that deleting a song deletes nested sections and chords."""
        song = GuitarSong.objects.create(title='To Delete')
        TabSection.objects.create(
            song=song, title='Intro',
            measures=[], chords=[], lyrics=[]
        )
        CustomChord.objects.create(
            song=song, name='C', frets=[]
        )
        
        self.assertEqual(GuitarSong.objects.count(), 1)
        self.assertEqual(TabSection.objects.count(), 1)
        self.assertEqual(CustomChord.objects.count(), 1)
        
        detail_url = reverse('song-detail', args=[song.pk])
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Everything should be cascades deleted
        self.assertEqual(GuitarSong.objects.count(), 0)
        self.assertEqual(TabSection.objects.count(), 0)
        self.assertEqual(CustomChord.objects.count(), 0)


class ImportedScoreAPITests(APITestCase):
    def setUp(self):
        self.import_url = reverse('song-import-score')
        self.sample_bytes = b'GP5 sample binary content'

    def test_import_score_upload_and_download(self):
        upload = SimpleUploadedFile('test-riff.gp5', self.sample_bytes, content_type='application/octet-stream')
        response = self.client.post(
            self.import_url,
            {'file': upload, 'title': 'Test Riff'},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Riff')
        self.assertEqual(response.data['source'], 'imported')
        self.assertEqual(response.data['importFormat'], 'gp5')
        self.assertEqual(response.data['fileName'], 'test-riff.gp5')
        self.assertEqual(response.data['sections'], [])

        song_id = response.data['id']
        file_url = reverse('song-score-file', args=[song_id])
        file_response = self.client.get(file_url)
        self.assertEqual(file_response.status_code, status.HTTP_200_OK)
        self.assertEqual(b''.join(file_response.streaming_content), self.sample_bytes)

    def test_list_imported_scores_filter(self):
        GuitarSong.objects.create(title='GFlow Song', source=GuitarSong.SOURCE_GFLOW)
        upload = SimpleUploadedFile('another.gpx', self.sample_bytes, content_type='application/octet-stream')
        self.client.post(self.import_url, {'file': upload}, format='multipart')

        all_response = self.client.get(reverse('song-list'))
        self.assertEqual(len(all_response.data), 2)

        imported_response = self.client.get(reverse('song-list'), {'source': 'imported'})
        self.assertEqual(len(imported_response.data), 1)
        self.assertEqual(imported_response.data[0]['source'], 'imported')

    def test_update_imported_title_only(self):
        upload = SimpleUploadedFile('song.gp5', self.sample_bytes, content_type='application/octet-stream')
        create_response = self.client.post(self.import_url, {'file': upload}, format='multipart')
        song_id = create_response.data['id']

        detail_url = reverse('song-detail', args=[song_id])
        update_response = self.client.put(
            detail_url,
            {'title': 'Renamed Score', 'transposeOffset': 0, 'sections': [], 'customChords': []},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['title'], 'Renamed Score')

        song = GuitarSong.objects.get(pk=song_id)
        self.assertEqual(song.title, 'Renamed Score')
        self.assertTrue(song.import_file)

    def test_reject_unsupported_import_file(self):
        upload = SimpleUploadedFile('bad.txt', b'nope', content_type='text/plain')
        response = self.client.post(self.import_url, {'file': upload}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
