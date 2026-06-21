from django.contrib import admin
from .models import GuitarSong, TabSection, CustomChord

class TabSectionInline(admin.TabularInline):
    model = TabSection
    extra = 1

class CustomChordInline(admin.TabularInline):
    model = CustomChord
    extra = 1

@admin.register(GuitarSong)
class GuitarSongAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'source', 'owner', 'import_format', 'last_modified', 'transpose_offset')
    list_filter = ('source', 'import_format', 'owner')
    search_fields = ('title',)
    inlines = [TabSectionInline, CustomChordInline]

@admin.register(TabSection)
class TabSectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'song', 'title', 'capo', 'order')
    list_filter = ('song',)

@admin.register(CustomChord)
class CustomChordAdmin(admin.ModelAdmin):
    list_display = ('id', 'song', 'name')
    list_filter = ('song',)
