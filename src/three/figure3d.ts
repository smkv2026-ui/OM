/**
 * Procedural 3D meditation figure: head with face (brows, closed or open eyes, nose, lips, chin,
 * ears), neck, torso with collarbones, chest and shoulders, tapered limbs, feet with toes and
 * fingered mudra hands, posed for the asana and mudra chosen in Settings.
 *
 * Figure units (the shared 2D frame: y down) with +z toward the viewer; S converts to world units.
 * Everything is merged into one geometry for the glass material.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sideFingers, SIDE_WRIST, type HandShape } from '../figures/hands';
import { asanaById, mudraById, type AsanaId, type LegState, type MudraId } from '../figures/pose';

export const S = 0.01;
type V = [number, number, number];
const vec = ([x, y, z]: V) => new THREE.Vector3(x * S, -y * S, z * S);

/* ------------------------------------------------------------------ primitives */

const lerpR = (r: number[], t: number) => {
  const f = t * (r.length - 1), i = Math.min(r.length - 2, Math.floor(f));
  return r[i] + (r[i + 1] - r[i]) * (f - i);
};

/** A tube through points whose radius varies along it, with rounded ends. */
function taper(pts: V[], radii: number[], seg = 28, radial = 14, caps: boolean | 'end' = true): THREE.BufferGeometry[] {
  const curve = new THREE.CatmullRomCurve3(pts.map(vec));
  const fr = curve.computeFrenetFrames(seg, false);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, P = curve.getPointAt(t), r = lerpR(radii, t) * S;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).add(fr.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(P.x + n.x * r, P.y + n.y * r, P.z + n.z * r);
      nor.push(n.x, n.y, n.z);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const out = [g];
  if (caps === true) out.push(ball(pts[0], radii[0], 10));
  if (caps) out.push(ball(pts[pts.length - 1], radii[radii.length - 1], 10));
  return out;
}

/** Ellipsoid at c with radii r, optionally oriented by a basis (x, y, z axes in figure units). */
function ball(c: V, r: number | V, detail = 16, basis?: [THREE.Vector3, THREE.Vector3, THREE.Vector3]): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, detail, Math.max(6, Math.round(detail * 0.7)));
  const R = typeof r === 'number' ? [r, r, r] : r;
  g.scale(R[0] * S, R[1] * S, R[2] * S);
  if (basis) g.applyMatrix4(new THREE.Matrix4().makeBasis(...basis));
  const p = vec(c);
  g.translate(p.x, p.y, p.z);
  return g;
}

/** World-space direction from figure-space direction. */
const dir = ([x, y, z]: V) => new THREE.Vector3(x, -y, z).normalize();

/* ------------------------------------------------------------------ head */

function head(eyes: 'closed' | 'open' | 'up'): THREE.BufferGeometry[] {
  const g = new THREE.SphereGeometry(1, 48, 36);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < -0.1) {
      const k = Math.min(1, (-y - 0.1) / 0.9);
      x *= 1 - 0.3 * k; // jaw narrows to the chin
      z *= 1 - 0.1 * k;
    }
    if (z > 0.62) z = 0.62 + (z - 0.62) * 0.55; // flatter face
    if (z < 0) z *= 1.1; // fuller back of the skull
    p.setXYZ(i, x * 0.3, y * 0.46, z * 0.37);
  }
  g.computeVertexNormals();
  const c = vec([0, -148, 4]);
  g.translate(c.x, c.y, c.z);
  const out: THREE.BufferGeometry[] = [g];
  // nose and nostril wings
  out.push(...taper([[0, -144, 34], [0, -134, 39], [0, -127, 41.5]], [2.4, 3.8, 4.4]));
  out.push(ball([-4.5, -126, 37], [3.6, 3, 3]), ball([4.5, -126, 37], [3.6, 3, 3]));
  for (const s of [-1, 1]) {
    // brow ridge
    out.push(...taper([[s * 22, -150, 29], [s * 14, -153, 33.5], [s * 5, -150.5, 35]], [1.3, 1.7, 1.2], 12, 8));
    // eyes: mound under the lid, then either a closed lid line or an open eye
    out.push(ball([s * 13.5, -142.5, 29.5], [6.5, 4, 3.4]));
    if (eyes === 'closed') out.push(...taper([[s * 20, -142, 31.5], [s * 13.5, -140, 34], [s * 7, -142, 34]], [0.9, 1.1, 0.9], 10, 8));
    else out.push(ball([s * 13.5, -142.5, 31.5], 4.6), ball([s * 13.5, eyes === 'up' ? -145 : -142.5, 35.6], 1.9));
    // ears
    out.push(ball([s * 29.5, -140, 2], [3.6, 11, 7.5]));
  }
  // lips and chin
  out.push(...taper([[-8, -118, 33.5], [0, -117.4, 36.2], [8, -118, 33.5]], [1.3, 2, 1.3], 12, 8));
  out.push(...taper([[-6, -114.4, 33.5], [0, -113.4, 35.4], [6, -114.4, 33.5]], [1.4, 2.3, 1.4], 12, 8));
  out.push(ball([0, -107.5, 29], [9, 5.5, 6]));
  return out;
}

