import { useEffect, useRef, useState } from 'react';
import { checkNumber, makeNumber, ZAHLEN_LEVELS, ZAHLEN_SECONDS, type ZahlenLevel } from '../../games/logic';
import { useScores, type GameId } from '../../games/scores';
import { germanYear, numberToGerman } from '../../learn/german';
import { canSpeak, speak } from '../../learn/tts';
import { audio } from '../../audio/engine';
import { Sprite } from '../../ui/Sprite';
import { fmt, useT, type StringKey } from '../../i18n';
import { GameOver } from './GameOver';

const say = (level: ZahlenLevel, n: number) => ('year' in level && level.year ? germanYear(n) : numberToGerman(n));
const gameId = (level: ZahlenLevel) => `zahlen-${level.id}` as GameId;

function Round({ level, onEnd, onExit }: { level: ZahlenLevel; onEnd: (score: number) => void; onExit: () => void }) {
  const t = useT();
  const [n, setN] = useState(() => makeNumber(level));
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<number>();
  const [showWord, setShowWord] = useState(!canSpeak());
  const [endsAt] = useState(() => Date.now() + ZAHLEN_SECONDS * 1000);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { speak(say(level, n), { rate: 0.85 }); inputRef.current?.focus(); }, [n, level]);
  // one interval for the whole round; latest score/onEnd via refs
  const scoreRef = useRef(score); scoreRef.current = score;
  const onEndRef = useRef(onEnd); onEndRef.current = onEnd;
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= endsAt) { clearInterval(id); onEndRef.current(scoreRef.current); }
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);

  const next = () => { setInput(''); setWrong(undefined); setN((prev) => makeNumber(level, Math.random, prev)); };
  const submit = () => {
    if (wrong !== undefined || !input.trim()) return;
    if (checkNumber(input, n)) { audio.chime('ok'); setScore((s) => s + 1); next(); }
    else { audio.chime('no'); setWrong(n); setTimeout(next, 1400); }
  };

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <div className="game zahlen">
      <div className="game__hud">
        <button className="px-btn" onClick={onExit}>◀ {t('arcade.menu')}</button>
        <span>{t('arcade.score')}: <b>{score}</b></span>
        <span className={left <= 10 ? 'zahlen__hurry' : ''}>⏱ {left}s</span>
      </div>
      <div className="zahlen__stage">
        {canSpeak() && <button className="px-btn zahlen__replay" onClick={() => { speak(say(level, n), { rate: 0.75 }); inputRef.current?.focus(); }}>
          <Sprite name="speaker" px={3} />{t('arcade.zahlen.replay')}
        </button>}
        {(showWord || wrong !== undefined) && <p className="zahlen__word" lang="de">{say(level, n)}</p>}
        {wrong !== undefined && <p className="review__verdict is-bad" role="status">{t('arcade.missed')} <b>{wrong}</b></p>}
      </div>
      <form className="review__type" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input ref={inputRef} className="px-input" inputMode="numeric" autoComplete="off" value={input} placeholder={t('arcade.zahlen.ph')}
          aria-label={t('arcade.zahlen.ph')} onChange={(e) => setInput(e.target.value)} disabled={wrong !== undefined} />
        <button className="px-btn px-btn--primary" type="submit" disabled={!input.trim() || wrong !== undefined}>{t('arcade.check')}</button>
      </form>
      {canSpeak() && (
        <label className="px-check"><input type="checkbox" checked={showWord} onChange={(e) => { setShowWord(e.target.checked); inputRef.current?.focus(); }} />{t('arcade.zahlen.showWord')}</label>
      )}
    </div>
  );
}

export function ZahlenSprint({ onExit }: { onExit: () => void }) {
  const t = useT();
  const best = useScores((s) => s.best);
  const [level, setLevel] = useState<ZahlenLevel>();
  const [result, setResult] = useState<{ score: number; best: boolean }>();
  const [round, setRound] = useState(0);

  if (level && result) {
    return (
      <GameOver title={`Zahlen-Sprint · ${t(`arcade.zahlen.l${level.id}` as StringKey)}`} newBest={result.best} best={best[gameId(level)]}
        detail={fmt(t('arcade.zahlen.result'), { n: result.score })} onAgain={() => { setResult(undefined); setRound((r) => r + 1); }}
        onMenu={() => { setResult(undefined); setLevel(undefined); }} />
    );
  }
  if (level) {
    return <Round key={round} level={level} onExit={() => setLevel(undefined)}
      onEnd={(score) => setResult({ score, best: useScores.getState().record(gameId(level), score) })} />;
  }
  return (
    <div className="game zahlen">
      <div className="game__hud"><button className="px-btn" onClick={onExit}>◀ {t('arcade.menu')}</button><b>Zahlen-Sprint</b></div>
      <p>{t('arcade.zahlen.desc')}</p>
      <div className="zahlen__levels">
        {ZAHLEN_LEVELS.map((l) => (
          <button key={l.id} className="px-btn zahlen__level" onClick={() => setLevel(l)}>
            <b>{t(`arcade.zahlen.l${l.id}` as StringKey)}</b>
            <small>{t('arcade.best')}: {best[gameId(l)] ?? '–'}</small>
          </button>
        ))}
      </div>
      <p className="review__keys" lang="de">97 → siebenundneunzig · 1980 → neunzehnhundertachtzig</p>
    </div>
  );
}
