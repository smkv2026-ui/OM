/**
 * Cancellable step sequencer — a typed port of the prototype's Dharana playback
 * (playAudioAndWait / wait(700) / stopDharanaPlayback), reused by Matrika and Chant.
 */
export class Sequencer {
  active = false;
  private audio: HTMLAudioElement | null = null;
  private pendingResolve: (() => void) | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private utter: SpeechSynthesisUtterance | null = null;

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.timeout = setTimeout(() => {
        this.pendingResolve = null;
        this.timeout = null;
        resolve();
      }, ms);
    });
  }

  playAudio(url: string): Promise<void> {
    return new Promise((resolve) => {
      const a = new Audio(url);
      this.audio = a;
      this.pendingResolve = resolve;
      const finish = () => {
        this.pendingResolve = null;
        this.audio = null;
        resolve();
      };
      a.addEventListener('ended', finish);
      a.addEventListener('error', finish);
      a.play().catch(finish);
    });
  }

  /** Speak a syllable with the Web Speech API (Hindi voice reads Devanagari), resolving when done. */
  speak(text: string, voice: SpeechSynthesisVoice | null, rate = 0.8): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !voice) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = rate;
      this.utter = u;
      this.pendingResolve = resolve;
      const finish = () => {
        this.pendingResolve = null;
        this.utter = null;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
      // Safety net: some engines never fire onend.
      this.timeout = setTimeout(finish, 2500);
    });
  }

  stop() {
    this.active = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    if (this.utter && 'speechSynthesis' in window) speechSynthesis.cancel();
    this.utter = null;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.pendingResolve) {
      const r = this.pendingResolve;
      this.pendingResolve = null;
      r();
    }
  }
}

/** Best Devanagari-capable voice, if the platform has one. */
export function devanagariVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  return (
    vs.find((v) => v.lang.toLowerCase().startsWith('sa')) ||
    vs.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
    vs.find((v) => v.lang.toLowerCase().startsWith('mr')) ||
    vs.find((v) => v.lang.toLowerCase().startsWith('ne')) ||
    null
  );
}
