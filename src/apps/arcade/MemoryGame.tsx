import { useEffect, useRef, useState } from 'react';
import { memoryDeal, memoryDone, memoryFlip, memoryHide, pickCards, type MemoryState } from '../../games/logic';
import { useScores } from '../../games/scores';
import { useLearn } from '../../learn/store';
import type { Card } from '../../learn/cards';
import { audio } from '../../audio/engine';
import { speak } from '../../learn/tts';
import { useSettings } from '../../state/settings';
import { fmt, useT } from '../../i18n';
import { meaning } from '../cards/CardFace';
import { GameOver } from './GameOver';

export const PAIRS = 6;
export const memoryCards = (cards: Card[]) => cards.filter((c) => c.vi || c.en);

export function MemoryGame({ onExit }: { onExit: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const cardsById = useRef(new Map<string, Card>());
  const deal = () => {
    const picked = pickCards(memoryCards(useLearn.getState().cards), PAIRS, new Date());
    cardsById.current = new Map(picked.map((c) => [c.id, c]));
    return memoryDeal(picked.map((c) => ({ id: c.id, de: c.de, gender: c.gender, meaning: meaning(c, lang) })));
  };
  const [s, setS] = useState<MemoryState>(deal);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ best: boolean; secs: number }>();
  const lastPairSeen = useRef(new Map<string, number>());

  useEffect(() => {
    if (result) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [result]);

  const flip = (id: number) => {
    const { state, result: r, pair } = memoryFlip(s, id);
    if (state === s) return;
    const tile = state.tiles[id];
    if (tile.side === 'de' && !state.locked) speak(tile.text);
    setS(state);
    if (r === 'match' && pair) {
      audio.chime('ok');
      const seen = lastPairSeen.current.get(pair);
      void useLearn.getState().practice(pair, true, seen ? Date.now() - seen : 0, 'game:memory');
      if (memoryDone(state)) {
        const secs = Math.round((Date.now() - startedAt) / 1000);
        setResult({ secs, best: useScores.getState().record('memory', state.moves, true) });
      }
    } else if (r === 'miss') {
      audio.chime('no');
      setTimeout(() => setS((cur) => memoryHide(cur)), 900);
    }
    if (pair) lastPairSeen.current.set(pair, Date.now());
  };

  const restart = () => { setS(deal()); setResult(undefined); setStartedAt(Date.now()); lastPairSeen.current.clear(); };

  if (result) {
    return (
      <GameOver title={t('arcade.won')} newBest={result.best} best={useScores.getState().best.memory}
        detail={fmt(t('arcade.memory.result'), { m: s.moves, s: result.secs })} onAgain={restart} onMenu={onExit} />
    );
  }

  return (
    <div className="game memory">
      <div className="game__hud">
        <button className="px-btn" onClick={onExit}>◀ {t('arcade.menu')}</button>
        <span>{t('arcade.moves')}: <b>{s.moves}</b></span>
        <span>{t('arcade.time')}: {Math.round((now - startedAt) / 1000)}s</span>
        <span>{s.matched.size} / {s.tiles.length / 2}</span>
      </div>
      <div className="memory__grid">
        {s.tiles.map((tile) => {
          const up = s.up.includes(tile.id) || s.matched.has(tile.pair);
          return (
            <button key={tile.id} className={`memory__tile ${up ? 'is-up' : ''} ${s.matched.has(tile.pair) ? 'is-matched' : ''} ${tile.side === 'de' ? `memory__tile--de memory__tile--${tile.gender ?? 'x'}` : ''}`}
              onClick={() => flip(tile.id)} aria-label={up ? tile.text : '?'} disabled={s.matched.has(tile.pair)}>
              {up ? <span lang={tile.side === 'de' ? 'de' : lang}>{tile.text}</span> : <span className="memory__back">?</span>}
            </button>
          );
        })}
      </div>
      <p className="review__keys">{t('arcade.counts')}</p>
    </div>
  );
}
