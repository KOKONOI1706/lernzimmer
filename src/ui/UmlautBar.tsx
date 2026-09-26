import type { RefObject } from 'react';

const CHARS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

/** Buttons that type German special characters into an <input> at the caret without stealing focus. */
export function UmlautBar({ target, value, onChange }: { target: RefObject<HTMLInputElement | null>; value: string; onChange: (v: string) => void }) {
  const insert = (ch: string) => {
    const el = target.current;
    const a = el?.selectionStart ?? value.length, b = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, a) + ch + value.slice(b));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + 1, a + 1); });
  };
  return (
    <div className="umlaut-bar" onMouseDown={(e) => e.preventDefault()}>
      {CHARS.map((c) => <button key={c} type="button" className="px-btn" tabIndex={-1} onClick={() => insert(c)}>{c}</button>)}
    </div>
  );
}
