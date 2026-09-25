import { useT } from '../i18n';
import { Sprite, type SpriteName } from '../ui/Sprite';

export function ComingSoon({ icon, milestone }: { icon: SpriteName; milestone: string }) {
  const t = useT();
  return (
    <div className="soon">
      <div className="px-row">
        <Sprite name="dachshund" scale={3} />
        <Sprite name={icon} scale={2} />
      </div>
      <h3>{t('soon.title')}</h3>
      <p style={{ margin: 0 }}>{t('soon.body')}</p>
      <span className="soon__tag">{milestone}</span>
    </div>
  );
}
