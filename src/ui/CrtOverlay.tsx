import { useSettings } from '../state/settings';

/**
 * Retro CRT monitor screen effect:
 * Scanlines, phosphor glow, subtle screen curvature vignette, and glass glare.
 * Inspired directly by vintage arcade monitors & cyberpunk terminals.
 */
export function CrtOverlay() {
  const crt = useSettings((s) => s.crt);
  if (!crt) return null;

  return (
    <div className="crt-container" aria-hidden="true">
      <div className="crt-scanlines" />
      <div className="crt-vignette" />
      <div className="crt-flicker" />
      <div className="crt-bezel-glare" />
    </div>
  );
}
