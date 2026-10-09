// motion: none — escena three.js dentro de un canvas, sin DOM propio; el movimiento (rotación lenta, cortes de vista) lo declara LiveMannequin con data-motion="orbit".
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { DoubleSide, FrontSide, Shape, Vector2, type MeshStandardMaterial } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  BODY_COLOR,
  BODY_COLOR_SUBDUED,
  FIELD_CONFIG,
  GARMENT_COLOR,
  GUIDE_COLOR,
  HIGHLIGHT_COLOR,
  type QuickView,
} from "./data";
import { SLEEVE_SPLIT, type Pose, type Segment, type Vec3 } from "./pose";

const TARGET: Vec3 = [0, 0.85, 0];
const VIEW_POSITIONS: Record<QuickView, Vec3> = {
  front: [0, 0.85, 3.2],
  back: [0, 0.85, -3.2],
  profile: [3.2, 0.85, 0],
};
const BODY_INSET = 0.93;
const MIN_R = 0.012;

const TORSO_FIELDS = ["chest", "waist", "hem_circ", "back_length", "back_width"];
const SLEEVE_FIELDS = ["sleeve_length", "arm_circ", "cuff"];
const SHOULDER_FIELDS = ["shoulder_width", "shoulder_seam"];

/* ---------- materiales ---------- */

function Cloth({ color, active, roughness = 0.78, doubleSided = false }: { color: string; active: boolean; roughness?: number; doubleSided?: boolean }) {
  const ref = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.emissiveIntensity = active ? 0.3 + Math.sin(clock.elapsedTime * 3.2) * 0.14 : 0;
  });
  return (
    <meshStandardMaterial
      ref={ref}
      color={color}
      emissive={active ? HIGHLIGHT_COLOR : "#000000"}
      emissiveIntensity={active ? 0.3 : 0}
      roughness={roughness}
      metalness={0.04}
      side={doubleSided ? DoubleSide : FrontSide}
    />
  );
}

/* ---------- cuerpo ---------- */

