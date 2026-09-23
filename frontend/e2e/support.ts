import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const apiBase = process.env.E2E_API_URL ?? 'http://127.0.0.1:18000/api';

export const register = async (request: APIRequestContext) => {
  const response = await request.post(`${apiBase}/auth/register/`, {
    data: { username: `e2e_${randomUUID().replaceAll('-', '').slice(0, 16)}`, password: 'E2e-test-pass-2026' },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
};

export const authenticatePage = async (page: Page, token: string) => {
  await page.addInitScript(value => localStorage.setItem('guitarflow-auth-token', value), token);
};

export const seedSong = async (
  request: APIRequestContext,
  token: string,
  options: { title: string; chordColumns?: Record<number, string>; lyricColumns?: Record<number, string>; playedFrets?: Array<number | null>; sectionTitles?: string[] }
) => {
  const rows = Array.from({ length: 6 }, () => Array(16).fill('-'));
  options.playedFrets?.forEach((fret, stringIndex) => {
    rows[stringIndex][0] = fret === null ? '-' : String(fret);
  });
  const chords: Array<string | null> = Array(16).fill(null);
  Object.entries(options.chordColumns ?? {}).forEach(([column, symbol]) => {
    chords[Number(column)] = symbol;
  });
  const lyrics: Array<string | null> = Array(16).fill(null);
  Object.entries(options.lyricColumns ?? {}).forEach(([column, line]) => {
    lyrics[Number(column)] = line;
  });
  const response = await request.post(`${apiBase}/songs/`, {
    headers: { Authorization: `Token ${token}` },
    data: {
      title: options.title,
      transposeOffset: 0,
      voicingPlan: {},
      customChords: [],
      sections: (options.sectionTitles ?? ['Verse']).map(title => ({ title, capo: 0, timeSignature: [4, 4], measures: [rows], chords: [chords], lyrics: [lyrics] })),
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).id as string;
};

export const getSong = async (request: APIRequestContext, token: string, songId: string) => {
  const response = await request.get(`${apiBase}/songs/${songId}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
};
