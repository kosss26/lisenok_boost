// Bones of the fox pictures for the live (mesh) animation in src/game/live.ts.
// All points are % of the picture (x of its width, y of its height); radii are % of its height.
// To rig a new pose: open the picture over a 5 % grid and read the points off it.
import type { FoxPose } from "../components/kit";

export type Pt = readonly [number, number];
/** a limb that bends from `base` towards `tip`; `r` — how thick it is */
export type Limb = { base: Pt; tip: Pt; r: number };
export type Eye = { c: Pt; rx: number; ry: number };
export type Rig = {
  /** the picture's size in pixels (its proportions keep the layout before it loads) */
  size: readonly [number, number];
  /** stays put while the body breathes */
  feet: Pt;
  /** the head turns around the neck; everything within `r` of `c` turns with it */
  head: { neck: Pt; c: Pt; r: number };
  ears: Limb[];
  tail?: Limb;
  /** arms that move: "wave" — hello, "cheer" — both up and happy, "point" — a small nudge */
  arms?: (Limb & { move: "wave" | "cheer" | "point" })[];
  /** open eyes that blink (the cheer pose has them shut already) */
  eyes?: Eye[];
  /** the colour of the fur on the eyelids */
  lid?: readonly [number, number, number];
  /** a lively pose: quicker tail */
  lively?: boolean;
};

const FUR = [245, 140, 36] as const;

export const FOX_RIGS: Record<FoxPose, Rig> = {
  wave: {
    size: [372, 537],
    feet: [48, 97],
    head: { neck: [48, 43], c: [48, 26], r: 24 },
    ears: [
      { base: [28, 20], tip: [24, 4], r: 7 },
      { base: [70, 20], tip: [79, 6], r: 7 },
    ],
    tail: { base: [66, 82], tip: [94, 76], r: 10 },
    arms: [{ base: [31, 48], tip: [11, 33], r: 8, move: "wave" }],
    eyes: [
      { c: [40, 29.2], rx: 4.8, ry: 4 },
      { c: [58.4, 30], rx: 4.6, ry: 4 },
    ],
    lid: FUR,
  },
  walk: {
    size: [407, 529],
    feet: [55, 96],
    head: { neck: [60, 43], c: [64, 27], r: 22 },
    ears: [
      { base: [40, 20], tip: [35, 9], r: 6 },
      { base: [75, 16], tip: [80, 4], r: 6 },
    ],
    tail: { base: [34, 68], tip: [5, 57], r: 10 },
    eyes: [
      { c: [61, 31.5], rx: 4, ry: 4 },
      { c: [78, 29.5], rx: 3.6, ry: 3.8 },
    ],
    lid: FUR,
    lively: true,
  },
  cheer: {
    size: [408, 501],
    feet: [48, 96],
    head: { neck: [48, 41], c: [48, 26], r: 22 },
    ears: [
      { base: [35, 17], tip: [29, 4], r: 6 },
      { base: [68, 18], tip: [75, 9], r: 6 },
    ],
    tail: { base: [66, 78], tip: [94, 60], r: 10 },
    arms: [
      { base: [29, 43], tip: [8, 25], r: 7, move: "cheer" },
      { base: [67, 43], tip: [88, 30], r: 7, move: "cheer" },
    ],
    lively: true,
  },
  point: {
    size: [397, 490],
    feet: [50, 95],
    head: { neck: [47, 41], c: [48, 27], r: 22 },
    ears: [
      { base: [36, 18], tip: [32, 4], r: 6 },
      { base: [70, 18], tip: [77, 9], r: 6 },
    ],
    tail: { base: [70, 76], tip: [95, 58], r: 10 },
    arms: [{ base: [31, 46], tip: [5, 33], r: 7, move: "point" }],
    eyes: [
      { c: [33.6, 29], rx: 3.6, ry: 3.8 },
      { c: [48, 30.5], rx: 3.6, ry: 3.8 },
    ],
    lid: FUR,
  },
  think: {
    size: [342, 512],
    feet: [50, 96],
    head: { neck: [57, 43], c: [58, 28], r: 22 },
    ears: [
      { base: [32, 22], tip: [21, 13], r: 6 },
      { base: [68, 17], tip: [73, 3], r: 6 },
    ],
    tail: { base: [32, 79], tip: [5, 81], r: 9 },
    eyes: [
      { c: [57, 31.5], rx: 4.2, ry: 3.8 },
      { c: [76, 26.7], rx: 4, ry: 3.6 },
    ],
    lid: FUR,
  },
  read: {
    size: [390, 458],
    feet: [55, 93],
    head: { neck: [58, 47], c: [58, 32], r: 22 },
    ears: [
      { base: [35, 18], tip: [31, 4], r: 6 },
      { base: [72, 20], tip: [80, 7], r: 6 },
    ],
    tail: { base: [30, 78], tip: [8, 86], r: 10 },
    eyes: [
      { c: [51, 36], rx: 3.8, ry: 4 },
      { c: [67, 36.5], rx: 3.6, ry: 4 },
    ],
    lid: FUR,
  },
  jump: {
    size: [541, 452],
    feet: [55, 70],
    head: { neck: [60, 43], c: [63, 28], r: 20 },
    ears: [
      { base: [46, 20], tip: [41.5, 7], r: 5 },
      { base: [57, 18], tip: [55, 3.6], r: 5 },
    ],
    tail: { base: [33, 62], tip: [5, 45], r: 10 },
    eyes: [{ c: [64, 29.5], rx: 3, ry: 4 }],
    lid: FUR,
    lively: true,
  },
};
