import { useMemo, useRef, useState } from 'react';
import { formatInterval, isNew, State, type Card } from '../../learn/cards';
import { useLearn } from '../../learn/store';
import { exportCards, importCards, type CardFields } from '../../learn/csv';
import type { Gender } from '../../learn/words';
import { useSettings } from '../../state/settings';
import { useToast } from '../../ui/toast';
import { UmlautBar } from '../../ui/UmlautBar';
import { Sprite } from '../../ui/Sprite';
import { fmt, useT } from '../../i18n';
import { Headword, meaning } from './CardFace';

const EMPTY: CardFields = { de: '', tags: [] };

function CardForm({ initial, onSave, onCancel }: { initial: CardFields; onSave: (f: CardFields) => void; onCancel: () => void }) {
  const t = useT();
  const [f, setF] = useState<CardFields>(initial);
  const deRef = useRef<HTMLInputElement>(null);
  const exRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<CardFields>) => setF((x) => ({ ...x, ...patch }));
  const ex = f.example ?? { de: '' };

  return (
    <form className="cardform" onSubmit={(e) => {
      e.preventDefault();
      if (!f.de.trim()) return;
      const example = ex.de.trim() ? { de: ex.de.trim(), vi: ex.vi?.trim() || undefined, en: ex.en?.trim() || undefined } : undefined;
      onSave({ ...f, de: f.de.trim(), vi: f.vi?.trim() || undefined, en: f.en?.trim() || undefined, example, plural: f.gender ? f.plural : undefined });
    }}>
      <label className="px-label">{t('cards.f.gender')}
        <span className="px-row">
          {([undefined, 'der', 'die', 'das'] as (Gender | undefined)[]).map((g) => (
            <button key={g ?? 'none'} type="button" className={`px-btn ${g ? `gender-btn gender-btn--${g}` : ''}`} aria-pressed={f.gender === g} onClick={() => set({ gender: g })}>
              {g ?? t('cards.f.none')}
            </button>
          ))}
        </span>
      </label>
      <label className="px-label">{t('cards.f.de')}
        <input ref={deRef} className="px-input" required lang="de" value={f.de} autoFocus onChange={(e) => set({ de: e.target.value })} />
      </label>
      <UmlautBar target={deRef} value={f.de} onChange={(de) => set({ de })} />
      {f.gender && (
        <label className="px-label">{t('cards.f.plural')}
          <span className="px-row">
            <input className="px-input" lang="de" style={{ flex: 1 }} value={f.plural ?? ''} disabled={f.plural === null} onChange={(e) => set({ plural: e.target.value || undefined })} />
            <label className="px-check"><input type="checkbox" checked={f.plural === null} onChange={(e) => set({ plural: e.target.checked ? null : undefined })} />{t('cards.f.noPlural')}</label>
          </span>
        </label>
      )}
      <div className="cardform__two">
        <label className="px-label">{t('cards.f.vi')}<input className="px-input" lang="vi" value={f.vi ?? ''} onChange={(e) => set({ vi: e.target.value })} /></label>
        <label className="px-label">{t('cards.f.en')}<input className="px-input" lang="en" value={f.en ?? ''} onChange={(e) => set({ en: e.target.value })} /></label>
      </div>
      <label className="px-label">{t('cards.f.exDe')}
        <input ref={exRef} className="px-input" lang="de" value={ex.de} onChange={(e) => set({ example: { ...ex, de: e.target.value } })} />
      </label>
      <div className="cardform__two">
        <label className="px-label">{t('cards.f.exVi')}<input className="px-input" value={ex.vi ?? ''} onChange={(e) => set({ example: { ...ex, vi: e.target.value } })} /></label>
        <label className="px-label">{t('cards.f.exEn')}<input className="px-input" value={ex.en ?? ''} onChange={(e) => set({ example: { ...ex, en: e.target.value } })} /></label>
      </div>
      <label className="px-label">{t('cards.f.tags')}
        <input className="px-input" value={f.tags.join(' ')} onChange={(e) => set({ tags: e.target.value.split(/\s+/).filter(Boolean) })} />
      </label>
      <div className="px-row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="px-btn" onClick={onCancel}>{t('cards.cancel')}</button>
        <button type="submit" className="px-btn px-btn--primary" disabled={!f.de.trim()}>{t('cards.save')}</button>
      </div>
    </form>
  );
}