function Limb({ seg, x = 0, color }: { seg: Segment; x?: number; color: string }) {
  const r = (v: number) => Math.max(v * BODY_INSET, MIN_R);
  return (
    <mesh position={[x, (seg.y0 + seg.y1) / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r(seg.radiusTop), r(seg.radiusBottom), Math.max(seg.y1 - seg.y0, 0.001), 24]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function Body({ pose }: { pose: Pose }) {
  const c = BODY_COLOR_SUBDUED;
  return (
    <group>
      {pose.legs.map((leg, i) => (
        <group key={i}>
          <Limb seg={leg.thigh} x={leg.x} color={c} />
          <Limb seg={leg.calf} x={leg.x} color={c} />
          <mesh position={[leg.x, 0.02, 0.02]} castShadow>
            <boxGeometry args={[0.09, 0.04, 0.16]} />
            <meshStandardMaterial color="#2a2722" roughness={0.6} />
          </mesh>
        </group>
      ))}
      <Limb seg={pose.pelvis} color={c} />
      <Limb seg={pose.waistBand} color={c} />
      <Limb seg={pose.chest} color={c} />
      <Limb seg={pose.neck} color={c} />
      <mesh position={[0, pose.head.y, 0]} castShadow>
        <sphereGeometry args={[pose.head.radius, 24, 24]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.9} />
      </mesh>
      {pose.arms.map((arm, i) => (
        <group key={i}>
          <Limb seg={arm.upperArm} x={arm.x} color={c} />
          <Limb seg={arm.forearm} x={arm.x} color={c} />
        </group>
      ))}
    </group>
  );
}

/* ---------- saco ---------- */

type ProfilePoint = [number, number];

function sacoGeometry(pose: Pose) {
  const g = pose.garment;
  const shoulderX = g.shoulderWidthM / 2;
  const shoulderLineRadius = Math.max(g.chestRadius * 1.04, shoulderX - g.armRadius * 0.9);
  const hemRadius = Math.min(g.hemRadius, g.chestRadius);
  const waistRadius = g.waistRadius + (g.chestRadius - g.waistRadius) * 0.62;
  const napeY = g.shoulderY + 0.055;
  const hemY = Math.max(napeY - g.backLengthM, g.kneeY + 0.05);
  const waistLevel = Math.min(g.waistY + 0.05, hemY + (g.shoulderY - hemY) * 0.62);
  const collarBase = g.neckRadius * 1.2;
  const slope = shoulderLineRadius * 0.66 + collarBase * 0.34;
  const profile: ProfilePoint[] = [
    [hemRadius * 0.99, hemY],
    [hemRadius, hemY + 0.02],
    [waistRadius, waistLevel],
    [g.chestRadius, g.shoulderY - 0.12],
    [shoulderLineRadius, g.shoulderY],
    [slope, g.shoulderY + 0.016],
    [collarBase, g.shoulderY + 0.038],
  ];
  return { profile, hemY, waistLevel, napeY, shoulderX, waistRadius, hemRadius };
}

/** Radio del torso del saco a una altura, interpolando el perfil. */
function radiusAt(profile: ProfilePoint[], y: number) {
  if (y <= profile[0][1]) return profile[0][0];
  for (let i = 1; i < profile.length; i++) {
    const [r1, y1] = profile[i];
    const [r0, y0] = profile[i - 1];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(y1 - y0, 1e-6);
  }
  return profile[profile.length - 1][0];
}

function Lathe({ profile, active, openFrontRad = 0, position }: { profile: ProfilePoint[]; active: boolean; openFrontRad?: number; position?: Vec3 }) {
  const points = useMemo(() => {
    const out: Vector2[] = [];
    let prevY = Number.NEGATIVE_INFINITY;
    for (const [r, y] of profile) {
      const yy = prevY === Number.NEGATIVE_INFINITY ? y : Math.max(y, prevY + 0.004);
      out.push(new Vector2(Math.max(r, MIN_R), yy));
      prevY = yy;
    }
    return out;
  }, [profile]);
  return (
    <mesh position={position} castShadow receiveShadow>
      <latheGeometry args={[points, 32, openFrontRad / 2, Math.PI * 2 - openFrontRad]} />
      <Cloth color={GARMENT_COLOR} active={active} doubleSided={openFrontRad > 0} />
    </mesh>
  );
}

function Lapel({ side, topY, bottomY, width, radius, active }: { side: -1 | 1; topY: number; bottomY: number; width: number; radius: number; active: boolean }) {
  const shape = useMemo(() => {
    const h = Math.max(topY - bottomY, 0.02);
    const w = Math.max(width, 0.02) * side;
    const s = new Shape();
    s.moveTo(0, 0);
    s.lineTo(w, h * 0.12);
    s.lineTo(w * 0.62, -h * 0.55);
    s.lineTo(0, -h);
    s.closePath();
    return s;
  }, [topY, bottomY, width, side]);
  return (
    <mesh position={[0, topY, radius * 0.9]} rotation={[0, side * -0.32, 0]} castShadow>
      <extrudeGeometry args={[shape, { depth: 0.008, bevelEnabled: false, curveSegments: 2 }]} />
      <Cloth color={GARMENT_COLOR} active={active} roughness={0.68} doubleSided />
    </mesh>
  );
}

function Tube({ x, rTop, rBottom, y0, y1, active }: { x: number; rTop: number; rBottom: number; y0: number; y1: number; active: boolean }) {
  return (
    <mesh position={[x, (y0 + y1) / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[Math.max(rTop, MIN_R), Math.max(rBottom, MIN_R), Math.max(y1 - y0, 0.001), 20]} />
      <Cloth color={GARMENT_COLOR} active={active} />
    </mesh>
  );
}

function Saco({ pose, activeField }: { pose: Pose; activeField: string | null }) {
  const g = pose.garment;
  const geo = useMemo(() => sacoGeometry(pose), [pose]);
  const torso = !!activeField && TORSO_FIELDS.includes(activeField);
  const sleeve = !!activeField && SLEEVE_FIELDS.includes(activeField);
  const shoulder = !!activeField && SHOULDER_FIELDS.includes(activeField);

  const elbowY = g.shoulderY - g.sleeveM * SLEEVE_SPLIT;
  const elbowR = (g.armRadius + g.cuffRadius) / 2;
  const sleeveTopY = g.shoulderY - g.armRadius * 0.3;
  const lapelTop = g.shoulderY - 0.015;
  const lapelBottom = geo.waistLevel + (g.shoulderY - geo.waistLevel) * 0.18;

  const collarProfile = useMemo<ProfilePoint[]>(() => {
    const r = Math.max(g.neckRadius * 1.18, MIN_R);
    const y = g.shoulderY - 0.01;
    return [[r, y], [r * 1.06, y + 0.035], [r * 1.04, y + 0.05]];
  }, [g.neckRadius, g.shoulderY]);

  return (
    <group>
      <Lathe profile={geo.profile} active={torso} />
      <mesh
        position={[0, g.shoulderY - 0.032, 0]}
        scale={[Math.max(g.shoulderWidthM, 0.05) / 2, 0.044, Math.max(g.chestRadius * 1.9, 0.05) / 2]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 28, 16]} />
        <Cloth color={GARMENT_COLOR} active={shoulder} />
      </mesh>
      <Lathe profile={collarProfile} active={shoulder} openFrontRad={Math.PI * 0.62} />
      {([-1, 1] as const).map((s) => (
        <Lapel key={s} side={s} topY={lapelTop} bottomY={lapelBottom} width={g.chestRadius * 0.58} radius={g.chestRadius} active={torso} />
      ))}
      {([-1, 1] as const).map((s) => {
        const x = s * geo.shoulderX;
        return (
          <group key={s}>
            <mesh position={[x, sleeveTopY, 0]} scale={[1, 0.58, 1]} castShadow receiveShadow>
              <sphereGeometry args={[Math.max(g.armRadius * 1.08, MIN_R), 20, 14]} />
              <Cloth color={GARMENT_COLOR} active={shoulder} />
            </mesh>
            <Tube x={x} rTop={g.armRadius} rBottom={elbowR} y0={elbowY} y1={sleeveTopY} active={sleeve} />
            <Tube x={x} rTop={elbowR} rBottom={g.cuffRadius} y0={g.wristY} y1={elbowY} active={sleeve} />
          </group>
        );
      })}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, lapelBottom - 0.015 - i * 0.085, geo.waistRadius * 0.99]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.005, 12]} />
          <meshStandardMaterial color="#1b1b1d" roughness={0.45} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- guías de medición ---------- */

function ring(r: number, y: number, x = 0, n = 64): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [x + Math.sin(a) * r, y, Math.cos(a) * r] as Vec3;
  });
}

