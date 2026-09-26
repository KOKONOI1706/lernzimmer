import { parseNote } from './cards';
import { BOARD_DECK, useLearn } from './store';
import { useBoard } from '../board/store';
import type { NoteItem } from '../board/types';

/**
 * Save a sticky note as a flashcard in the "board" deck (created on first use).
 * A note remembers its card, so saving again updates instead of duplicating.
 * Returns what happened, or null if the note is empty.
 */
export async function noteToCard(note: NoteItem, deckName: string): Promise<{ word: string; updated: boolean } | null> {
  const parsed = parseNote(note.text);
  if (!parsed) return null;
  const learn = useLearn.getState();
  if (!learn.loaded) await learn.load();
  const s = useLearn.getState();
  if (!s.decks.some((d) => d.id === BOARD_DECK)) await s.addDeck(deckName, BOARD_DECK);

  const fields = { ...parsed, tags: ['tafel'] };
  const word = `${parsed.gender ? parsed.gender + ' ' : ''}${parsed.de}`;
  const existing = note.cardId ? useLearn.getState().cards.find((c) => c.id === note.cardId) : undefined;
  if (existing) {
    await useLearn.getState().updateCard(existing.id, fields);
    return { word, updated: true };
  }
  const [card] = await useLearn.getState().addCards(BOARD_DECK, [fields]);
  useBoard.getState().update(note.id, { cardId: card.id });
  return { word, updated: false };
}
