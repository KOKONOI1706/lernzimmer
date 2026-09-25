import { useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useWindows, type WinState } from './windows';
import { useSettings } from '../state/settings';
import { Sprite, type SpriteName } from '../ui/Sprite';
import { useT } from '../i18n';

interface Props {
  win: WinState;
  title: string;
  icon: SpriteName;
  focused: boolean;
  children: ReactNode;
}

/** Keep at least this much of a window grabbable inside the desktop. */
const KEEP_VISIBLE = 64;

export function Window({ win, title, icon, focused, children }: Props) {
  const t = useT();
  const px = useSettings((s) => s.px);
  const { focus, move, resize, close, minimize, toggleMaximize } = useWindows.getState();
  const ref = useRef<HTMLDivElement>(null);
  const snap = (v: number) => Math.round(v / px) * px;

  /** Shared pointer-drag helper: calls onMove with the delta since pointerdown. */
  const drag = (e: RPointerEvent, onMove: (dx: number, dy: number, area: DOMRect) => void) => {
    if (e.button !== 0) return;
    const area = ref.current!.parentElement!.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const onPointerMove = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy, area);
    const stop = () => {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
    };
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
  };

  const onBarDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || win.maximized) return;
    const { x: x0, y: y0 } = win;
    drag(e, (dx, dy, area) => {
      const x = Math.min(Math.max(x0 + dx, KEEP_VISIBLE - win.w), area.width - KEEP_VISIBLE);
      const y = Math.min(Math.max(y0 + dy, 0), area.height - KEEP_VISIBLE / 2);
      move(win.id, snap(x), snap(y));
    });
  };

  const onGripDown = (e: RPointerEvent) => {
    e.stopPropagation();
    const { w: w0, h: h0 } = win;
    drag(e, (dx, dy, area) => resize(win.id, snap(Math.min(w0 + dx, area.width - win.x)), snap(Math.min(h0 + dy, area.height - win.y))));
  };

  const cls = ['win', focused && 'win--focused', win.maximized && 'win--max', win.minimized && 'win--min'].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={cls}
      role="dialog"
      aria-label={title}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      onPointerDownCapture={() => focus(win.id)}
    >
      <div className="win__bar" onPointerDown={onBarDown} onDoubleClick={() => toggleMaximize(win.id)}>
        <div className="win__title"><Sprite name={icon} px={2} animate={false} />{title}</div>
        <div className="win__btns">
          <button className="win__btn" title={t('win.minimize')} aria-label={t('win.minimize')} onClick={() => minimize(win.id)}><Sprite name="btn_min" px={3} /></button>
          <button className="win__btn" title={t('win.maximize')} aria-label={t('win.maximize')} onClick={() => toggleMaximize(win.id)}><Sprite name="btn_max" px={3} /></button>
          <button className="win__btn" title={t('win.close')} aria-label={t('win.close')} onClick={() => close(win.id)}><Sprite name="btn_close" px={3} /></button>
        </div>
      </div>
      <div className="win__body">{children}</div>
      {!win.maximized && <div className="win__grip" onPointerDown={onGripDown} aria-hidden />}
    </div>
  );
}
