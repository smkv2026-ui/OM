/**
 * KP: Suṣumṇā as the stem of a lotus, rising from Mūlādhāra (red triangle in an earth-yellow square)
 * to a thousand-petal lotus at Sahasrāra. A diamond rides the stem with the breath:
 *   inhale    — rises from the centre of the triangle to the lotus
 *   hold in   — the lotus blooms fully and glows; golden nectar oozes out and spreads
 *   exhale    — the diamond descends and the nectar flows down the stem with it
 *   hold out  — it rests at Mūlādhāra, which glows with the gathered nectar
 * Driven by `kpFrame`, which the view updates every frame.
 */
import { Sparkles, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { PhaseKind } from '../engine/kumbhaka';
import { CHAKRAS } from '../data';
import { BRILLIANT, chakraPos, getSushumnaCurve, glowTexture, sparkTexture, useDiamondEnv } from './Scene';

export const kpFrame: { kind: PhaseKind | 'idle'; p: number } = { kind: 'idle', p: 0 };

/** Mūlādhāra and Sahasrāra on the body's Suṣumṇā (world units, the 3D figure's frame). */
const M = chakraPos(CHAKRAS.find((c) => c.id === 'muladhara')!);
const T = chakraPos(CHAKRAS.find((c) => c.id === 'sahasrara')!);
/** sizes relative to the original standalone design (stem 3.2 tall) */
const LK = 0.4; // lotus
const MK = 0.3; // Mūlādhāra plate
const DK = 0.45; // diamond
const EARTH_YELLOW = '#e1a95f';
const RED = '#d7263d';
const GOLD = new THREE.Color('#ffc94a');
const ease = (x: number) => x * x * (3 - 2 * x);
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/* ------------------------------------------------------------------ the shared animation state */

/** Everything the scene shows, derived from the phase each frame. */
function look(kind: PhaseKind | 'idle', p: number) {
  switch (kind) {
    case 'inhale':
      return { d: ease(p), bloom: 0.15 + 0.25 * p, glow: 0.1 * p, light: ease(p), nectarTop: 0, nectarBottom: 0, pool: 0, ooze: 0 };
    case 'hold-in': {
      const b = ease(clamp(p / 0.6));
      return { d: 1, bloom: 0.4 + 0.6 * b, glow: 0.25 + 0.75 * b, light: 1, nectarTop: 0, nectarBottom: 0, pool: 0, ooze: clamp((p - 0.15) / 0.3) };
    }
    case 'exhale': {
      const d = 1 - ease(p);
      return { d, bloom: 1 - 0.25 * p, glow: 1 - 0.5 * p, light: 1 - p * 0.6, nectarTop: 1, nectarBottom: d, pool: clamp((p - 0.7) / 0.3) * 0.6, ooze: (1 - p) * 0.5 };
    }
    case 'hold-out':
      return { d: 0, bloom: 0.75 - 0.6 * ease(p), glow: 0.5 - 0.45 * p, light: 0.4 * (1 - p), nectarTop: 1 - ease(p), nectarBottom: 0, pool: 0.6 + 0.4 * Math.sin(Math.min(1, p * 1.4) * Math.PI), ooze: 0 };
    default:
      return { d: 0, bloom: 0.15, glow: 0, light: 0, nectarTop: 0, nectarBottom: 0, pool: 0.15, ooze: 0 };
  }
}
type Look = ReturnType<typeof look>;
const cur: { L: Look } = { L: look('idle', 0) };

/* ------------------------------------------------------------------ stem (Suṣumṇā) */

/** the stem follows Suṣumṇā's own centre line from Mūlādhāra up to the crown */
const STEM = (() => {
  const inner = getSushumnaCurve()
    .getSpacedPoints(300)
    .filter((q) => q.y > M.y + 0.05 && q.y < T.y - 0.05)
    .sort((a, b) => a.y - b.y)
    .filter((_, i) => i % 12 === 0);
  return new THREE.CatmullRomCurve3([M.clone(), ...inner, T.clone()]);
})();

function Stem() {
  const outer = useMemo(() => new THREE.TubeGeometry(STEM, 200, 0.026, 18, false), []);
  const inner = useMemo(() => new THREE.TubeGeometry(STEM, 200, 0.009, 10, false), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { light: { value: 0 }, nTop: { value: 0 }, nBottom: { value: 0 }, time: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0);
            vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          uniform float light, nTop, nBottom, time; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){
            float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
            vec3 stem = vec3(0.45, 0.78, 0.5);                       // lotus-stem green
            vec3 c = stem * (0.35 + 0.9 * f);
            float a = 0.18 + 0.6 * f;
            // light rising with the diamond
            float lit = smoothstep(light + 0.02, light - 0.04, vUv.x) * step(0.001, light);
            c += vec3(1.0, 0.95, 0.8) * lit * 0.55; a += lit * 0.25;
            // golden nectar flowing down: between nBottom and nTop, with moving bands
            float nec = smoothstep(nBottom - 0.03, nBottom + 0.02, vUv.x) * smoothstep(nTop + 0.01, nTop - 0.04, vUv.x) * step(0.001, nTop);
            float band = 0.75 + 0.25 * sin(vUv.x * 60.0 + time * 6.0);
            c = mix(c, vec3(1.0, 0.74, 0.2) * 1.6 * band, nec * 0.85); a += nec * 0.5;
            gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
          }`,
      }),
    [],
  );
  const core = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const L = cur.L;
    mat.uniforms.light.value = L.light * L.d;
    mat.uniforms.nTop.value = L.nectarTop;
    mat.uniforms.nBottom.value = L.nectarBottom;
    mat.uniforms.time.value = clock.elapsedTime;
    if (core.current) core.current.color.setRGB(1, 0.92 - 0.2 * L.nectarTop, 0.72 - 0.4 * L.nectarTop).multiplyScalar(0.7 + 0.8 * Math.max(L.light * 0.6, L.nectarTop));
  });
  return (
    <group>
      <mesh geometry={inner}>
        <meshBasicMaterial ref={core} color="#fff2c8" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh geometry={outer} material={mat} renderOrder={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ Mūlādhāra */

function triShape(r: number) {
  // tip toward −x (becomes the front once the plate stands in the side plane)
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r * 0.5, r * 0.866);
  s.lineTo(r * 0.5, -r * 0.866);
  s.closePath();
  return s;
}

function Muladhara() {
  const glow = useRef<THREE.SpriteMaterial>(null);
  const plate = useRef<THREE.MeshStandardMaterial>(null);
  const tri = useMemo(() => new THREE.ExtrudeGeometry(triShape(0.26), { depth: 0.012, bevelEnabled: false }), []);
  useFrame(({ clock }) => {
    const L = cur.L;
    const pulse = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 2);
    if (glow.current) glow.current.opacity = (0.18 + 0.45 * L.pool) * pulse;
    if (plate.current) plate.current.emissiveIntensity = 0.25 + 1.1 * L.pool;
  });
  return (
    <group position={M} scale={MK}>
      <sprite scale={[1.9, 1.9, 1]}>
        <spriteMaterial ref={glow} map={glowTexture()} color="#ff7a2c" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {/* lies flat (horizontal), triangle tip pointing to the front */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.8, 0.05]} />
          <meshStandardMaterial ref={plate} color={EARTH_YELLOW} emissive={EARTH_YELLOW} emissiveIntensity={0.25} roughness={0.55} metalness={0.15} />
        </mesh>
        {/* thin gold frame */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.82, 0.82, 0.06)]} />
          <lineBasicMaterial color="#ffd77a" transparent opacity={0.8} />
        </lineSegments>
        {[1, -1].map((s) => (
          <mesh key={s} geometry={tri} position={[0, 0, s * 0.026]} rotation={[0, s === 1 ? 0 : Math.PI, Math.PI / 2]}>
            <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.55} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ the thousand-petal lotus */

const RINGS = 16;
const RING_N = (() => {
  const n = Array.from({ length: RINGS }, (_, i) => Math.round(24 + (i * (100 - 24)) / (RINGS - 1)));
  n[RINGS - 1] += 1000 - n.reduce((a, b) => a + b, 0);
  return n;
})();

/** A cupped, pointed petal: base at the origin, growing along +y, cupped toward +z. */
function petalGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 6, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) * 2; // −1..1 across
    const v = p.getY(i) + 0.5; // 0..1 along
    const w = Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.95 + 0.05)), 0.75) * (1 - 0.35 * v);
    const x = u * 0.5 * w;
    const z = 0.22 * (1 - u * u) * w + 0.18 * v * v; // cup across, curl at the tip
    p.setXYZ(i, x, v, z);
  }
  g.computeVertexNormals();
  // darker toward the base and along the edges, so overlapping petals read separately
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = p.getY(i), u = Math.abs(p.getX(i)) / 0.5;
    const k = 0.62 + 0.38 * Math.min(1, v * 1.3) - 0.12 * u * u;
    col.set([k, k, k], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function Lotus({ color }: { color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const geo = useMemo(petalGeometry, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const base = useMemo(() => new THREE.Color(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const last = useRef({ bloom: -1, glow: -1, color: '' });
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const L = cur.L;
    const t = clock.elapsedTime;
    const breathe = 1 + 0.012 * Math.sin(t * 1.3);
    if (halo.current) halo.current.opacity = 0.06 + 0.26 * L.glow;
    if (light.current) light.current.intensity = 0.4 + 1.4 * L.glow;
    if (mat.current) mat.current.emissiveIntensity = 0.04 + 0.22 * L.glow;
    const L0 = last.current;
    if (Math.abs(L0.bloom - L.bloom) < 0.002 && Math.abs(L0.glow - L.glow) < 0.004 && L0.color === color) {
      m.scale.setScalar(breathe);
      return;
    }
    L0.bloom = L.bloom;
    L0.glow = L.glow;
    L0.color = color;
    base.set(color);
    let k = 0;
    for (let r = 0; r < RINGS; r++) {
      const f = r / (RINGS - 1); // 0 = innermost
      // outer rings open first, inner ones follow
      const open = ease(clamp(L.bloom * 1.35 - (1 - f) * 0.35));
      const tilt = (0.06 + 0.26 * f) * (1 - open) + (0.22 + 1.2 * f) * open;
      const len = 0.18 + 0.62 * f;
      const r0 = 0.03 + 0.2 * f * (0.35 + 0.65 * open);
      const wid = Math.max(0.05, ((2 * Math.PI * (0.05 + r0 + 0.25 * len * Math.sin(tilt))) / RING_N[r]) * 1.35);
      // inner rings turn golden as the lotus glows
      for (let i = 0; i < RING_N[r]; i++) {
        // a little variation per petal, and the inner rings turn golden as the lotus glows
        const jit = 0.9 + 0.1 * Math.sin(i * 12.9898 + r * 78.233);
        tmp.copy(base).multiplyScalar(jit).lerp(GOLD, L.glow * (0.6 - 0.5 * f));
        const a = (i / RING_N[r]) * Math.PI * 2 + r * 0.37;
        o.position.set(Math.cos(a) * r0, 0, Math.sin(a) * r0);
        o.rotation.set(0, -a + Math.PI / 2, 0, 'YXZ');
        o.rotateX(tilt);
        o.scale.set(wid * 4, len, len * 0.9);
        o.updateMatrix();
        m.setMatrixAt(k, o.matrix);
        m.setColorAt(k, tmp);
        k++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <group position={T} scale={LK}>
      <sprite scale={[2.4, 2.4, 1]} position={[0, 0.15, 0]}>
        <spriteMaterial ref={halo} map={glowTexture()} color="#ffd36a" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight ref={light} color="#ffcf6a" intensity={0.6} distance={2} position={[0, 0.25, 0]} />
      <instancedMesh ref={mesh} args={[geo, undefined, 1000]}>
        <meshStandardMaterial ref={mat} vertexColors side={THREE.DoubleSide} emissive="#ffb43a" emissiveIntensity={0.12} roughness={0.45} metalness={0.05} />
      </instancedMesh>
      {/* seed pod */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.06, 24]} />
        <meshStandardMaterial color="#f5d27a" emissive="#ffb43a" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ nectar */

const N = 900;
function Nectar() {
  const ref = useRef<THREE.Points>(null);
  const st = useMemo(() => ({ pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0, acc: 0 }), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(st.pos, 3));
    g.setAttribute('life', new THREE.BufferAttribute(st.life, 1));
    return g;
  }, [st]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { map: { value: glowTexture() }, scale: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float life; varying float vL; uniform float scale;
          void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position,1.0);
            gl_PointSize = (life > 0.0 ? (0.016 + 0.016 * min(life, 1.0)) : 0.0) * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D map; varying float vL;
          void main(){ if (vL <= 0.0) discard; vec4 t = texture2D(map, gl_PointCoord);
            gl_FragColor = vec4(vec3(1.0, 0.72, 0.25), t.a * 0.75 * min(1.0, vL)); }`,
      }),
    [],
  );
  const diamondPos = useMemo(() => new THREE.Vector3(), []);
  const size = useThree((s) => s.size);
  useFrame((_, dt) => {
    const L = cur.L;
    mat.uniforms.scale.value = size.height / (2 * Math.tan((20 * Math.PI) / 180)); // world size → pixels at fov 40
    const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number) => {
      const i = st.next;
      st.next = (st.next + 1) % N;
      st.pos.set([x, y, z], i * 3);
      st.vel.set([vx, vy, vz], i * 3);
      st.life[i] = life;
    };
    // oozing from the lotus: out over the petals and beyond, then falling
    st.acc += dt * (L.ooze * 260 + (kpFrame.kind === 'exhale' ? 120 : 0));
    while (st.acc > 1) {
      st.acc -= 1;
      if (L.ooze > 0.01 && (kpFrame.kind === 'hold-in' || Math.random() < L.ooze)) {
        const a = Math.random() * Math.PI * 2, sp = (0.25 + Math.random() * 0.7) * LK;
        spawn(T.x + Math.cos(a) * 0.02, T.y + 0.04, T.z + Math.sin(a) * 0.02, Math.cos(a) * sp, (0.35 + Math.random() * 0.4) * LK, Math.sin(a) * sp, 2 + Math.random() * 1.6);
      }
      if (kpFrame.kind === 'exhale') {
        // nectar flowing down with the diamond
        STEM.getPointAt(Math.max(0, Math.min(1, L.d)), diamondPos);
        const a = Math.random() * Math.PI * 2, r = 0.012 + Math.random() * 0.025;
        spawn(diamondPos.x + Math.cos(a) * r, diamondPos.y + Math.random() * 0.12, diamondPos.z + Math.sin(a) * r, 0, -0.12 - Math.random() * 0.15, 0, 0.8 + Math.random() * 0.6);
      }
    }
    for (let i = 0; i < N; i++) {
      if (st.life[i] <= 0) continue;
      st.life[i] -= dt * 0.6;
      st.vel[i * 3 + 1] -= dt * 0.4; // gravity
      st.vel[i * 3] *= 1 - dt * 0.4;
      st.vel[i * 3 + 2] *= 1 - dt * 0.4;
      st.pos[i * 3] += st.vel[i * 3] * dt;
      st.pos[i * 3 + 1] += st.vel[i * 3 + 1] * dt;
      st.pos[i * 3 + 2] += st.vel[i * 3 + 2] * dt;
      if (st.pos[i * 3 + 1] < M.y - 0.35) st.life[i] = 0;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.life.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ the diamond */

function Diamond() {
  const ref = useRef<THREE.Group>(null);
  const gem = useRef<THREE.Group>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const glints = useRef<(THREE.Sprite | null)[]>([]);
  const env = useDiamondEnv();
  const geo = useMemo(() => new THREE.LatheGeometry(BRILLIANT.map(([r, y]) => new THREE.Vector2(r, y)), 16).toNonIndexed(), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 10), [geo]);
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f4f8ff',
        metalness: 0.25,
        roughness: 0.03,
        ior: 2.42,
        envMap: env,
        envMapIntensity: 3.6,
        clearcoat: 1,
        clearcoatRoughness: 0,
        iridescence: 0.45,
        iridescenceIOR: 1.8,
        flatShading: true,
      }),
    [env],
  );
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, dt) => {
    const L = cur.L;
    STEM.getPointAt(Math.max(0, Math.min(1, L.d)), p);
    ref.current?.position.copy(p).add(new THREE.Vector3(0, L.d > 0.98 ? 0.035 : 0, 0));
    if (gem.current) gem.current.rotation.y += dt * 0.8;
    if (halo.current) halo.current.opacity = 0.22 + 0.25 * Math.max(L.light, L.glow);
    const t = clock.elapsedTime;
    glints.current.forEach((s, k) => {
      if (!s) return;
      const ph = (t * (0.9 + k * 0.37) + k * 0.31) % 1;
      const on = Math.max(0, Math.sin(ph * Math.PI)) ** 6;
      s.scale.setScalar(0.03 + on * 0.16);
      (s.material as THREE.SpriteMaterial).opacity = on;
    });
  });
  return (
    <group ref={ref}>
      <group scale={DK}>
      <sprite scale={[0.7, 0.7, 1]}>
        <spriteMaterial ref={halo} map={glowTexture()} color="#e8f6ff" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <group ref={gem} rotation={[0.3, 0, 0]} scale={0.16}>
        <mesh geometry={geo} material={mat} />
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </lineSegments>
      </group>
      {[
        [0.09, 0.07],
        [-0.1, 0.03],
        [0.03, -0.06],
      ].map(([x, y], k) => (
        <sprite key={k} ref={(s) => void (glints.current[k] = s)} position={[x, y, 0.14]} scale={0.03}>
          <spriteMaterial map={sparkTexture()} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ bloom + scene */

function Bloom({ strength }: { strength: number }) {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    // drop any NaN / infinite pixel (a single one would otherwise be smeared over the frame by the bloom)
    c.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
          void main(){ vec4 c = texture2D(tDiffuse, vUv);
            if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
            gl_FragColor = clamp(c, 0.0, 64.0); }`,
      }),
    );
    c.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), strength, 0.5, 0.82));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame((_, dt) => {
    const L = cur.L;
    (composer.passes[2] as UnrealBloomPass).strength = strength * (0.7 + 0.3 * L.glow);
    composer.render(dt);
  }, 1);
  return null;
}

/** The KP layer: drawn inside the normal 3D scene (body, spine, nāḍīs and the other chakras come from there). */
export function KPScene({ lotusColor, stem = true }: { lotusColor: string; stem?: boolean }) {
  useFrame(() => {
    cur.L = look(kpFrame.kind, kpFrame.p);
  }, -1);
  return (
    <>
      <color attach="background" args={['#04030c']} />
      <Stars radius={40} depth={30} count={2500} factor={3} saturation={0} fade speed={0.4} />
      <Sparkles count={60} scale={[2, 3.6, 2]} position={[0, (M.y + T.y) / 2, 0]} size={1.8} speed={0.25} opacity={0.45} color="#ffe2a0" />
      <Muladhara />
      {stem && <Stem />}
      <Lotus color={lotusColor} />
      <Nectar />
      <Diamond />
      <Bloom strength={0.5} />
    </>
  );
}
