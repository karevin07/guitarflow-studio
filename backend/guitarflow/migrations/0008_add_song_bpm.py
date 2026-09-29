from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guitarflow', '0007_add_song_voicing_plan'),
    ]

    operations = [
        migrations.AddField(
            model_name='guitarsong',
            name='bpm',
            field=models.PositiveSmallIntegerField(blank=True, help_text='Song tempo; null uses the player default', null=True),
        ),
    ]
