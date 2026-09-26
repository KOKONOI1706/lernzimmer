import { useState } from 'react';
import { buildQueue, isNew, type Card, type Deck } from '../../learn/cards';
import { newLeftToday, useLearn } from '../../learn/store';
import { Sprite } from '../../ui/Sprite';
import { useT } from '../../i18n';
import type { ReviewMode } from './Review';

export function deckCounts(deck: Deck, cards: Card[], s: Parameters<typeof newLeftToday>[0], now = new Date()) {
  const mine = cards.filter((c) => c.deckId === deck.id);
  const queue = buildQueue(mine, now, newLeftToday(s, deck.id));
  const fresh = queue.filter(isNew).length;
  return { total: mine.length, fresh, due: queue.length - fresh };
}

export function DeckList({ onStudy, onEdit }: { onStudy: (id: string, mode: ReviewMode) => void; onEdit: (id: string) => void }) {
  const t = useT();
  const s = useLearn();
  const [name, setName] = useState('');
  const reviewedToday = s.today.length;

  return (
    <div className="decks">
      <div className="decks__today">
        <Sprite name="book" px={2} />
        <span>{t('cards.today')}: <b>{reviewedToday}</b></span>
      </div>

      <ul className="decks__list">
        {s.decks.map((d) => {
          const c = deckCounts(d, s.cards, s);
          const empty = c.due + c.fresh === 0;
          return (
            <li key={d.id} className="deck">
              <div className="deck__info">
                <b className="deck__name">{d.name}</b>
                <span className="deck__counts">
                  <span className="deck__due" title={t('cards.due')}>{c.due} {t('cards.due')}</span>
                  <span className="deck__new" title={t('cards.new')}>{c.fresh} {t('cards.new')}</span>
                  <span className="deck__total">{c.total} {t('cards.total')}</span>
                </span>
              </div>
              <div className="deck__actions">
                <button className="px-btn px-btn--primary" disabled={empty} onClick={() => onStudy(d.id, 'recognize')}>{t('cards.learn')}</button>
                <button className="px-btn" disabled={empty} onClick={() => onStudy(d.id, 'type')}>{t('cards.type')}</button>
                <button className="px-btn" onClick={() => onEdit(d.id)}>{t('cards.edit')}</button>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="radio__add" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; const d = await s.addDeck(name); setName(''); onEdit(d.id); }}>
        <input className="px-input" value={name} placeholder={t('cards.newDeck')} aria-label={t('cards.newDeck')} onChange={(e) => setName(e.target.value)} />
        <button className="px-btn" type="submit" disabled={!name.trim()}>{t('cards.create')}</button>
      </form>
    </div>
  );
}
