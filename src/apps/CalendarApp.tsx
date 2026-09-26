import { useEffect, useMemo, useRef, useState } from 'react';
import { daysBetween, isoDate, isTime, monthGrid, monthTitle, parseIso, weekdayNames, type IsoDate } from '../calendar/dates';
import { entriesOn, nextExam, useCalendar } from '../calendar/store';
import { GOOGLE_CLIENT_ID } from '../calendar/google';
import type { CalEntry, EntryKind } from '../calendar/types';
import { useTimer } from '../focus/timer';
import { useLearn } from '../learn/store';
import { db } from '../data/db';
import { useSettings } from '../state/settings';
import { Sprite, type SpriteName } from '../ui/Sprite';
import { fmt, useT, type StringKey } from '../i18n';
import type { Lang } from '../i18n/strings';

const LOCALE: Record<Lang, string> = { de: 'de-DE', vi: 'vi-VN', en: 'en-GB' };
const KIND_ICON: Record<EntryKind, SpriteName> = { task: 'checklist', event: 'clock', exam: 'book' };
const KINDS: EntryKind[] = ['task', 'event', 'exam'];

/** Card reviews per day for a date range (from the review log). */
function useReviewCounts(from: IsoDate, to: IsoDate) {
  const todayCount = useLearn((s) => s.today.length); // refresh when reviewing today
  const [counts, setCounts] = useState<Record<IsoDate, number>>({});
  useEffect(() => {
    let alive = true;
    const start = parseIso(from).getTime(), end = parseIso(to).getTime() + 86_400_000;
    void db.logs.where('at').between(start, end).toArray().then((logs) => {
      if (!alive) return;
      const c: Record<IsoDate, number> = {};
      for (const l of logs) { const d = isoDate(new Date(l.at)); c[d] = (c[d] ?? 0) + 1; }
      setCounts(c);
    });
    return () => { alive = false; };
  }, [from, to, todayCount]);
  return counts;
}

function GooglePanel({ from, to }: { from: IsoDate; to: IsoDate }) {
  const t = useT();
  const { google, wantsGoogle, connectGoogle, refreshGoogle, disconnectGoogle } = useCalendar();
  if (!GOOGLE_CLIENT_ID) return <span className="cal__google cal__google--off" title={t('cal.g.notSetup')}>G · {t('cal.g.notSetup')}</span>;
  return (
    <div className="cal__google">
      {google.status === 'on' ? (
        <>
          <span className="cal__gstatus">● {t('cal.g.connected')}</span>
          <button className="px-btn" onClick={() => void refreshGoogle(from, to, t('cal.untitled'))}>{t('cal.g.sync')}</button>
          <button className="px-btn" onClick={disconnectGoogle}>{t('cal.g.disconnect')}</button>
        </>
      ) : (
        <button className="px-btn" disabled={google.status === 'connecting'} title={t('cal.g.privacy')}
          onClick={async () => { await connectGoogle(); await useCalendar.getState().refreshGoogle(from, to, t('cal.untitled')); }}>
          {google.status === 'connecting' ? t('cal.g.connecting') : wantsGoogle ? t('cal.g.reconnect') : t('cal.g.connect')}
        </button>
      )}
      {google.status === 'error' && google.error && <span className="cal__gerror" role="alert">{fmt(t('cal.g.error'), { e: google.error })}</span>}
    </div>
  );
}

