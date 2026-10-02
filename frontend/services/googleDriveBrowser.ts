/**
 * Google sign-in with Google Identity Services (token model); only an OAuth client ID is needed.
 * The access token stays in memory only; it lasts about an hour and is asked for again after that.
 */
import { DriveError, createDriveClient } from './googleDrive';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const isDriveConfigured = (): boolean => Boolean(CLIENT_ID);

/** The user closed the Google sign-in popup; nothing to report. */
export class DriveCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'DriveCancelledError';
  }
}

interface TokenResponse { access_token?: string; expires_in?: number; error?: string }
interface TokenClient {
  callback: (response: TokenResponse) => void;
  error_callback: (error: { type: string }) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: { oauth2: { initTokenClient(config: { client_id: string; scope: string; include_granted_scopes?: boolean; callback: TokenClient['callback'] }): TokenClient } };
    };
  }
}

let gisLoaded: Promise<void> | null = null;
/**
 * Loads the Google sign-in script ahead of the click, so the popup can open straight from the
 * user's tap; browsers block popups opened after a slow await.
 */
export const preloadDrive = (): Promise<void> => {
  if (!isDriveConfigured()) return Promise.resolve();
  gisLoaded ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoaded = null;
      script.remove();
      reject(new DriveError('無法載入 Google 登入，請檢查網路連線。'));
    };
    document.head.appendChild(script);
  });
  return gisLoaded;
};

let tokenClient: TokenClient | null = null;
let token: { value: string; expiresAt: number } | null = null;

const requestToken = (): Promise<string> => new Promise((resolve, reject) => {
  tokenClient ??= window.google!.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID!,
    scope: SCOPE,
    // Ask for drive.file alone: the Cloud project may hold grants from other apps (e.g. YouTube
    // scopes), and Google refuses to request some of those together with Drive.
    include_granted_scopes: false,
    callback: () => {},
  });
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
