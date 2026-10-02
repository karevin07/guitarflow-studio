import { describe, it, expect, vi } from 'vitest';
import { DriveBackupItem, DriveError, appPropertyQuery, createDriveClient, driveSongKey, multipartBody, quoteDriveQuery } from './googleDrive';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A fake fetch answering in order, recording each call. */
const fakeFetch = (...responses: Response[]) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request ${String(input)}`);
    return next;
  });
  return { impl: impl as unknown as typeof fetch, calls };
};

const query = (url: string) => new URL(url).searchParams.get('q');

describe('Drive query helpers', () => {
  it('escapes quotes and backslashes', () => {
    expect(quoteDriveQuery("it's a\\b")).toBe("'it\\'s a\\\\b'");
    expect(appPropertyQuery('guitarflowSongId', '42')).toBe("appProperties has { key='guitarflowSongId' and value='42' } and trashed=false");
  });

  it('builds a multipart body with metadata first', () => {
    const body = multipartBody({ name: '歌.gflow' }, '{"title":"歌"}', 'b');
    expect(body).toBe('--b\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"歌.gflow"}\r\n--b\r\nContent-Type: application/json\r\n\r\n{"title":"歌"}\r\n--b--');
  });
});

describe('createDriveClient', () => {
  const token = vi.fn(async () => 'tok');
  const song42 = { key: driveSongKey({ id: '42', createdAt: 1700 }), id: '42' };

  it('creates the GuitarFlow folder and uploads a new song into it', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [] }),
      json({ files: [] }),
      json({ files: [] }),
      json({ id: 'folder1' }),
      json({ id: 'file1', name: 'Song.gflow' }),
    );
    const result = await createDriveClient(token, impl).uploadGflow(song42, 'Song.gflow', '{}');

    expect(result).toEqual({ id: 'file1', name: 'Song.gflow', updated: false });
    expect(query(calls[0].url)).toContain("key='guitarflowSongKey' and value='42:1700'");
    expect(query(calls[1].url)).toContain("key='guitarflowSongId' and value='42'");
    expect(query(calls[2].url)).toContain("mimeType='application/vnd.google-apps.folder'");
    expect(JSON.parse(calls[3].init.body as string)).toMatchObject({ name: 'GuitarFlow', appProperties: { guitarflowFolder: 'root' } });
    expect(calls[4].init.method).toBe('POST');
    expect(calls[4].url).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(calls[4].init.body).toContain('"parents":["folder1"]');
    expect(calls[4].init.body).toContain('"appProperties":{"guitarflowSongKey":"42:1700"}');
    expect((calls[4].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('overwrites the earlier upload of the same song', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [{ id: 'file1', name: 'Old.gflow' }] }),
      json({ id: 'file1', name: 'New.gflow' }),
    );
    const result = await createDriveClient(token, impl).uploadGflow(song42, 'New.gflow', '{}');

    expect(result).toEqual({ id: 'file1', name: 'New.gflow', updated: true });
    expect(calls[1].init.method).toBe('PATCH');
    expect(calls[1].url).toContain('/upload/drive/v3/files/file1?');
    expect(calls[1].init.body).toContain('{"name":"New.gflow","appProperties":{"guitarflowSongKey":"42:1700","guitarflowSongId":null}}');
  });

  it('adopts a file uploaded before keys had the creation time', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [] }),
      json({ files: [{ id: 'old', name: 'Song.gflow' }] }),
      json({ id: 'old', name: 'Song.gflow' }),
    );
    const result = await createDriveClient(token, impl).uploadGflow(song42, 'Song.gflow', '{}');
    expect(result.updated).toBe(true);
    expect(calls[2].url).toContain('/files/old?');
    expect(calls[2].init.body).toContain('"guitarflowSongId":null');
  });

  it('reuses the folder for later uploads', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [] }), json({ files: [] }), json({ files: [{ id: 'folder1', name: 'GuitarFlow' }] }), json({ id: 'a', name: 'A.gflow' }),
      json({ files: [] }), json({ files: [] }), json({ id: 'b', name: 'B.gflow' }),
    );
    const client = createDriveClient(token, impl);
    await client.uploadGflow({ key: '1:1', id: '1' }, 'A.gflow', '{}');
    await client.uploadGflow({ key: '2:2', id: '2' }, 'B.gflow', '{}');
    expect(calls).toHaveLength(7);
    expect(calls[6].init.body).toContain('"parents":["folder1"]');
  });

  it('lists every uploaded .gflow across pages, newest first', async () => {
    const { impl, calls } = fakeFetch(
      json({ nextPageToken: 'p2', files: [{ id: 'a', name: 'A.gflow', modifiedTime: '2026-10-02T03:00:00.000Z', appProperties: { guitarflowSongKey: '1:5' } }] }),
      json({ files: [{ id: 'b', name: 'B.gflow', modifiedTime: '2026-10-01T03:00:00.000Z' }] }),
    );
    const files = await createDriveClient(token, impl).listGflowFiles();

    expect(files).toEqual([
      { id: 'a', name: 'A.gflow', modifiedTime: Date.parse('2026-10-02T03:00:00.000Z'), songKey: '1:5' },
      { id: 'b', name: 'B.gflow', modifiedTime: Date.parse('2026-10-01T03:00:00.000Z'), songKey: undefined },
    ]);
    expect(query(calls[0].url)).toBe("mimeType='application/json' and trashed=false");
    expect(new URL(calls[0].url).searchParams.get('orderBy')).toBe('modifiedTime desc');
    expect(new URL(calls[1].url).searchParams.get('pageToken')).toBe('p2');
  });

  describe('backupLibrary', () => {
    const at = (iso: string) => Date.parse(iso);
    const item = (id: string, fileName: string, lastModified: number): DriveBackupItem => ({
      song: { key: `${id}:1`, id }, fileName, lastModified, content: () => `{"id":"${id}"}`,
    });

    it('creates new songs, updates changed ones and skips the rest after one listing', async () => {
      const { impl, calls } = fakeFetch(
        json({ files: [
          { id: 'f1', name: 'Same.gflow', modifiedTime: '2026-10-02T00:00:00Z', appProperties: { guitarflowSongKey: '1:1' } },
          { id: 'f2', name: 'Edited.gflow', modifiedTime: '2026-10-01T00:00:00Z', appProperties: { guitarflowSongKey: '2:1' } },
          { id: 'f3', name: 'Old.gflow', modifiedTime: '2026-10-01T00:00:00Z', appProperties: { guitarflowSongId: '3' } },
        ] }),
        json({ id: 'f2', name: 'Edited.gflow' }),
        json({ id: 'f3', name: 'Old.gflow' }),
        json({ files: [{ id: 'folder1', name: 'GuitarFlow' }] }),
        json({ id: 'f4', name: 'New.gflow' }),
      );
      const progress: number[] = [];
      const result = await createDriveClient(token, impl).backupLibrary([
        item('1', 'Same.gflow', at('2026-10-01T12:00:00Z')),
        item('2', 'Edited.gflow', at('2026-10-01T12:00:00Z')),
        item('3', 'Old.gflow', at('2026-09-01T00:00:00Z')),
        item('4', 'New.gflow', at('2026-10-01T00:00:00Z')),
      ], done => progress.push(done));

      expect(result).toEqual({ created: 1, updated: 2, unchanged: 1, failed: [] });
      expect(progress).toEqual([1, 2, 3, 4]);
      expect(calls[1].url).toContain('/files/f2?');
      expect(calls[2].url).toContain('/files/f3?');
      expect(calls[2].init.body).toContain('"guitarflowSongKey":"3:1","guitarflowSongId":null');
      expect(calls[4].init.method).toBe('POST');
    });

    it('re-uploads a renamed song even when its file is newer', async () => {
      const { impl, calls } = fakeFetch(
        json({ files: [{ id: 'f1', name: 'Before.gflow', modifiedTime: '2026-10-02T00:00:00Z', appProperties: { guitarflowSongKey: '1:1' } }] }),
        json({ id: 'f1', name: 'After.gflow' }),
      );
      const result = await createDriveClient(token, impl).backupLibrary([item('1', 'After.gflow', at('2026-10-01T00:00:00Z'))]);
      expect(result.updated).toBe(1);
      expect(calls[1].init.body).toContain('"name":"After.gflow"');
    });

    it('keeps going past a failed song but stops when access is refused', async () => {
      const { impl } = fakeFetch(json({ files: [] }), json({ files: [{ id: 'folder1', name: 'GuitarFlow' }] }), new Response('', { status: 500 }), json({ id: 'b', name: 'B.gflow' }));
      const result = await createDriveClient(token, impl).backupLibrary([item('1', 'A.gflow', 0), item('2', 'B.gflow', 0)]);
      expect(result).toEqual({ created: 1, updated: 0, unchanged: 0, failed: ['A.gflow'] });

      const denied = fakeFetch(json({ files: [] }), json({ files: [{ id: 'folder1', name: 'GuitarFlow' }] }), new Response('', { status: 403 }));
      await expect(createDriveClient(token, denied.impl).backupLibrary([item('1', 'A.gflow', 0), item('2', 'B.gflow', 0)]))
        .rejects.toMatchObject({ status: 403 });
      expect(denied.calls).toHaveLength(3);
    });
  });

  it('links a file to a song and drops the id-only mark', async () => {
    const { impl, calls } = fakeFetch(json({ id: 'f1' }));
    await createDriveClient(token, impl).linkFile('f1', song42);
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toBe('https://www.googleapis.com/drive/v3/files/f1?fields=id');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ appProperties: { guitarflowSongKey: '42:1700', guitarflowSongId: null } });
  });

  it('retries once with a fresh token after a 401', async () => {
    const getToken = vi.fn(async ({ forceRefresh = false } = {}) => (forceRefresh ? 'new' : 'old'));
    const { impl, calls } = fakeFetch(new Response('', { status: 401 }), new Response('{"title":"x"}'));
    await expect(createDriveClient(getToken, impl).downloadText('f1')).resolves.toBe('{"title":"x"}');
    expect(calls[0].url).toBe('https://www.googleapis.com/drive/v3/files/f1?alt=media');
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer new');
  });

  it('turns failures into a DriveError with a readable message', async () => {
    const { impl } = fakeFetch(new Response('', { status: 404 }));
    const error = await createDriveClient(token, impl).downloadText('missing').catch(e => e);
    expect(error).toBeInstanceOf(DriveError);
    expect(error).toMatchObject({ status: 404, message: '在 Google Drive 找不到這個檔案。' });
  });
});
