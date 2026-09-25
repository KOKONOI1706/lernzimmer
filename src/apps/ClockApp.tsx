import { useEffect, useMemo, useState } from 'react';
import { germanTimeColloquial, germanTimeOfficial, itIs } from '../learn/german';
import { canSpeak, speak } from '../learn/tts';
import { audio } from '../audio/engine';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';

/** Pixel-style analog clock (SVG with crisp edges). */
function Analog({ h, m, s, size = 168 }: { h: number; m: number; s?: number; size?: number }) {
  const c = 50;
  const hand = (deg: number, len: number) => ({ x2: c + len * Math.sin((deg * Math.PI) / 180), y2: c - len * Math.cos((deg * Math.PI) / 180) });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} shapeRendering="crispEdges" aria-hidden className="clock-face">
      <circle cx={c} cy={c} r={46} fill="#f4efe6" stroke="#0d0b1e" strokeWidth={4} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180, big = i % 3 === 0;
        return <rect key={i} x={c + 38 * Math.sin(a) - (big ? 3 : 1.5)} y={c - 38 * Math.cos(a) - (big ? 3 : 1.5)} width={big ? 6 : 3} height={big ? 6 : 3} fill={big ? '#1f4fd1' : '#8b8aa3'} />;
      })}
      <line x1={c} y1={c} {...hand((h % 12) * 30 + m * 0.5, 22)} stroke="#0d0b1e" strokeWidth={6} strokeLinecap="square" />
      <line x1={c} y1={c} {...hand(m * 6, 34)} stroke="#0d0b1e" strokeWidth={4} strokeLinecap="square" />
      {s !== undefined && <line x1={c} y1={c} {...hand(s * 6, 36)} stroke="#e0344a" strokeWidth={2} />}
      <rect x={c - 4} y={c - 4} width={8} height={8} fill="#e0344a" />
    </svg>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

interface Question { h: number; m: number; options: string[]; answer: string }

/** A random time (5-minute steps) with 3 distractors built from typical learner mistakes. */
function makeQuestion(): Question {
  const h = 1 + Math.floor(Math.random() * 12);
  const m = Math.floor(Math.random() * 12) * 5;
  const answer = germanTimeColloquial(h, m);
  const tricks = [
    germanTimeColloquial(h - 1, m),              // "halb vier" means 3:30, not 4:30
    germanTimeColloquial(h + 1, m),
    germanTimeColloquial(h, (60 - m) % 60),      // nach ↔ vor
    germanTimeColloquial(h, (m + 30) % 60),      // halb confusion
  ];
  const options = [...new Set([answer, ...tricks.sort(() => Math.random() - 0.5)])].slice(0, 4).sort(() => Math.random() - 0.5);
  return { h, m, options, answer };
}

function Quiz({ onBack }: { onBack: () => void }) {
  const t = useT();
  const [q, setQ] = useState(makeQuestion);
  const [picked, setPicked] = useState<string>();
  const [streak, setStreak] = useState(0);
  const right = picked === q.answer;

  const pick = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === q.answer;
    audio.chime(ok ? 'ok' : 'no');
    setStreak(ok ? streak + 1 : 0);
    speak(itIs(q.answer));
  };

  return (
    <div className="clock">
      <div className="px-row" style={{ justifyContent: 'space-between' }}>
        <strong className="clock__title">{t('clock.quiz')}</strong>
        <span title={t('clock.streak')}><Sprite name="fire" px={2} /> {streak}</span>
      </div>
      <Analog h={q.h} m={q.m} />
      <div className="clock__options">
        {q.options.map((o) => (
          <button key={o} className="px-btn" onClick={() => pick(o)}
            aria-pressed={picked === o}
            style={picked && o === q.answer ? { background: 'var(--das)', color: '#0d0b1e' } : picked === o ? { background: 'var(--die)', color: '#fff' } : undefined}>
            Es ist {o}.
          </button>
        ))}
      </div>
      {picked && (
        <p className="clock__feedback" role="status">
          {right ? t('clock.correct') : <>{t('clock.wrong')} <b>{itIs(q.answer)}</b></>}
        </p>
      )}
      <div className="px-row" style={{ justifyContent: 'space-between' }}>
        <button className="px-btn" onClick={onBack}>{t('clock.back')}</button>
        <button className="px-btn px-btn--primary" disabled={!picked} onClick={() => { setQ(makeQuestion()); setPicked(undefined); }}>{t('clock.next')} ▶</button>
      </div>
    </div>
  );
}

export function ClockApp() {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const [quiz, setQuiz] = useState(false);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  // phrases only change once a minute
  const phrases = useMemo(() => ({ col: itIs(germanTimeColloquial(h, m)), off: itIs(germanTimeOfficial(h, m)) }), [h, m]);

  if (quiz) return <Quiz onBack={() => setQuiz(false)} />;
  return (
    <div className="clock">
      <div className="clock__top">
        <Analog h={h} m={m} s={s} />
        <div className="clock__digital">{pad(h)}:{pad(m)}<small>:{pad(s)}</small></div>
      </div>
      <dl className="clock__phrases">
        <dt>{t('clock.colloquial')}</dt>
        <dd>{phrases.col}</dd>
        <dt>{t('clock.official')}</dt>
        <dd>{phrases.off}</dd>
      </dl>
      <div className="px-row">
        {canSpeak() && <button className="px-btn" onClick={() => speak(phrases.col)}><Sprite name="speaker" px={2} />{t('clock.listen')}</button>}
        <button className="px-btn px-btn--primary" onClick={() => setQuiz(true)}><Sprite name="clock" px={2} animate={false} />{t('clock.quiz')}</button>
      </div>
    </div>
  );
}
