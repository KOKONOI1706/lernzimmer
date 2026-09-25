import { useEffect, useState } from 'react';
import { dayKey, mmss, phaseLength, timeLeft, useTimer } from '../focus/timer';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';

const FOCUS_OPTIONS = [15, 25, 45, 50];
const BREAK_OPTIONS = [5, 10, 15];
const SEGMENTS = 20;

export function FocusApp() {
  const t = useT();
  const s = useTimer();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);

  const left = timeLeft(s, now);
  const total = phaseLength(s);
  const filled = Math.round((1 - left / total) * SEGMENTS);
  const today = s.history[dayKey(now)] ?? 0;

  return (
    <div className="focus">
      <div className="px-row" role="tablist">
        {(['focus', 'break'] as const).map((p) => (
          <button key={p} role="tab" className="px-btn" aria-selected={s.phase === p} aria-pressed={s.phase === p}
            onClick={() => p !== s.phase && s.skip()} disabled={s.running}>
            {t(`focus.${p}`)}
          </button>
        ))}
      </div>

      <div className={`focus__time ${s.phase === 'break' ? 'focus__time--break' : ''}`} aria-live="off">{mmss(left)}</div>
      <div className="focus__bar" aria-hidden>
        {Array.from({ length: SEGMENTS }, (_, i) => <span key={i} className={i < filled ? 'on' : ''} />)}
      </div>

      <div className="px-row" style={{ justifyContent: 'center' }}>
        {s.running
          ? <button className="px-btn px-btn--primary focus__main" onClick={() => s.pause()}>❚❚ {t('focus.pause')}</button>
          : <button className="px-btn px-btn--primary focus__main" onClick={() => s.start()}>▶ {t('focus.start')}</button>}
        <button className="px-btn" onClick={s.reset}>{t('focus.reset')}</button>
        <button className="px-btn" onClick={s.skip}>{t('focus.skip')}</button>
      </div>

      <div className="focus__settings">
        <label className="px-label">{t('focus.focus')}
          <select className="px-select" value={s.focusMin} disabled={s.running} onChange={(e) => s.configure({ focusMin: Number(e.target.value) })}>
            {FOCUS_OPTIONS.map((m) => <option key={m} value={m}>{m} {t('focus.min')}</option>)}
          </select>
        </label>
        <label className="px-label">{t('focus.break')}
          <select className="px-select" value={s.breakMin} disabled={s.running} onChange={(e) => s.configure({ breakMin: Number(e.target.value) })}>
            {BREAK_OPTIONS.map((m) => <option key={m} value={m}>{m} {t('focus.min')}</option>)}
          </select>
        </label>
        <label className="px-check">
          <input type="checkbox" checked={s.autoNext} onChange={(e) => s.configure({ autoNext: e.target.checked })} />
          {t('focus.auto')}
        </label>
      </div>

      <div className="focus__today">
        <span className="px-label" style={{ margin: 0 }}>{t('focus.today')}</span>
        <span className="focus__tomatoes">
          {Array.from({ length: Math.min(today, 12) }, (_, i) => <Sprite key={i} name="tomato" px={2} />)}
          {today > 12 && <b>+{today - 12}</b>}
          {today === 0 && <span style={{ color: 'var(--muted)' }}>–</span>}
        </span>
      </div>
    </div>
  );
}
