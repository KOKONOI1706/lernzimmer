import { useState } from 'react';
import { useSettings } from '../state/settings';
import { useWindows } from '../os/windows';
import { useT } from '../i18n';
import type { Lang } from '../i18n/strings';
import { Sprite } from '../ui/Sprite';
import { useTypewriter } from '../ui/useTypewriter';

/** A page is German text (typed out) plus a translation shown once typing finishes. */
type Seg = { text: string; cls?: string };
interface Page { de: Seg[]; tr: Record<Lang, string> }

const PAGES: Page[] = [
  {
    de: [{ text: '✱ Hallo! Ich bin Brezel, dein Lernhund.' }],
    tr: { vi: 'Xin chào! Mình là Brezel, chú chó học tập của bạn.', en: 'Hi! I’m Brezel, your study dog.', de: '' },
  },
  {
    de: [{ text: '✱ Das ist dein Lernzimmer. Dekoriere es, wie du willst!' }],
    tr: { vi: 'Đây là phòng học của bạn. Hãy trang trí theo ý thích!', en: 'This is your study room. Decorate it however you like!', de: '' },
  },
  {
    de: [
      { text: '✱ Merk dir die Farben: ' },
      { text: 'der', cls: 'g-der' }, { text: ' ist blau, ' },
      { text: 'die', cls: 'g-die' }, { text: ' ist rot, ' },
      { text: 'das', cls: 'g-das' }, { text: ' ist grün.' },
    ],
    tr: { vi: 'Nhớ màu nhé: der = xanh dương, die = đỏ, das = xanh lá.', en: 'Remember the colours: der is blue, die is red, das is green.', de: '' },
  },
  {
    de: [{ text: '✱ Öffne SYSTEM, um Thema und Hintergrund zu ändern. Viel Spaß!' }],
    tr: { vi: 'Mở SYSTEM để đổi giao diện và hình nền. Chúc bạn học vui!', en: 'Open SYSTEM to change the theme and background. Have fun!', de: '' },
  },
];

/** Render the first `n` characters of a segmented line, keeping per-segment colour. */
function Typed({ segs, n }: { segs: Seg[]; n: number }) {
  let left = n;
  return (
    <>
      {segs.map((s, i) => {
        const part = s.text.slice(0, Math.max(0, left));
        left -= s.text.length;
        return part ? <span key={i} className={s.cls}>{part}</span> : null;
      })}
    </>
  );
}

export function WelcomeApp({ winId }: { winId: string }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [page, setPage] = useState(0);
  const p = PAGES[page];
  const full = p.de.map((s) => s.text).join('');
  const { shown, done, skip } = useTypewriter(full);
  const last = page === PAGES.length - 1;

  const next = () => {
    if (!done) return skip();
    if (!last) return setPage(page + 1);
    useSettings.getState().set({ seenWelcome: true });
    useWindows.getState().close(winId);
  };

  return (
    <div className="welcome" onClick={() => !done && skip()}>
      <div className="welcome__stage">
        <Sprite name="dachshund" scale={4} />
        <Sprite name="pretzel" scale={2} />
      </div>
      <div className="px-dialog" aria-live="polite">
        <span className="sr-only">{full}</span>
        <span aria-hidden><Typed segs={p.de} n={shown.length} /></span>
        {done && p.tr[lang] && <div style={{ color: '#8b8aa3', marginTop: 8, fontSize: 20 }}>{p.tr[lang]}</div>}
        {done && <span className="px-dialog__caret">▼</span>}
      </div>
      <div className="welcome__actions">
        <span className="welcome__pager">{page + 1} / {PAGES.length}</span>
        <button className="px-btn px-btn--primary" onClick={(e) => { e.stopPropagation(); next(); }} autoFocus>
          <Sprite name="heart" px={2} />{last && done ? t('welcome.done') : t('welcome.next')}
        </button>
      </div>
    </div>
  );
}
