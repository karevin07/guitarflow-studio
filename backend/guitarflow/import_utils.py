import os
import re

GP_EXTENSIONS = ('.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.xml', '.musicxml')

ALLOWED_IMPORT_EXTENSIONS = GP_EXTENSIONS


def detect_import_format(file_name: str) -> str:
    lower = file_name.lower()
    for ext in GP_EXTENSIONS:
        if lower.endswith(ext):
            return ext.lstrip('.')
    return 'unknown'


def title_from_file_name(file_name: str) -> str:
    base = os.path.splitext(os.path.basename(file_name))[0]
    title = re.sub(r'[_-]+', ' ', base).strip()
    return title or 'Imported Score'


def is_allowed_import_file(file_name: str) -> bool:
    lower = file_name.lower()
    return any(lower.endswith(ext) for ext in ALLOWED_IMPORT_EXTENSIONS)