function Guide({ points, width = 3.5 }: { points: Vec3[]; width?: number }) {
  return <Line points={points} color={HIGHLIGHT_COLOR} lineWidth={width} />;
}

/** Guía resaltada del campo activo: aro, barra o línea sobre el saco. */
function ActiveGuide({ pose, field }: { pose: Pose; field: string }) {
  const g = pose.garment;
  const geo = useMemo(() => sacoGeometry(pose), [pose]);
  const off = 0.008;
  const rAt = (y: number) => radiusAt(geo.profile, y) + off;

  switch (field) {
    case "chest": {
      const y = (pose.chest.y0 + pose.chest.y1) / 2;
      return <Guide points={ring(rAt(y), y)} />;
    }
    case "waist":
      return <Guide points={ring(rAt(geo.waistLevel), geo.waistLevel)} />;
    case "hip":
      return <Guide points={ring(rAt(g.hipY), g.hipY)} />;
    case "arm_circ": {
      const y = g.shoulderY - 0.13;
      return (
        <>
          {([-1, 1] as const).map((s) => (
            <Guide key={s} points={ring(g.armRadius + off, y, s * geo.shoulderX)} />
          ))}
        </>
      );
    }
    case "shoulder_width": {
      const y = g.shoulderY + 0.03;
      return (
        <>
          <Guide points={[[-geo.shoulderX, y, 0], [geo.shoulderX, y, 0]]} width={4} />
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * geo.shoulderX, y, 0]}>
              <sphereGeometry args={[0.014, 12, 12]} />
              <meshBasicMaterial color={HIGHLIGHT_COLOR} />
            </mesh>
          ))}
        </>
      );
    }
    case "sleeve_length":
      return (
        <>
          {([-1, 1] as const).map((s) => {
            const topR = g.armRadius + off;
            const botR = g.cuffRadius + off;
            return (
              <Guide
                key={s}
                points={[
                  [s * (geo.shoulderX + topR), g.shoulderY - g.armRadius * 0.3, 0],
                  [s * (geo.shoulderX + (topR + botR) / 2), (g.shoulderY + g.wristY) / 2, 0],
                  [s * (geo.shoulderX + botR), g.wristY, 0],
                ]}
                width={4}
              />
            );
          })}
        </>
      );
    case "back_length": {
      const ys = Array.from({ length: 14 }, (_, i) => geo.hemY + ((geo.napeY - geo.hemY) * i) / 13);
      return <Guide points={ys.map((y) => [0, y, -(rAt(Math.min(y, g.shoulderY)) + 0.002)] as Vec3)} width={4} />;
    }
    case "back_width": {
      const y = g.shoulderY - 0.12;
      const half = 0.43 / 2;
      const z = -(rAt(y) + 0.002);
      return <Guide points={[[-half, y, z], [half, y, z]]} width={4} />;
    }
    default:
      return null;
  }
}

