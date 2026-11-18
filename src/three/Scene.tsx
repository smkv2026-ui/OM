/**
 * Stylised 3D subtle-body scene (lazy-loaded with the 3D route).
 * Units: 1 = 100 figure units. x → x, figure y → -y, side-view x (back = +) → -z. Front faces +z.
 */
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CHAKRAS, NADIS, PRANAS, type Chakra, type ChakraId, type PranaId } from '../data';
import { SIDE_SPINE_POINTS } from '../figures/geometry';
import { VAYU_PATHS } from '../engine/pranaFlow';

export type Preset = 'front' | 'back' | 'side' | 'full';
export interface Layers {
  body: boolean;
  chakras: boolean;
  nadis: boolean;
  spine: boolean;
  om: boolean;
  prana: boolean;
}

const S = 0.01;
const v3 = (x: number, y: number, z = 0) => new THREE.Vector3(x * S, -y * S, z * S);
/** Spine curve (medulla → coccyx) in 3D. */
const SPINE = new THREE.CatmullRomCurve3(SIDE_SPINE_POINTS.map(([sx, y]) => v3(0, y, -sx)));
const chakraPos = (c: Chakra) => v3(0, c.position.sideY, -c.position.sideX);
const spineZAt = (y: number) => {
  // nearest z on spine for figure-y
  let best = SIDE_SPINE_POINTS[0];
  for (const p of SIDE_SPINE_POINTS) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p;
  return -best[0];
};

/* ------------------------------------------------------------------ materials */

