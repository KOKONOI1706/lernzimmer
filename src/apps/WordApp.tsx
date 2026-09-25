import { useState } from 'react';
import { WORDS, wordOfDay } from '../learn/words';
import { canSpeak, speak } from '../learn/tts';
import { useSettings } from '../state/settings';
import { useBoard } from '../board/store';
import { boardApi } from '../board/api';
import { NOTE_COLORS } from '../board/types';
import { useToast } from '../ui/toast';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';

/** Note colours that echo the gender colours: der → blue, die → pink, das → green. */
const GENDER_NOTE = { der: NOTE_COLORS[2], die: NOTE_COLORS[1], das: NOTE_COLORS[3] } as const;

export function WordApp() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const today = wordOfDay();
  const [idx, setIdx] = useState(() => WORDS.indexOf(today));
  const w = WORDS[(idx + WORDS.length) % WORDS.length];
  const meaning = lang === 'vi' ? w.vi : w.en;
  const exTr = lang === 'vi' ? w.example.vi : w.example.en;

  const toBoard = () => {
    const c = boardApi.center();
    const b = useBoard.getState();
    const text = `${w.gender} ${w.de}\n${w.plural ? `die ${w.plural}` : '–'}\n\n${meaning}\n„${w.example.de}“`;
    b.add({ kind: 'note', x: Math.round(c.x - 110), y: Math.round(c.y - 100), w: 220, h: 200, text, color: GENDER_NOTE[w.gender], rot: -2 });
    b.set({ toolbar: true });
    useToast.getState().show(`📌 ${w.gender} ${w.de}`);
  };

  return (
    <div className="word">
      <div className="word__nav">
        <button className="px-btn" title={t('word.prev')} aria-label={t('word.prev')} onClick={() => setIdx(idx - 1)}>◀</button>
        <button className="px-btn" disabled={w === today} onClick={() => setIdx(WORDS.indexOf(today))}>{t('word.today')}</button>
        <button className="px-btn" title={t('word.next')} aria-label={t('word.next')} onClick={() => setIdx(idx + 1)}>▶</button>
      </div>

      <div className={`word__card word__card--${w.gender}`}>
        <div className="word__main">
          <span className={`word__article g-${w.gender}`}>{w.gender}</span> {w.de}
        </div>
        <div className="word__plural">
          {t('word.plural')}: {w.plural ? <><span className="g-die">die</span> {w.plural}</> : <i>{t('word.noPlural')}</i>}
        </div>
        <div className="word__meaning">{meaning}</div>
        <blockquote className="word__example">
          <span lang="de">„{w.example.de}“</span>
          <small>{exTr}</small>
        </blockquote>
      </div>

      <div className="px-row">
        {canSpeak() && (
          <button className="px-btn" onClick={() => { speak(`${w.gender} ${w.de}`); speak(w.example.de, { queue: true }); }}>
            <Sprite name="speaker" px={2} />{t('word.listen')}
          </button>
        )}
        <button className="px-btn px-btn--primary" onClick={toBoard}><Sprite name="pin" px={2} />{t('word.toBoard')}</button>
      </div>
    </div>
  );
}
