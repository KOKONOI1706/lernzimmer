import { useEffect, useState } from 'react';
import { Arrow, Ellipse, Group, Line, Rect, Shape, Text } from 'react-konva';
import type Konva from 'konva';
import type { BoardItem, NoteItem, PinItem, ShapeItem, StickerItem, StrokeItem, TextItem } from './types';
import { smoothFor, stickerCanvas } from './stickers';
import { PIN_SIZE, PIN_TIP } from './geometry';

/** Props every item node receives from the Board (position, drag, selection handlers). */
export type Bind = Partial<Konva.NodeConfig> & Record<string, unknown>;

const INK = '#0d0b1e';
const HARD_SHADOW = { shadowColor: 'rgba(13,11,30,0.85)', shadowBlur: 0, shadowOffsetX: 4, shadowOffsetY: 4 } as const;
export const FONT = 'VT323';

function StrokeNode({ item, bind }: { item: StrokeItem; bind: Bind }) {
  const hl = item.tool === 'highlighter';
  return (
    <Line
      {...bind}
      points={item.points.length === 2 ? [...item.points, item.points[0] + 0.01, item.points[1]] : item.points}
      stroke={item.color}
      strokeWidth={item.size}
      opacity={hl ? 0.4 : 1}
      lineCap={item.pixel ? 'square' : 'round'}
      lineJoin={item.pixel ? 'miter' : 'round'}
      hitStrokeWidth={Math.max(item.size, 14)}
      perfectDrawEnabled={false}
    />
  );
}

function ShapeNode({ item, bind }: { item: ShapeItem; bind: Bind }) {
  const common = { stroke: item.stroke, strokeWidth: item.size, fill: item.fill, perfectDrawEnabled: false };
  return (
    <Group {...bind}>
      {item.shape === 'rect' && <Rect width={item.w} height={item.h} {...common} />}
      {item.shape === 'ellipse' && <Ellipse x={item.w / 2} y={item.h / 2} radiusX={Math.abs(item.w / 2)} radiusY={Math.abs(item.h / 2)} {...common} />}
      {item.shape === 'arrow' && (
        <Arrow points={[0, 0, item.w, item.h]} stroke={item.stroke} fill={item.stroke} strokeWidth={item.size}
          pointerLength={item.size * 3 + 6} pointerWidth={item.size * 3 + 6} hitStrokeWidth={Math.max(14, item.size)} lineCap="square" />
      )}
    </Group>
  );
}

function TextNode({ item, bind, editing }: { item: TextItem; bind: Bind; editing: boolean }) {
  return (
    <Text {...bind} text={item.text || ' '} fontFamily={FONT} fontSize={item.size} fill={item.color}
      width={item.w} lineHeight={1} visible={!editing} />
  );
}

function NoteNode({ item, bind, editing }: { item: NoteItem; bind: Bind; editing: boolean }) {
  return (
    <Group {...bind}>
      <Rect width={item.w} height={item.h} fill={item.color} stroke={INK} strokeWidth={2} {...HARD_SHADOW} />
      {/* washi tape */}
      <Rect x={item.w / 2 - 28} y={-10} width={56} height={18} fill="rgba(255,255,255,0.6)" stroke="rgba(13,11,30,0.25)" strokeWidth={1} rotation={-3} />
      {!editing && (
        <Text x={12} y={16} width={item.w - 24} height={item.h - 28} text={item.text} fontFamily={FONT} fontSize={24}
          lineHeight={1.05} fill={INK} ellipsis wrap="word" />
      )}
    </Group>
  );
}

/** Draws a canvas with per-sticker smoothing (Konva.Image only has a per-layer switch). */
function CanvasShape({ source, w, h, smooth, bind }: { source?: HTMLCanvasElement; w: number; h: number; smooth: boolean; bind?: Bind }) {
  return (
    <Shape
      {...bind}
      width={w}
      height={h}
      sceneFunc={(ctx, shape) => {
        if (!source) {
          ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.closePath();
          ctx.setAttr('strokeStyle', 'rgba(139,138,163,0.8)');
          ctx.setAttr('lineWidth', 2);
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          return;
        }
        const native = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
        native.imageSmoothingEnabled = smooth;
        native.drawImage(source, 0, 0, w, h);
        void shape;
      }}
      hitFunc={(ctx, shape) => { ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.closePath(); ctx.fillStrokeShape(shape); }}
    />
  );
}

function useStickerCanvas(item: Pick<StickerItem, 'blobId' | 'sprite' | 'pixelate' | 'outline'>) {
  const [c, setC] = useState<HTMLCanvasElement>();
  const { blobId, sprite, pixelate, outline } = item;
  useEffect(() => {
    let alive = true;
    stickerCanvas({ blobId, sprite, pixelate, outline }).then((cv) => alive && setC(cv)).catch((e) => console.warn('[board] sticker failed', e));
    return () => { alive = false; };
  }, [blobId, sprite, pixelate, outline]);
  return c;
}

function StickerNode({ item, bind }: { item: StickerItem; bind: Bind }) {
  const c = useStickerCanvas(item);
  return <CanvasShape bind={bind} source={c} w={item.w} h={item.h} smooth={smoothFor(item)} />;
}

function PinNode({ bind }: { item: PinItem; bind: Bind }) {
  const c = useStickerCanvas({ sprite: 'pin', pixelate: 0, outline: false });
  return (
    <Group {...bind}>
      <CanvasShape source={c} w={PIN_SIZE} h={PIN_SIZE} smooth={false} bind={{ x: -PIN_TIP.x, y: -PIN_TIP.y }} />
    </Group>
  );
}

export function ItemNode({ item, bind, editing }: { item: BoardItem; bind: Bind; editing: boolean }) {
  switch (item.kind) {
    case 'stroke': return <StrokeNode item={item} bind={bind} />;
    case 'shape': return <ShapeNode item={item} bind={bind} />;
    case 'text': return <TextNode item={item} bind={bind} editing={editing} />;
    case 'note': return <NoteNode item={item} bind={bind} editing={editing} />;
    case 'sticker': return <StickerNode item={item} bind={bind} />;
    case 'pin': return <PinNode item={item} bind={bind} />;
  }
}
