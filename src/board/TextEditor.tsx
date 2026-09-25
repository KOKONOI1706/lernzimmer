import { useEffect, useRef, useState } from 'react';
import { useBoard } from './store';
import { FONT } from './nodes';
import type { Camera, NoteItem, TextItem } from './types';

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü', 'ẞ', '„', '“'];

/** Textarea overlay for editing a text item or a sticky note in place. */
export function TextEditor({ item, camera }: { item: TextItem | NoteItem; camera: Camera }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(item.text);
  const wasEmpty = useRef(item.text === '');
  const done = useRef(false);
  const started = useRef(false);
  const latest = useRef(item.text);

  useEffect(() => {
    // editing an existing item: snapshot so the whole edit undoes in one step (once, even under StrictMode)
    if (!started.current && !wasEmpty.current) useBoard.getState().checkpoint();
    started.current = true;
    const el = ref.current!;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    // Removing a focused textarea doesn't reliably fire blur, so also commit on unmount.
    // Deferred so StrictMode's simulated unmount (editing still set) is ignored.
    return () => { setTimeout(() => { if (useBoard.getState().editing !== item.id) commit(); }, 0); };
  }, []);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const s = useBoard.getState();
    const text = latest.current;
    if (item.kind === 'text' && !text.trim()) {
      useBoard.setState((st) => ({ items: st.items.filter((i) => i.id !== item.id), selected: [] }));
      if (wasEmpty.current) s.discardCheckpoint(); // the add itself was the checkpointed change
    } else if (!wasEmpty.current && text === item.text) {
      s.discardCheckpoint(); // nothing changed
    }
    if (useBoard.getState().editing === item.id) s.setEditing(undefined);
  };

  const change = (text: string) => {
    setValue(text);
    latest.current = text;
    useBoard.getState().update(item.id, { text });
  };

  const insert = (ch: string) => {
    const el = ref.current!;
    const { selectionStart: a, selectionEnd: b } = el;
    const next = el.value.slice(0, a) + ch + el.value.slice(b);
    change(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + ch.length, a + ch.length); });
  };

  const z = camera.zoom;
  const isNote = item.kind === 'note';
  const fontSize = (isNote ? 24 : item.size) * z;
  const style: React.CSSProperties = isNote
    ? { left: (item.x + 12) * z + camera.x, top: (item.y + 16) * z + camera.y, width: (item.w - 24) * z, height: (item.h - 28) * z, color: '#0d0b1e', lineHeight: 1.05 }
    : { left: item.x * z + camera.x, top: item.y * z + camera.y, width: Math.max(8, value.length + 2) + 'ch', height: (value.split('\n').length + 0.2) * fontSize, color: item.color, lineHeight: 1 };

  return (
    <>
      <div className="umlauts" style={{ left: style.left, top: `calc(${Number(style.top)}px - 44px)` }} onMouseDown={(e) => e.preventDefault()}>
        {UMLAUTS.map((u) => <button key={u} className="px-btn" onClick={() => insert(u)}>{u}</button>)}
      </div>
      <textarea
        ref={ref}
        className={isNote ? 'board-editor board-editor--note' : 'board-editor'}
        value={value}
        spellCheck
        lang="de"
        style={{ ...style, fontFamily: FONT, fontSize, transform: item.rot ? `rotate(${item.rot}deg)` : undefined, transformOrigin: 'top left' }}
        onChange={(e) => change(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); commit(); }
        }}
      />
    </>
  );
}