/* ------------------------------------------------------------------ torso */

function torso(): THREE.BufferGeometry[] {
  const prof: [number, number][] = [
    [8, -98],
    [14, -88],
    [44, -80],
    [66, -68],
    [71, -44],
    [67, -12],
    [59, 22],
    [54, 52],
    [60, 92],
    [66, 128],
    [58, 158],
    [30, 176],
    [0, 182],
  ];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * S, -y * S)), 40);
  g.scale(1, 1, 0.56);
  g.translate(0, 0, 0.02);
  const out: THREE.BufferGeometry[] = [g];
  out.push(...taper([[0, -114, 0], [0, -100, 2], [0, -86, 2]], [12.5, 13, 16], 12, 16, false));
  for (const s of [-1, 1]) {
    out.push(...taper([[s * 6, -85, 18], [s * 32, -82, 21], [s * 58, -72, 8]], [2.4, 3, 2.6], 14, 8)); // collarbone
  }
  return out;
}

/* ------------------------------------------------------------------ legs + feet */

/** Foot lying with the sole up, heel → toes, with five toes. */
function foot(heel: V, toe: V, up: V = [0, -1, 0]): THREE.BufferGeometry[] {
  const out = taper([heel, [heel[0] * 0.55 + toe[0] * 0.45, heel[1] * 0.55 + toe[1] * 0.45, heel[2] * 0.55 + toe[2] * 0.45], toe], [8.5, 9.5, 10.5]);
  const d = new THREE.Vector3(toe[0] - heel[0], toe[1] - heel[1], toe[2] - heel[2]).normalize();
  const p = new THREE.Vector3().crossVectors(d, new THREE.Vector3(...up)).normalize();
  for (let k = -2; k <= 2; k++) {
    const r = k === 2 || k === -2 ? 2.6 : 3.2;
    const c: V = [toe[0] + d.x * 9 + p.x * k * 4.6, toe[1] + d.y * 9 + p.y * k * 4.6, toe[2] + d.z * 9 + p.z * k * 4.6];
    out.push(ball(c, r, 8));
  }
  return out;
}

