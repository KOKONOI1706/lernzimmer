import { useEffect, useMemo, useState } from 'react';
import { db } from '../../data/db';
import { useLearn } from '../../learn/store';
import { Rating, type Card } from '../../learn/cards';
import type { Gender } from '../../learn/words';
import { pickCards, shuffle } from '../../games/logic';
import { useProfile } from '../../gamify/store';
import { weekOf } from '../../gamify/rules';
import { emit } from '../../gamify/events';
import { isoDate, parseIso } from '../../calendar/dates';
import { audio } from '../../audio/engine';
import { useSettings } from '../../state/settings';
import { Sprite } from '../../ui/Sprite';
import { useT } from '../../i18n';
import { meaning } from '../cards/CardFace';
import { GameOver } from './GameOver';

const QUESTIONS = 8;
const HEARTS = 5;
const GENDERS: Gender[] = ['der', 'die', 'das'];

interface Q { card: Card; kind: 'article' | 'meaning'; options: string[]; answer: string }

/** This week's mistakes first (cards rated "Again" since Monday), topped up with the weakest cards. */
async function buildQuestions(lang: Parameters<typeof meaning>[1]): Promise<Q[]> {
  const cards = useLearn.getState().cards.filter((c) => c.vi || c.en);
  const since = parseIso(weekOf(isoDate(new Date()))).getTime();
  const missedIds = new Set((await db.logs.where('at').aboveOrEqual(since).toArray()).filter((l) => l.rating === Rating.Again).map((l) => l.cardId));
  const missed = shuffle(cards.filter((c) => missedIds.has(c.id))).slice(0, QUESTIONS);
  const rest = pickCards(cards.filter((c) => !missedIds.has(c.id)).sort((a, b) => b.srs.lapses - a.srs.lapses).slice(0, 60), QUESTIONS - missed.length, new Date());
  return [...missed, ...rest].map((card) => {
    if (card.gender && Math.random() < 0.6) return { card, kind: 'article', options: GENDERS, answer: card.gender };
    const answer = meaning(card, lang);
    const others = shuffle(cards.filter((c) => c.id !== card.id).map((c) => meaning(c, lang)).filter((m) => m && m !== answer));
    return { card, kind: 'meaning', options: shuffle([answer, ...new Set(others)].slice(0, 4)), answer };
  });
}

export function BossFight({ onExit }: { onExit: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const [qs, setQs] = useState<Q[]>();
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();
  const [end, setEnd] = useState<'win' | 'lose'>();
  const [shake, setShake] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => { void buildQuestions(lang).then(setQs); }, [lang, round]);
  const q = qs?.[i];
  const hp = qs ? qs.length - i : QUESTIONS;
  // read once per round, before a win updates it
  const alreadyBeaten = useMemo(() => useProfile.getState().bossWeek === weekOf(isoDate(new Date())), [round]);

  const answer = (opt: string) => {
    if (!q || feedback || end) return;
    const ok = opt === q.answer;
    void useLearn.getState().practice(q.card.id, ok, 0, 'game:boss');
    audio.chime(ok ? 'ok' : 'no');
    setShake((s) => s + 1);
    setFeedback({ ok, text: ok ? t('boss.hit') : `${t('boss.ouch')} ${q.card.gender ? `${q.card.gender} ${q.card.de}` : `${q.card.de} = ${q.answer}`}` });
    const nextHearts = ok ? hearts : hearts - 1;
    setHearts(nextHearts);
    setTimeout(() => {
      setFeedback(undefined);
      if (nextHearts <= 0) { setEnd('lose'); emit({ type: 'gameEnd', game: 'boss', score: i * 10 }); return; }
      if (ok && i + 1 >= (qs?.length ?? 0)) {
        if (!alreadyBeaten) emit({ type: 'bossWin' });
        emit({ type: 'gameEnd', game: 'boss', score: 100 });
        setEnd('win');
        return;
      }
      if (ok) setI(i + 1);
      // a missed question comes back at the end, with the options reshuffled
      else setQs((cur) => cur && [...cur.slice(0, i), ...cur.slice(i + 1), { ...q, options: q.kind === 'meaning' ? shuffle(q.options) : q.options }]);
    }, ok ? 700 : 1500);
  };

  const restart = () => { setI(0); setHearts(HEARTS); setEnd(undefined); setQs(undefined); setRound((r) => r + 1); };

  if (end) {
    return <GameOver title={end === 'win' ? t('boss.win') : t('boss.lose')} newBest={end === 'win' && !alreadyBeaten}
      detail={end === 'win' ? (alreadyBeaten ? t('boss.beaten') : t('boss.reward')) : `${i}/${qs?.length ?? QUESTIONS}`} onAgain={restart} onMenu={onExit} />;
  }

  return (
    <div className="game boss">
      <div className="game__hud">
        <button className="px-btn" onClick={onExit}>◀ {t('arcade.menu')}</button>
        <b>Der Grammatik-Geist</b>
        <span className="game__lives">{Array.from({ length: HEARTS }, (_, k) => <Sprite key={k} name="heart" px={2} style={{ opacity: k < hearts ? 1 : 0.2 }} />)}</span>
      </div>

      <div className="boss__arena">
        <div className={`boss__ghost ${feedback?.ok ? 'is-hit' : ''}`} key={shake}><Sprite name="ghost" px={7} /></div>
        <div className="boss__hp" aria-label={`HP ${hp}`}>
          <span>HP</span>
          <span className="pbar pbar--hp">{Array.from({ length: qs?.length ?? QUESTIONS }, (_, k) => <i key={k} className={k < hp ? 'on' : ''} />)}</span>
        </div>
      </div>

      <div className="px-dialog boss__dialog" aria-live="polite">
        {!q ? '✱ …' : feedback ? `✱ ${feedback.text}` : (
          <>
            ✱ {q.kind === 'article' ? <><span className="headword__blank">___</span> <span lang="de">{q.card.de}</span></> : <span lang="de">{q.card.gender ? `${q.card.gender} ` : ''}{q.card.de}</span>}
            <small>{q.kind === 'article' ? t('review.whichArticle') : t('boss.meaning')}</small>
          </>
        )}
      </div>

      {q && (
        <div className={`boss__options boss__options--${q.kind}`}>
          {q.options.map((o) => (
            <button key={o} className={`boss__opt ${q.kind === 'article' ? `gender-btn--${o}` : ''}`} disabled={!!feedback} onClick={() => answer(o)}>
              <span className="boss__heart">♥</span>{o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