function stateLabel(c: Card, t: ReturnType<typeof useT>) {
  if (isNew(c)) return t('cards.state.new');
  if (c.srs.state === State.Learning || c.srs.state === State.Relearning) return t('cards.state.learning');
  const ms = new Date(c.srs.due).getTime() - Date.now();
  return ms <= 0 ? t('cards.state.now') : fmt(t('cards.state.in'), { t: formatInterval(ms) });
}

const toFields = ({ de, gender, plural, vi, en, example, tags }: Card): CardFields => ({ de, gender, plural, vi, en, example, tags });

export function DeckView({ deckId, onBack }: { deckId: string; onBack: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const s = useLearn();
  const deck = s.decks.find((d) => d.id === deckId);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | 'new'>();
  const fileRef = useRef<HTMLInputElement>(null);

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.cards.filter((c) => c.deckId === deckId)
      .filter((c) => !needle || [c.de, c.vi, c.en, ...c.tags].some((x) => x?.toLowerCase().includes(needle)))
      .sort((a, b) => a.order - b.order);
  }, [s.cards, deckId, q]);

  if (!deck) return null;

  const onImport = async (file?: File) => {
    if (!file) return;
    const { cards: fields, skipped } = importCards(await file.text());
    if (fields.length) await s.addCards(deckId, fields);
    useToast.getState().show(fmt(t('cards.imported'), { n: fields.length }) + (skipped ? ` · ${fmt(t('cards.skipped'), { n: skipped })}` : ''), 4000);
  };

  const onExport = () => {
    const blob = new Blob([exportCards(s.cards.filter((c) => c.deckId === deckId).sort((a, b) => a.order - b.order).map(toFields))], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${deck.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const editingCard = editing && editing !== 'new' ? s.cards.find((c) => c.id === editing) : undefined;
  if (editing) {
    return (
      <div className="deckview">
        <div className="deckview__head"><b>{deck.name}</b></div>
        <CardForm
          initial={editingCard ? toFields(editingCard) : EMPTY}
          onCancel={() => setEditing(undefined)}
          onSave={async (f) => {
            if (editingCard) await s.updateCard(editingCard.id, f);
            else await s.addCards(deckId, [f]);
            setEditing(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="deckview">
      <div className="deckview__head">
        <button className="px-btn" onClick={onBack}>◀ {t('cards.back')}</button>
        <input className="px-input deckview__name" value={deck.name} aria-label={deck.name} onChange={(e) => void s.updateDeck(deckId, { name: e.target.value })} />
      </div>

      <div className="deckview__tools">
        <button className="px-btn px-btn--primary" onClick={() => setEditing('new')}>+ {t('cards.addCard')}</button>
        <button className="px-btn" onClick={() => fileRef.current?.click()}>{t('cards.import')}</button>
        <button className="px-btn" onClick={onExport} disabled={!cards.length}>{t('cards.export')}</button>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
        <label className="px-label deckview__limit">{t('cards.newPerDay')}
          <input className="px-input" type="number" min={0} max={200} value={deck.newPerDay} onChange={(e) => void s.updateDeck(deckId, { newPerDay: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
        </label>
      </div>

      <input className="px-input" type="search" value={q} placeholder={t('cards.search')} aria-label={t('cards.search')} onChange={(e) => setQ(e.target.value)} />

      {cards.length === 0 ? <p className="todo__empty">{t('cards.noMatch')}</p> : (
        <ul className="cardlist">
          {cards.map((c) => (
            <li key={c.id}>
              <button className="cardlist__main" onClick={() => setEditing(c.id)}>
                <Headword card={c} />
                <span className="cardlist__meaning">{meaning(c, lang)}</span>
              </button>
              <span className="cardlist__state">{stateLabel(c, t)}</span>
              <button className="win__btn" aria-label={`${t('cards.delete')}: ${c.de}`} title={t('cards.delete')}
                onClick={() => window.confirm(t('cards.confirmCard')) && void s.deleteCard(c.id)}>
                <Sprite name="btn_close" px={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="px-btn deckview__delete" onClick={async () => { if (window.confirm(t('cards.confirmDelete'))) { await s.deleteDeck(deckId); onBack(); } }}>
        <Sprite name="tool_trash" px={2} />{t('cards.deleteDeck')}
      </button>
    </div>
  );
}
