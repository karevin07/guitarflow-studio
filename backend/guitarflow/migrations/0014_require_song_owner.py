from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def delete_ownerless_songs(apps, schema_editor):
    """Songs from before accounts existed could be claimed by anyone; that path is gone."""
    apps.get_model('guitarflow', 'GuitarSong').objects.filter(owner__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('guitarflow', '0013_remove_score_import'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(delete_ownerless_songs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='guitarsong',
            name='owner',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='songs', to=settings.AUTH_USER_MODEL),
        ),
    ]
