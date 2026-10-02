/**
 * Google Drive REST calls for .gflow files, under the drive.file scope: the app sees only the
 * files it created, so the import list holds exactly the songs uploaded from GuitarFlow.
 * Sign-in lives in googleDriveBrowser.ts so this part runs in tests.
 */

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const GFLOW_MIME = 'application/json';
export const DRIVE_FOLDER_NAME = 'GuitarFlow';
/** appProperties marking our folder, and the GuitarFlow song each uploaded file belongs to. */
const FOLDER_KEY = 'guitarflowFolder';
const SONG_KEY = 'guitarflowSongKey';
/** Earlier uploads marked the song by id alone; they get the full key the next time they are saved. */
const LEGACY_SONG_KEY = 'guitarflowSongId';

export class DriveError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'DriveError';
  }
}

/** The song a Drive file belongs to; ids restart in every database, so the creation time is part of it. */
export const driveSongKey = (song: { id: string; createdAt?: number }): string => `${song.id}:${song.createdAt ?? 0}`;

export interface DriveSong {
  key: string;
  /** The song id, to adopt a file uploaded before keys included the creation time. */
  id: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  /** True when an earlier upload of the same song was overwritten. */
  updated: boolean;
}

export interface DriveGflowFile {
  id: string;
  name: string;
  /** Milliseconds since the epoch. */
  modifiedTime: number;
  songKey?: string;
}

export interface DriveBackupItem {
  song: DriveSong;
  fileName: string;
  lastModified: number;
  content: () => string;
}

export interface DriveBackupResult {
  created: number;
  updated: number;
  unchanged: number;
  /** File names that could not be saved. */
  failed: string[];
}

export type TokenProvider = (options?: { forceRefresh?: boolean }) => Promise<string>;

interface DriveFileResource {
  id: string;
  name: string;
  modifiedTime?: string;
  appProperties?: Record<string, string>;
}

/** A string literal inside a Drive query (q=...). */
export const quoteDriveQuery = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export const appPropertyQuery = (key: string, value: string): string =>
  `appProperties has { key=${quoteDriveQuery(key)} and value=${quoteDriveQuery(value)} } and trashed=false`;

/** A multipart/related body holding the file metadata and its contents. */
export const multipartBody = (metadata: object, content: string, boundary: string): string => [
  `--${boundary}`,
  'Content-Type: application/json; charset=UTF-8',
  '',
  JSON.stringify(metadata),
  `--${boundary}`,
  `Content-Type: ${GFLOW_MIME}`,
  '',
  content,
  `--${boundary}--`,
].join('\r\n');

const describeFailure = (status: number): string => {
  if (status === 401) return 'Google 登入已過期，請再試一次。';
  if (status === 403) return 'Google Drive 拒絕存取，請確認已授權 GuitarFlow。';
  if (status === 404) return '在 Google Drive 找不到這個檔案。';
  if (status === 429 || status >= 500) return 'Google Drive 暫時無法使用，請稍後再試。';
  return `Google Drive 回應錯誤（${status}）。`;
};

/** Sign-in and permission failures stop a backup; anything else only fails that one song. */
const isFatal = (error: unknown) => !(error instanceof DriveError) || error.status === 401 || error.status === 403;

/** Marks a file as the given song's and drops the id-only mark of earlier uploads. */
const songProperties = (song: DriveSong) => ({ [SONG_KEY]: song.key, [LEGACY_SONG_KEY]: null });