function EntryRow({ e }: { e: CalEntry }) {
  const t = useT();
  const { toggleDone, remove } = useCalendar();
  const onDelete = async () => {
    if (e.googleId && useCalendar.getState().google.status === 'on') {
      // a Google-only event can only be deleted in Google; a local copy may keep or drop its Google twin
      if (e.source === 'google') { if (window.confirm(t('cal.confirmGoogleDelete'))) await remove(e.id, true); return; }
      if (!window.confirm(t('cal.confirmDelete'))) return;
      await remove(e.id, window.confirm(t('cal.confirmGoogleDelete')));
      return;
    }
    if (e.source === 'local' && window.confirm(t('cal.confirmDelete'))) await remove(e.id);
  };
  return (
    <li className={`cal__entry cal__entry--${e.kind} ${e.done ? 'is-done' : ''}`}>
      {e.kind === 'task' || e.source === 'google'
        ? <input type="checkbox" className="cal__check" checked={e.done} onChange={() => toggleDone(e.id)} aria-label={e.title} />
        : <Sprite name={KIND_ICON[e.kind]} px={2} animate={false} />}
      <span className="cal__time">{e.time ? `${e.time}${e.endTime ? `–${e.endTime}` : ''}` : t('cal.allDay')}</span>
      <span className="cal__title">
        {e.title}
        {e.notes && <small>{e.notes}</small>}
      </span>
      {e.googleId && (e.link
        ? <a className="cal__gbadge" href={e.link} target="_blank" rel="noopener noreferrer" title={t('cal.g.open')}>G</a>
        : <span className="cal__gbadge">G</span>)}
      {(e.source === 'local' || useCalendar.getState().google.status === 'on') && (
        <button className="win__btn" aria-label={`${t('cal.delete')}: ${e.title}`} title={t('cal.delete')} onClick={() => void onDelete()}>
          <Sprite name="btn_close" px={2} />
        </button>
      )}
    </li>
  );
}

function AddForm({ date }: { date: IsoDate }) {
  const t = useT();
  const googleOn = useCalendar((s) => s.google.status === 'on');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EntryKind>('task');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [toGoogle, setToGoogle] = useState(true);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <form className="cal__add" onSubmit={async (e) => {
      e.preventDefault();
      if (!title.trim()) return;
      await useCalendar.getState().add({ date, title, kind, time: isTime(time) ? time : undefined, notes: notes.trim() || undefined }, { toGoogle: googleOn && toGoogle });
      setTitle(''); setNotes(''); setTime('');
      ref.current?.focus();
    }}>
      <div className="cal__kinds" role="radiogroup">
        {KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} aria-pressed={kind === k} className="px-btn" onClick={() => setKind(k)}>
            <Sprite name={KIND_ICON[k]} px={2} animate={false} />{t(`cal.kind.${k}` as StringKey)}
          </button>
        ))}
      </div>
      <div className="radio__add">
        <input ref={ref} className="px-input" value={title} placeholder={t('cal.titlePh')} aria-label={t('cal.titlePh')} onChange={(e) => setTitle(e.target.value)} />
        <input className="px-input cal__timeinput" type="time" value={time} aria-label={t('cal.time')} title={t('cal.time')} onChange={(e) => setTime(e.target.value)} />
      </div>
      <input className="px-input" value={notes} placeholder={t('cal.notes')} aria-label={t('cal.notes')} onChange={(e) => setNotes(e.target.value)} />
      <div className="px-row" style={{ justifyContent: 'space-between' }}>
        {googleOn ? (
          <label className="px-check"><input type="checkbox" checked={toGoogle} onChange={(e) => setToGoogle(e.target.checked)} />{t('cal.g.alsoGoogle')}</label>
        ) : <span />}
        <button className="px-btn px-btn--primary" type="submit" disabled={!title.trim()}>{t('cal.add')}</button>
      </div>
    </form>
  );
}

