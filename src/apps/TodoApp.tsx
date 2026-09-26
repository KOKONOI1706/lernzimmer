import { useState } from 'react';
import { addDays, isoDate, parseIso, type IsoDate } from '../calendar/dates';
import { taskBuckets, useCalendar } from '../calendar/store';
import type { CalEntry } from '../calendar/types';
import { openApp } from '../os/apps';
import { useSettings } from '../state/settings';
import { Sprite } from '../ui/Sprite';
import { useT, type StringKey } from '../i18n';
import type { Lang } from '../i18n/strings';

const LOCALE: Record<Lang, string> = { de: 'de-DE', vi: 'vi-VN', en: 'en-GB' };

function useDateLabel() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const today = isoDate(new Date()), tomorrow = addDays(today, 1);
  return (d: IsoDate) =>
    d === today ? t('todo.dueToday') : d === tomorrow ? t('todo.tomorrow') : parseIso(d).toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function TaskRow({ e }: { e: CalEntry }) {
  const t = useT();
  const label = useDateLabel();
  const { toggleDone, update, remove } = useCalendar.getState();
  return (
    <li className={e.done ? 'is-done' : ''}>
      <label className="px-check">
        <input type="checkbox" checked={e.done} onChange={() => toggleDone(e.id)} />
        <span>{e.title}</span>
      </label>
      {e.time && <span className="todo__time">{e.time}</span>}
      <input className="px-input todo__date" type="date" value={e.date ?? ''} aria-label={`${t('todo.date')}: ${e.title}`}
        title={e.date ? label(e.date) : t('todo.noDate')} onChange={(ev) => update(e.id, { date: ev.target.value || undefined })} />
      <button className="win__btn" aria-label={`✕ ${e.title}`} onClick={() => void remove(e.id)}><Sprite name="btn_close" px={2} /></button>
    </li>
  );
}

function Section({ title, items, cls }: { title: StringKey; items: CalEntry[]; cls?: string }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <section className={`todo__section ${cls ?? ''}`}>
      <h4 className="px-label">{t(title)} · {items.length}</h4>
      <ul className="todo__list">{items.map((e) => <TaskRow key={e.id} e={e} />)}</ul>
    </section>
  );
}

/** The to-do list is a task view of the calendar: same entries, grouped by when they're due. */
export function TodoApp() {
  const t = useT();
  const cal = useCalendar();
  const today = isoDate(new Date());
  const tomorrow = addDays(today, 1);
  const b = taskBuckets(cal, today);
  const [text, setText] = useState('');
  const [date, setDate] = useState<IsoDate | ''>('');
  const [showDone, setShowDone] = useState(false);
  const open = b.overdue.length + b.today.length + b.upcoming.length + b.someday.length;

  return (
    <div className="todo">
      <form className="todo__add" onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        await cal.add({ title: text, kind: 'task', date: date || undefined });
        setText('');
      }}>
        <div className="radio__add">
          <input className="px-input" value={text} placeholder={t('todo.placeholder')} aria-label={t('todo.placeholder')} onChange={(e) => setText(e.target.value)} />
          <button className="px-btn px-btn--primary" type="submit" disabled={!text.trim()}>{t('todo.add')}</button>
        </div>
        <div className="px-row">
          {([['', 'todo.someday'], [today, 'todo.dueToday'], [tomorrow, 'todo.tomorrow']] as [IsoDate | '', StringKey][]).map(([d, key]) => (
            <button key={key} type="button" className="px-btn" aria-pressed={date === d} onClick={() => setDate(d)}>{t(key)}</button>
          ))}
          <input className="px-input todo__date" type="date" value={date} aria-label={t('todo.date')} onChange={(e) => setDate(e.target.value)} />
        </div>
      </form>

      {open === 0 && !b.done.length ? (
        <p className="todo__empty"><Sprite name="dachshund" scale={2} />{t('todo.empty')}</p>
      ) : (
        <>
          <Section title="todo.overdue" items={b.overdue} cls="todo__section--overdue" />
          <Section title="todo.dueToday" items={b.today} />
          <Section title="todo.upcoming" items={b.upcoming} />
          <Section title="todo.someday" items={b.someday} />
          {showDone && <Section title="todo.done" items={b.done} />}
        </>
      )}

      <div className="px-row" style={{ justifyContent: 'space-between' }}>
        <span className="px-label" style={{ margin: 0 }}>{open} {t('todo.left')}</span>
        <span className="px-row">
          {b.done.length > 0 && <button className="px-btn" onClick={() => setShowDone(!showDone)}>{t(showDone ? 'todo.hideDone' : 'todo.showDone')} ({b.done.length})</button>}
          <button className="px-btn" disabled={!b.done.length} onClick={cal.clearDoneTasks}>{t('todo.clearDone')}</button>
          <button className="px-btn" onClick={() => openApp('calendar')}><Sprite name="calendar" px={2} />{t('todo.openCalendar')}</button>
        </span>
      </div>
    </div>
  );
}