function legs(state: LegState): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const thigh = (s: number, knee: V) => {
    out.push(...taper([[s * 40, 150, 0], [s * 96, 160, 46], knee], [23, 20, 16], 28, 14, 'end'));
  };
  if (state === 'vajra' || state === 'kneel') {
    for (const s of [-1, 1]) {
      out.push(...taper([[s * 32, 150, 0], [s * 32, 160, 60], [s * 30, 166, 112]], [23, 21, 16], 28, 14, 'end'));
      out.push(...taper([[s * 30, 182, 110], [s * 34, 186, 50], [s * 28, 186, -18]], [14, 15.5, 9.5]));
      out.push(...foot([s * 26, 186, -22], [s * 16, 184, -64], [0, 1, 0]));
    }
    return out;
  }
  const padmaFoot = (s: number) => {
    // shin of leg s crosses to rest its foot, sole up, on the opposite thigh
    out.push(...taper([[s * 150, 168, 96], [s * 96, 160, 110], [s * 34, 152, 106], [-s * 18, 142, 88]], [15, 16.5, 12, 9]));
    out.push(...foot([-s * 18, 142, 88], [-s * 82, 126, 76]));
  };
  if (state === 'padma' || state === 'padma-half') {
    thigh(-1, [-150, 168, 92]);
    thigh(1, [150, 168, 92]);
    padmaFoot(-1);
    padmaFoot(1);
  } else if (state === 'ardha' || state === 'ardha-tuck') {
    thigh(-1, [-148, 170, 92]);
    thigh(1, [150, 168, 92]);
    out.push(...taper([[-148, 172, 94], [-90, 182, 102], [-20, 184, 92], [38, 184, 72]], [15, 16.5, 12, 9]));
    out.push(...foot([38, 184, 72], [102, 180, 58]));
    padmaFoot(1);
  } else {
    // siddhasana: left heel at the perineum, right heel just above it, toes tucked in
    thigh(-1, [-144, 170, 90]);
    thigh(1, [144, 168, 90]);
    out.push(...taper([[-144, 172, 96], [-90, 178, 108], [-30, 179, 100], [0, 178, 86]], [15, 16.5, 12, 9]));
    out.push(...foot([0, 178, 86], [70, 172, 80], [0, -1, 0.4]));
    out.push(...taper([[144, 168, 96], [90, 166, 112], [30, 162, 108], [4, 160, 94]], [15, 16.5, 12, 9]));
    out.push(...foot([4, 160, 94], [-70, 152, 90], [0, -1, 0.4]));
  }
  return out;
}

/* ------------------------------------------------------------------ hands */

/** One hand from the 2D side-hand skeleton, placed with fingers along `u`, palm facing `n`. */
function sideHand3d(shape: HandShape, wrist: V, toward: V, palmUp: boolean, k = 0.22): THREE.BufferGeometry[] {
  const W = new THREE.Vector3(...wrist);
  const u = new THREE.Vector3(toward[0] - wrist[0], toward[1] - wrist[1], toward[2] - wrist[2]).normalize();
  const n0 = new THREE.Vector3(0, palmUp ? -1 : 1, 0);
  const n = n0.sub(u.clone().multiplyScalar(n0.dot(u))).normalize();
  let v = new THREE.Vector3().crossVectors(n, u).normalize();
  if (v.z < 0) v = v.negate(); // thumb side toward the viewer
  const at = (x: number, y: number, depth: number): V => {
    const q = W.clone()
      .add(u.clone().multiplyScalar((x - SIDE_WRIST[0]) * k))
      .add(n.clone().multiplyScalar(-(y - SIDE_WRIST[1]) * k))
      .add(v.clone().multiplyScalar(depth * k));
    return [q.x, q.y, q.z];
  };
  const out: THREE.BufferGeometry[] = [];
  const depth = { index: 16, middle: 0, ring: -16, little: -30, thumb: 30 } as const;
  for (const f of sideFingers(shape)) {
    const base = f.name === 'thumb' ? 0 : f.pts[0][1] - 18;
    const pts = f.pts.map(([x, y], i) => at(x, y - base, depth[f.name] * (f.name === 'thumb' ? 1 - (i / (f.pts.length - 1)) * 0.55 : 1)));
    out.push(...taper(pts, f.w.map((w) => (w / 2) * k), 16, 10));
  }
  // palm: a flattened ellipsoid along u, across v, thin along n
  const c = at(-48, 18, -6);
  const basis: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [dir([u.x, u.y, u.z]), dir([n.x, n.y, n.z]), dir([v.x, v.y, v.z])];
  // basis vectors are in figure space; convert to world (flip y)
  out.push(ball(c, [56 * k, 13 * k, 34 * k], 16, basis));
  return out;
}

function lapHands(shape: HandShape): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const touch = shape === 'dhyana';
  // left hand underneath, right hand resting in it, both palms up
  ([
    [-1, 124, 56],
    [1, 117, 60],
  ] as const).forEach(([s, y, z]) => {
    out.push(ball([s * 18, y, z], [24, 6, 17]));
    for (const dz of [-10, -3.5, 3, 9.5]) out.push(...taper([[s * 2, y + 1, z + dz], [-s * 20, y + 1.5, z + dz], [-s * 36, y + 1, z + dz]], [4.2, 3.9, 3.4], 10, 8));
    out.push(...taper(touch ? [[s * 30, y - 2, z + 12], [s * 16, y - 12, z + 16], [s * 2, y - 15, z + 16]] : [[s * 30, y - 2, z + 12], [s * 20, y - 5, z + 15], [s * 12, y - 6, z + 15]], [5, 4.4, 3.8], 12, 8));
  });
  return out;
}

