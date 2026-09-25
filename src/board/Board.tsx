import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layer, Rect, Stage, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useBoard } from './store';
import { ItemNode, type Bind } from './nodes';
import { appendPoint, bbox, hitStroke, itemsUnder, snap, stepZoom, zoomAt, type Box, type Pt } from './geometry';
import { NOTE_COLORS, type BoardItem, type Tool } from './types';
import { stickerSize } from './stickers';
import { putImageBlob } from '../data/persist';
import { boardApi } from './api';
import { TextEditor } from './TextEditor';

const CURSOR: Record<Tool, string> = {
  select: 'default', hand: 'grab', pen: 'crosshair', highlighter: 'crosshair', eraser: 'cell',
  rect: 'crosshair', ellipse: 'crosshair', arrow: 'crosshair', text: 'text', note: 'copy', pin: 'copy', sticker: 'copy',
};
const TRANSFORMABLE = new Set<BoardItem['kind']>(['shape', 'text', 'note', 'sticker']);
const ACCENT = '#3fd0ff';

/** Ignore board shortcuts while typing or while a window has focus. */
const typingTarget = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable], .win');

const silentRemove = (ids: string[]) => useBoard.setState((s) => ({ items: s.items.filter((it) => !ids.includes(it.id)) }));

/** Open the editor after the browser's mousedown focus change, which would otherwise blur it at once. */
const editSoon = (id: string) => setTimeout(() => useBoard.getState().setEditing(id), 0);

const intersects = (a: Box, b: Box) => a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;

