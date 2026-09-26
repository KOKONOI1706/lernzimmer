import { useEffect, useMemo, useRef, useState } from 'react';
import { buildQueue, checkAnswer, formatInterval, preview, Rating, requeue, suggestRating, type Card, type Grade, type Verdict } from '../../learn/cards';
import { newLeftToday, useLearn } from '../../learn/store';
import type { Gender } from '../../learn/words';
import { canSpeak, speak } from '../../learn/tts';
import { audio } from '../../audio/engine';
import { useSettings } from '../../state/settings';
import { Sprite } from '../../ui/Sprite';
import { UmlautBar } from '../../ui/UmlautBar';
import { fmt, useT, type StringKey } from '../../i18n';
import { CardBack, Headword, meaning } from './CardFace';

export type ReviewMode = 'recognize' | 'type';

const GRADES: { g: Grade; key: StringKey; cls: string }[] = [
  { g: Rating.Again, key: 'review.again', cls: 'grade--again' },
  { g: Rating.Hard, key: 'review.hard', cls: 'grade--hard' },
  { g: Rating.Good, key: 'review.good', cls: 'grade--good' },
  { g: Rating.Easy, key: 'review.easy', cls: 'grade--easy' },
];
const GENDERS: Gender[] = ['der', 'die', 'das'];
const AUTOPLAY_KEY = 'lz.review.autoplay';

