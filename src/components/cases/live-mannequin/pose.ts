/*
 * Geometría paramétrica del maniquí a partir de medidas en cm. Port reducido del
 * editor real (pose.ts): las proporciones fijas son constantes de estilo, no
 * antropometría; los segmentos escalan en vivo con cada medida.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const radiusM = (circumferenceCm: number) => circumferenceCm / (2 * Math.PI * 100);
const toM = (cm: number) => cm / 100;

const WAIST_BAND_H = 0.05;
const CHEST_H = 0.32;
const NECK_H = 0.08;
const HEAD_R = 0.1;
const UPPER_ARM_BASE_R = 0.045;
const ELBOW_BASE_R = 0.035;
export const SLEEVE_SPLIT = 0.46;
const KNEE_FRACTION = 0.48;
const LEG_X_FACTOR = 0.55;
const EASE = 1.06;

export type Vec3 = [number, number, number];

export interface Segment {
  radiusTop: number;
  radiusBottom: number;
  y0: number;
  y1: number;
}

export interface Pose {
  heightM: number;
  head: { radius: number; y: number };
  neck: Segment;
  chest: Segment;
  waistBand: Segment;
  pelvis: Segment;
  legs: Array<{ x: number; thigh: Segment; calf: Segment }>;
  arms: Array<{ x: number; upperArm: Segment; forearm: Segment }>;
  garment: {
    chestRadius: number;
    waistRadius: number;
    hemRadius: number;
    armRadius: number;
    cuffRadius: number;
    neckRadius: number;
    shoulderWidthM: number;
    sleeveM: number;
    backLengthM: number;
    shoulderY: number;
    waistY: number;
    crotchY: number;
    kneeY: number;
    hipY: number;
    wristY: number;
  };
}

export function computePose(m: Record<string, number>): Pose {
  const cm = (f: string) => m[f] ?? 0;

  const chestR = radiusM(cm("chest"));
  const waistR = radiusM(cm("waist"));
  const hipR = radiusM(cm("hip"));
  const neckR = radiusM(cm("neck"));
  const cuffR = radiusM(cm("cuff"));
  const thighR = radiusM(cm("thigh"));
  const kneeR = radiusM(cm("knee"));
  const hemR = radiusM(cm("hem"));

  const inseamM = toM(cm("inseam"));
  const riseM = toM(cm("rise"));
  const outseamM = toM(cm("outseam"));
  const sleeveM = toM(cm("sleeve_length"));
  const shoulderWidthM = toM(cm("shoulder_width"));

  const crotchY0 = inseamM;
  const waistY0 = crotchY0 + riseM;
  const legStretch = clamp(outseamM / (waistY0 || 1), 0.85, 1.18);
  const kneeY = crotchY0 * KNEE_FRACTION * legStretch;
  const crotchY = crotchY0 * legStretch;
  const waistY = waistY0 * legStretch;
  const legX = hipR * LEG_X_FACTOR;

  const chestY0 = waistY + WAIST_BAND_H;
  const chestY1 = chestY0 + CHEST_H;
  const neckY1 = chestY1 + NECK_H;
  const headY = neckY1 + HEAD_R * 0.9;

  const shoulderX = shoulderWidthM / 2;
  const shoulderY = chestY1;
  const elbowY = shoulderY - sleeveM * SLEEVE_SPLIT;
  const wristY = shoulderY - sleeveM;

  return {
    heightM: headY + HEAD_R,
    head: { radius: HEAD_R, y: headY },
    neck: { radiusTop: neckR, radiusBottom: neckR, y0: chestY1, y1: neckY1 },
    chest: { radiusTop: chestR, radiusBottom: waistR, y0: chestY0, y1: chestY1 },
    waistBand: { radiusTop: waistR, radiusBottom: waistR, y0: waistY, y1: waistY + WAIST_BAND_H },
    pelvis: { radiusTop: hipR, radiusBottom: hipR, y0: crotchY, y1: waistY },
    legs: ([-1, 1] as const).map((s) => ({
      x: s * legX,
      thigh: { radiusTop: thighR, radiusBottom: kneeR, y0: kneeY, y1: crotchY },
      calf: { radiusTop: kneeR, radiusBottom: hemR, y0: 0, y1: kneeY },
    })),
    arms: ([-1, 1] as const).map((s) => ({
      x: s * shoulderX,
      upperArm: { radiusTop: UPPER_ARM_BASE_R, radiusBottom: ELBOW_BASE_R, y0: elbowY, y1: shoulderY },
      forearm: { radiusTop: ELBOW_BASE_R, radiusBottom: cuffR, y0: wristY, y1: elbowY },
    })),
    garment: {
      chestRadius: chestR * EASE,
      waistRadius: waistR * EASE,
      hemRadius: radiusM(cm("hem_circ")) * EASE,
      armRadius: radiusM(cm("arm_circ")) * EASE,
      cuffRadius: cuffR * EASE,
      neckRadius: neckR * EASE,
      shoulderWidthM,
      sleeveM,
      backLengthM: toM(cm("back_length")),
      shoulderY,
      waistY,
      crotchY,
      kneeY,
      hipY: (crotchY + waistY) / 2,
      wristY,
    },
  };
}
