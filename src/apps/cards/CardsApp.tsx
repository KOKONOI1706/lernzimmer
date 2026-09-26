import { useEffect, useState } from 'react';
import { useLearn } from '../../learn/store';
import { DeckList } from './DeckList';
import { DeckView } from './DeckView';
import { Review, type ReviewMode } from './Review';

type View = { v: 'decks' } | { v: 'deck'; id: string } | { v: 'review'; id: string; mode: ReviewMode };

export function CardsApp() {
  const loaded = useLearn((s) => s.loaded);
  const [view, setView] = useState<View>({ v: 'decks' });
  useEffect(() => { if (!loaded) void useLearn.getState().load(); }, [loaded]);

  if (!loaded) return <p className="todo__empty">…</p>;
  if (view.v === 'review') return <Review key={`${view.id}:${view.mode}`} deckId={view.id} mode={view.mode} onExit={() => setView({ v: 'decks' })} />;
  if (view.v === 'deck') return <DeckView deckId={view.id} onBack={() => setView({ v: 'decks' })} />;
  return <DeckList onStudy={(id, mode) => setView({ v: 'review', id, mode })} onEdit={(id) => setView({ v: 'deck', id })} />;
}
