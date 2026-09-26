// Optional Google Calendar connection, entirely in the browser:
// Google Identity Services (token model) → short-lived access token → Calendar REST API.
// Nothing is loaded or sent to Google until the user clicks "connect". The token is kept in memory only.
// Setup: docs/GOOGLE_CALENDAR.md (needs VITE_GOOGLE_CLIENT_ID).
import { addDays, isoDate } from './dates';
import type { CalEntry } from './types';

export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// ── mapping (pure, unit-tested) ──

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  status?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Google event → calendar entry in the user's local time zone. */
export function fromGoogle(ev: GoogleEvent, fallbackTitle = '(—)'): CalEntry {
  const base = { id: `g:${ev.id}`, googleId: ev.id, source: 'google' as const, title: ev.summary?.trim() || fallbackTitle,
    notes: ev.description || undefined, link: ev.htmlLink, done: false, kind: 'event' as const };
  if (ev.start.date) return { ...base, date: ev.start.date };
  const start = new Date(ev.start.dateTime!);
  const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : undefined;
  return { ...base, date: isoDate(start), time: hhmm(start), endTime: end && isoDate(end) === isoDate(start) ? hhmm(end) : undefined };
}

/** Calendar entry → Google event body. All-day entries use an exclusive end date, as the API requires. */
export function toGoogle(e: Pick<CalEntry, 'time' | 'endTime' | 'title' | 'notes' | 'kind'> & { date: string }, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const summary = e.kind === 'exam' ? `🎓 ${e.title}` : e.title;
  const description = e.notes;
  if (!e.time) return { summary, description, start: { date: e.date }, end: { date: addDays(e.date, 1) } };
  const end = e.endTime ?? plusOneHour(e.time);
  const endDate = end <= e.time ? addDays(e.date, 1) : e.date; // e.g. 23:30 → 00:30
  return { summary, description, start: { dateTime: `${e.date}T${e.time}:00`, timeZone }, end: { dateTime: `${endDate}T${end}:00`, timeZone } };
}

function plusOneHour(t: string) {
  const h = (Number(t.slice(0, 2)) + 1) % 24;
  return `${String(h).padStart(2, '0')}${t.slice(2)}`;
}

// ── Google Identity Services token client ──

interface TokenResponse { access_token?: string; expires_in?: number; error?: string }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void }
declare global {
  interface Window {
    google?: { accounts: { oauth2: {
      initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    } } };
  }
}

let gisLoading: Promise<void> | undefined;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisLoading = undefined; reject(new Error('Could not load Google sign-in')); };
    document.head.appendChild(s);
  });
  return gisLoading;
}

let token: { value: string; expiresAt: number } | undefined;
export const hasToken = () => !!token && token.expiresAt > Date.now() + 30_000;

/** Opens Google's consent popup (must be called from a click). Resolves when a token is granted. */
export async function connect(clientId = GOOGLE_CLIENT_ID): Promise<void> {
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'no token'));
        token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve();
      },
      error_callback: (e) => reject(new Error(e.type)), // popup closed / blocked
    });
    client.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

export function disconnect() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.value);
  token = undefined;
}

export class GoogleAuthError extends Error {}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!hasToken()) throw new GoogleAuthError('not connected');
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token!.value}`, 'Content-Type': 'application/json', ...init.headers } });
  if (r.status === 401 || r.status === 403) { token = undefined; throw new GoogleAuthError(`Google ${r.status}`); }
  if (!r.ok) throw new Error(`Google Calendar ${r.status}`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

/** Events of the primary calendar between two local dates (inclusive). */
export async function listEvents(from: string, to: string, fallbackTitle?: string): Promise<CalEntry[]> {
  const params = new URLSearchParams({
    timeMin: new Date(`${from}T00:00:00`).toISOString(),
    timeMax: new Date(`${addDays(to, 1)}T00:00:00`).toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
  });
  const out: CalEntry[] = [];
  let pageToken: string | undefined;
  do {
    if (pageToken) params.set('pageToken', pageToken);
    const r = await call<{ items?: GoogleEvent[]; nextPageToken?: string }>(`${API}?${params}`);
    for (const ev of r.items ?? []) if (ev.status !== 'cancelled') out.push(fromGoogle(ev, fallbackTitle));
    pageToken = r.nextPageToken;
  } while (pageToken);
  return out;
}

export const createEvent = (e: Parameters<typeof toGoogle>[0]) =>
  call<GoogleEvent>(API, { method: 'POST', body: JSON.stringify(toGoogle(e)) });

export const deleteEvent = (googleId: string) =>
  call<void>(`${API}/${encodeURIComponent(googleId)}`, { method: 'DELETE' });