export function Board() {
  const items = useBoard((s) => s.items);
  const selected = useBoard((s) => s.selected);
  const editing = useBoard((s) => s.editing);
  const tool = useBoard((s) => s.tool);
  const camera = useBoard((s) => s.camera);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [marquee, setMarquee] = useState<Box>();
  const [panning, setPanning] = useState(false);
  const spaceDown = useRef(false);

  // ── sizing ──
  useLayoutEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // redraw once the pixel font is ready (Konva draws text on canvas)
  useEffect(() => { void document.fonts.load('24px VT323').then(() => stageRef.current?.batchDraw()); }, []);

  /** client (screen) px → world coordinates */
  const toWorld = useCallback((clientX: number, clientY: number): Pt => {
    const r = wrapRef.current!.getBoundingClientRect();
    const { camera: c } = useBoard.getState();
    return { x: (clientX - r.left - c.x) / c.zoom, y: (clientY - r.top - c.y) / c.zoom };
  }, []);

  const center = useCallback((): Pt => {
    const r = wrapRef.current!.getBoundingClientRect();
    return toWorld(r.left + r.width / 2, r.top + r.height / 2);
  }, [toWorld]);

  // ── adding images (upload / paste / drop) ──
  const addImageFile = useCallback(async (file: File, at?: Pt) => {
    if (!file.type.startsWith('image/')) return;
    const blobId = await putImageBlob(file, 1024);
    const base = { blobId, pixelate: 0, outline: true };
    const { w, h } = await stickerSize(base);
    const p = at ?? center();
    const s = useBoard.getState();
    s.add({ kind: 'sticker', ...base, x: Math.round(p.x - w / 2), y: Math.round(p.y - h / 2), w, h, rot: 0 }, { select: true });
    s.setTool('select');
  }, [center]);

  // ── PNG export of everything on the board ──
  const exportPng = useCallback(async () => {
    const { items: all, camera: c } = useBoard.getState();
    const layer = layerRef.current;
    if (!all.length || !layer) return;
    const boxes = all.map(bbox);
    const pad = 32;
    const x0 = Math.min(...boxes.map((b) => b.x)) - pad, y0 = Math.min(...boxes.map((b) => b.y)) - pad;
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + pad, y1 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
    const img = layer.toCanvas({ x: x0 * c.zoom + c.x, y: y0 * c.zoom + c.y, width: (x1 - x0) * c.zoom, height: (y1 - y0) * c.zoom, pixelRatio: 2 / c.zoom });
    const out = document.createElement('canvas');
    out.width = img.width; out.height = img.height;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/png'));
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lernzimmer-tafel-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, []);

  useEffect(() => { Object.assign(boardApi, { center, exportPng, addImageFile }); }, [center, exportPng, addImageFile]);

  // ── transformer follows selection ──
  useEffect(() => {
    const tr = trRef.current, stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selected
      .filter((id) => { const it = items.find((i) => i.id === id); return it && TRANSFORMABLE.has(it.kind) && id !== editing; })
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => !!n);
    tr.nodes(nodes);
    const only = nodes.length === 1 ? items.find((i) => i.id === selected[0]) : undefined;
    tr.keepRatio(only?.kind === 'sticker');
    tr.getLayer()?.batchDraw();
  }, [selected, items, editing]);

  const onTransformEnd = () => {
    const patches: Record<string, Partial<BoardItem>> = {};
    for (const node of trRef.current?.nodes() ?? []) {
      const it = useBoard.getState().items.find((i) => i.id === node.id());
      if (!it) continue;
      const sx = node.scaleX(), sy = node.scaleY();
      node.scale({ x: 1, y: 1 });
      const base = { x: Math.round(node.x()), y: Math.round(node.y()), rot: Math.round(node.rotation()) };
      if (it.kind === 'text') patches[it.id] = { ...base, size: Math.max(8, Math.round(it.size * sy)), ...(it.w ? { w: Math.round(it.w * sx) } : {}) };
      else if (it.kind === 'shape' || it.kind === 'note' || it.kind === 'sticker') patches[it.id] = { ...base, w: Math.round(it.w * sx), h: Math.round(it.h * sy) };
    }
    useBoard.getState().updateMany(patches);
  };

  // ── per-item handlers (select tool) ──
  const dragStart = useRef<Map<string, Pt>>(new Map());
  const bind = (item: BoardItem): Bind => ({
    id: item.id,
    x: item.x,
    y: item.y,
    rotation: item.rot ?? 0,
    draggable: tool === 'select' && editing !== item.id,
    onPointerDown: (e: KonvaEventObject<PointerEvent>) => {
      if (tool !== 'select' || e.evt.button !== 0) return;
      const s = useBoard.getState();
      if (e.evt.shiftKey) s.select(s.selected.includes(item.id) ? s.selected.filter((i) => i !== item.id) : [...s.selected, item.id]);
      else if (!s.selected.includes(item.id)) s.select([item.id]);
    },
    onDblClick: () => (item.kind === 'text' || item.kind === 'note') && useBoard.getState().setEditing(item.id),
    onDblTap: () => (item.kind === 'text' || item.kind === 'note') && useBoard.getState().setEditing(item.id),
    onDragStart: () => {
      const s = useBoard.getState();
      s.checkpoint();
      const moving = new Set(s.selected.includes(item.id) ? s.selected : [item.id]);
      // pins carry what they hold
      for (const it of s.items) if (moving.has(it.id) && it.kind === 'pin') it.holds.forEach((h) => moving.add(h));
      dragStart.current = new Map(s.items.filter((it) => moving.has(it.id)).map((it) => [it.id, { x: it.x, y: it.y }]));
    },
    onDragMove: (e: KonvaEventObject<DragEvent>) => {
      const start = dragStart.current.get(item.id);
      if (!start) return;
      const dx = Math.round(e.target.x() - start.x), dy = Math.round(e.target.y() - start.y);
      const patches: Record<string, Partial<BoardItem>> = {};
      dragStart.current.forEach((p, id) => { patches[id] = { x: p.x + dx, y: p.y + dy }; });
      useBoard.getState().updateMany(patches);
    },
    onDragEnd: () => { dragStart.current = new Map(); },
  });

  // ── stage interactions (drawing, shapes, placing, erasing, marquee, pan) ──
  const onStageDown = (e: KonvaEventObject<PointerEvent>) => {
    const ev = e.evt;
    const s = useBoard.getState();
    const onEmpty = e.target === e.target.getStage();
    const pan = ev.button === 1 || s.tool === 'hand' || spaceDown.current;
    if (ev.button !== 0 && !pan) return;
    if (s.editing) { s.setEditing(undefined); return; }
    if (s.tool === 'select' && !onEmpty && !pan) return; // item handlers take over

    const p0 = toWorld(ev.clientX, ev.clientY);
    let onMove: (p: Pt, ev: PointerEvent) => void = () => {};
    let onUp: () => void = () => {};

    if (pan) {
      const c0 = s.camera, sx = ev.clientX, sy = ev.clientY;
      setPanning(true);
      onMove = (_p, mv) => s.set({ camera: { ...c0, x: Math.round(c0.x + mv.clientX - sx), y: Math.round(c0.y + mv.clientY - sy) } });
      onUp = () => setPanning(false);
    } else if (s.tool === 'select') {
      if (!ev.shiftKey) s.select([]);
      const base = ev.shiftKey ? s.selected : [];
      onMove = (p) => {
        const box = { x: Math.min(p0.x, p.x), y: Math.min(p0.y, p.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) };
        setMarquee(box);
        const hit = useBoard.getState().items.filter((it) => intersects(box, bbox(it))).map((it) => it.id);
        useBoard.getState().select([...new Set([...base, ...hit])]);
      };
      onUp = () => setMarquee(undefined);
    } else if (s.tool === 'pen' || s.tool === 'highlighter') {
      const grid = s.pixelSnap ? s.size : 0;
      const q = (v: number) => (grid ? snap(v, grid) : Math.round(v));
      const x0 = q(p0.x), y0 = q(p0.y);
      const size = s.tool === 'highlighter' ? s.size * 3 : s.size;
      const id = s.add({ kind: 'stroke', tool: s.tool, x: x0, y: y0, points: [0, 0], color: s.color, size, pixel: s.pixelSnap });
      let pts = [0, 0];
      onMove = (p) => {
        const next = appendPoint(pts, q(p.x) - x0, q(p.y) - y0, grid || 2 / useBoard.getState().camera.zoom);
        if (next !== pts) { pts = next; useBoard.getState().update(id, { points: pts }); }
      };
    } else if (s.tool === 'eraser') {
      s.checkpoint();
      let erased = false;
      let last = p0;
      // sweep from the previous pointer position so fast swipes don't skip thin strokes
      const erase = (p: Pt) => {
        const st = useBoard.getState();
        const r = 8 / st.camera.zoom;
        const steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / r));
        const samples = Array.from({ length: steps + 1 }, (_, i) => ({ x: last.x + ((p.x - last.x) * i) / steps, y: last.y + ((p.y - last.y) * i) / steps }));
        last = p;
        const hit = st.items.filter((it) => it.kind === 'stroke' && samples.some((q) => hitStroke(it, q, r))).map((it) => it.id);
        if (hit.length) { erased = true; silentRemove(hit); }
      };
      erase(p0);
      onMove = (p) => erase(p);
      onUp = () => { if (!erased) useBoard.getState().discardCheckpoint(); };
    } else if (s.tool === 'rect' || s.tool === 'ellipse' || s.tool === 'arrow') {
      s.checkpoint();
      const shape = s.tool;
      const id = s.add({ kind: 'shape', shape, x: Math.round(p0.x), y: Math.round(p0.y), w: 0, h: 0, stroke: s.color, size: s.size, fill: s.fill && shape !== 'arrow' ? s.color : undefined }, { record: false });
      onMove = (p, mv) => {
        let w = Math.round(p.x - p0.x), h = Math.round(p.y - p0.y);
        if (mv.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
        useBoard.getState().update(id, { w, h });
      };
      onUp = () => {
        const st = useBoard.getState();
        const it = st.items.find((i) => i.id === id);
        if (!it || it.kind !== 'shape') return;
        if (Math.abs(it.w) < 4 && Math.abs(it.h) < 4) { silentRemove([id]); st.discardCheckpoint(); return; }
        if (it.shape !== 'arrow') st.update(id, { x: Math.min(it.x, it.x + it.w), y: Math.min(it.y, it.y + it.h), w: Math.abs(it.w), h: Math.abs(it.h) });
      };
    } else if (s.tool === 'text') {
      const id = s.add({ kind: 'text', x: Math.round(p0.x), y: Math.round(p0.y - s.textSize / 2), text: '', size: s.textSize, color: s.color });
      editSoon(id);
      return;
    } else if (s.tool === 'note') {
      const color = NOTE_COLORS[s.items.filter((i) => i.kind === 'note').length % NOTE_COLORS.length];
      const id = s.add({ kind: 'note', x: Math.round(p0.x - 20), y: Math.round(p0.y - 20), w: 200, h: 180, text: '', color, rot: 0 }, { select: true });
      s.setTool('select');
      s.select([id]);
      editSoon(id);
      return;
    } else if (s.tool === 'pin') {
      const p = { x: Math.round(p0.x), y: Math.round(p0.y) };
      s.add({ kind: 'pin', ...p, holds: itemsUnder(s.items, p) });
      return;
    } else if (s.tool === 'sticker') {
      if (!s.stickerSprite) return;
      const base = { sprite: s.stickerSprite, pixelate: 0, outline: true };
      void stickerSize(base).then(({ w, h }) => {
        useBoard.getState().add({ kind: 'sticker', ...base, x: Math.round(p0.x - w / 2), y: Math.round(p0.y - h / 2), w, h, rot: 0 });
      });
      return;
    }

    const move = (mv: PointerEvent) => onMove(toWorld(mv.clientX, mv.clientY), mv);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onUp();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // ── wheel zoom (accumulated so trackpads don't skip steps) ──
  const wheelAcc = useRef(0);
  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    wheelAcc.current += e.evt.deltaY;
    if (Math.abs(wheelAcc.current) < 40) return;
    const dir = wheelAcc.current < 0 ? 1 : -1;
    wheelAcc.current = 0;
    const s = useBoard.getState();
    const r = wrapRef.current!.getBoundingClientRect();
    s.set({ camera: zoomAt(s.camera, stepZoom(s.camera.zoom, dir), { x: e.evt.clientX - r.left, y: e.evt.clientY - r.top }) });
  };

  // ── keyboard shortcuts, paste ──
  useEffect(() => {
    const keys: Record<string, Tool> = { v: 'select', h: 'hand', p: 'pen', m: 'highlighter', e: 'eraser', r: 'rect', o: 'ellipse', a: 'arrow', t: 'text', n: 'note', i: 'sticker', k: 'pin' };
    const onDown = (e: KeyboardEvent) => {
      if (typingTarget(e.target)) return;
      const s = useBoard.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === ' ') { spaceDown.current = true; if (e.target === document.body) e.preventDefault(); return; }
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); s.redo(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); s.duplicate(s.selected); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); s.setTool('select'); s.select(s.items.map((i) => i.id)); return; }
      if (mod) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { s.remove(s.selected); return; }
      if (e.key === 'Escape') { s.select([]); return; }
      if (e.key === 'Enter' && s.selected.length === 1) {
        const it = s.items.find((i) => i.id === s.selected[0]);
        if (it && (it.kind === 'text' || it.kind === 'note')) { e.preventDefault(); s.setEditing(it.id); }
        return;
      }
      const tool = keys[e.key.toLowerCase()];
      if (tool && s.toolbar) s.setTool(tool);
    };
    const onUp = (e: KeyboardEvent) => { if (e.key === ' ') spaceDown.current = false; };
    const onPaste = (e: ClipboardEvent) => {
      if (typingTarget(e.target)) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) { e.preventDefault(); void addImageFile(file); }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('paste', onPaste);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('paste', onPaste); };
  }, [addImageFile]);

  const onDrop = (e: React.DragEvent) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    const p = toWorld(e.clientX, e.clientY);
    files.forEach((f, i) => void addImageFile(f, { x: p.x + i * 24, y: p.y + i * 24 }));
  };

  const outlined = items.filter((it) => selected.includes(it.id) && !TRANSFORMABLE.has(it.kind));
  const editingItem = editing ? items.find((i) => i.id === editing) : undefined;

  return (
    <div
      ref={wrapRef}
      className="board"
      style={{ cursor: panning ? 'grabbing' : CURSOR[tool] }}
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDrop={onDrop}
    >
      {size.w > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          x={camera.x}
          y={camera.y}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
          onPointerDown={onStageDown}
          onWheel={onWheel}
        >
          <Layer ref={layerRef} listening={tool === 'select'}>
            {items.map((it) => <ItemNode key={it.id} item={it} bind={bind(it)} editing={editing === it.id} />)}
          </Layer>
          <Layer>
            {outlined.map((it) => {
              const b = bbox(it);
              return <Rect key={it.id} x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} stroke={ACCENT} strokeWidth={2 / camera.zoom} dash={[6 / camera.zoom, 4 / camera.zoom]} listening={false} />;
            })}
            {marquee && <Rect {...{ x: marquee.x, y: marquee.y, width: marquee.w, height: marquee.h }} fill="rgba(63,208,255,0.12)" stroke={ACCENT} strokeWidth={1 / camera.zoom} dash={[4 / camera.zoom, 4 / camera.zoom]} listening={false} />}
            <Transformer
              ref={trRef}
              rotateAnchorOffset={24}
              anchorSize={10}
              anchorCornerRadius={0}
              anchorStroke="#0d0b1e"
              anchorFill="#f4efe6"
              borderStroke={ACCENT}
              borderStrokeWidth={2}
              borderDash={[6, 4]}
              flipEnabled={false}
              ignoreStroke
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 16 || Math.abs(newBox.height) < 16 ? oldBox : newBox)}
              onTransformStart={() => useBoard.getState().checkpoint()}
              onTransformEnd={onTransformEnd}
            />
          </Layer>
        </Stage>
      )}
      {editingItem && (editingItem.kind === 'text' || editingItem.kind === 'note') && (
        <TextEditor key={editingItem.id} item={editingItem} camera={camera} />
      )}
    </div>
  );
}
