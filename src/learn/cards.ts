// Flashcards: data model, FSRS scheduling, review queue and answer checking. Pure logic, no IO.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type { Gender } from './words';

export { Rating, State };
export type { Grade };

export interface Deck {
  id: string;
  name: string;
  /** built-in decks can be reset but not deleted by accident */
  builtin?: boolean;
  newPerDay: number;
  createdAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  de: string;
  gender?: Gender;
  plural?: string | null;
  vi?: string;
  en?: string;
  example?: { de: string; vi?: string; en?: string };
  tags: string[];
  /** order new cards are introduced in */
  order: number;
  createdAt: number;
  srs: FsrsCard;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  at: number;
  rating: Grade;
  /** the card was new before this review (counts against the daily new-card limit) */
  wasNew: boolean;
  ms: number;
  source: 'review' | string;
  /** logged from a game without changing the card's schedule */
  practice?: boolean;
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export const newSrs = (now = new Date()) => createEmptyCard(now);

/** Apply a rating. Returns the updated card. */
export function schedule(card: Card, rating: Grade, now = new Date()): Card {
  return { ...card, srs: scheduler.next(card.srs, now, rating).card };
}

/** Next due date for each rating, for the button labels. */
export function preview(card: Card, now = new Date()): Record<Grade, Date> {
  const r = scheduler.repeat(card.srs, now);
  return { [Rating.Again]: r[Rating.Again].card.due, [Rating.Hard]: r[Rating.Hard].card.due, [Rating.Good]: r[Rating.Good].card.due, [Rating.Easy]: r[Rating.Easy].card.due } as Record<Grade, Date>;
}

/** "<1m", "10m", "3h", "4d", "2mo", "1.5y" */
export function formatInterval(ms: number): string {
  const m = ms / 60_000;
  if (m < 1) return '<1m';
  if (m < 60) return `${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${Math.round((d / 365) * 10) / 10}y`;
}

export const isNew = (c: Card) => c.srs.state === State.New;
export const isDue = (c: Card, now: Date) => !isNew(c) && new Date(c.srs.due).getTime() <= now.getTime();

/** Cards learned within this window are shown again in the same session (Anki's "learn ahead"). */
export const LEARN_AHEAD_MS = 20 * 60_000;

/**
 * Build a session queue: cards in (re)learning first, then due reviews (most overdue first),
 * with new cards mixed in, one after every 3 reviews, up to the remaining daily limit.
 */
export function buildQueue(cards: Card[], now: Date, newLeft: number): Card[] {
  const t = now.getTime();
  const due = (c: Card) => new Date(c.srs.due).getTime();
  const learning = cards.filter((c) => (c.srs.state === State.Learning || c.srs.state === State.Relearning) && due(c) <= t + LEARN_AHEAD_MS).sort((a, b) => due(a) - due(b));
  const reviews = cards.filter((c) => c.srs.state === State.Review && due(c) <= t).sort((a, b) => due(a) - due(b));
  const fresh = cards.filter(isNew).sort((a, b) => a.order - b.order).slice(0, Math.max(0, newLeft));
  const mixed: Card[] = [];
  let r = 0, n = 0;
  while (r < reviews.length || n < fresh.length) {
    for (let k = 0; k < 3 && r < reviews.length; k++) mixed.push(reviews[r++]);
    if (n < fresh.length) mixed.push(fresh[n++]);
  }
  return [...learning, ...mixed];
}

/** After rating, keep the card in this session if it's due again soon. */
export function requeue(queue: Card[], card: Card, now: Date): Card[] {
  const rest = queue.filter((c) => c.id !== card.id);
  const due = new Date(card.srs.due).getTime();
  if (due > now.getTime() + LEARN_AHEAD_MS) return rest;
  // insert after cards that are due earlier; never directly next if others are waiting
  const idx = rest.findIndex((c) => new Date(c.srs.due).getTime() > due);
  const at = Math.max(Math.min(rest.length, 2), idx === -1 ? rest.length : idx);
  return [...rest.slice(0, at), card, ...rest.slice(at)];
}

// ───────────────────────────── answer checking ─────────────────────────────

export type Verdict = 'correct' | 'typo' | 'umlaut' | 'article' | 'wrong';

const ARTICLES = new Set(['der', 'die', 'das']);
const clean = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
/** ä→ae, ß→ss … so "Mädchen" typed as "Maedchen" is recognised */
const deumlaut = (s: string) => s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/ẞ/g, 'SS');

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * Grade a typed German answer against a card. Article and word are judged separately:
 * a wrong article with the right word is its own verdict (the most common learner error).
 * Capitalisation of nouns matters in German, but we only flag it as a typo.
 */
export function checkAnswer(input: string, card: Pick<Card, 'de' | 'gender'>): Verdict {
  const parts = clean(input).split(' ');
  const givenArticle = parts.length > 1 && ARTICLES.has(parts[0].toLowerCase()) ? parts.shift()!.toLowerCase() : undefined;
  const word = parts.join(' ');
  const target = clean(card.de);
  if (!word) return 'wrong';

  const lw = word.toLowerCase(), lt = target.toLowerCase();
  let wordVerdict: Verdict;
  if (word === target) wordVerdict = 'correct';
  else if (lw === lt) wordVerdict = 'typo'; // only capitalisation differs
  else if (deumlaut(lw) === deumlaut(lt)) wordVerdict = 'umlaut'; // "Maedchen", "Strasse"
  else if (levenshtein(lw, lt) <= (lt.length > 6 ? 2 : 1)) wordVerdict = 'typo';
  else return 'wrong';

  if (card.gender && givenArticle !== card.gender) return 'article';
  return wordVerdict;
}

/** Suggested rating for a verdict (the user can still override). */
export const suggestRating = (v: Verdict): Grade =>
  v === 'correct' ? Rating.Good : v === 'wrong' ? Rating.Again : Rating.Hard;

// ───────────────────────────── note → card ─────────────────────────────

/**
 * Turn a sticky-note text into card fields. Expected (flexible) layout:
 *   der Tisch        ← first line: German, optionally with article
 *   die Tische       ← optional plural line (starts with "die " or "Pl.")
 *   cái bàn          ← meaning (rest)
 *   „Beispiel.“      ← quoted line becomes the example
 */
export function parseNote(text: string): Pick<Card, 'de' | 'gender' | 'plural' | 'vi' | 'example'> | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const head = lines.shift()!.split(/\s+/);
  const gender = ARTICLES.has(head[0].toLowerCase()) && head.length > 1 ? (head.shift()!.toLowerCase() as Gender) : undefined;
  const de = head.join(' ');
  let plural: string | null | undefined;
  if (lines[0] && /^(die\s+|pl\.?\s*:?\s*)/i.test(lines[0])) plural = lines.shift()!.replace(/^(die\s+|pl\.?\s*:?\s*)/i, '').trim() || null;
  else if (lines[0] === '–' || lines[0] === '-') { lines.shift(); plural = null; }
  const exIdx = lines.findIndex((l) => /^[„"“]/.test(l));
  const example = exIdx >= 0 ? { de: lines.splice(exIdx, 1)[0].replace(/^[„"“]|[“"”]$/g, '') } : undefined;
  const vi = lines.join(' · ') || undefined;
  return { de, gender, plural, vi, example };
}
