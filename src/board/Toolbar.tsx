import { useRef } from 'react';
import { useBoard } from './store';
import { boardApi } from './api';
import { stepZoom, zoomAt } from './geometry';
import { INK_COLORS, NOTE_COLORS, SIZES, type BoardItem, type Tool } from './types';
import { STICKER_SPRITES } from './stickers';
import { Sprite, type SpriteName } from '../ui/Sprite';
import { useT, type StringKey } from '../i18n';

const TOOLS: { tool: Tool; icon: SpriteName; key: string }[][] = [
  [{ tool: 'select', icon: 'cursor', key: 'V' }, { tool: 'hand', icon: 'tool_hand', key: 'H' }],
  [{ tool: 'pen', icon: 'pencil', key: 'P' }, { tool: 'highlighter', icon: 'tool_highlighter', key: 'M' }, { tool: 'eraser', icon: 'tool_eraser', key: 'E' }],
  [{ tool: 'rect', icon: 'tool_rect', key: 'R' }, { tool: 'ellipse', icon: 'tool_ellipse', key: 'O' }, { tool: 'arrow', icon: 'tool_arrow', key: 'A' }],
  [{ tool: 'text', icon: 'tool_text', key: 'T' }, { tool: 'note', icon: 'sticky_note', key: 'N' }, { tool: 'pin', icon: 'pin', key: 'K' }, { tool: 'sticker', icon: 'tool_image', key: 'I' }],
];

const COLOR_TOOLS = new Set<Tool>(['pen', 'highlighter', 'rect', 'ellipse', 'arrow', 'text']);
const PIXELATE_STEPS = [0, 4, 8, 16];
const GENDER_TITLE = ['der', 'die', 'das', 'die (Pl.)'];
/** Single-colour line icons drawn in ink: inverted on dark themes (see .ink-icon). */
const INK_ICONS = new Set<SpriteName>(['tool_rect', 'tool_ellipse', 'tool_arrow', 'tool_text', 'tool_undo', 'tool_redo', 'tool_download', 'tool_trash']);

function IconBtn({ icon, title, pressed, onClick, disabled }: { icon: SpriteName; title: string; pressed?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="px-btn tb__btn" title={title} aria-label={title} aria-pressed={pressed} onClick={onClick} disabled={disabled}>
      <Sprite name={icon} px={2} animate={false} className={INK_ICONS.has(icon) ? 'ink-icon' : undefined} />
    </button>
  );
}

function Colors({ colors, value, onPick }: { colors: readonly string[]; value?: string; onPick: (c: string) => void }) {
  return (
    <div className="tb__group" role="radiogroup">
      {colors.map((c, i) => (
        <button key={c} className="tb__swatch" role="radio" aria-checked={value === c} title={GENDER_TITLE[i] ?? c}
          aria-label={GENDER_TITLE[i] ?? c} style={{ background: c }} onClick={() => onPick(c)} />
      ))}
    </div>
  );
}

/** Apply a colour to the selection: strokes/text change ink, shapes change outline (and fill if filled). */
function recolor(items: BoardItem[], ids: string[], color: string): Record<string, Partial<BoardItem>> {
  const patches: Record<string, Partial<BoardItem>> = {};
  for (const it of items) {
    if (!ids.includes(it.id)) continue;
    if (it.kind === 'stroke' || it.kind === 'text') patches[it.id] = { color };
    else if (it.kind === 'shape') patches[it.id] = { stroke: color, ...(it.fill ? { fill: color } : {}) };
    else if (it.kind === 'note' && (NOTE_COLORS as readonly string[]).includes(color)) patches[it.id] = { color };
  }
  return patches;
}

