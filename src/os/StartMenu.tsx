import { useEffect, useRef, useState } from 'react';
import { APPS, openApp } from './apps';
import { Sprite } from '../ui/Sprite';
import { useT } from '../i18n';

interface Props {
  onClose: () => void;
  onSave: () => void;
  onEnd: () => void;
}

/** Start menu modelled on the "aconite" reference: ITEMS / SAVE / SYSTEM / END. */
export function StartMenu({ onClose, onSave, onEnd }: Props) {
  const t = useT();
  const [itemsOpen, setItemsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      if (!ref.current?.contains(el) && !el.closest('.taskbar__start')) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [onClose]);

  const launch = (id: string) => { openApp(id); onClose(); };

  return (
    <div className="start" ref={ref} role="menu">
      <button className="start__item" role="menuitem" aria-expanded={itemsOpen} onClick={() => setItemsOpen(!itemsOpen)}>
        <Sprite name="sticky_note" px={2} />{t('start.items')}
      </button>
      {itemsOpen && (
        <div className="start__sub">
          {APPS.filter((a) => a.id !== 'settings').map((a) => (
            <button key={a.id} className="start__item" role="menuitem" onClick={() => launch(a.id)}>
              <Sprite name={a.icon} px={2} animate={false} />{t(a.title)}
            </button>
          ))}
        </div>
      )}
      <button className="start__item" role="menuitem" onClick={() => { onSave(); onClose(); }}>
        <Sprite name="book" px={2} />{t('start.save')}
      </button>
      <button className="start__item" role="menuitem" onClick={() => launch('settings')}>
        <Sprite name="cursor" px={2} />{t('start.system')}
      </button>
      <button className="start__item" role="menuitem" onClick={() => { onEnd(); onClose(); }}>
        <Sprite name="dachshund" px={2} animate={false} />{t('start.end')}
      </button>
    </div>
  );
}
