// Import/export cards as CSV/TSV. Also accepts Anki's "Notes in Plain Text" export (front<TAB>back).
import type { Card } from './cards';
import type { Gender } from './words';

export type CardFields = Pick<Card, 'de' | 'gender' | 'plural' | 'vi' | 'en' | 'example' | 'tags'>;

export const COLUMNS = ['de', 'gender', 'plural', 'vi', 'en', 'example_de', 'example_vi', 'example_en', 'tags'] as const;

/** Split CSV text into rows, honouring "quoted, fields" and "" escapes. */
export function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith('#')) ?? '';
  if (first.includes('\t')) return '\t';
  if (first.includes(';')) return ';';
  return ',';
}

const ARTICLE = /^(der|die|das)\s+(.+)$/i;
const stripHtml = (s: string) => s.replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

/** Parse imported text into card fields. Returns cards plus how many lines were skipped. */
export function importCards(text: string): { cards: CardFields[]; skipped: number } {
  // Anki adds "#separator:tab" style header lines
  const body = text.split(/\r?\n/).filter((l) => !l.startsWith('#')).join('\n');
  const rows = parseDelimited(body, detectDelimiter(text));
  if (!rows.length) return { cards: [], skipped: 0 };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes('de');
  const idx = (name: string) => header.indexOf(name);
  const data = hasHeader ? rows.slice(1) : rows;
  const cards: CardFields[] = [];
  let skipped = 0;

  for (const r of data) {
    const cell = (name: string, fallbackPos: number) => stripHtml((hasHeader ? r[idx(name)] : r[fallbackPos]) ?? '');
    let de = cell('de', 0);
    let gender = cell('gender', -1).toLowerCase() as Gender | '';
    const m = de.match(ARTICLE);
    if (m) { gender = m[1].toLowerCase() as Gender; de = m[2].trim(); }
    if (!de) { skipped++; continue; }
    const plural = hasHeader ? cell('plural', -1) : '';
    const exDe = cell('example_de', -1);
    cards.push({
      de,
      gender: gender === 'der' || gender === 'die' || gender === 'das' ? gender : undefined,
      plural: plural === '–' || plural === '-' ? null : plural || undefined,
      // without a header: column 2 is the meaning (Anki "back")
      vi: (hasHeader ? cell('vi', -1) : cell('', 1)) || undefined,
      en: (hasHeader ? cell('en', -1) : cell('', 2)) || undefined,
      example: exDe ? { de: exDe, vi: cell('example_vi', -1) || undefined, en: cell('example_en', -1) || undefined } : undefined,
      tags: (hasHeader ? cell('tags', -1) : '').split(/[\s,]+/).filter(Boolean),
    });
  }
  return { cards, skipped };
}

const quote = (s: string) => (/[",\n\t;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** CSV with a header row; round-trips through importCards. */
export function exportCards(cards: CardFields[]): string {
  const lines = [COLUMNS.join(',')];
  for (const c of cards) {
    lines.push([
      c.de, c.gender ?? '', c.plural === null ? '–' : c.plural ?? '', c.vi ?? '', c.en ?? '',
      c.example?.de ?? '', c.example?.vi ?? '', c.example?.en ?? '', c.tags.join(' '),
    ].map(quote).join(','));
  }
  return lines.join('\n') + '\n';
}
