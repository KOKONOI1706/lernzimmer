// Text-to-speech via the browser (Web Speech API). German voices vary by OS; we pick the best available.

let cached: SpeechSynthesisVoice | null | undefined;

function germanVoice(): SpeechSynthesisVoice | null {
  if (cached !== undefined) return cached;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null; // not loaded yet, try again next time
  const de = voices.filter((v) => v.lang.toLowerCase().startsWith('de'));
  // prefer natural/online voices, then de-DE
  cached = de.find((v) => /natural|online|google/i.test(v.name)) ?? de.find((v) => v.lang === 'de-DE') ?? de[0] ?? null;
  return cached;
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** `queue: true` plays after whatever is currently speaking instead of interrupting it. */
export function speak(text: string, { rate = 0.9, lang = 'de-DE', queue = false } = {}) {
  if (!canSpeak()) return;
  if (!queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const v = lang.startsWith('de') ? germanVoice() : null;
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

if (canSpeak()) speechSynthesis.addEventListener?.('voiceschanged', () => { cached = undefined; });
