import { useEffect, useState, type CSSProperties } from 'react';
import atlas from '../../public/assets/sprites/atlas.json';

export type SpriteName = keyof typeof atlas.sprites;
type FrameKey = keyof typeof atlas.frames;

interface Props {
  name: SpriteName;
  /** art-pixel multiplier on top of --px (default 1) */
  scale?: number;
  /** fixed CSS px per art pixel, ignoring --px (for small inline icons next to text) */
  px?: number;
  /** play the animation if the sprite has several frames */
  animate?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export const spriteUrl = (key: string) => `/assets/sprites/${key}.png`;

/** A sprite from the generated atlas, rendered at an integer multiple of --px. */
export function Sprite({ name, scale = 1, px, animate = true, label, className, style }: Props) {
  const def = atlas.sprites[name];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate || def.frames.length < 2 || !def.fps) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % def.frames.length), 1000 / def.fps);
    return () => clearInterval(id);
  }, [animate, def]);

  const key = def.frames[frame] as FrameKey;
  const { w, h } = atlas.frames[key];
  return (
    <img
      src={spriteUrl(key)}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={className}
      style={px
        ? { width: w * px, height: h * px, ...style }
        : { width: `calc(var(--px) * ${w * scale})`, height: `calc(var(--px) * ${h * scale})`, ...style }}
    />
  );
}
