/** Guru view in 3D: the lotus with the Padukas at the heart centre, facing the viewer, nectar oozing from behind. */
import { Billboard } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CHAKRAS, type ChakraId } from '../data';
import { chakraPos, glowTexture } from '../three/Scene';
import { composeCanvas, LOTUS_ASPECT } from './art';

const W = 0.95; // world width of the art (the shoulders span about 1.3)
const N = 500;

export function GuruArt3D({ center, art, lotus, padukas, nectar, dark }: { center: ChakraId; art: { lotus: string; padukas: string }; lotus: boolean; padukas: boolean; nectar: boolean; dark: boolean }) {
  const pos = useMemo(() => chakraPos(CHAKRAS.find((c) => c.id === center)!), [center]);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    if (!lotus && !padukas) return setTex(null);
    composeCanvas(art, lotus, padukas).then((c) => {
      if (!live) return;
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTex((old) => (old?.dispose(), t));
    });
    return () => void (live = false);
  }, [art, lotus, padukas]);
  const halo = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ clock }) => {
    if (halo.current) halo.current.opacity = (dark ? 0.55 : 0.4) * (0.85 + 0.15 * Math.sin(clock.elapsedTime * 1.6));
  });
  return (
    <group position={pos}>
      {nectar && (
        <sprite scale={[W * 1.9, W * 1.9, 1]} renderOrder={28}>
          <spriteMaterial ref={halo} map={glowTexture()} color="#ffc94a" transparent depthTest={false} depthWrite={false} blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={false} />
        </sprite>
      )}
      {nectar && <Nectar dark={dark} />}
      {tex && (
        <Billboard>
          <mesh renderOrder={30}>
            <planeGeometry args={[W, W * LOTUS_ASPECT]} />
            <meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}

/** Nectar spreading out from behind the art (in the camera's plane), then falling. */
function Nectar({ dark }: { dark: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
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
        depthTest: false,
        depthWrite: false,
        blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: { map: { value: glowTexture() }, scale: { value: 1 } },
        vertexShader: `attribute float life; varying float vL; uniform float scale;
          void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position,1.0);
            gl_PointSize = (life > 0.0 ? (0.045 + 0.03 * min(life, 1.0)) : 0.0) * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D map; varying float vL;
          void main(){ if (vL <= 0.0) discard; vec4 t = texture2D(map, gl_PointCoord);
            gl_FragColor = vec4(1.0, 0.76, 0.28, t.a * 0.85 * min(1.0, vL)); }`,
      }),
    [dark],
  );
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    mat.uniforms.scale.value = size.height / (2 * Math.tan(((cam.fov ?? 38) * Math.PI) / 360));
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    up.setFromMatrixColumn(cam.matrixWorld, 1);
    st.acc += dt * 110;
    while (st.acc > 1) {
      st.acc -= 1;
      const i = st.next;
      st.next = (st.next + 1) % N;
      const a = Math.random() * Math.PI * 2, r = W * 0.12, sp = W * (0.25 + Math.random() * 0.45);
      const dx = Math.cos(a), dy = Math.sin(a) * 0.85;
      st.pos.set([(right.x * dx + up.x * dy) * r, (right.y * dx + up.y * dy) * r, (right.z * dx + up.z * dy) * r], i * 3);
      st.vel.set([(right.x * dx + up.x * dy) * sp, (right.y * dx + up.y * dy) * sp, (right.z * dx + up.z * dy) * sp], i * 3);
      st.life[i] = 1.6 + Math.random() * 1.4;
    }
    for (let i = 0; i < N; i++) {
      if (st.life[i] <= 0) continue;
      st.life[i] -= dt * 0.7;
      st.vel[i * 3] *= 1 - dt * 0.9;
      st.vel[i * 3 + 2] *= 1 - dt * 0.9;
      st.vel[i * 3 + 1] = st.vel[i * 3 + 1] * (1 - dt * 0.9) - dt * 0.35; // slows, then falls
      st.pos[i * 3] += st.vel[i * 3] * dt;
      st.pos[i * 3 + 1] += st.vel[i * 3 + 1] * dt;
      st.pos[i * 3 + 2] += st.vel[i * 3 + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.life.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={29} />;
}