export function Toolbar() {
  const t = useT();
  const s = useBoard();
  const fileRef = useRef<HTMLInputElement>(null);
  const sel = s.items.filter((i) => s.selected.includes(i.id));
  const onlyNotes = sel.length > 0 && sel.every((i) => i.kind === 'note');
  const stickers = sel.filter((i) => i.kind === 'sticker');
  const photoStickers = stickers.filter((i) => i.kind === 'sticker' && i.blobId);

  const apply = (patches: Record<string, Partial<BoardItem>>) => {
    if (!Object.keys(patches).length) return;
    s.checkpoint();
    s.updateMany(patches);
  };
  const zoom = (dir: 1 | -1) => {
    const el = document.querySelector('.board')!.getBoundingClientRect();
    s.set({ camera: zoomAt(s.camera, stepZoom(s.camera.zoom, dir), { x: el.width / 2, y: el.height / 2 }) });
  };

  const sizes = s.tool === 'text' ? SIZES.text : SIZES.pen;
  const curSize = s.tool === 'text' ? s.textSize : s.size;

  return (
    <div className="tb" role="toolbar" aria-label={t('app.board')} onPointerDown={(e) => e.stopPropagation()}>
      {/* ── contextual options row ── */}
      <div className="tb__row tb__row--opts">
        {s.tool === 'select' && sel.length > 0 && (
          <>
            {onlyNotes
              ? <Colors colors={NOTE_COLORS} value={sel.length === 1 && sel[0].kind === 'note' ? sel[0].color : undefined} onPick={(c) => apply(recolor(s.items, s.selected, c))} />
              : <Colors colors={INK_COLORS} onPick={(c) => apply(recolor(s.items, s.selected, c))} />}
            {stickers.length > 0 && (
              <div className="tb__group">
                <button className="px-btn tb__text" aria-pressed={stickers.every((i) => i.kind === 'sticker' && i.outline)}
                  onClick={() => { const on = !stickers.every((i) => i.kind === 'sticker' && i.outline); apply(Object.fromEntries(stickers.map((i) => [i.id, { outline: on }]))); }}>
                  {t('board.outline')}
                </button>
                {photoStickers.length > 0 && (
                  <button className="px-btn tb__text" title={t('board.pixelate')}
                    onClick={() => {
                      const cur = photoStickers[0].kind === 'sticker' ? photoStickers[0].pixelate : 0;
                      const next = PIXELATE_STEPS[(PIXELATE_STEPS.indexOf(cur) + 1) % PIXELATE_STEPS.length];
                      apply(Object.fromEntries(photoStickers.map((i) => [i.id, { pixelate: next }])));
                    }}>
                    {t('board.pixelate')} {photoStickers[0].kind === 'sticker' && photoStickers[0].pixelate ? `×${photoStickers[0].pixelate}` : '–'}
                  </button>
                )}
              </div>
            )}
            <div className="tb__group">
              <IconBtn icon="btn_max" title={t('board.front')} onClick={() => s.toFront(s.selected)} />
              <IconBtn icon="btn_min" title={t('board.back')} onClick={() => s.toBack(s.selected)} />
              <IconBtn icon="sticky_note" title={`${t('board.duplicate')} (Ctrl+D)`} onClick={() => s.duplicate(s.selected)} />
              <IconBtn icon="tool_trash" title={`${t('board.delete')} (Del)`} onClick={() => s.remove(s.selected)} />
            </div>
          </>
        )}

        {COLOR_TOOLS.has(s.tool) && (
          <>
            <Colors colors={INK_COLORS} value={s.color} onPick={(color) => s.set({ color })} />
            <div className="tb__group" role="radiogroup">
              {sizes.map((n) => (
                <button key={n} className="px-btn tb__size" role="radio" aria-checked={curSize === n} aria-pressed={curSize === n} title={`${n}px`}
                  onClick={() => s.set(s.tool === 'text' ? { textSize: n } : { size: n })}>
                  <span style={{ width: Math.min(18, s.tool === 'text' ? n / 4 : n + 2), height: Math.min(18, s.tool === 'text' ? n / 4 : n + 2), background: 'currentColor', display: 'block' }} />
                </button>
              ))}
            </div>
            {(s.tool === 'rect' || s.tool === 'ellipse') && (
              <button className="px-btn tb__text" aria-pressed={s.fill} onClick={() => s.set({ fill: !s.fill })}>{t('board.fill')}</button>
            )}
            {s.tool === 'pen' && (
              <button className="px-btn tb__text" aria-pressed={s.pixelSnap} onClick={() => s.set({ pixelSnap: !s.pixelSnap })}>{t('board.pixel')}</button>
            )}
          </>
        )}

        {s.tool === 'sticker' && (
          <>
            <div className="tb__group tb__stickers">
              {STICKER_SPRITES.map((name) => (
                <button key={name} className="px-btn tb__btn" title={name} aria-label={name} aria-pressed={s.stickerSprite === name}
                  onClick={() => s.set({ stickerSprite: name })}>
                  <Sprite name={name as SpriteName} px={2} animate={false} />
                </button>
              ))}
            </div>
            <button className="px-btn tb__text" onClick={() => fileRef.current?.click()}>
              <Sprite name="tool_image" px={2} />{t('board.upload')}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => { [...(e.target.files ?? [])].forEach((f) => void boardApi.addImageFile(f)); e.target.value = ''; }} />
          </>
        )}
      </div>

      {/* ── tools row ── */}
      <div className="tb__row">
        {TOOLS.map((group, gi) => (
          <div key={gi} className="tb__group">
            {group.map(({ tool, icon, key }) => (
              <IconBtn key={tool} icon={icon} title={`${t(`tool.${tool}` as StringKey)} (${key})`} pressed={s.tool === tool}
                onClick={() => s.setTool(tool)} />
            ))}
          </div>
        ))}
        <div className="tb__group">
          <IconBtn icon="tool_undo" title={`${t('board.undo')} (Ctrl+Z)`} onClick={s.undo} disabled={!s.past.length} />
          <IconBtn icon="tool_redo" title={`${t('board.redo')} (Ctrl+Y)`} onClick={s.redo} disabled={!s.future.length} />
        </div>
        <div className="tb__group">
          <button className="px-btn tb__text" title={t('board.zoomOut')} aria-label={t('board.zoomOut')} onClick={() => zoom(-1)}>−</button>
          <button className="px-btn tb__text tb__zoom" title={t('board.zoomReset')} onClick={() => s.set({ camera: { x: 0, y: 0, zoom: 1 } })}>
            {Math.round(s.camera.zoom * 100)}%
          </button>
          <button className="px-btn tb__text" title={t('board.zoomIn')} aria-label={t('board.zoomIn')} onClick={() => zoom(1)}>+</button>
        </div>
        <div className="tb__group">
          <IconBtn icon="tool_download" title={t('board.export')} onClick={() => void boardApi.exportPng()} disabled={!s.items.length} />
          <IconBtn icon="btn_close" title={t('board.hide')} onClick={() => { s.setTool('select'); s.set({ toolbar: false }); }} />
        </div>
      </div>
    </div>
  );
}
