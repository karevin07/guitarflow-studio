import { ImportedSong } from '../types';
import { detectImportFormat, titleFromFileName } from './gpImport';

const DB_NAME = 'guitarflow-imported';
const STORE = 'songs';
const DB_VERSION = 1;

interface StoredImportedSong extends ImportedSong {
  data: ArrayBuffer;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = fn(store);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    request.onsuccess = () => resolve(request.result as T);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
};

export const listImportedSongs = async (): Promise<ImportedSong[]> => {
  const rows = await withStore('readonly', store => store.getAll());
  return rows
    .map(({ data: _data, ...meta }) => meta)
    .sort((a, b) => b.lastModified - a.lastModified);
};

export const getImportedSongData = async (id: string): Promise<ArrayBuffer | null> => {
  const row = await withStore<StoredImportedSong | undefined>('readonly', store => store.get(id));
  return row?.data ?? null;
};

export const saveImportedSong = async (
  file: File,
  title?: string
): Promise<ImportedSong> => {
  const buffer = await file.arrayBuffer();
  const song: StoredImportedSong = {
    id: crypto.randomUUID(),
    title: title?.trim() || titleFromFileName(file.name),
    lastModified: Date.now(),
    source: 'imported',
    importFormat: detectImportFormat(file.name),
    fileName: file.name,
    data: buffer,
  };
  await withStore('readwrite', store => store.put(song));
  const { data: _data, ...meta } = song;
  return meta;
};

export const deleteImportedSong = async (id: string): Promise<void> => {
  await withStore('readwrite', store => store.delete(id));
};

export const updateImportedSongTitle = async (id: string, title: string): Promise<void> => {
  const row = await withStore<StoredImportedSong | undefined>('readonly', store => store.get(id));
  if (!row) return;
  await withStore('readwrite', store =>
    store.put({ ...row, title: title.trim() || row.title, lastModified: Date.now() })
  );
};