export function Review({ deckId, mode, onExit }: { deckId: string; mode: ReviewMode; onExit: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const deck = useLearn((s) => s.decks.find((d) => d.id === deckId));

  // The queue is fixed at session start (new-card limit applied then), then evolves via requeue().
  const [queue, setQueue] = useState<Card[]>(() => {
    const s = useLearn.getState();
    return buildQueue(s.cards.filter((c) => c.deckId === deckId), new Date(), newLeftToday(s, deckId));
  });
  const [phase, setPhase] = useState<'front' | 'back'>('front');
  const [picked, setPicked] = useState<Gender>();
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<Verdict>();
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem(AUTOPLAY_KEY) !== '0');
  const [stats, setStats] = useState({ done: 0, firstTry: 0 });
  const seen = useRef(new Set<string>());
  const shownAt = useRef(performance.now());
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  const card = queue[0];
  const intervals = useMemo(() => (card ? preview(card) : undefined), [card]);

  // new card on screen: reset per-card state and focus the right element
  useEffect(() => {
    setPhase('front'); setPicked(undefined); setTyped(''); setVerdict(undefined);
    shownAt.current = performance.now();
    requestAnimationFrame(() => (mode === 'type' ? inputRef.current : rootRef.current)?.focus());
  }, [card?.id, mode]);

  const suggestion: Grade | undefined =
    mode === 'type' ? (verdict ? suggestRating(verdict) : undefined)
    : card?.gender && picked ? (picked === card.gender ? Rating.Good : Rating.Again)
    : undefined;

  const reveal = () => {
    if (!card || phase === 'back') return;
    setPhase('back');
    // the typing input unmounts on reveal; keep keyboard focus in the review so 1–4 still work
    requestAnimationFrame(() => rootRef.current?.focus());
    if (autoplay && canSpeak()) {
      speak(card.gender ? `${card.gender} ${card.de}` : card.de);
      if (card.example) speak(card.example.de, { queue: true });
    }
  };

  const pickGender = (g: Gender) => {
    if (!card || phase === 'back') return;
    setPicked(g);
    audio.chime(g === card.gender ? 'ok' : 'no');
    reveal();
  };

  const check = () => {
    if (!card || phase === 'back' || !typed.trim()) return;
    const v = checkAnswer(typed, card);
    setVerdict(v);
    audio.chime(v === 'correct' ? 'ok' : v === 'wrong' ? 'no' : 'ok');
    reveal();
  };

  const rate = async (g: Grade) => {
    if (!card || phase !== 'back' || busy.current) return;
    busy.current = true;
    try {
      const first = !seen.current.has(card.id);
      seen.current.add(card.id);
      if (first) setStats((s) => ({ done: s.done + 1, firstTry: s.firstTry + (g >= Rating.Good ? 1 : 0) }));
      const next = await useLearn.getState().review(card.id, g, performance.now() - shownAt.current, mode === 'type' ? 'review:type' : 'review');
      if (next) setQueue((q) => requeue(q, next, new Date()));
    } finally {
      busy.current = false;
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!card) return;
    if (phase === 'front') {
      // typing mode: the <form> handles Enter; digits are part of the answer
      if (mode === 'type') return;
      if (card.gender && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); pickGender(GENDERS[Number(e.key) - 1]); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
      return;
    }
    if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); void rate(Number(e.key) as Grade); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void rate(suggestion ?? Rating.Good); }
  };

  if (!card) {
    const pct = stats.done ? Math.round((stats.firstTry / stats.done) * 100) : 0;
    return (
      <div className="review review--done" ref={rootRef}>
        <Sprite name="dachshund" scale={3} />
        <h3>{t('review.done')}</h3>
        <p>{stats.done ? fmt(t('review.stats'), { n: stats.done, p: pct }) : t('cards.nothing')}</p>
        <button className="px-btn px-btn--primary" autoFocus onClick={onExit}>{t('cards.back')}</button>
      </div>
    );
  }

  const now = Date.now();
  return (
    <div className="review" ref={rootRef} tabIndex={-1} onKeyDown={onKey}>
      <div className="review__head">
        <button className="px-btn" onClick={onExit}>◀ {t('review.quit')}</button>
        <span className="review__deck">{deck?.name}</span>
        <span className="review__left">{queue.length} {t('review.left')}</span>
        <label className="px-check" title={t('review.autoplay')}>
          <input type="checkbox" checked={autoplay} onChange={(e) => { setAutoplay(e.target.checked); localStorage.setItem(AUTOPLAY_KEY, e.target.checked ? '1' : '0'); }} />
          <Sprite name="speaker" px={2} />
        </label>
      </div>

      {phase === 'front' ? (
        <div className="cardface cardface--front">
          {mode === 'recognize' ? (
            <>
              <div className="cardface__main"><Headword card={card} hideArticle /></div>
              {card.gender ? (
                <>
                  <p className="px-label">{t('review.whichArticle')}</p>
                  <div className="review__genders">
                    {GENDERS.map((g, i) => (
                      <button key={g} className={`px-btn gender-btn gender-btn--${g}`} onClick={() => pickGender(g)}>
                        <kbd>{i + 1}</kbd>{g}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button className="px-btn px-btn--primary" onClick={reveal}>{t('review.reveal')} <kbd>␣</kbd></button>
              )}
            </>
          ) : (
            <>
              <p className="px-label">{t('review.typePrompt')}</p>
              <div className="cardface__meaning cardface__meaning--prompt">{meaning(card, lang)}</div>
              {card.gender && <p className="review__hint">der / die / das + …</p>}
              <form className="review__type" onSubmit={(e) => { e.preventDefault(); check(); }}>
                <input ref={inputRef} className="px-input" value={typed} lang="de" autoComplete="off" autoCapitalize="off" spellCheck={false}
                  onChange={(e) => setTyped(e.target.value)} aria-label={t('review.typePrompt')} />
                <button className="px-btn px-btn--primary" type="submit" disabled={!typed.trim()}>{t('review.check')}</button>
              </form>
              <UmlautBar target={inputRef} value={typed} onChange={setTyped} />
            </>
          )}
        </div>
      ) : (
        <>
          {(picked || verdict) && (
            <p className={`review__verdict ${suggestion === Rating.Good ? 'is-good' : suggestion === Rating.Again ? 'is-bad' : 'is-meh'}`} role="status">
              {verdict
                ? <>{t(`review.verdict.${verdict}` as StringKey)} {verdict !== 'correct' && <span className="review__typed">„{typed}“</span>}</>
                : picked === card.gender ? t('review.genderRight') : <>{t('review.genderWrong')} <span className={`g-${card.gender}`}>{card.gender}</span> {card.de}</>}
            </p>
          )}
          <CardBack card={card} lang={lang} />
          <div className="review__grades">
            {GRADES.map(({ g, key, cls }) => (
              <button key={g} className={`px-btn grade ${cls}`} aria-pressed={suggestion === g} onClick={() => void rate(g)}>
                <kbd>{g}</kbd>{t(key)}
                {intervals && <small>{formatInterval(intervals[g].getTime() - now)}</small>}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="review__keys">{t('review.keys')}</p>
    </div>
  );
}
