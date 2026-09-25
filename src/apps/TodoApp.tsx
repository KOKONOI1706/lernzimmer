import { useState } from 'react';
import { useTodos } from '../state/todos';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';

export function TodoApp() {
  const t = useT();
  const { todos, add, toggle, remove, clearDone } = useTodos();
  const [text, setText] = useState('');
  const open = todos.filter((x) => !x.done).length;

  return (
    <div className="todo">
      <form className="radio__add" onSubmit={(e) => { e.preventDefault(); add(text); setText(''); }}>
        <input className="px-input" value={text} placeholder={t('todo.placeholder')} aria-label={t('todo.placeholder')} onChange={(e) => setText(e.target.value)} />
        <button className="px-btn px-btn--primary" type="submit" disabled={!text.trim()}>{t('todo.add')}</button>
      </form>

      {todos.length === 0 ? (
        <p className="todo__empty"><Sprite name="dachshund" scale={2} />{t('todo.empty')}</p>
      ) : (
        <ul className="todo__list">
          {todos.map((x) => (
            <li key={x.id} className={x.done ? 'is-done' : ''}>
              <label className="px-check">
                <input type="checkbox" checked={x.done} onChange={() => toggle(x.id)} />
                <span>{x.text}</span>
              </label>
              <button className="win__btn" aria-label={`✕ ${x.text}`} onClick={() => remove(x.id)}><Sprite name="btn_close" px={2} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="px-row" style={{ justifyContent: 'space-between' }}>
        <span className="px-label" style={{ margin: 0 }}>{open} {t('todo.left')}</span>
        <button className="px-btn" disabled={!todos.some((x) => x.done)} onClick={clearDone}>{t('todo.clearDone')}</button>
      </div>
    </div>
  );
}