function useGlass(dark: boolean, opts: { base: string; rim: string; alpha?: number }) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: {
          base: { value: new THREE.Color(opts.base) },
          rim: { value: new THREE.Color(opts.rim) },
          alpha: { value: opts.alpha ?? 0.14 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 base; uniform vec3 rim; uniform float alpha;
          varying vec3 vN; varying vec3 vV;
          void main(){
            float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
            vec3 c = mix(base, rim, f);
            gl_FragColor = vec4(c, alpha + f * 0.75);
          }`,
      }),
    [dark, opts.base, opts.rim, opts.alpha],
  );
}

let glowTex: THREE.Texture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

const omTex = new Map<string, THREE.Texture>();
function omTexture(color: string) {
  const k = color;
  if (omTex.has(k)) return omTex.get(k)!;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.font = '600 72px "Noto Serif Devanagari", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('ॐ', 48, 54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  omTex.set(k, t);
  return t;
}

/* ------------------------------------------------------------------ body */

function Body({ dark }: { dark: boolean }) {
  const mat = useGlass(dark, dark ? { base: '#1d1a52', rim: '#9fb0ff', alpha: 0.1 } : { base: '#f1e2c4', rim: '#9c6b22', alpha: 0.22 });
  const torso = useMemo(() => {
    // radius profile (figure units) from neck base to seat
    const prof: [number, number][] = [
      [8, -98],
      [14, -86],
      [52, -76],
      [70, -64],
      [72, -40],
      [68, -10],
      [60, 22],
      [55, 52],
      [60, 92],
      [66, 128],
      [58, 158],
      [30, 176],
      [0, 182],
    ];
    const g = new THREE.LatheGeometry(
      prof.map(([r, y]) => new THREE.Vector2(r * S, -y * S)),
      28,
    );
    g.scale(1, 1, 0.56);
    g.translate(0, 0, 0.02);
    return g;
  }, []);
  const tube = (pts: [number, number, number][], r: number) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => v3(x, y, z))), 24, r * S, 10, false);
  const parts = useMemo(() => {
    const g: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      g.push(tube([[s * 66, -70, 0], [s * 92, -36, -4], [s * 118, 20, -6]], 12)); // upper arm
      g.push(tube([[s * 118, 20, -6], [s * 128, 80, 20], [s * 134, 136, 50]], 9.5)); // forearm
      g.push(tube([[s * 40, 150, 0], [s * 100, 160, 50], [s * 150, 166, 90]], 21)); // thigh
      g.push(tube([[s * 150, 166, 95], [s * 70, 150, 105], [-s * 50, 134, 78]], 15)); // shin crossing over
    }
    return g;
  }, []);
  return (
    <group renderOrder={1}>
      <mesh geometry={torso} material={mat} />
      {/* head */}
      <mesh position={v3(0, -148, 6)} scale={[0.3, 0.47, 0.37]} material={mat}>
        <sphereGeometry args={[1, 28, 20]} />
      </mesh>
      {/* nose hint */}
      <mesh position={v3(0, -130, 44)} scale={[0.05, 0.1, 0.06]} material={mat}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      {/* neck */}
      <mesh position={v3(0, -92, 2)} material={mat}>
        <cylinderGeometry args={[0.13, 0.15, 0.24, 18, 1, true]} />
      </mesh>
      {parts.map((g, i) => (
        <mesh key={i} geometry={g} material={mat} />
      ))}
      {/* rounded joints close the tube ends */}
      {[-1, 1].map((s) => (
        <group key={`j${s}`}>
          {(
            [
              [s * 66, -70, 0, 13],
              [s * 118, 20, -6, 11],
              [s * 150, 166, 92, 20],
              [s * 40, 150, 0, 21],
              [-s * 50, 134, 78, 15],
            ] as const
          ).map(([x, y, z, r], i) => (
            <mesh key={i} position={v3(x, y, z)} scale={r * S} material={mat}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* hands (jñāna mudrā) on knees and feet resting on thighs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={v3(s * 136, 142, 58)} scale={[0.1, 0.13, 0.08]} material={mat}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
          <mesh position={v3(-s * 62, 128, 70)} rotation={[0.3, 0, s * 0.35]} scale={[0.2, 0.08, 0.1]} material={mat}>
            <sphereGeometry args={[1, 16, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ spine */

function Spine({ dark }: { dark: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 26;
  useEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const t = 0.04 + (i / (n - 1)) * 0.92;
      const p = SPINE.getPointAt(t);
      const tan = SPINE.getTangentAt(t);
      o.position.copy(p);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      const w = i < 7 ? 0.06 : i < 19 ? 0.075 : i < 24 ? 0.095 : 0.07 - (i - 24) * 0.02;
      o.scale.set(w, 0.035, w * 0.8);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <cylinderGeometry args={[1, 1, 1, 12]} />
      <meshStandardMaterial color={dark ? '#8f8bc9' : '#b59a6a'} roughness={0.6} transparent opacity={0.75} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ nadis */

function Sushumna({ dark }: { dark: boolean }) {
  const geo = useMemo(() => {
    const crown = CHAKRAS.find((c) => c.id === 'sahasrara')!;
    const pts = [...SIDE_SPINE_POINTS].reverse().map(([sx, y]) => v3(0, y, -sx));
    pts.push(chakraPos(crown));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.016, 8, false);
  }, []);
  const core = useMemo(() => {
    const crown = CHAKRAS.find((c) => c.id === 'sahasrara')!;
    const pts = [...SIDE_SPINE_POINTS].reverse().map(([sx, y]) => v3(0, y, -sx));
    pts.push(chakraPos(crown));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.035, 8, false);
  }, []);
  const col = dark ? '#f5c451' : '#c8920f';
  return (
    <group>
      <mesh geometry={geo}>
        <meshBasicMaterial color={dark ? '#fff2c8' : col} toneMapped={false} />
      </mesh>
      <mesh geometry={core}>
        <meshBasicMaterial color={col} transparent opacity={0.35} blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Ida / Pingala: spiral around the spine, crossing at each chakra, meeting at Ajna. */
function Braid({ side, color }: { side: -1 | 1; color: string }) {
  const geo = useMemo(() => {
    const ys = CHAKRAS.filter((c) => c.id !== 'sahasrara').map((c) => c.position.sideY);
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s < ys.length - 1; s++) {
      const y0 = ys[s];
      const y1 = ys[s + 1];
      const amp = Math.min(30, 0.42 * Math.abs(y1 - y0) + 6);
      const dir = (s % 2 === 0 ? 1 : -1) * side;
      for (let i = s === 0 ? 0 : 1; i <= 20; i++) {
        const t = i / 20;
        const y = y0 + (y1 - y0) * t;
        const x = dir * amp * Math.sin(Math.PI * t);
        const z = spineZAt(y) + side * amp * 0.55 * Math.sin(2 * Math.PI * t);
        pts.push(v3(x, y, z));
      }
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.011, 6, false);
  }, [side]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ chakras */

function ChakraNode({ c, dark, onSelect, om }: { c: Chakra; dark: boolean; onSelect: (id: ChakraId) => void; om: boolean }) {
  const group = useRef<THREE.Group>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const pos = useMemo(() => chakraPos(c), [c]);
  const rainbow = !!c.color.rainbow;
  const col = rainbow ? '#c9a7ff' : c.color.primary;
  const R = (c.position.size / 2) * S;
  const n = rainbow ? 36 : Math.min(c.petals.count, 16);
  useEffect(() => {
    const m = petals.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (c.id === 'ajna') {
        o.position.set((i === 0 ? -1 : 1) * R * 0.62, 0, 0);
        o.rotation.set(0, 0, Math.PI / 2);
        o.scale.set(R * 0.32, R * 0.6, R * 0.12);
      } else {
        o.position.set(Math.sin(a) * R * 0.72, Math.cos(a) * R * 0.72, 0);
        o.rotation.set(0, 0, -a);
        o.scale.set(R * (rainbow ? 0.12 : 0.62 / Math.sqrt(n)), R * 0.32, R * 0.08);
      }
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, rainbow ? color.setHSL(i / n, 0.9, 0.62) : color.set(col));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [c, n, R, rainbow, col]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const k = 1 + 0.06 * Math.sin(clock.elapsedTime * 1.1 + c.order);
    g.scale.setScalar(k);
    if (petals.current && c.id !== 'ajna') petals.current.rotation.z = clock.elapsedTime * (rainbow ? 0.25 : 0.08) * (c.order % 2 ? 1 : -1);
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(c.id);
  };
  return (
    <group position={pos}>
      <group ref={group}>
        <sprite scale={[R * 4.2, R * 4.2, 1]}>
          <spriteMaterial map={glowTexture()} color={col} transparent opacity={dark ? 0.85 : 0.6} depthWrite={false} blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={false} />
        </sprite>
        <mesh>
          <sphereGeometry args={[R * 0.32, 20, 14]} />
          <meshBasicMaterial color={c.id === 'muladhara' ? '#f2c230' : rainbow ? '#ffffff' : col} toneMapped={false} />
        </mesh>
        <instancedMesh ref={petals} args={[undefined, undefined, n]} rotation={rainbow ? [-Math.PI * 0.42, 0, 0] : [0, 0, 0]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial transparent opacity={0.85} toneMapped={false} depthWrite={false} />
        </instancedMesh>
      </group>
      {/* generous invisible hit target */}
      <mesh onClick={click} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <sphereGeometry args={[Math.max(R * 1.1, 0.16), 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {om && c.omSpokes > 0 && <OmSpokes c={c} dark={dark} />}
    </group>
  );
}

/** Radiating Om glyphs in the sagittal (y–z) plane, as in Fig. 5.1. */
function OmSpokes({ c, dark }: { c: Chakra; dark: boolean }) {
  const small = c.order <= 2;
  const L = (c.id === 'ajna' ? 22 : small ? 17 : 26) * S * 1.1;
  const col = dark ? c.color.primary : c.color.ink;
  const tex = omTexture(col);
  const lines = useMemo(() => {
    const pts: number[] = [];
    for (let k = 0; k < c.omSpokes; k++) {
      const a = (k / c.omSpokes) * Math.PI * 2;
      pts.push(0, Math.sin(a) * 0.07, Math.cos(a) * 0.07, 0, Math.sin(a) * (L - 0.04), Math.cos(a) * (L - 0.04));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [c, L]);
  return (
    <group>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={col} transparent opacity={0.7} />
      </lineSegments>
      {Array.from({ length: c.omSpokes }, (_, k) => {
        const a = (k / c.omSpokes) * Math.PI * 2;
        return (
          <sprite key={k} position={[0, Math.sin(a) * L, Math.cos(a) * L]} scale={[small ? 0.06 : 0.075, small ? 0.06 : 0.075, 1]}>
            <spriteMaterial map={tex} transparent depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ flows */

/** Rising particles along Sushumna (instanced). */
function SushumnaFlow({ dark }: { dark: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 60;
  const seeds = useMemo(() => Array.from({ length: n }, () => ({ t: Math.random(), s: 0.04 + Math.random() * 0.06 })), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    seeds.forEach((p, i) => {
      p.t = (p.t + p.s * dt) % 1;
      o.position.copy(SPINE.getPointAt(1 - p.t));
      o.scale.setScalar(0.012 + 0.01 * Math.sin(p.t * Math.PI));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial color={dark ? '#fff6dc' : '#b07d1e'} toneMapped={false} />
    </instancedMesh>
  );
}

/** Five-prāṇa flows, sampled from the same paths as the 2D Prana view (front plane, slightly forward). */
function PranaFlows({ dark }: { dark: boolean }) {
  const refs = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const N = 40;
  const curves = useMemo(
    () =>
      Object.fromEntries(
        PRANAS.map((p) => [
          p.id,
          VAYU_PATHS[p.id].map((path) => new THREE.CatmullRomCurve3(path.map(([x, y]) => v3(x, y, p.id === 'vyana' ? 10 : 30)))),
        ]),
      ) as Record<PranaId, THREE.CatmullRomCurve3[]>,
    [],
  );
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ t: Math.random(), lane: i })), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    for (const p of PRANAS) {
      const m = refs.current[p.id];
      if (!m) continue;
      const cs = curves[p.id];
      seeds.forEach((s, i) => {
        const speed = p.id === 'udana' ? 0.6 : p.id === 'vyana' ? 0.15 : 0.25;
        s.t = (s.t + speed * dt * (0.8 + (i % 5) * 0.1)) % 1;
        const c = cs[s.lane % cs.length];
        const t = p.id === 'vyana' ? (s.t < 0.5 ? s.t * 2 : 2 - s.t * 2) : s.t;
        o.position.copy(c.getPointAt(Math.min(0.999, t)));
        if (p.id === 'samana') o.position.x += Math.cos(s.t * 9 + i) * 0.04 * (1 - s.t);
        o.scale.setScalar(0.014);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group>
      {PRANAS.map((p) => (
        <instancedMesh key={p.id} ref={(m) => void (refs.current[p.id] = m)} args={[undefined, undefined, N]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshBasicMaterial color={dark ? p.glow ?? p.color : p.id === 'udana' ? '#3d86b8' : p.color} toneMapped={false} />
        </instancedMesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ camera rig */

const TARGET = new THREE.Vector3(0, -0.12, 0);
const PRESET: Record<Preset, { dir: THREE.Vector3; fov: number }> = {
  front: { dir: new THREE.Vector3(0, 0, 1), fov: 12 },
  back: { dir: new THREE.Vector3(0, 0, -1), fov: 12 },
  // camera on the figure's right → face points left on screen, matching Fig. 5.1
  side: { dir: new THREE.Vector3(1, 0, 0), fov: 12 },
  full: { dir: new THREE.Vector3(0.62, 0.32, 0.72).normalize(), fov: 38 },
};
const FIT_H = 4.6; // world height to fit (figure ≈ 3.8 + crown + room for controls)

function distFor(fov: number, aspect: number) {
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2));
  // fit height, and the ~3.7-wide seated pose on narrow (portrait) screens; perspective needs extra room
  const h = Math.max(FIT_H, 3.9 / Math.max(0.1, aspect)) * (fov > 20 ? 1.2 : 1);
  return h / vh;
}

export function CameraRig({ preset, nonce, reduce }: { preset: Preset; nonce: number; reduce: boolean }) {
  const { camera, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const tween = useRef<{ from: THREE.Vector3; fromFov: number; fromTarget: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    tween.current = {
      from: cam.position.clone().sub(controls.current?.target ?? TARGET).normalize(),
      fromFov: cam.fov,
      fromTarget: (controls.current?.target ?? TARGET).clone(),
      t: reduce ? 1 : 0,
    };
  }, [preset, nonce, camera, reduce]);
  useFrame((_, dt) => {
    const tw = tween.current;
    const cam = camera as THREE.PerspectiveCamera;
    const ctl = controls.current;
    if (!tw || !ctl) return;
    tw.t = Math.min(1, tw.t + dt / 1.1);
    const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
    const P = PRESET[preset];
    const fov = THREE.MathUtils.lerp(tw.fromFov, P.fov, e);
    // spherical slerp of the view direction (avoids passing through the body)
    const qa = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tw.from);
    const qb = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), P.dir);
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(qa.slerp(qb, e));
    ctl.target.lerpVectors(tw.fromTarget, TARGET, e);
    cam.fov = fov;
    cam.position.copy(ctl.target).addScaledVector(dir, distFor(fov, size.width / size.height));
    cam.updateProjectionMatrix();
    ctl.update();
    if (tw.t >= 1) tween.current = null;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      minDistance={2}
      maxDistance={60}
      target={TARGET}
    />
  );
}

/* ------------------------------------------------------------------ scene */

export function Scene({ layers, dark, onSelect }: { layers: Layers; dark: boolean; onSelect: (id: ChakraId) => void }) {
  const ida = NADIS.find((n) => n.id === 'ida')!;
  const pingala = NADIS.find((n) => n.id === 'pingala')!;
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      {layers.spine && <Spine dark={dark} />}
      {layers.nadis && (
        <>
          <Sushumna dark={dark} />
          <SushumnaFlow dark={dark} />
          <Braid side={-1} color={dark ? ida.color : ida.colorLight} />
          <Braid side={1} color={dark ? pingala.color : pingala.colorLight} />
        </>
      )}
      {layers.chakras && CHAKRAS.map((c) => <ChakraNode key={c.id} c={c} dark={dark} onSelect={onSelect} om={layers.om} />)}
      {!layers.chakras && layers.om && CHAKRAS.map((c) => (
        <group key={c.id} position={chakraPos(c)}>
          <OmSpokes c={c} dark={dark} />
        </group>
      ))}
      {layers.prana && <PranaFlows dark={dark} />}
      {layers.body && <Body dark={dark} />}
    </>
  );
}
