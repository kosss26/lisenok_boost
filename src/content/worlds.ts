/** The playable worlds in order: each opens when the one before it is finished. */
import { FOREST, timeOf, type Stop, type TimeOfDay, type Weather } from "./forest.ts";
import { SEA } from "./sea.ts";

export type WorldId = "forest" | "sea";
export type World = {
  id: WorldId;
  /** «Лес» */
  name: string;
  stops: Stop[];
  /** path pictures: the entrance (below) and the far part (above); the stop screen background */
  bg: [string, string];
  stopBg: string;
  /**
   * where the world sits on the difficulty scale inside the age level (at «средне»): the forest
   * rises from 0 to 0.7, the sea starts a little lower than the forest ended and climbs to 1
   */
  span: [number, number];
  weather: (i: number) => Weather;
  time: (i: number) => TimeOfDay;
  /** voice lines: «who do we help?», all stars collected */
  say: { next: string; done: string };
  /** the celebration card when all its stars are back */
  done: { title: string; text: string };
  /** the album section title */
  album: string;
};

export const WORLD: Record<WorldId, World> = {
  forest: {
    id: "forest",
    name: "Лес",
    stops: FOREST,
    bg: ["bg-forest", "bg-forest-2"],
    stopBg: "bg-clearing",
    span: [0, 0.7],
    // a short shower in the middle of the path (stops 8–9), mist in the evening (13–14)
    weather: (i) => (i === 7 || i === 8 ? "rain" : i === 12 || i === 13 ? "fog" : "clear"),
    time: timeOf,
    say: { next: "forest-next", done: "forest-done" },
    done: {
      title: "Звёзды вернулись на небо!",
      text: "Весь лес сияет. Теперь лисёнок может отправиться к морю!",
    },
    album: "Лес",
  },
  sea: {
    id: "sea",
    name: "Море",
    stops: SEA,
    bg: ["bg-sea", "bg-sea-2"],
    stopBg: "bg-shore",
    span: [0.5, 1],
    // morning sea mist at the tide pools (stops 4–5), a shower on the rocky coast (14–15)
    weather: (i) => (i === 3 || i === 4 ? "fog" : i === 13 || i === 14 ? "rain" : "clear"),
    time: timeOf,
    say: { next: "sea-next", done: "sea-done" },
    done: {
      title: "Море сияет!",
      text: "Все морские звёзды снова на небе. Скоро лисёнок отправится в горы.",
    },
    album: "Море",
  },
};
export const WORLD_LIST: World[] = [WORLD.forest, WORLD.sea];
export const ALL_STOPS: Stop[] = WORLD_LIST.flatMap((w) => w.stops);

/** the world a stop belongs to and its place on that world's path */
export function findStop(id: string): { world: World; index: number; stop: Stop } | null {
  for (const world of WORLD_LIST) {
    const index = world.stops.findIndex((s) => s.id === id);
    if (index !== -1) return { world, index, stop: world.stops[index] };
  }
  return null;
}

/** The age-specific dialogue and the task skill must agree (especially the later sea stops). */
export const storySkill = (stop: Stop, level: 1 | 2 | 3) =>
  level === 1 && stop.young ? stop.young.skill : stop.skill;