function yoni3d(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    out.push(ball([s * 22, 98, 50], [17, 19, 6.5]));
    out.push(...taper([[s * 18, 110, 53], [s * 10, 124, 55], [s * 1.5, 134, 55]], [4.4, 4, 3.5], 12, 8)); // index, tips meet below
    out.push(...taper([[s * 26, 88, 54], [s * 14, 79, 57], [s * 2, 77, 57]], [5.4, 4.8, 4.2], 12, 8)); // thumb, tips meet above
  }
  // interlaced middle, ring and little fingers across the backs of the hands
  for (const [y, s] of [
    [92, 1],
    [98, -1],
    [104, 1],
  ] as const)
    out.push(...taper([[s * 24, y, 54], [0, y + 1, 58], [-s * 22, y + 2, 55]], [4, 4, 3.5], 12, 8));
  return out;
}

function anjali3d(joined: boolean): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const g = joined ? 4 : 14;
  for (const s of [-1, 1]) {
    out.push(ball([s * g, -42, 64], [4.2, 26, 14]));
    out.push(...taper([[s * (g + 3), -22, 72], [s * (g + 2), -34, 75]], [3.4, 3], 10, 8));
  }
  return out;
}

/* ------------------------------------------------------------------ arms + the whole figure */

export function buildFigure(asanaId: AsanaId, mudraId: MudraId): THREE.BufferGeometry {
  const asana = asanaById(asanaId), mudra = mudraById(mudraId);
  const legState = asana.steps[asana.steps.length - 1].legs;
  const palmUp = mudra.id !== 'jnana';
  const parts: THREE.BufferGeometry[] = [...head(mudra.eyes ?? 'closed'), ...torso(), ...legs(legState)];
  const vajra = legState === 'vajra';
  for (const s of [-1, 1]) {
    const sh: V = [s * 58, -66, 0];
    const arm = (a: V, elbow: V, b: V, wrist: V) => parts.push(...taper([sh, a, elbow, b, wrist], [15, 12.5, 10.5, 9.5, 7.5], 40, 14, 'end'));
    if (mudra.arms === 'knees') {
      if (vajra) {
        const wrist: V = [s * 40, 134, 78];
        arm([s * 86, -20, 0], [s * 88, 30, 10], [s * 66, 90, 56], wrist);
        parts.push(...sideHand3d(mudra.hand, wrist, [s * 34, 140, 130], palmUp));
      } else {
        const knee: V = [s * (legState === 'siddha' ? 144 : 150), 168, 92];
        const wrist: V = [s * 128, 124, 50];
        arm([s * 92, -28, -4], [s * 112, 22, -4], [s * 124, 76, 22], wrist);
        parts.push(...sideHand3d(mudra.hand, wrist, [knee[0] + s * 2, knee[1] - 2, knee[2] + 10], palmUp));
      }
    } else if (mudra.arms === 'lap') {
      const yoni = mudra.hand === 'yoni';
      arm([s * 88, -20, 0], [s * 88, 40, 6], [s * 66, 90, 38], yoni ? [s * 38, 96, 46] : [s * 36, 120, 54]);
    } else {
      arm([s * 90, -30, 0], [s * 84, 10, 10], [s * 48, -4, 46], [s * 12, -20, 60]);
    }
  }
  if (mudra.arms === 'lap') parts.push(...(mudra.hand === 'yoni' ? yoni3d() : lapHands(mudra.hand)));
  if (mudra.arms === 'chest') parts.push(...anjali3d(mudra.hand === 'anjali'));
  // merge needs matching attributes everywhere
  for (const p of parts) {
    if (!p.index) p.setIndex([...Array(p.attributes.position.count).keys()]);
    if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2));
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}
