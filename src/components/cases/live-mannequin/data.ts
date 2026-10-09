/* Datos de muestra del maniquí en vivo. Medidas inventadas (cm), cliente ficticio. */

export const BODY_COLOR = "#cfc3a3";
export const BODY_COLOR_SUBDUED = "#a89e86";
export const GUIDE_COLOR = "#E8D090";
export const HIGHLIGHT_COLOR = "#f4d35e";
export const GARMENT_COLOR = "#28374f";

export interface FieldConfig {
  label: string;
  typicalMin: number;
  typicalMax: number;
}

/** Rangos habituales y etiquetas, tomados del editor real. */
export const FIELD_CONFIG: Record<string, FieldConfig> = {
  chest: { label: "Pecho", typicalMin: 80, typicalMax: 140 },
  waist: { label: "Cintura", typicalMin: 60, typicalMax: 130 },
  hip: { label: "Cadera", typicalMin: 80, typicalMax: 140 },
  shoulder_width: { label: "Hombro a hombro", typicalMin: 38, typicalMax: 56 },
  sleeve_length: { label: "Manga", typicalMin: 55, typicalMax: 70 },
  back_length: { label: "Largo", typicalMin: 66, typicalMax: 80 },
  back_width: { label: "Espalda", typicalMin: 34, typicalMax: 50 },
  arm_circ: { label: "Contorno de brazo", typicalMin: 26, typicalMax: 42 },
};

/** Medidas que se muestran como chips, en el orden del editor. */
export const CHIP_FIELDS = [
  "chest",
  "waist",
  "hip",
  "shoulder_width",
  "sleeve_length",
  "back_length",
  "back_width",
  "arm_circ",
] as const;

export type ChipField = (typeof CHIP_FIELDS)[number];

/** Medidas de Juan Pérez (inventadas). Incluye las del cuerpo que no se muestran como chip. */
export const SAMPLE_MEASUREMENTS: Record<string, number> = {
  chest: 102,
  waist: 90,
  hip: 103,
  shoulder_width: 46.5,
  shoulder_seam: 15,
  sleeve_length: 64,
  back_length: 74,
  back_width: 43,
  hem_circ: 100,
  arm_circ: 33,
  cuff: 24,
  neck: 39,
  thigh: 58,
  knee: 38,
  hem: 40,
  inseam: 81,
  outseam: 106,
  rise: 28,
};

/** Medidas "confirmadas" por el sastre (el resto son sugeridas por altura). */
export const CONFIRMED_SAMPLE: ReadonlySet<string> = new Set(["chest", "waist", "shoulder_width", "sleeve_length"]);

export type QuickView = "front" | "back" | "profile";

export const VIEW_LABELS: Record<QuickView, string> = {
  front: "Frente",
  back: "Espalda",
  profile: "Lado",
};
