import { useCallback, useEffect, useState } from 'react';

/** Reveals `text` one character at a time (Undertale-style). `skip()` shows it all at once. */
export function useTypewriter(text: string, cps = 40) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(text.length); return; }
    const id = setInterval(() => setN((i) => {
      if (i >= text.length) { clearInterval(id); return i; }
      return i + 1;
    }), 1000 / cps);
    return () => clearInterval(id);
  }, [text, cps]);

  const skip = useCallback(() => setN(text.length), [text]);
  return { shown: text.slice(0, n), done: n >= text.length, skip };
}
