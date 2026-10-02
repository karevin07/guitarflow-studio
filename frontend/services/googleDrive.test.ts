import { describe, it, expect, vi } from 'vitest';
import { DriveError, appPropertyQuery, createDriveClient, multipartBody, quoteDriveQuery } from './googleDrive';

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

  it('creates the GuitarFlow folder and uploads a new song into it', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [] }),
      json({ files: [] }),
      json({ id: 'folder1' }),
      json({ id: 'file1', name: 'Song.gflow' }),
    );
    const result = await createDriveClient(token, impl).uploadGflow('42', 'Song.gflow', '{}');

    expect(result).toEqual({ id: 'file1', name: 'Song.gflow', updated: false });
    expect(query(calls[0].url)).toContain("value='42'");
    expect(query(calls[1].url)).toContain("mimeType='application/vnd.google-apps.folder'");
    expect(JSON.parse(calls[2].init.body as string)).toMatchObject({ name: 'GuitarFlow', appProperties: { guitarflowFolder: 'root' } });
    expect(calls[3].init.method).toBe('POST');
    expect(calls[3].url).toContain('/upload/drive/v3/files?uploadType=multipart');
    expect(calls[3].init.body).toContain('"parents":["folder1"]');
    expect(calls[3].init.body).toContain('"appProperties":{"guitarflowSongId":"42"}');
    expect((calls[3].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('overwrites the earlier upload of the same song', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [{ id: 'file1', name: 'Old.gflow' }] }),
      json({ id: 'file1', name: 'New.gflow' }),
    );
    const result = await createDriveClient(token, impl).uploadGflow('42', 'New.gflow', '{}');

    expect(result).toEqual({ id: 'file1', name: 'New.gflow', updated: true });
    expect(calls[1].init.method).toBe('PATCH');
    expect(calls[1].url).toContain('/upload/drive/v3/files/file1?');
    expect(calls[1].init.body).toContain('{"name":"New.gflow"}');
  });

  it('reuses the folder for later uploads', async () => {
    const { impl, calls } = fakeFetch(
      json({ files: [] }), json({ files: [{ id: 'folder1', name: 'GuitarFlow' }] }), json({ id: 'a', name: 'A.gflow' }),
      json({ files: [] }), json({ id: 'b', name: 'B.gflow' }),
    );
    const client = createDriveClient(token, impl);
    await client.uploadGflow('1', 'A.gflow', '{}');
    await client.uploadGflow('2', 'B.gflow', '{}');
    expect(calls).toHaveLength(5);
    expect(calls[4].init.body).toContain('"parents":["folder1"]');
  });

  it('lists every uploaded .gflow across pages, newest first', async () => {
    const { impl, calls } = fakeFetch(
      json({ nextPageToken: 'p2', files: [{ id: 'a', name: 'A.gflow', modifiedTime: '2026-10-02T03:00:00.000Z' }] }),
      json({ files: [{ id: 'b', name: 'B.gflow', modifiedTime: '2026-10-01T03:00:00.000Z' }] }),
    );
    const files = await createDriveClient(token, impl).listGflowFiles();

    expect(files).toEqual([
      { id: 'a', name: 'A.gflow', modifiedTime: Date.parse('2026-10-02T03:00:00.000Z') },
      { id: 'b', name: 'B.gflow', modifiedTime: Date.parse('2026-10-01T03:00:00.000Z') },
    ]);
    expect(query(calls[0].url)).toBe("mimeType='application/json' and trashed=false");
    expect(new URL(calls[0].url).searchParams.get('orderBy')).toBe('modifiedTime desc');
    expect(new URL(calls[1].url).searchParams.get('pageToken')).toBe('p2');
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