/* ---------- puntos de medición ---------- */

function hotspotPositions(pose: Pose): Record<string, Vec3> {
  const g = pose.garment;
  const geo = sacoGeometry(pose);
  const gap = 0.03;
  return {
    chest: [0, (pose.chest.y0 + pose.chest.y1) / 2, radiusAt(geo.profile, (pose.chest.y0 + pose.chest.y1) / 2) + gap],
    waist: [0, geo.waistLevel, radiusAt(geo.profile, geo.waistLevel) + gap],
    hip: [0, g.hipY, radiusAt(geo.profile, g.hipY) + gap],
    shoulder_width: [geo.shoulderX + 0.02, g.shoulderY + 0.02, 0.02],
    sleeve_length: [geo.shoulderX, g.wristY, g.cuffRadius + gap],
    back_length: [0, geo.hemY, -(geo.hemRadius + gap)],
  };
}

function Hotspot({ field, position, active, onActive }: { field: string; position: Vec3; active: boolean; onActive: (f: string) => void }) {
  const [hover, setHover] = useState(false);
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    onActive(field);
  };
  return (
    <group position={position}>
      <mesh onPointerOver={pick} onPointerOut={() => setHover(false)} onClick={(e) => { e.stopPropagation(); onActive(field); }}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh scale={active ? 1.6 : hover ? 1.3 : 1}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshStandardMaterial
          color={active ? GUIDE_COLOR : "#f5f1e8"}
          emissive={active ? GUIDE_COLOR : "#f5f1e8"}
          emissiveIntensity={active ? 0.6 : 0.15}
        />
      </mesh>
      {(hover || active) && (
        <Html center position={[0, 0.06, 0]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <div className="lm-tag">{FIELD_CONFIG[field]?.label ?? field}</div>
        </Html>
      )}
    </group>
  );
}

/* ---------- cámara ---------- */

function CameraRig({ view, controlsRef }: { view: { v: QuickView; n: number }; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.object.position.set(...VIEW_POSITIONS[view.v]);
    c.target.set(...TARGET);
    c.update();
  }, [view, controlsRef]);
  return null;
}

/* ---------- escena ---------- */

export interface SceneProps {
  pose: Pose;
  activeField: string | null;
  onActiveChange: (field: string) => void;
  view: { v: QuickView; n: number };
  autoRotate: boolean;
  paused: boolean;
  onInteract: () => void;
  onReady: () => void;
  onLost: () => void;
}

const MAX_VISIBLE_HEIGHT_M = 1.78;

export default function Scene({ pose, activeField, onActiveChange, view, autoRotate, paused, onInteract, onReady, onLost }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const fit = Math.min(1, MAX_VISIBLE_HEIGHT_M / Math.max(pose.heightM, 0.01));
  const spots = useMemo(() => hotspotPositions(pose), [pose]);

  return (
    <Canvas
      shadows
      frameloop={paused ? "never" : "always"}
      camera={{ position: VIEW_POSITIONS.front, fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); onLost(); });
        onReady();
      }}
    >
      <ambientLight intensity={1.0} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} shadow-normalBias={0.035} />
      <directionalLight position={[-2, 1.5, -1]} intensity={0.35} />
      <directionalLight position={[0, 1.2, 3]} intensity={0.45} />
      <directionalLight position={[0, 1.2, -3]} intensity={0.3} />
      <group scale={fit}>
        <Body pose={pose} />
        <Saco pose={pose} activeField={activeField} />
        {activeField && <ActiveGuide pose={pose} field={activeField} />}
        {Object.entries(spots).map(([field, position]) => (
          <Hotspot key={field} field={field} position={position} active={activeField === field} onActive={onActiveChange} />
        ))}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[1.4, 32]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
      <CameraRig view={view} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        target={TARGET}
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        onStart={onInteract}
      />
    </Canvas>
  );
}
