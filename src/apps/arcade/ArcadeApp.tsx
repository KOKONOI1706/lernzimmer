import { useEffect, useState } from 'react';
import { useLearn } from '../../learn/store';
import { useScores, type GameId } from '../../games/scores';
import { Sprite, type SpriteName } from '../../ui/Sprite';
import { useT, type StringKey } from '../../i18n';
import { ClockQuiz } from '../ClockApp';
import { ArtikelRegen, nounCards } from './ArtikelRegen';
import { MemoryGame, memoryCards, PAIRS } from './MemoryGame';
import { ZahlenSprint } from './ZahlenSprint';

type Game = 'artikel' | 'memory' | 'zahlen' | 'uhr';

const GAMES: { id: Game; title: string; desc: StringKey; icon: SpriteName; best?: GameId; lowerIsBetter?: boolean }[] = [
  { id: 'artikel', title: 'Artikel-Regen', desc: 'arcade.artikel.desc', icon: 'raindrop', best: 'artikel' },
  { id: 'memory', title: 'Memory', desc: 'arcade.memory.desc', icon: 'heart', best: 'memory', lowerIsBetter: true },
  { id: 'zahlen', title: 'Zahlen-Sprint', desc: 'arcade.zahlen.desc', icon: 'coin' },
  { id: 'uhr', title: 'Wie spät ist es?', desc: 'arcade.uhr.desc', icon: 'clock', best: 'uhr' },
];

/** Spielhalle: game menu in the violet "arcade" palette regardless of room theme. */
export function ArcadeApp() {
  const t = useT();
  const [game, setGame] = useState<Game>();
  const learn = useLearn();
  const best = useScores((s) => s.best);
  useEffect(() => { if (!learn.loaded) void learn.load(); }, [learn]);

  const nouns = nounCards(learn.cards).length, withMeaning = memoryCards(learn.cards).length;
  const ready: Record<Game, boolean> = { artikel: nouns >= 4, memory: withMeaning >= PAIRS, zahlen: true, uhr: true };
  const exit = () => setGame(undefined);

  let body;
  if (game === 'artikel') body = <ArtikelRegen onExit={exit} />;
  else if (game === 'memory') body = <MemoryGame onExit={exit} />;
  else if (game === 'zahlen') body = <ZahlenSprint onExit={exit} />;
  else if (game === 'uhr') body = <ClockQuiz onBack={(streak) => { if (streak > 0) useScores.getState().record('uhr', streak); exit(); }} />;
  else body = (
    <div className="arcade__menu">
      <h3 className="arcade__title">♥ SPIELHALLE ♥</h3>
      <ul className="arcade__games">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button className="arcade__game" disabled={!learn.loaded || !ready[g.id]} onClick={() => setGame(g.id)}>
              <Sprite name={g.icon} scale={2} animate={false} />
              <span className="arcade__gameinfo">
                <b className="arcade__gametitle">{g.title}</b>
                <span>{t(g.desc)}</span>
                {!ready[g.id] && learn.loaded && <small className="arcade__warn">{t('arcade.needCards')}</small>}
              </span>
              {g.best && <span className="arcade__best">{t('arcade.best')}<b>{best[g.best] ?? '–'}</b></span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="review__keys">{t('arcade.counts')}</p>
    </div>
  );

  return <div className="arcade">{body}</div>;
}
