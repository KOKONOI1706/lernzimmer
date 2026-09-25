import { layerById } from './layers';

interface Running { gain: GainNode; stop: () => void; stopTimer?: ReturnType<typeof setTimeout> }

const FADE = 0.4; // seconds

/**
 * Web Audio graph: layer → gain(layer) → master → destination.
 * Browsers only allow audio after a user gesture, so nothing happens until `unlock()`.
 */
class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private running = new Map<string, Running>();
  private recorded = new Map<string, Promise<AudioBuffer>>();
  onUnavailable?: (id: string) => void;

  get unlocked() { return !!this.ctx && this.ctx.state === 'running'; }

  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  setMaster(volume: number) {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  /** volume 0 = off. Starts/stops the layer's graph with a short fade. */
  setLayer(id: string, volume: number) {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    const cur = this.running.get(id);
    if (volume <= 0) {
      if (!cur || cur.stopTimer) return;
      cur.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
      cur.stopTimer = setTimeout(() => { cur.stop(); cur.gain.disconnect(); this.running.delete(id); }, FADE * 1000 + 100);
      return;
    }
    if (cur) {
      if (cur.stopTimer) { clearTimeout(cur.stopTimer); cur.stopTimer = undefined; }
      cur.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
      return;
    }
    const def = layerById(id);
    if (!def) return;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(master);
    g.gain.setTargetAtTime(volume, ctx.currentTime, FADE / 3);
    const entry: Running = { gain: g, stop: () => {} };
    this.running.set(id, entry);
    if (def.build) {
      entry.stop = def.build(ctx, g);
    } else if (def.url) {
      void this.load(def.url).then((buf) => {
        if (this.running.get(id) !== entry) return; // turned off while loading
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        src.connect(g);
        src.start(ctx.currentTime, Math.random() * buf.duration);
        entry.stop = () => { try { src.stop(); } catch { /* noop */ } src.disconnect(); };
      }).catch(() => {
        this.running.delete(id);
        g.disconnect();
        this.onUnavailable?.(id);
      });
    }
  }

  private load(url: string): Promise<AudioBuffer> {
    let p = this.recorded.get(url);
    if (!p) {
      p = fetch(url).then((r) => {
        if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('audio')) throw new Error(`missing ${url}`);
        return r.arrayBuffer();
      }).then((data) => this.ctx!.decodeAudioData(data));
      p.catch(() => this.recorded.delete(url));
      this.recorded.set(url, p);
    }
    return p;
  }

  /** Short synthesized chime (Pomodoro end, quiz feedback). */
  chime(kind: 'done' | 'ok' | 'no' = 'done') {
    const ctx = this.ctx, master = this.master;
    if (!ctx || !master) return;
    const notes = kind === 'done' ? [784, 988, 1175, 1568] : kind === 'ok' ? [880, 1319] : [330, 262];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * (kind === 'done' ? 0.16 : 0.1);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.4);
    });
  }
}

export const audio = new AudioEngine();