export const createDriveClient = (getToken: TokenProvider, fetchImpl: typeof fetch = (input, init) => fetch(input, init)) => {
  /** Sends an authorised request, getting a fresh token once if the current one was rejected. */
  const request = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const send = async (forceRefresh: boolean) => {
      const token = await getToken({ forceRefresh });
      return fetchImpl(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
    };
    let response = await send(false);
    if (response.status === 401) response = await send(true);
    if (!response.ok) throw new DriveError(describeFailure(response.status), response.status);
    return response;
  };

  const findOne = async (query: string): Promise<{ id: string; name: string } | null> => {
    const params = new URLSearchParams({ q: query, spaces: 'drive', pageSize: '1', fields: 'files(id,name)' });
    const { files } = await (await request(`${API}?${params}`)).json() as { files?: Array<{ id: string; name: string }> };
    return files?.[0] ?? null;
  };

  const findSongFile = async (song: DriveSong) =>
    await findOne(appPropertyQuery(SONG_KEY, song.key)) ?? await findOne(appPropertyQuery(LEGACY_SONG_KEY, song.id));

  let folderId: string | null = null;
  const ensureFolder = async (): Promise<string> => {
    if (folderId) return folderId;
    const existing = await findOne(`mimeType=${quoteDriveQuery(FOLDER_MIME)} and ${appPropertyQuery(FOLDER_KEY, 'root')}`);
    if (existing) return (folderId = existing.id);
    const created = await (await request(`${API}?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { [FOLDER_KEY]: 'root' } }),
    })).json() as { id: string };
    return (folderId = created.id);
  };

  /** Overwrites fileId, or creates the file in the GuitarFlow folder when it is null. */
  const save = async (fileId: string | null, song: DriveSong, fileName: string, content: string): Promise<DriveUploadResult> => {
    const boundary = `gflow-${Math.random().toString(36).slice(2)}`;
    const headers = { 'Content-Type': `multipart/related; boundary=${boundary}` };
    if (fileId) {
      const response = await request(`${UPLOAD_API}/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name`, {
        method: 'PATCH',
        headers,
        body: multipartBody({ name: fileName, appProperties: songProperties(song) }, content, boundary),
      });
      return { ...(await response.json() as { id: string; name: string }), updated: true };
    }
    const metadata = { name: fileName, mimeType: GFLOW_MIME, parents: [await ensureFolder()], appProperties: { [SONG_KEY]: song.key } };
    const response = await request(`${UPLOAD_API}?uploadType=multipart&fields=id,name`, {
      method: 'POST',
      headers,
      body: multipartBody(metadata, content, boundary),
    });
    return { ...(await response.json() as { id: string; name: string }), updated: false };
  };

  /** Saves a song's .gflow, overwriting the file from its previous upload (Drive keeps the old revision). */
  const uploadGflow = async (song: DriveSong, fileName: string, content: string): Promise<DriveUploadResult> =>
    save((await findSongFile(song))?.id ?? null, song, fileName, content);

  const listFiles = async (): Promise<DriveFileResource[]> => {
    const files: DriveFileResource[] = [];
    let pageToken = '';
    do {
      const params = new URLSearchParams({
        q: `mimeType=${quoteDriveQuery(GFLOW_MIME)} and trashed=false`,
        spaces: 'drive',
        orderBy: 'modifiedTime desc',
        pageSize: '100',
        fields: 'nextPageToken,files(id,name,modifiedTime,appProperties)',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await (await request(`${API}?${params}`)).json() as { nextPageToken?: string; files?: DriveFileResource[] };
      files.push(...(page.files ?? []));
      pageToken = page.nextPageToken ?? '';
    } while (pageToken);
    return files;
  };

  /** Every .gflow uploaded from GuitarFlow, most recently changed first. */
  const listGflowFiles = async (): Promise<DriveGflowFile[]> => (await listFiles()).map(file => ({
    id: file.id,
    name: file.name,
    modifiedTime: Date.parse(file.modifiedTime ?? ''),
    songKey: file.appProperties?.[SONG_KEY],
  }));

  /**
   * Saves every song, skipping the ones whose file is newer than the song's last change.
   * The list is read once up front, so each changed song costs a single request.
   */
  const backupLibrary = async (items: DriveBackupItem[], onProgress?: (done: number, total: number) => void): Promise<DriveBackupResult> => {
    const files = await listFiles();
    const byKey = new Map<string, DriveFileResource>();
    const byLegacyId = new Map<string, DriveFileResource>();
    for (const file of files) {
      const key = file.appProperties?.[SONG_KEY];
      const legacyId = file.appProperties?.[LEGACY_SONG_KEY];
      if (key) byKey.set(key, file);
      else if (legacyId) byLegacyId.set(legacyId, file);
    }

    const result: DriveBackupResult = { created: 0, updated: 0, unchanged: 0, failed: [] };
    for (const [index, item] of items.entries()) {
      const file = byKey.get(item.song.key);
      if (file && file.name === item.fileName && Date.parse(file.modifiedTime ?? '') >= item.lastModified) {
        result.unchanged += 1;
      } else {
        try {
          const saved = await save((file ?? byLegacyId.get(item.song.id))?.id ?? null, item.song, item.fileName, item.content());
          result[saved.updated ? 'updated' : 'created'] += 1;
        } catch (error) {
          if (isFatal(error)) throw error;
          result.failed.push(item.fileName);
        }
      }
      onProgress?.(index + 1, items.length);
    }
    return result;
  };

  /** Points a file at a song, so the song's next upload overwrites it instead of adding a copy. */
  const linkFile = async (fileId: string, song: DriveSong): Promise<void> => {
    await request(`${API}/${encodeURIComponent(fileId)}?fields=id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appProperties: songProperties(song) }),
    });
  };

  const downloadText = async (fileId: string): Promise<string> =>
    (await request(`${API}/${encodeURIComponent(fileId)}?alt=media`)).text();

  return { uploadGflow, listGflowFiles, backupLibrary, linkFile, downloadText };
};

export type DriveClient = ReturnType<typeof createDriveClient>;
