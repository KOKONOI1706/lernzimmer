import { useCallback, useEffect, useRef, useState } from 'react';
import { artikelAnswer, artikelStart, ARTIKEL_LIVES, fallTime, levelFor, pickCards, type ArtikelState } from '../../games/logic';
import { useScores } from '../../games/scores';
import { useLearn } from '../../learn/store';
import type { Card } from '../../learn/cards';
import type { Gender } from '../../learn/words';
import { audio } from '../../audio/engine';
import { Sprite } from '../../ui/Sprite';
import { fmt, useT } from '../../i18n';
import { GameOver } from './GameOver';

const GENDERS: Gender[] = ['der', 'die', 'das'];
const KEYS: Record<string, Gender> = { '1': 'der', '2': 'die', '3': 'das', ArrowLeft: 'der', ArrowDown: 'die', ArrowRight: 'das' };

export const nounCards = (cards: Card[]) => cards.filter((c) => c.gender);

export function ArtikelRegen({ onExit }: { onExit: () => void }) {
  const t = useT();
  const [game, setGame] = useState<ArtikelState>(artikelStart);
  const [word, setWord] = useState<Card>();
  const [flash, setFlash] = useState<{ kind: 'ok' | 'bad'; text: string; bucket?: Gender }>();
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<{ best: boolean }>();
  const words = useRef(0);

  const fieldRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const queue = useRef<Card[]>([]);
  const fall = useRef({ start: 0, elapsed: 0, ms: 6000 });
  const gameRef = useRef(game);
  gameRef.current = game;

  const nextWord = useCallback(() => {
    if (!queue.current.length) {
      const pool = nounCards(useLearn.getState().cards);
      queue.current = pickCards(pool, 20, new Date());
    }
    const w = queue.current.shift();
    fall.current = { start: performance.now(), elapsed: 0, ms: fallTime(levelFor(gameRef.current.correct)) * 1000 };
    words.current += 1;
    setWord(w);
  }, []);

  useEffect(() => { nextWord(); }, [nextWord]);

  const resolve = useCallback((answer: Gender | undefined) => {
    const w = word;
    if (!w?.gender || gameRef.current.over) return;
    const ok = answer === w.gender;
    const ms = fall.current.elapsed + (performance.now() - fall.current.start);
    void useLearn.getState().practice(w.id, ok, ms, 'game:artikel');
    audio.chime(ok ? 'ok' : 'no');
    setFlash(ok ? { kind: 'ok', text: '+', bucket: answer } : { kind: 'bad', text: `${w.gender} ${w.de}`, bucket: answer });
    setTimeout(() => setFlash(undefined), ok ? 350 : 1100);
    const next = artikelAnswer(gameRef.current, answer, w.gender);
    setGame(next);
    if (next.over) {
      setWord(undefined);
      setResult({ best: useScores.getState().record('artikel', next.score) });
    } else {
      nextWord();
    }
  }, [word, nextWord]);

  // falling animation (writes to the DOM directly; no re-render per frame)
  useEffect(() => {
    if (!word || paused || result) return;
    fall.current.start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const f = fall.current;
      const p = (f.elapsed + now - f.start) / f.ms;
      const h = (fieldRef.current?.clientHeight ?? 300) - 56;
      if (wordRef.current) wordRef.current.style.transform = `translate(-50%, ${Math.round(Math.min(p, 1) * h)}px)`;
      if (p >= 1) { resolve(undefined); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); fall.current.elapsed += performance.now() - fall.current.start; };
  }, [word, paused, result, resolve]);

  // keyboard + auto-pause when the tab is hidden
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
      if (e.key === 'Escape') { setPaused((p) => !p); return; }
      const g = KEYS[e.key];
      if (g && !paused) { e.preventDefault(); resolve(g); }
    };
    const onVis = () => document.hidden && setPaused(true);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); };
  }, [resolve, paused]);

  const restart = () => { setGame(artikelStart()); setResult(undefined); words.current = 0; queue.current = []; nextWord(); };

  if (result) {
    return (
      <GameOver title={t('arcade.gameOver')} newBest={result.best} best={useScores.getState().best.artikel}
        detail={fmt(t('arcade.artikel.result'), { p: game.score, w: words.current })} extra={`${t('arcade.streak')}: ${game.best}`}
        onAgain={restart} onMenu={onExit} />
    );
  }

  return (
    <div className="game artikel">
      <div className="game__hud">
        <button className="px-btn" onClick={onExit}>◀ {t('arcade.menu')}</button>
        <span>{t('arcade.score')}: <b>{game.score}</b></span>
        <span>{t('arcade.level')} {levelFor(game.correct)}</span>
        <span className="game__lives" aria-label={`${t('arcade.lives')}: ${game.lives}`}>
          {Array.from({ length: ARTIKEL_LIVES }, (_, i) => <Sprite key={i} name="heart" px={2} style={{ opacity: i < game.lives ? 1 : 0.2 }} />)}
        </span>
        <button className="px-btn" onClick={() => setPaused(!paused)}>{paused ? t('arcade.resume') : t('arcade.pause')}</button>
      </div>

      <div className="artikel__field" ref={fieldRef}>
        {word && <div className={`artikel__word ${paused ? 'is-paused' : ''}`} ref={wordRef} lang="de">{word.de}</div>}
        {flash?.kind === 'bad' && <div className="artikel__miss" role="status">{t('arcade.missed')} <b className={`g-${flash.text.split(' ')[0]}`}>{flash.text}</b></div>}
        {paused && <div className="artikel__paused">{t('arcade.pause')}</div>}
      </div>

      <div className="artikel__buckets">
        {GENDERS.map((g, i) => (
          <button key={g} className={`px-btn gender-btn gender-btn--${g} artikel__bucket ${flash?.bucket === g ? `is-${flash.kind}` : ''}`}
            onClick={() => !paused && resolve(g)}>
            <kbd>{i + 1}</kbd>{g}
          </button>
        ))}
      </div>
      <p className="review__keys">{t('arcade.keysArtikel')} · Esc = {t('arcade.pause')} · {t('arcade.counts')}</p>
    </div>
  );
}