export function CalendarApp() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const locale = LOCALE[lang];
  const cal = useCalendar();
  const focusHistory = useTimer((s) => s.history);
  const today = isoDate(new Date());
  const sel = parseIso(cal.selected);
  const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() });

  const grid = useMemo(() => monthGrid(view.y, view.m), [view]);
  const from = grid[0].date, to = grid[41].date;
  const reviews = useReviewCounts(from, to);
  const byDay = useMemo(() => Object.fromEntries(grid.map((d) => [d.date, entriesOn(cal, d.date)])), [grid, cal]);

  // pull Google events for the visible weeks whenever the month changes (if connected)
  useEffect(() => { if (useCalendar.getState().google.status === 'on') void useCalendar.getState().refreshGoogle(from, to, t('cal.untitled')); }, [from, to]);

  const move = (delta: number) => setView(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => { const d = new Date(); setView({ y: d.getFullYear(), m: d.getMonth() }); cal.select(today); };

  const exam = nextExam(cal, today);
  const examDays = exam?.date ? daysBetween(today, exam.date) : 0;
  const examTitle = exam?.title.replace(/^🎓\s*/, '');
  const dayEntries = byDay[cal.selected] ?? entriesOn(cal, cal.selected);
  const focusSel = focusHistory[cal.selected] ?? 0, reviewsSel = reviews[cal.selected] ?? 0;

  return (
    <div className="cal">
      <div className="cal__head">
        <button className="px-btn" title={t('cal.prev')} aria-label={t('cal.prev')} onClick={() => move(-1)}>◀</button>
        <h3 className="cal__month">{monthTitle(view.y, view.m, locale)}</h3>
        <button className="px-btn" title={t('cal.next')} aria-label={t('cal.next')} onClick={() => move(1)}>▶</button>
        <button className="px-btn" onClick={goToday}>{t('cal.today')}</button>
        <GooglePanel from={from} to={to} />
      </div>

      {exam && (
        <button className="cal__exam" onClick={() => { const d = parseIso(exam.date!); setView({ y: d.getFullYear(), m: d.getMonth() }); cal.select(exam.date!); }}>
          <Sprite name="book" px={2} />
          {examDays === 0 ? fmt(t('cal.examToday'), { t: examTitle! }) : examDays === 1 ? fmt(t('cal.examTomorrow'), { t: examTitle! }) : fmt(t('cal.examIn'), { t: examTitle!, n: examDays })}
        </button>
      )}

      <div className="cal__grid" role="grid" aria-label={monthTitle(view.y, view.m, locale)}>
        {weekdayNames(locale).map((w) => <div key={w} className="cal__wd" role="columnheader">{w}</div>)}
        {grid.map(({ date, inMonth }) => {
          const items = byDay[date];
          const f = focusHistory[date] ?? 0, r = reviews[date] ?? 0;
          return (
            <button key={date} role="gridcell" aria-selected={date === cal.selected}
              className={['cal__day', !inMonth && 'is-out', date === today && 'is-today', date === cal.selected && 'is-sel'].filter(Boolean).join(' ')}
              onClick={() => cal.select(date)}>
              <span className="cal__num">{parseIso(date).getDate()}</span>
              <span className="cal__chips">
                {items.slice(0, 2).map((e) => <span key={e.id} className={`cal__chip cal__chip--${e.kind} ${e.source === 'google' ? 'is-google' : ''} ${e.done ? 'is-done' : ''}`}>{e.title}</span>)}
                {items.length > 2 && <span className="cal__more">+{items.length - 2}</span>}
              </span>
              {(f > 0 || r > 0) && (
                <span className="cal__stamps" title={fmt(t('cal.stamps'), { f, r })}>
                  {f > 0 && <><Sprite name="tomato" px={1} />{f > 1 ? f : ''}</>}
                  {r > 0 && <span className="cal__rev">{r}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="cal__dayview">
        <div className="cal__dayhead">
          <b>{parseIso(cal.selected).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
          {(focusSel > 0 || reviewsSel > 0) && <span className="cal__daystats">{fmt(t('cal.stamps'), { f: focusSel, r: reviewsSel })}</span>}
        </div>
        {dayEntries.length === 0 ? <p className="cal__empty">{t('cal.empty')}</p> : (
          <ul className="cal__list">{dayEntries.map((e) => <EntryRow key={e.id} e={e} />)}</ul>
        )}
        <AddForm key={cal.selected} date={cal.selected} />
      </section>
    </div>
  );
}
