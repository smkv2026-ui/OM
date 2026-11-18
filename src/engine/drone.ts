import { getAudioContext } from './audioContext';

/** "Harmonic Drone" — sine 108 Hz + triangle 54 Hz → lowpass → gain (prototype formulas). */
export class Drone {
  private ctx: AudioContext | null = null;
  private main!: OscillatorNode;
  private sub!: OscillatorNode;
  private filter!: BiquadFilterNode;
  private gain!: GainNode;
  enabled = false;

  private init() {
    if (this.ctx) return;
    const ctx = getAudioContext();
    this.ctx = ctx;
    this.main = ctx.createOscillator();
    this.sub = ctx.createOscillator();
    this.filter = ctx.createBiquadFilter();
    this.gain = ctx.createGain();
    this.main.type = 'sine';
    this.sub.type = 'triangle';
    this.main.frequency.setValueAtTime(108, ctx.currentTime);
    this.sub.frequency.setValueAtTime(54, ctx.currentTime);
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(200, ctx.currentTime);
    this.gain.gain.setValueAtTime(0, ctx.currentTime);
    this.main.connect(this.filter);
    this.sub.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(ctx.destination);
    this.main.start();
    this.sub.start();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.init();
      if (this.ctx!.state === 'suspended') void this.ctx!.resume();
      this.gain.gain.setTargetAtTime(0.1, this.ctx!.currentTime, 0.2);
    } else if (this.ctx) {
      this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  update(alignment: number, freq: number) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.gain.gain.setTargetAtTime(0.05 + alignment * 0.25, t, 0.1);
    this.filter.frequency.setTargetAtTime(150 + alignment * 800 + freq * 10, t, 0.1);
    this.main.frequency.setTargetAtTime(108 + alignment * 12, t, 0.1);
  }

  dispose() {
    if (!this.ctx) return;
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    const { main, sub, gain } = this;
    setTimeout(() => {
      try {
        main.stop();
        sub.stop();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    }, 300);
    this.ctx = null;
    this.enabled = false;
  }
}
