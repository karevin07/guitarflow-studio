from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guitarflow', '0008_add_song_bpm'),
    ]

    operations = [
        migrations.AddField(
            model_name='tabsection',
            name='pattern',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]
