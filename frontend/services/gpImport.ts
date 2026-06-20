const GP_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.xml', '.musicxml'] as const;

export const GP_ACCEPT =
  '.gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,application/octet-stream';

export const isGuitarProFile = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return GP_EXTENSIONS.some(ext => lower.endsWith(ext));
};

export const detectImportFormat = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  for (const ext of GP_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext.slice(1);
  }
  return 'unknown';
};

export const titleFromFileName = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base.replace(/[_-]+/g, ' ').trim() || 'Imported Score';
};
