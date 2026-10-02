/**
 * Google sign-in (Google Identity Services token model) and the Google Picker.
 * The access token stays in memory only; it lasts about an hour and is asked for again after that.
 */
import { DriveError, createDriveClient } from './googleDrive';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
/** The Cloud project number; the Picker needs it to grant drive.file access to picked files. */
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const isDriveConfigured = (): boolean => Boolean(CLIENT_ID && API_KEY && APP_ID);

/** The user closed the Google sign-in popup or the Picker; nothing to report. */
export class DriveCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'DriveCancelledError';
  }
}

interface TokenResponse { access_token?: string; expires_in?: number; error?: string; error_description?: string }
interface TokenClient {
  callback: (response: TokenResponse) => void;
  error_callback: (error: { type: string }) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}
interface PickerDoc { id: string; name: string; mimeType: string }
interface PickerBuilderChain {
  addView(view: unknown): PickerBuilderChain;
  enableFeature(feature: string): PickerBuilderChain;
  setOAuthToken(token: string): PickerBuilderChain;
  setDeveloperKey(key: string): PickerBuilderChain;
  setAppId(id: string): PickerBuilderChain;
  setLocale(locale: string): PickerBuilderChain;
  setTitle(title: string): PickerBuilderChain;
  setCallback(callback: (data: { action: string; docs?: PickerDoc[] }) => void): PickerBuilderChain;
  build(): { setVisible(visible: boolean): void };
}
interface GoogleGlobal {
  accounts: { oauth2: { initTokenClient(config: { client_id: string; scope: string; callback: TokenClient['callback'] }): TokenClient } };
  picker: {
    DocsView: new (viewId: string) => { setMimeTypes(types: string): unknown; setIncludeFolders(include: boolean): unknown; setMode(mode: string): unknown };
    PickerBuilder: new () => PickerBuilderChain;
    ViewId: { DOCS: string };
    DocsViewMode: { LIST: string };
    Feature: { MULTISELECT_ENABLED: string };
    Action: { PICKED: string; CANCEL: string };
  };
}
declare global {
  interface Window {
    google?: GoogleGlobal;
    gapi?: { load(api: string, callback: () => void): void };
  }
}

const scripts = new Map<string, Promise<void>>();
const loadScript = (src: string): Promise<void> => {
  const cached = scripts.get(src);
  if (cached) return cached;
  const loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scripts.delete(src);
      reject(new DriveError('無法載入 Google 服務，請檢查網路連線。'));
    };
    document.head.appendChild(script);
  });
  scripts.set(src, loading);
  return loading;
};

let pickerLoaded: Promise<void> | null = null;
/**
 * Loads the Google scripts ahead of the click, so the sign-in popup can open straight from the
 * user's tap; browsers block popups opened after a slow await.
 */
export const preloadDrive = (): Promise<void> => {
  if (!isDriveConfigured()) return Promise.resolve();
  pickerLoaded ??= Promise.all([
    loadScript('https://accounts.google.com/gsi/client'),
    loadScript('https://apis.google.com/js/api.js').then(() => new Promise<void>(resolve => window.gapi!.load('picker', resolve))),
  ]).then(() => undefined).catch(error => {
    pickerLoaded = null;
    throw error;
  });
  return pickerLoaded;
};

let tokenClient: TokenClient | null = null;
let token: { value: string; expiresAt: number } | null = null;

const requestToken = (): Promise<string> => new Promise((resolve, reject) => {
  tokenClient ??= window.google!.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID!, scope: SCOPE, callback: () => {} });
  tokenClient.callback = response => {
    if (response.error || !response.access_token) {
      reject(new DriveError(response.error === 'access_denied' ? '需要允許 GuitarFlow 存取 Google Drive 才能繼續。' : 'Google 登入失敗，請再試一次。'));
      return;
    }
    token = { value: response.access_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 };
    resolve(response.access_token);
  };
  tokenClient.error_callback = error => {
    reject(error.type === 'popup_closed' ? new DriveCancelledError() : new DriveError('無法開啟 Google 登入視窗，請允許此網站的彈出視窗。'));
  };
  // An empty prompt asks for consent only the first time.
  tokenClient.requestAccessToken({ prompt: '' });
});

const getToken = async ({ forceRefresh = false } = {}): Promise<string> => {
  if (!isDriveConfigured()) throw new DriveError('尚未設定 Google Drive 連線。');
  if (!forceRefresh && token && token.expiresAt - Date.now() > 60_000) return token.value;
  await preloadDrive();
  return requestToken();
};

export const drive = createDriveClient(getToken);

export interface PickedDriveFile { id: string; name: string }

/** Opens the Google Picker for .gflow files; resolves to an empty list when the user cancels. */
export const pickGflowFiles = async (): Promise<PickedDriveFile[]> => {
  const accessToken = await getToken();
  const { picker } = window.google!;
  // Files uploaded from a computer usually get octet-stream or text, since Drive does not know .gflow.
  const view = new picker.DocsView(picker.ViewId.DOCS);
  view.setMimeTypes('application/json,application/octet-stream,text/plain');
  view.setIncludeFolders(true);
  view.setMode(picker.DocsViewMode.LIST);
  return new Promise(resolve => {
    new picker.PickerBuilder()
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY!)
      .setAppId(APP_ID!)
      .setLocale('zh-TW')
      .setTitle('選擇要匯入的 .gflow 樂譜')
      .setCallback(data => {
        if (data.action === picker.Action.PICKED) resolve((data.docs ?? []).map(doc => ({ id: doc.id, name: doc.name })));
        else if (data.action === picker.Action.CANCEL) resolve([]);
      })
      .build()
      .setVisible(true);
  });
};
