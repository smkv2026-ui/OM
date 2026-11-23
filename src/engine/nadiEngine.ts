/**
 * Nadi Harmony canvas engine — a typed, framework-free port of the prototype's
 * animate() loop, rebuilt for DPR-crisp rendering, live theming and resize-safe state.
 *
 * Coordinates: the figure frame from figures/geometry.ts. A layout unit U = 300·s px
 * (s ≤ ~1.15, smaller on phones). Ideal sensor spot = (cx, cy + targetYRatio·U), exactly the
 * prototype's `centerY + ratio × 300` at s = 1. Sensor positions are stored as ratios of U
 * relative to the centre, so they survive resize and rotation.
 */
import { CHAKRAS, NADIS } from '../data';
import { braidPoints, CROSSINGS, FRONT_ARM_GAPS, FRONT_EARRINGS, FRONT_LINEART, FRONT_OUTLINE } from '../figures/geometry';
import { EYE_PATCHES, openEyes, TORSO, TORSO_MASK, type PoseFigure } from '../figures/pose';
import { Drone } from './drone';
import { SENSOR_SETS, targetAlignment, type SensorConf, type SensorCount } from './sensors';

export type Silhouette = 'default' | 'dharana';
export type Channel = 'ida' | 'pingala' | 'sushumna';

interface EngineTheme {
  dark: boolean;
  bodyTop: string;
  bodyBottom: string;
  bodyRim: string;
  bodyDetail: string;
  bodyLine: string;
  poseTop: string;
  poseBottom: string;
  poseRim: string;
  poseAlpha: number;
  sushumna: string;
  text: string;
}

const NUM_PARTICLES = 160;
const NUM_NADIS = 50;
const SENSOR_R = 26;

class Particle {
  x = 0;
  y = 0;
  speedY = 0;
  radius = 0;
  alpha = 0;
  seed = 0;
  reset(e: NadiEngine) {
    const s = e.s;
    this.y = e.cy + (220 - Math.random() * 440) * s;
    this.x = e.cx + (Math.random() - 0.5) * 350 * s;
    this.speedY = 0.5 + Math.random() * 1.5;
    this.radius = 1 + Math.random() * 2;
    this.alpha = 0.1 + Math.random() * 0.5;
    this.seed = Math.random() * 100;
  }
  update(e: NadiEngine, a: number, freq: number, dt: number) {
    const s = e.s;
    const speedMult = 1 + freq / 30;
    this.y -= this.speedY * speedMult * (0.5 + a * 1.5) * s * dt;
    const targetX = e.cx + Math.sin((this.y / s) * 0.02 + this.seed) * (15 * (1 - a)) * s;
    this.x += (targetX - this.x) * Math.min(1, (0.02 + a * 0.08) * dt);
    if (this.y < e.cy - 220 * s) {
      this.reset(e);
      this.y = e.cy + 220 * s;
    }
  }
}

class Nadi {
  phase = Math.random() * Math.PI * 2;
  speed = 0.008 + Math.random() * 0.015;
  amplitude = 60 + Math.random() * 120;
  frequencyMod = 0.5 + Math.random() * 1.5;
}

export class NadiEngine {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  dpr = 1;
  w = 0;
  h = 0;
  cx = 0;
  cy = 0;
  /** scale: U = 300·s */
  s = 1;
  insets = { top: 0, bottom: 0, right: 0 };

  sensorCount: SensorCount = 3;
  set: SensorConf[] = SENSOR_SETS[3];
  /** normalized: px = cx + rx·U */
  placed = new Map<string, { rx: number; ry: number }>();
  freqs: Record<string, number> = {};
  alignment = 0;
  silhouette: Silhouette = 'default';
  reduce = false;
  /** visible anatomy layers (Ida / Pingala / Sushumna / chakras / spine) */
  layers = { chakras: true, sushumna: true, ida: true, pingala: true, spine: false };
  marker = { active: false, y: 0, target: 0 };
  /** Chakras currently vibrating on the sensor device: drawn as rings rippling at their frequency. */
  devicePulses: { ratio: number; color: string; freq: number; intensity: number }[] = [];
  /** How chakras are drawn: the prototype's dots, or flat lotus rings that rotate. */
  chakraStyle: 'dots' | 'ring' | 'simple' = 'dots';
  /** ring state: rotation angle per chakra; while the marker travels, chakras it has reached are lit
   *  and turn clockwise (+1, ascending) or anticlockwise (−1, descending). */
  private ringAngle = new Map<string, number>();
  private ringLit = new Map<string, 1 | -1>();
  private ringLevel = new Map<string, number>();
  private travelDir: 1 | -1 = 1;
  private lastTarget = 0;
  private wasMarker = false;
  readonly drone = new Drone();
  onFrame?: (alignment: number, avgFreq: number) => void;
  onLayout?: () => void;

