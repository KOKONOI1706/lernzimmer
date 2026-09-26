import { Sprite } from '../../ui/Sprite';
import { useT } from '../../i18n';

/** Shared end-of-round screen (Undertale-style dialog). */
export function GameOver({ title, detail, extra, best, newBest, onAgain, onMenu }: {
  title: string; detail: string; extra?: string; best?: number; newBest?: boolean; onAgain: () => void; onMenu: () => void;
}) {
  const t = useT();
  return (
    <div className="game game--over">
      <Sprite name={newBest ? 'sparkle' : 'dachshund'} scale={3} />
      <h3 className="game__title">{title}</h3>
      <div className="px-dialog game__dialog">
        ✱ {detail}
        {extra && <div>✱ {extra}</div>}
        {newBest ? <div className="game__newbest">★ {t('arcade.newBest')} ★</div> : best !== undefined && <div>✱ {t('arcade.best')}: {best}</div>}
      </div>
      <div className="px-row" style={{ justifyContent: 'center' }}>
        <button className="px-btn px-btn--primary" autoFocus onClick={onAgain}>{t('arcade.again')}</button>
        <button className="px-btn" onClick={onMenu}>{t('arcade.menu')}</button>
      </div>
    </div>
  );
}
