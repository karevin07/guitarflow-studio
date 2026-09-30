from django.contrib.auth.models import User
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import GuitarSong, TabSection, CustomChord


def list_results(response):
    data = response.data
    if isinstance(data, dict) and 'results' in data:
        return data['results']
    return data


class AuthenticatedAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass123')
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def create_other_user(self, username='otheruser'):
        other = User.objects.create_user(username=username, password='otherpass123')
        return other, Token.objects.create(user=other)


class AuthAPITests(APITestCase):
    def test_register_login_me_logout(self):
        register_response = self.client.post(
            reverse('auth-register'),
            {'username': 'alice', 'password': 'secret123'},
            format='json',
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', register_response.data)
        token = register_response.data['token']

        self.client.credentials()
        login_response = self.client.post(
            reverse('auth-login'),
            {'username': 'alice', 'password': 'secret123'},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data['user']['username'], 'alice')

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        me_response = self.client.get(reverse('auth-me'))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data['username'], 'alice')

        logout_response = self.client.post(reverse('auth-logout'))
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        me_after_logout = self.client.get(reverse('auth-me'))
        self.assertEqual(me_after_logout.status_code, status.HTTP_401_UNAUTHORIZED)


class GuitarSongAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
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
            ],
            'voicingPlan': {
                'Cmaj7': {
                    'position': 'low',
                    'lockedShape': {
                        'symbol': 'Cmaj7',
                        'name': 'Cmaj7',
                        'frets': [0, 0, 0, 2, 3, None],
                    },
                },
            },
        }
        
        response = self.client.post(self.song_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db contents
        self.assertEqual(GuitarSong.objects.count(), 1)
        song = GuitarSong.objects.first()
        self.assertEqual(song.title, 'Test Song')
        self.assertEqual(song.transpose_offset, 2)
        self.assertEqual(song.voicing_plan['Cmaj7']['position'], 'low')
        self.assertEqual(song.owner, self.user)
        
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

    def test_rejects_invalid_voicing_plan(self):
        response = self.client.post(
            self.song_url,
            {
                'title': 'Invalid Plan',
                'sections': [],
                'customChords': [],
                'voicingPlan': {
                    'C': {
                        'position': 'high',
                        'lockedShape': {'symbol': 'C', 'frets': [1, 2]},
                    },
                },
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_song_bpm_is_saved_kept_and_validated(self):
        response = self.client.post(
            self.song_url,
            {'title': 'Tempo', 'sections': [], 'customChords': [], 'bpm': 100},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['bpm'], 100)
        detail_url = reverse('song-detail', args=[response.data['id']])

        # Saving without a tempo keeps the stored one.
        response = self.client.put(detail_url, {'title': 'Tempo', 'sections': [], 'customChords': []}, format='json')
        self.assertEqual(response.data['bpm'], 100)

        response = self.client.put(detail_url, {'title': 'Tempo', 'sections': [], 'customChords': [], 'bpm': None}, format='json')
        self.assertIsNone(response.data['bpm'])

        response = self.client.put(detail_url, {'title': 'Tempo', 'sections': [], 'customChords': [], 'bpm': 10}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(self.song_url, {'title': 'No tempo', 'sections': [], 'customChords': []}, format='json')
        self.assertIsNone(response.data['bpm'])

    def test_section_pattern_is_saved_and_kept(self):
        section = {'title': 'Verse', 'measures': [], 'chords': [], 'lyrics': [], 'pattern': '  ↓ ↓↑ -↑ ↓↑  '}
        response = self.client.post(self.song_url, {'title': 'Groove', 'sections': [section], 'customChords': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sections'][0]['pattern'], '↓ ↓↑ -↑ ↓↑')
        detail_url = reverse('song-detail', args=[response.data['id']])
        section_id = response.data['sections'][0]['id']

        # Saving without a pattern keeps the stored one.
        kept = {'id': section_id, 'title': 'Verse', 'measures': [], 'chords': [], 'lyrics': []}
        response = self.client.put(detail_url, {'title': 'Groove', 'sections': [kept], 'customChords': []}, format='json')
        self.assertEqual(response.data['sections'][0]['pattern'], '↓ ↓↑ -↑ ↓↑')

        changed = {**kept, 'pattern': 'T1 21 31 21'}
        response = self.client.put(detail_url, {'title': 'Groove', 'sections': [changed], 'customChords': []}, format='json')
        self.assertEqual(response.data['sections'][0]['pattern'], 'T1 21 31 21')

    def test_song_info_is_saved_on_create_and_changed_only_through_info(self):
        data = {
            'title': '小幸運', 'artist': ' 田馥甄 ', 'originalKey': 'E', 'tags': ['抒情', ' 表演 ', '抒情', ''],
            'sections': [], 'customChords': [],
        }
        response = self.client.post(self.song_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['artist'], '田馥甄')
        self.assertEqual(response.data['originalKey'], 'E')
        self.assertEqual(response.data['tags'], ['抒情', '表演'])
        self.assertFalse(response.data['favorite'])
        detail_url = reverse('song-detail', args=[response.data['id']])

        # An editor autosave with an older copy does not undo library changes.
        info_url = reverse('song-info', args=[response.data['id']])
        response = self.client.patch(info_url, {'favorite': True, 'tags': ['表演']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stale = {'title': '小幸運', 'artist': '', 'tags': [], 'favorite': False, 'sections': [], 'customChords': []}
        response = self.client.put(detail_url, stale, format='json')
        self.assertTrue(response.data['favorite'])
        self.assertEqual(response.data['artist'], '田馥甄')
        self.assertEqual(response.data['tags'], ['表演'])

        response = self.client.patch(info_url, {'title': '  '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.patch(info_url, {'tags': 'oops'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_melody_range_is_saved_through_info(self):
        response = self.client.post(self.song_url, {'title': 'Range', 'sections': [], 'customChords': []}, format='json')
        self.assertIsNone(response.data['melodyRange'])
        info_url = reverse('song-info', args=[response.data['id']])
        response = self.client.patch(info_url, {'melodyRange': {'low': 50, 'high': 66}}, format='json')
        self.assertEqual(response.data['melodyRange'], {'low': 50, 'high': 66})
        for bad in ({'low': 66, 'high': 50}, {'low': 10, 'high': 60}, {'low': 50}, 'x'):
            response = self.client.patch(info_url, {'melodyRange': bad}, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)
        response = self.client.patch(info_url, {'melodyRange': None}, format='json')
        self.assertIsNone(response.data['melodyRange'])

    def test_search_matches_artist(self):
        self.client.post(self.song_url, {'title': '小幸運', 'artist': '田馥甄', 'sections': [], 'customChords': []}, format='json')
        self.client.post(self.song_url, {'title': '晴天', 'artist': '周杰倫', 'sections': [], 'customChords': []}, format='json')
        titles = [song['title'] for song in list_results(self.client.get(self.song_url, {'search': '周杰'}))]
        self.assertEqual(titles, ['晴天'])

    def test_song_info_is_private_to_owner(self):
        response = self.client.post(self.song_url, {'title': 'Mine', 'sections': [], 'customChords': []}, format='json')
        _, other_token = self.create_other_user()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')
        response = self.client.patch(reverse('song-info', args=[response.data['id']]), {'favorite': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_play_order_is_saved_and_validated(self):
        form = [{'section': 0, 'repeat': 1}, {'section': 1, 'repeat': 2}, {'section': 0}]
        response = self.client.post(self.song_url, {'title': 'Form', 'form': form, 'sections': [], 'customChords': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['form'][2], {'section': 0, 'repeat': 1})
        detail_url = reverse('song-detail', args=[response.data['id']])

        # Saving without a form keeps it; an empty list clears it.
        response = self.client.put(detail_url, {'title': 'Form', 'sections': [], 'customChords': []}, format='json')
        self.assertEqual(len(response.data['form']), 3)
        response = self.client.put(detail_url, {'title': 'Form', 'form': [], 'sections': [], 'customChords': []}, format='json')
        self.assertEqual(response.data['form'], [])

        for bad in ([{'section': -1}], [{'section': 0, 'repeat': 9}], [{'repeat': 2}], 'x'):
            response = self.client.put(detail_url, {'title': 'Form', 'form': bad, 'sections': [], 'customChords': []}, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)

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
        song = GuitarSong.objects.create(
            title='Old Title',
            transpose_offset=0,
            owner=self.user,
            voicing_plan={'C': {'position': 'low'}},
        )
        sec1 = TabSection.objects.create(
            song=song, title='Sec 1', capo=0, order=0,
            measures=[[['-'] * 16] * 6], chords=[[None] * 16], lyrics=[[None] * 16]
        )
        sec2 = TabSection.objects.create(
            song=song, title='Sec 2', capo=0, order=1,
            measures=[[['-'] * 16] * 6], chords=[[None] * 16], lyrics=[[None] * 16]
        )
        CustomChord.objects.create(
            song=song, name='C', frets=[0, 1, 0, 2, 3, None]
        )

        detail_url = reverse('song-detail', args=[song.pk])
        
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
                    'frets': [0, 1, 0, 2, 3, 3]
                },
                {
                    'name': 'D',
                    'frets': [2, 3, 2, 0, None, None]
                }
            ]
        }
        
        response = self.client.put(detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        song.refresh_from_db()
        self.assertEqual(song.title, 'New Title')
        self.assertEqual(song.transpose_offset, -1)
        self.assertEqual(song.voicing_plan, {'C': {'position': 'low'}})
        self.assertEqual(song.sections.count(), 2)
        self.assertTrue(song.sections.filter(pk=sec1.pk).exists())
        self.assertFalse(song.sections.filter(pk=sec2.pk).exists())
        self.assertEqual(song.custom_chords.count(), 2)

    def test_delete_song_cascades(self):
        song = GuitarSong.objects.create(title='To Delete', owner=self.user)
        TabSection.objects.create(
            song=song, title='Intro',
            measures=[], chords=[], lyrics=[]
        )
        CustomChord.objects.create(
            song=song, name='C', frets=[]
        )
        
        detail_url = reverse('song-detail', args=[song.pk])
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(GuitarSong.objects.count(), 0)

    def test_user_cannot_access_other_users_songs(self):
        song = GuitarSong.objects.create(title='Private', owner=self.user)
        other_user, other_token = self.create_other_user()

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')
        detail_url = reverse('song-detail', args=[song.pk])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        list_response = self.client.get(self.song_url)
        self.assertEqual(len(list_results(list_response)), 0)

    def test_legacy_null_owner_songs_visible_to_authenticated_users(self):
        GuitarSong.objects.create(title='Legacy', owner=None)
        response = self.client.get(self.song_url)
        results = list_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Legacy')
        self.assertTrue(results[0]['isLegacy'])

    def test_claim_legacy_song(self):
        song = GuitarSong.objects.create(title='Unclaimed', owner=None)
        claim_url = reverse('song-claim', args=[song.pk])
        response = self.client.post(claim_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['isLegacy'])
        song.refresh_from_db()
        self.assertEqual(song.owner, self.user)

    def test_claim_already_owned_song_fails(self):
        song = GuitarSong.objects.create(title='Mine', owner=self.user)
        claim_url = reverse('song-claim', args=[song.pk])
        response = self.client.post(claim_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_claim_all_legacy_songs(self):
        GuitarSong.objects.create(title='Legacy A', owner=None)
        GuitarSong.objects.create(title='Legacy B', owner=None)
        GuitarSong.objects.create(title='Owned', owner=self.user)
        response = self.client.post(reverse('song-claim-legacy'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['claimed'], 2)
        self.assertEqual(GuitarSong.objects.filter(owner=self.user).count(), 3)

    def test_list_pagination_structure(self):
        GuitarSong.objects.create(title='Song A', owner=self.user)
        response = self.client.get(self.song_url)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_list_search_filter(self):
        GuitarSong.objects.create(title='Wonderwall', owner=self.user)
        GuitarSong.objects.create(title='Blackbird', owner=self.user)
        response = self.client.get(self.song_url, {'search': 'wonder'})
        results = list_results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Wonderwall')

    def test_unauthenticated_requests_are_rejected(self):
        self.client.credentials()
        response = self.client.get(self.song_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ImportedScoreAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
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

        song = GuitarSong.objects.get(pk=response.data['id'])
        self.assertEqual(song.owner, self.user)

        song_id = response.data['id']
        file_url = reverse('song-score-file', args=[song_id])
        file_response = self.client.get(file_url)
        self.assertEqual(file_response.status_code, status.HTTP_200_OK)
        self.assertEqual(b''.join(file_response.streaming_content), self.sample_bytes)

    def test_list_imported_scores_filter(self):
        GuitarSong.objects.create(title='GFlow Song', source=GuitarSong.SOURCE_GFLOW, owner=self.user)
        upload = SimpleUploadedFile('another.gpx', self.sample_bytes, content_type='application/octet-stream')
        self.client.post(self.import_url, {'file': upload}, format='multipart')

        all_response = self.client.get(reverse('song-list'))
        self.assertEqual(len(list_results(all_response)), 2)

        imported_response = self.client.get(reverse('song-list'), {'source': 'imported'})
        imported = list_results(imported_response)
        self.assertEqual(len(imported), 1)
        self.assertEqual(imported[0]['source'], 'imported')

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

    def test_reject_unsupported_import_file(self):
        upload = SimpleUploadedFile('bad.txt', b'nope', content_type='text/plain')
        response = self.client.post(self.import_url, {'file': upload}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SetlistAPITests(AuthenticatedAPITestCase):
    def test_create_reorder_and_delete_setlist(self):
        url = reverse('setlist-list')
        response = self.client.post(url, {'name': ' 週六表演 ', 'songIds': ['3', 1, '', None]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], '週六表演')
        self.assertEqual(response.data['songIds'], ['3', '1'])
        detail = reverse('setlist-detail', args=[response.data['id']])
        response = self.client.patch(detail, {'songIds': ['1', '3']}, format='json')
        self.assertEqual(response.data['songIds'], ['1', '3'])
        self.assertEqual(len(self.client.get(url).data), 1)
        self.assertEqual(self.client.post(url, {'name': ''}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_204_NO_CONTENT)

    def test_setlists_are_private(self):
        response = self.client.post(reverse('setlist-list'), {'name': 'Mine'}, format='json')
        _, other_token = self.create_other_user()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')
        self.assertEqual(self.client.get(reverse('setlist-list')).data, [])
        detail = reverse('setlist-detail', args=[response.data['id']])
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_404_NOT_FOUND)
