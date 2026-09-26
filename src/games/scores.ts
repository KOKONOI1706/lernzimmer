import { create } from 'zustand';

export type GameId = 'artikel' | 'memory' | 'zahlen-1' | 'zahlen-2' | 'zahlen-3' | 'zahlen-4' | 'uhr';

interface ScoresState {
  best: Partial<Record<GameId, number>>;
  plays: Partial<Record<GameId, number>>;
  /** records a finished round; returns true for a new personal best */
  record: (game: GameId, score: number, lowerIsBetter?: boolean) => boolean;
  hydrate: (s: Partial<Pick<ScoresState, 'best' | 'plays'>>) => void;
}

export const useScores = create<ScoresState>()((set, get) => ({
  best: {},
  plays: {},
  record: (game, score, lowerIsBetter = false) => {
    const prev = get().best[game];
    const isBest = prev === undefined || (lowerIsBetter ? score < prev : score > prev);
    set((s) => ({
      plays: { ...s.plays, [game]: (s.plays[game] ?? 0) + 1 },
      best: isBest ? { ...s.best, [game]: score } : s.best,
    }));
    return isBest && prev !== undefined;
  },
  hydrate: (s) => set(s),
}));
