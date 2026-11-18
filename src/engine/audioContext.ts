/** One shared AudioContext for the whole app (drone, chant tones, sequencer). */
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/** Call from inside a user gesture: creates/resumes the context (iOS Safari, Chrome autoplay policy). */
export function unlockAudio() {
  try {
    const c = getAudioContext();
    if (c.state === 'suspended') void c.resume();
    // iOS needs a (silent) buffer started within the gesture to fully unlock output.
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* audio unsupported — the app stays usable silently */
  }
}

/** A soft bell-like tone (used when a petal has no recorded audio). */
export function playTone(freq: number, dur = 0.45, gain = 0.12) {
  const c = getAudioContext();
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.01;
  const g2 = c.createGain();
  g2.gain.value = 0.25;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}
