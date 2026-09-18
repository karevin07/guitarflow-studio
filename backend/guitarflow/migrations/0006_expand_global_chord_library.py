from django.db import migrations


ROOT_PITCHES = {
    'C': 0,
    'C#': 1,
    'D': 2,
    'Eb': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'G': 7,
    'Ab': 8,
    'A': 9,
    'Bb': 10,
    'B': 11,
}

# Relative fret shapes in the application's high-e to low-E string order.
# E shapes are rooted on the low E string; A shapes on the A string.
E_SHAPES = {
    '': [0, 0, 1, 2, 2, 0],
    'm': [0, 0, 0, 2, 2, 0],
    '7': [0, 0, 1, 0, 2, 0],
    'maj7': [0, 0, 1, 1, 2, 0],
    'm7': [0, 0, 0, 0, 2, 0],
    '6': [0, 2, 1, 2, 2, 0],
    'm6': [0, 0, 0, 2, 4, 0],
    'sus2': [0, 0, 4, 4, 2, 0],
    'sus4': [0, 0, 2, 2, 2, 0],
    'add9': [2, 0, 1, 4, 2, 0],
    '9': [2, 0, 1, 0, 2, 0],
    'maj9': [2, 0, 1, 1, 2, 0],
    'm9': [2, 0, 0, 0, 2, 0],
}

A_SHAPES = {
    '': [0, 2, 2, 2, 0, None],
    'm': [0, 1, 2, 2, 0, None],
    '7': [0, 2, 0, 2, 0, None],
    'maj7': [0, 2, 1, 2, 0, None],
    'm7': [0, 1, 0, 2, 0, None],
    '6': [2, 2, 2, 2, 0, None],
    'm6': [2, 1, 2, 2, 0, None],
    'sus2': [0, 0, 2, 2, 0, None],
    'sus4': [0, 3, 2, 2, 0, None],
    'add9': [0, 2, 4, 2, 0, None],
    '9': [3, 2, 4, 2, 0, None],
    'maj9': [0, 0, 6, 6, 0, None],
    'm9': [3, 1, 4, 2, 0, None],
    'dim': [None, 1, 2, 1, 0, None],
    'aug': [1, 2, 2, 3, 0, None],
    'm7b5': [None, 1, 0, 1, 0, None],
    'dim7': [2, 1, 2, 1, 0, None],
}

# Prefer familiar open-position voicings where a movable template would be
# needlessly wide or high on the neck.
COMMON_SHAPES = {
    'Cadd9': [3, 3, 0, 2, 3, None],
    'C9': [3, 3, 3, 2, 3, None],
    'Cmaj9': [0, 3, 4, 2, 3, None],
    'Cm9': [3, 3, 3, 1, 3, None],
    'Dadd9': [0, 3, 2, 4, 5, None],
    'Dmaj9': [0, 2, 2, 4, 5, None],
    'Gadd9': [3, 0, 2, 0, 2, 3],
}


def transpose_shape(shape, fret):
    return [None if value is None else value + fret for value in shape]


def shape_cost(shape, fret):
    transposed = transpose_shape(shape, fret)
    played = [value for value in transposed if value is not None]
    pressed = [value for value in played if value > 0]
    span = max(pressed) - min(pressed) if pressed else 0
    # Balance a compact hand shape against staying in a lower neck position.
    return max(played) + span * 2


def build_library():
    library = {}
    for root, pitch in ROOT_PITCHES.items():
        e_fret = (pitch - ROOT_PITCHES['E']) % 12
        a_fret = (pitch - ROOT_PITCHES['A']) % 12
        for suffix in A_SHAPES:
            candidates = [(a_fret, A_SHAPES[suffix])]
            if suffix in E_SHAPES:
                candidates.append((e_fret, E_SHAPES[suffix]))
            fret, shape = min(candidates, key=lambda candidate: shape_cost(candidate[1], candidate[0]))
            library[f'{root}{suffix}'] = transpose_shape(shape, fret)
    library.update(COMMON_SHAPES)
    return library


def seed_chords(apps, schema_editor):
    GlobalChord = apps.get_model('guitarflow', 'GlobalChord')
    GlobalChord.objects.bulk_create(
        [GlobalChord(name=name, frets=frets) for name, frets in build_library().items()],
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('guitarflow', '0005_add_song_owner'),
    ]

    operations = [
        migrations.RunSQL(
            sql='''
                CREATE TABLE IF NOT EXISTS guitarflow_globalchord (
                    id BIGSERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    frets JSONB NOT NULL
                );
            ''',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunPython(seed_chords, migrations.RunPython.noop),
    ]
