// Tiny event bus: learning features report what happened; the gamify store turns it into XP, streaks, quests…
// Keeps flashcards, timer and games free of any reward logic.

export type StudyEvent =
  | { type: 'review'; correct: boolean; wasNew: boolean; practice: boolean }
  | { type: 'focusDone' }
  | { type: 'gameEnd'; game: string; score: number }
  | { type: 'cardCreated'; count: number }
  | { type: 'boardCard' }
  | { type: 'bossWin' };

type Listener = (e: StudyEvent, at: number) => void;
const listeners = new Set<Listener>();

export function onStudy(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emit(e: StudyEvent, at = Date.now()) {
  for (const fn of listeners) fn(e, at);
}
