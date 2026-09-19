from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guitarflow', '0006_expand_global_chord_library'),
    ]

    operations = [
        migrations.AddField(
            model_name='guitarsong',
            name='voicing_plan',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