  private particles: Particle[] = [];
  private nadis: Nadi[] = [];
  private theme!: EngineTheme;
  private body = new Path2D(`${FRONT_OUTLINE} ${FRONT_ARM_GAPS.join(' ')}`);
  private lineArt = new Path2D(FRONT_LINEART);
  private earrings = new Path2D(FRONT_EARRINGS);
  /** meditation pose chosen in Settings; traced = the reference figure */
  private pose: PoseFigure | null = null;
  private poseCache: { img: { fill: HTMLCanvasElement; lines: HTMLCanvasElement }; key: string } | null = null;
  private raf = 0;
  private last = 0;
  private time = 0;
  private braid: { ida: [number, number][]; pingala: [number, number][] } = { ida: [], pingala: [] };
  private ro: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setCount(3);
    this.readTheme();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement!);
    addEventListener('om-theme', this.readTheme);
  }

  /* ------------------------------------------------------------------ state */

  setPose(pose: PoseFigure) {
    this.pose = pose;
    this.poseCache = null;
  }

  /**
   * Composite the non-default pose once: an opaque fill (drawn later with one alpha so overlaps
   * don't darken) and a line layer where each part first erases what it hides, then draws its outline.
   */
  private poseImage(): { fill: HTMLCanvasElement; lines: HTMLCanvasElement } | null {
    const fp = this.pose;
    if (!fp || fp.traced) return null;
    const k = this.s * this.dpr;
    const key = `${k}|${this.theme.bodyLine}`;
    if (this.poseCache?.key === key) return this.poseCache.img;
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(460 * k);
      c.height = Math.ceil(420 * k);
      const x = c.getContext('2d')!;
      x.setTransform(k, 0, 0, k, 230 * k, 220 * k);
      return { c, x };
    };
    const torso = new Path2D(`${FRONT_OUTLINE} ${FRONT_ARM_GAPS.join(' ')}`);
    const mask = new Path2D(TORSO_MASK);
    const eyes = new Path2D(`M-300 -300H300V300H-300Z ${EYE_PATCHES.join(' ')}`);
    const F = mk(), Ln = mk();
    const g = F.x.createLinearGradient(0, -200, 0, 185);
    g.addColorStop(0, this.theme.poseTop);
    g.addColorStop(1, this.theme.poseBottom);
    F.x.fillStyle = g;
    const L = Ln.x;
    L.strokeStyle = L.fillStyle = this.theme.bodyLine;
    L.lineJoin = 'round';
    L.lineCap = 'round';
    for (const p of fp.parts) {
      if (p.d === TORSO) {
        F.x.save();
        F.x.clip(mask);
        F.x.fill(torso, 'evenodd');
        F.x.restore();
        L.save();
        L.clip(mask);
        L.globalCompositeOperation = 'destination-out';
        L.fill(torso, 'evenodd');
        L.globalCompositeOperation = 'source-over';
        L.lineWidth = 1.05;
        L.stroke(torso);
        if (fp.eyes !== 'closed') L.clip(eyes, 'evenodd');
        L.fill(this.lineArt, 'evenodd');
        L.restore();
        continue;
      }
      if (p.d) {
        const path = new Path2D(p.d);
        F.x.fill(path);
        L.globalCompositeOperation = 'destination-out';
        L.fill(path);
        L.globalCompositeOperation = 'source-over';
        L.lineWidth = 1.05;
        L.stroke(path);
      }
      L.lineWidth = 0.85;
      p.lines?.forEach((d) => L.stroke(new Path2D(d)));
    }
    const img = { fill: F.c, lines: Ln.c };
    this.poseCache = { img, key };
    return img;
  }

  private drawPoseFront() {
    const { ctx, theme } = this;
    const fp = this.pose!;
    const img = this.poseImage()!;
    ctx.globalAlpha = theme.poseAlpha;
    ctx.drawImage(img.fill, -230, -220, 460, 420);
    ctx.globalAlpha = 1;
    ctx.drawImage(img.lines, -230, -220, 460, 420);
    ctx.fillStyle = '#d9a48c';
    ctx.fill(this.earrings, 'evenodd');
    this.drawPoseDetails(fp);
  }

  private drawPoseDetails(fp: PoseFigure) {
    const { ctx, theme } = this;
    ctx.strokeStyle = theme.bodyLine;
    ctx.fillStyle = theme.bodyLine;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (fp.eyes !== 'closed') {
      const e = openEyes(fp.eyes === 'up');
      ctx.lineWidth = 1;
      e.whites.forEach((d) => ctx.stroke(new Path2D(d)));
      e.irises.forEach((d) => ctx.fill(new Path2D(d)));
    }
  }

  setCount(n: SensorCount) {
    this.sensorCount = n;
    this.set = SENSOR_SETS[n];
    this.placed.clear();
    this.freqs = {};
    this.set.forEach((c) => (this.freqs[c.id] = 10));
    this.onLayout?.();
  }

  get unit() {
    return 300 * this.s;
  }

  ideal(c: SensorConf) {
    return { x: this.cx, y: this.cy + c.targetYRatio * this.unit };
  }

  sensorPos(id: string) {
    const p = this.placed.get(id);
    return p ? { x: this.cx + p.rx * this.unit, y: this.cy + p.ry * this.unit } : null;
  }

  placeSensor(id: string, x: number, y: number) {
    if (!this.set.find((c) => c.id === id)) return;
    const cx = Math.max(8, Math.min(this.w - 8, x));
    const cy = Math.max(8, Math.min(this.h - 8, y));
    this.placed.delete(id); // re-insert last (draw order like the prototype's filter+push)
    this.placed.set(id, { rx: (cx - this.cx) / this.unit, ry: (cy - this.cy) / this.unit });
    this.onLayout?.();
  }

  resetEnergy() {
    this.placed.clear();
    this.set.forEach((c) => (this.freqs[c.id] = 10));
    this.onLayout?.();
  }

  avgFrequency() {
    const v = Object.values(this.freqs);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 10;
  }

  readTheme = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    this.poseCache = null;
    this.theme = {
      dark: document.documentElement.dataset.theme !== 'light',
      bodyTop: v('--body-top'),
      bodyBottom: v('--body-bottom'),
      bodyRim: v('--body-rim'),
      bodyDetail: v('--body-detail'),
      bodyLine: v('--body-line'),
      poseTop: v('--pose-skin-top'),
      poseBottom: v('--pose-skin-bottom'),
      poseRim: v('--pose-rim'),
      poseAlpha: parseFloat(v('--pose-alpha')) || 0.2,
      sushumna: v('--sushumna'),
      text: v('--text'),
    };
  };

  /* ------------------------------------------------------------------ layout */

  resize = () => {
    const parent = this.canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const oldParticles = this.particles.length === 0;
    this.w = w;
    this.h = h;
    const availH = h - this.insets.top - this.insets.bottom;
    const availW = w - this.insets.right;
    // Figure spans ~400 units tall (incl. crown glyph) and ~370 wide.
    this.s = Math.max(0.45, Math.min(1.6, (availH - 16) / 410, (availW - 12) / 380));
    this.cx = availW / 2;
    this.cy = this.insets.top + availH / 2 + 8 * this.s;
    if (oldParticles) {
      this.nadis = Array.from({ length: NUM_NADIS }, () => new Nadi());
      this.particles = Array.from({ length: NUM_PARTICLES }, () => {
        const p = new Particle();
        p.reset(this);
        return p;
      });
    } else {
      this.particles.forEach((p) => p.reset(this));
    }
    this.onLayout?.();
  };

  setInsets(i: Partial<NadiEngine['insets']>) {
    this.insets = { ...this.insets, ...i };
    this.resize();
  }

  /* ------------------------------------------------------------------ hit tests */

  channelAt(px: number, py: number): Channel | null {
    const ux = (px - this.cx) / this.s;
    const uy = (py - this.cy) / this.s;
    if (uy < -180 || uy > 165) return null;
    if ((this.layers.ida || this.layers.pingala) && uy > CROSSINGS[CROSSINGS.length - 1] && uy < CROSSINGS[0]) {
      for (const k of ['ida', 'pingala'] as const) {
        if (!this.layers[k]) continue;
        const pts = this.braid[k];
        let best = pts[0];
        for (const p of pts) if (Math.abs(p[1] - uy) < Math.abs(best[1] - uy)) best = p;
        if (best && Math.abs(best[0] - ux) < 9 && Math.abs(best[0]) > 4) return k;
      }
    }
    if (this.layers.sushumna && Math.abs(ux) < 8) return 'sushumna';
    return null;
  }

  /* ------------------------------------------------------------------ loop */

  start() {
    this.last = performance.now();
    const loop = (t: number) => {
      const dt = Math.max(0.25, Math.min(3, (t - this.last) / 16.667));
      this.last = t;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    removeEventListener('om-theme', this.readTheme);
    this.drone.dispose();
  }

  private frame(dt: number) {
    const { ctx } = this;
    const motion = this.reduce ? 0.12 : 1;
    this.time += dt * 16.667 * motion;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const freq = this.avgFrequency();
    const pts = new Map<string, { x: number; y: number }>();
    this.placed.forEach((_, id) => pts.set(id, this.sensorPos(id)!));
    const target = targetAlignment(this.set, pts, (c) => this.ideal(c), 85 * this.s);
    this.alignment += (target - this.alignment) * (1 - Math.pow(1 - 0.08, dt));
    const a = this.alignment;

    const onDharana = this.silhouette === 'dharana';
    if (onDharana) this.drawSensorCircles();
    this.drawSilhouette(a);

    const additive = this.theme.dark;
    ctx.save();
    if (additive) ctx.globalCompositeOperation = 'lighter';
    if (!this.reduce) {
      for (const p of this.particles) {
        p.update(this, a, freq, dt);
        this.drawParticle(p, a);
      }
    }
    for (const n of this.nadis) {
      n.phase += n.speed * (1 + freq * 0.02) * dt * motion;
      this.drawNadi(n, a, freq);
    }
    ctx.restore();

    if (this.layers.ida || this.layers.pingala) this.drawBraid(a);
    if (this.layers.sushumna) this.drawSushumna(a);
    this.drawUnifiedStream(a, freq);
    if (onDharana) this.drawSensorGlow(0.45);
    else {
      this.drawSensorCircles();
      this.drawSensorGlow(1);
    }
    this.drawDevicePulses();
    this.drawMarker(dt);
    this.drone.update(a, freq);
    this.onFrame?.(a, freq);
  }

  /* ------------------------------------------------------------------ drawing */

  private drawSilhouette(a: number) {
    const { ctx, s, theme } = this;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.scale(s, s);

    const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, 220);
    aura.addColorStop(0, `rgba(0, 243, 255, ${0.02 + a * 0.15})`);
    aura.addColorStop(0.7, `rgba(255, 42, 109, ${0.02 + (1 - a) * 0.05})`);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.fill();

    if (this.pose && !this.pose.traced) this.drawPoseFront();
    else {
    const g = ctx.createLinearGradient(0, -200, 0, 185);
    g.addColorStop(0, theme.bodyTop);
    g.addColorStop(1, theme.bodyBottom);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = g;
    ctx.fill(this.body, 'evenodd');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.bodyRim;
    ctx.lineWidth = 1;
    ctx.stroke(this.body);
    ctx.fillStyle = theme.bodyLine;
    if (this.pose && this.pose.eyes !== 'closed') {
      ctx.save();
      ctx.clip(new Path2D(`M-300 -300H300V300H-300Z ${EYE_PATCHES.join(' ')}`), 'evenodd');
      ctx.fill(this.lineArt, 'evenodd');
      ctx.restore();
    } else ctx.fill(this.lineArt, 'evenodd');
    ctx.fillStyle = '#d9a48c';
    ctx.fill(this.earrings, 'evenodd');
    if (this.pose) this.drawPoseDetails(this.pose);
    }

    if (this.layers.spine) this.drawSpine();
    if (this.layers.chakras && this.chakraStyle === 'ring') this.drawRings(a);
    else if (this.layers.chakras && (this.chakraStyle === 'simple' || this.silhouette === 'dharana')) this.drawDharanaGlyphs(a);

    // The prototype's seven chakra dots (cyan once aligned > 0.8).
    if (this.layers.chakras && this.chakraStyle === 'dots') CHAKRAS.forEach((c) => {
      const y = c.targetYRatio * 300;
      ctx.beginPath();
      ctx.arc(0, y, this.silhouette === 'dharana' ? 1.8 : 4, 0, Math.PI * 2);
      ctx.fillStyle = a > 0.8 ? 'rgba(0, 243, 255, 0.9)' : theme.dark ? 'rgba(255,255,255,0.25)' : 'rgba(60,40,20,0.25)';
      if (a > 0.8) {
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  }

  /** Flat lotus rings (figure units, inside the silhouette transform). */
  private drawRings(a: number) {
    const { ctx, theme } = this;
    const m = this.marker;
    const dt = 1 / 60;
    // track travel direction and light chakras as the marker reaches them
    if (m.active) {
      if (!this.wasMarker) {
        this.ringLit.clear();
        this.lastTarget = m.target;
      }
      if (m.target !== this.lastTarget) {
        this.travelDir = m.target < this.lastTarget ? 1 : -1; // smaller ratio = higher = ascending
        this.lastTarget = m.target;
      }
      for (const c of CHAKRAS) if (Math.abs(m.y - c.targetYRatio) < 0.025) this.ringLit.set(c.id, this.travelDir);
    } else if (this.wasMarker) this.ringLit.clear();
    this.wasMarker = m.active;

    for (const c of CHAKRAS) {
      const dir = this.ringLit.get(c.id);
      const want = m.active ? (dir ? 1 : 0.18) : 1;
      const lv = (this.ringLevel.get(c.id) ?? 1) + (want - (this.ringLevel.get(c.id) ?? 1)) * 0.08;
      this.ringLevel.set(c.id, lv);
      const ang = (this.ringAngle.get(c.id) ?? 0) + (m.active ? (dir ? dir * 1.6 * dt * (this.reduce ? 0.2 : 1) : 0) : (c.order % 2 ? 1 : -1) * 0.25 * dt * (this.reduce ? 0.2 : 1));
      this.ringAngle.set(c.id, ang);

      const y = c.targetYRatio * 300;
      const R = c.position.size / 2;
      const rainbow = !!c.color.rainbow;
      const col = rainbow ? '#c9a7ff' : c.color.primary;
      ctx.save();
      ctx.translate(0, y);
      // glow
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
      const ga = Math.round(Math.min(1, (0.25 + 0.35 * a) * lv) * 255).toString(16).padStart(2, '0');
      gr.addColorStop(0, col + ga);
      gr.addColorStop(1, col + '00');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.25 + 0.75 * lv;
      ctx.scale(0.6 + 0.4 * lv, 0.6 + 0.4 * lv);
      if (c.id === 'ajna') {
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(sx * R * 0.6, 0, R * 0.45, R * 0.22, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#f7f3e8';
          ctx.fill();
          ctx.strokeStyle = theme.dark ? '#f7f3e8' : c.color.ink;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      } else {
        const n = rainbow ? 24 : Math.min(c.petals.count, 16);
        ctx.rotate(ang);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          ctx.save();
          ctx.rotate(t);
          ctx.beginPath();
          ctx.ellipse(0, -R * 0.66, R * (rainbow ? 0.12 : Math.min(0.26, 1.6 / n)), R * 0.32, 0, 0, Math.PI * 2);
          ctx.fillStyle = rainbow ? `hsl(${(i / n) * 360} 90% 62% / .85)` : col + 'cc';
          ctx.fill();
          ctx.strokeStyle = theme.dark ? 'rgba(255,255,255,.35)' : c.color.ink;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.restore();
        }
      }
      // core
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = c.id === 'muladhara' ? '#f2c230' : rainbow ? '#ffffff' : col;
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Vertebral column on the axis (figure units, inside the silhouette transform). */
  private drawSpine() {
    const { ctx, theme } = this;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = theme.bodyDetail;
    for (let i = 0; i < 26; i++) {
      const y = -86 + (228 * i) / 25; // ends at Muladhara (y 145)
      const w = i < 7 ? 6 : i < 19 ? 7.5 : i < 24 ? 9.5 : 8 - (i - 24) * 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2, y - 2, w, 4, 1.8);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Chakra Dharana figure: golden Sushumna and a tattva glyph per centre. */
  private drawDharanaGlyphs(a: number) {
    const { ctx, theme } = this;
    ctx.save();
    ctx.strokeStyle = theme.sushumna;
    ctx.shadowColor = theme.sushumna;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, 145);
    ctx.lineTo(0, -176);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const glow = (y: number, col: string, r: number) => {
      const gr = ctx.createRadialGradient(0, y, 0, 0, y, r);
      gr.addColorStop(0, col + 'aa');
      gr.addColorStop(1, col + '00');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const c of CHAKRAS) {
      const y = c.targetYRatio * 300;
      const col = c.color.rainbow ? '#c9a7ff' : c.color.primary;
      glow(y, col, 16 + a * 8);
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = theme.dark ? col : c.color.ink;
      ctx.fillStyle = col;
      ctx.beginPath();
      switch (c.id) {
        case 'sahasrara':
          for (let i = 0; i < 9; i++) {
            const ang = (-170 + i * 20) * (Math.PI / 180);
            ctx.save();
            ctx.translate(0, y + 6);
            ctx.rotate(ang + Math.PI / 2);
            ctx.beginPath();
            ctx.ellipse(0, -11, 3.4, 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${i * 40 + this.time * 0.02} 90% 60%)`;
            ctx.fill();
            ctx.restore();
          }
          break;
        case 'ajna': {
          // a white eye between the brows
          ctx.fillStyle = '#fbf8ef';
          ctx.strokeStyle = c.color.ink;
          ctx.lineWidth = 1.1;
          ctx.moveTo(-12, y);
          ctx.quadraticCurveTo(0, y - 9, 12, y);
          ctx.quadraticCurveTo(0, y + 9, -12, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, y, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, y, 1.3, 0, Math.PI * 2);
          ctx.fillStyle = c.color.ink;
          ctx.fill();
          break;
        }
        case 'vishuddha':
          ctx.arc(0, y, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, y, 3.4, 0, Math.PI * 2);
          ctx.fillStyle = '#f4f1ff';
          ctx.fill();
          break;
        case 'anahata':
          for (const off of [0, 60]) {
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              const t = ((off + k * 120) * Math.PI) / 180;
              const px = 9 * Math.sin(t);
              const py = y - 9 * Math.cos(t);
              k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.closePath();
            ctx.globalAlpha = 0.35;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.stroke();
          }
          break;
        case 'manipura':
          // upward triangle of fire
          ctx.moveTo(0, y - 10);
          ctx.lineTo(8.7, y + 5);
          ctx.lineTo(-8.7, y + 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'svadhisthana':
          ctx.arc(0, y + 1, 8, 0, Math.PI);
          ctx.arc(0, y - 1.5, 7, Math.PI * 0.95, Math.PI * 0.05, true);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'muladhara':
          // lying flat, seen a little from above: earth-yellow square, triangle tip toward the viewer (as in KP 2D)
          ctx.save();
          ctx.translate(0, y);
          ctx.scale(0.5, 0.21);
          ctx.beginPath();
          ctx.rect(-20, -20, 40, 40);
          ctx.fillStyle = '#e1a95f';
          ctx.fill();
          ctx.lineWidth = 2.8;
          ctx.strokeStyle = '#ffd77a';
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-15, -9);
          ctx.lineTo(15, -9);
          ctx.lineTo(0, 18);
          ctx.closePath();
          ctx.fillStyle = '#d7263d';
          ctx.fill();
          ctx.restore();
          break;
      }
    }
    ctx.restore();
  }

  private drawParticle(p: Particle, a: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (p.radius + a) * Math.max(0.7, this.s), 0, Math.PI * 2);
    if (this.theme.dark) ctx.fillStyle = a > 0.6 ? `rgba(0, 243, 255, ${p.alpha})` : `rgba(255, 183, 3, ${p.alpha * 0.7})`;
    else ctx.fillStyle = a > 0.6 ? `rgba(14, 138, 163, ${p.alpha})` : `rgba(184, 120, 20, ${p.alpha * 0.7})`;
    ctx.fill();
  }

  private drawNadi(n: Nadi, a: number, freq: number) {
    const { ctx, s, cx, cy } = this;
    const startY = cy + 200 * s;
    const endY = cy - 200 * s;
    const steps = 40;
    const stepY = (startY - endY) / steps;
    ctx.beginPath();
    ctx.moveTo(cx, startY);
    const now = this.time;
    for (let i = 0; i <= steps; i++) {
      const y = startY - i * stepY;
      const progress = i / steps;
      const wave = Math.sin(n.phase + progress * Math.PI * 4 * n.frequencyMod);
      const chaos = wave * n.amplitude * s * Math.sin(progress * Math.PI) * (1 - a);
      const micro = a > 0.8 ? Math.sin(now * 0.01 + progress * 10) * (freq * 0.05) * s : 0;
      ctx.lineTo(cx + chaos + micro, y);
    }
    const hue = 350 - a * 160;
    const dark = this.theme.dark;
    const lightness = dark ? 50 + a * 25 : 42 + a * 8;
    const alpha = (dark ? 0.15 : 0.22) + a * 0.35 + Math.sin(n.phase) * 0.05;
    ctx.strokeStyle = `hsla(${hue}, 90%, ${lightness}%, ${alpha})`;
    ctx.lineWidth = (1 + a * 1.5 + freq * 0.01) * Math.max(0.75, s);
    if (a > 0.7) {
      ctx.shadowBlur = a * 12 + freq * 0.1;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    } else ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /** Ida (lunar, cool) and Pingala (solar, warm) braiding around Sushumna, crossing at each chakra. */
  private drawBraid(a: number) {
    const { ctx, s, theme } = this;
    const phase = this.time * 0.0012;
    this.braid.ida = braidPoints(-1, 16, 1, phase);
    this.braid.pingala = braidPoints(1, 16, 1, phase + 0.6);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const k of ['ida', 'pingala'] as const) {
      if (!this.layers[k]) continue;
      const nd = NADIS.find((n) => n.id === k)!;
      const col = theme.dark ? nd.color : nd.colorLight;
      const pts = this.braid[k];
      const path = new Path2D();
      pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      ctx.globalAlpha = 0.35 + a * 0.35;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.6 + a;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6 + a * 8;
      ctx.stroke(path);
      // flowing current (upward)
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.6 + a * 0.4;
      ctx.strokeStyle = theme.dark ? '#ffffff' : col;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 12]);
      ctx.lineDashOffset = this.time * 0.03 * (k === 'ida' ? 1 : 1.15);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    // crossing points glow in the chakra colours; Ajna is the meeting point
    if (this.layers.chakras) CHAKRAS.filter((c) => c.id !== 'sahasrara').forEach((c) => {
      const y = c.position.frontY;
      const meet = c.id === 'ajna';
      const r = (meet ? 12 : 8) + a * 6;
      const col = c.color.primary;
      const gr = ctx.createRadialGradient(0, y, 0, 0, y, r);
      const al = Math.round((0.35 + a * 0.5) * 255)
        .toString(16)
        .padStart(2, '0');
      gr.addColorStop(0, col + al);
      gr.addColorStop(1, col + '00');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  /** Sushumna — the hero channel, always present, brightest as alignment rises. */
  private drawSushumna(a: number) {
    const { ctx, s, theme } = this;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.sushumna;
    ctx.shadowColor = theme.sushumna;
    ctx.shadowBlur = 10 + a * 14;
    ctx.globalAlpha = 0.45 + a * 0.45;
    ctx.lineWidth = 2 + a * 2;
    ctx.beginPath();
    ctx.moveTo(0, 145);
    ctx.lineTo(0, -190);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5 + a * 0.5;
    ctx.strokeStyle = '#fff6dc';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([8, 16]);
    ctx.lineDashOffset = this.time * 0.05;
    ctx.stroke();
    ctx.restore();
  }

  private drawUnifiedStream(a: number, freq: number) {
    if (a <= 0.02) return;
    const { ctx, s, cx, cy } = this;
    const streamWidth = a * 12 * (1 + freq * 0.008) * Math.max(0.7, s);
    const cyan = this.theme.dark ? '0, 243, 255' : '14, 138, 163';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 150 * s);
    ctx.lineTo(cx, cy - 190 * s);
    ctx.lineWidth = streamWidth;
    ctx.strokeStyle = `rgba(${cyan}, ${a * 0.8})`;
    ctx.shadowColor = `rgb(${cyan})`;
    ctx.shadowBlur = 20 * a + freq * 0.2;
    ctx.stroke();
    if (a > 0.5) {
      ctx.lineWidth = streamWidth * 0.35;
      ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();
  }

  private pulse(id: string) {
    const f = this.freqs[id] || 10;
    return Math.sin(this.time * 0.006 * (f / 15)) * 4;
  }

  private drawSensorCircles() {
    const { ctx, theme } = this;
    const k = Math.max(0.8, this.s);
    for (const c of this.set) {
      const pos = this.sensorPos(c.id);
      if (!pos) continue;
      const rgb = c.rgb.join(',');
      const r = (SENSOR_R + this.pulse(c.id)) * k;
      const ideal = this.ideal(c);
      ctx.beginPath();
      ctx.arc(ideal.x, ideal.y, 20 * k, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb}, ${theme.dark ? 0.3 : 0.55})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.dark ? 'rgba(10, 10, 25, 0.6)' : 'rgba(255, 252, 245, 0.82)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.dark ? c.color : c.ink;
      ctx.stroke();

      ctx.fillStyle = theme.dark ? '#ffffff' : '#251e33';
      const label = this.sensorCount === 7 ? c.short : c.name;
      ctx.font = `600 ${label.length > 7 ? 9.5 : 11}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pos.x, pos.y);
    }
  }

  private drawSensorGlow(mult: number) {
    const { ctx } = this;
    const k = Math.max(0.8, this.s);
    for (const c of this.set) {
      const pos = this.sensorPos(c.id);
      if (!pos) continue;
      const rgb = c.rgb.join(',');
      const r = (SENSOR_R + this.pulse(c.id)) * k;
      const g = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, r * 1.8);
      g.addColorStop(0, `rgba(${rgb}, ${0.5 * mult})`);
      g.addColorStop(0.6, `rgba(${rgb}, ${0.15 * mult})`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  private drawDevicePulses() {
    const { ctx } = this;
    for (const p of this.devicePulses) {
      const x = this.cx;
      const y = this.cy + p.ratio * this.unit;
      const k = Math.max(0.8, this.s);
      // ring phase advances at a visible fraction of the vibration frequency
      const speed = 0.4 + p.freq / 60;
      for (let r = 0; r < 3; r++) {
        const ph = ((this.time / 1000) * speed + r / 3) % 1;
        ctx.beginPath();
        ctx.arc(x, y, (14 + ph * 34) * k, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = (1 - ph) * (0.35 + 0.6 * p.intensity);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Slow glowing diamond gliding to the sounding sensor (ratios, so it survives resize). */
  private drawMarker(dt: number) {
    const m = this.marker;
    if (!m.active) return;
    m.y += (m.target - m.y) * (1 - Math.pow(1 - 0.04, dt));
    this.drawGem(this.cx, this.cy + m.y * this.unit, 9 * Math.max(0.85, this.s));
  }

  /** A brilliant-cut diamond seen from the side: table, crown facets, girdle, pavilion, sparkle. */
  private drawGem(x: number, y: number, r: number) {
    const { ctx } = this;
    const tableHalf = r * 0.56;
    const top = y - r * 0.45;
    const girdle = y;
    const culet = y + r * 0.95;
    ctx.save();
    ctx.shadowColor = '#bfe9ff';
    ctx.shadowBlur = 16;
    // body
    const g = ctx.createLinearGradient(x - r, top, x + r, culet);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#dbefff');
    g.addColorStop(0.6, '#f7fbff');
    g.addColorStop(1, '#a9c6dd');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - tableHalf, top);
    ctx.lineTo(x + tableHalf, top);
    ctx.lineTo(x + r, girdle);
    ctx.lineTo(x, culet);
    ctx.lineTo(x - r, girdle);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // facet lines
    ctx.strokeStyle = 'rgba(120, 150, 180, 0.75)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - r, girdle);
    ctx.lineTo(x + r, girdle);
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
      ctx.moveTo(x + k * r * 0.95, girdle);
      ctx.lineTo(x + k * r * 0.25, culet - r * 0.25);
      ctx.lineTo(x, culet);
    }
    for (const k of [-1, 1]) {
      ctx.moveTo(x + k * tableHalf, top);
      ctx.lineTo(x + k * r * 0.5, girdle);
      ctx.lineTo(x + k * tableHalf * 0.2, top);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    // sparkle
    const tw = 0.5 + 0.5 * Math.sin(this.time * 0.008);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * tw;
    ctx.fillStyle = '#ffffff';
    const sx = x - r * 0.3;
    const sy = top + r * 0.18;
    const s = r * (0.35 + 0.35 * tw);
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.quadraticCurveTo(sx, sy, sx + s, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + s);
    ctx.quadraticCurveTo(sx, sy, sx - s, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - s);
    ctx.fill();
    ctx.restore();
  }
}
