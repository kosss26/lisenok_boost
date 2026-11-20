/** Versioned, bounded save format shared by local storage and portable backups. */
import { NAMES } from "../content/names.ts";
import { findStop } from "../content/worlds.ts";
import { FOREST, SKILL_NAMES } from "../content/forest.ts";
import type { Progress, SkillStat, WordStat } from "./progress.ts";

import { parseSession } from "./session-state.ts";

export const SAVE_VERSION = 3;
export type Profile = { label: string; progress: Progress };
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const number = (v: unknown, fallback = 0, lo = 0, hi = 1e7) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
const count = (v: unknown) => Math.floor(number(v));
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);
const entries = (v: unknown) =>
  Object.entries(obj(v))
    .filter(([k]) => /^[\w-]{1,80}$/.test(k))
    .slice(0, 5000);
const counts = (v: unknown) =>
  Object.fromEntries(
    entries(v)
      .filter(([, n]) => typeof n === "number")
      .map(([k, n]) => [k, count(n)]),
  );
const strings = (v: unknown) =>
  Array.isArray(v)
    ? [
        ...new Set(v.filter((s): s is string => typeof s === "string" && /^[\w-]{1,80}$/.test(s))),
      ].slice(0, 1000)
    : [];

export function freshProgress(): Progress {
  return {
    session: null,
    intro: false,
    setupDone: false,
    done: {},
    gifts: [],
    recent: [],
    adapt: 0,
    skills: {},
    words: {},
    settings: {
      name: null,
      level: 1,
      auto: true,
      autoHints: true,
      difficulty: "medium",
      limit: 0,
      volume: { voice: 1, sounds: 0.8, music: 0.5 },
    },
    playLog: {},
    extra: {},
    forestCelebrated: false,
    seaCelebrated: false,
    finds: {},
    opened: [],
    sky: {},
  };
}

export function normalizeProgress(value: unknown): Progress {
  const v = obj(value),
    s = obj(v.settings),
    volume = obj(s.volume);
  const p = freshProgress();
  p.intro = bool(v.intro);
  p.done = counts(v.done);
  p.setupDone = bool(v.setupDone, p.intro || Object.values(p.done).some((n) => n > 0));
  p.gifts = strings(v.gifts);
  p.opened = strings(v.opened);
  p.recent = Array.isArray(v.recent) ? v.recent.slice(-3).map(count) : [];
  p.adapt = number(v.adapt, 0, -0.45, 0.15);
  p.forestCelebrated = bool(v.forestCelebrated);
  p.seaCelebrated = bool(v.seaCelebrated);
  p.finds = counts(v.finds);
  p.playLog = counts(v.playLog);
  p.extra = counts(v.extra);
  p.settings = {
    name: NAMES.some((n) => n.id === s.name) ? (s.name as string) : null,
    level: s.level === 2 || s.level === 3 ? s.level : 1,
    auto: bool(s.auto, true),
    autoHints: bool(s.autoHints, true),
    difficulty: s.difficulty === "easy" || s.difficulty === "hard" ? s.difficulty : "medium",
    limit: Math.round(number(s.limit, 0, 0, 180)),
    volume: Object.fromEntries(
      Object.entries(p.settings.volume).map(([k, fallback]) => [
        k,
        number(volume[k], fallback, 0, 1),
      ]),
    ) as Progress["settings"]["volume"],
  };
  p.session = parseSession(v.session, p.settings.level);
  if (p.session?.mode === "story") {
    const found = findStop(p.session.target);
    if (
      !found ||
      found.world.stops.slice(0, found.index).some((s) => !p.done[s.id]) ||
      (found.world.id === "sea" && FOREST.some((s) => !p.done[s.id]))
    )
      p.session = null;
  }
  if (p.session?.mode === "glade" && FOREST.some((s) => !p.done[s.id])) p.session = null;
  p.skills = Object.fromEntries(
    entries(v.skills)
      .filter(([k]) => Object.hasOwn(SKILL_NAMES, k))
      .map(([k, raw]) => {
        const x = obj(raw),
          tasks = count(x.tasks);
        const stat: SkillStat = {
          tasks,
          firstTry: Math.min(tasks, count(x.firstTry)),
          mistakes: count(x.mistakes),
          hints: Math.min(tasks, count(x.hints)),
        };
        // Historical firstTry included hints. Keep it as history; never invent new independent answers.
        if (typeof x.measured === "number") {
          stat.measured = Math.min(tasks, count(x.measured));
          stat.independent = Math.min(stat.measured, count(x.independent));
          stat.assisted = Math.min(stat.measured - stat.independent, count(x.assisted));
          stat.retried = stat.measured - stat.independent - stat.assisted;
        }
        return [k, stat];
      }),
  );
  p.words = Object.fromEntries(
    entries(v.words).map(([k, raw]) => {
      const x = obj(raw),
        seen = count(x.seen);
      const stat: WordStat = {
        seen,
        miss: count(x.miss),
        hints: Math.min(seen, count(x.hints)),
        streak: Math.min(seen, count(x.streak)),
      };
      return [k, stat];
    }),
  );
  p.sky = Object.fromEntries(
    entries(v.sky).flatMap(([k, xy]) =>
      Array.isArray(xy) &&
      xy.length === 2 &&
      xy.every((n) => typeof n === "number" && Number.isFinite(n))
        ? [[k, [number(xy[0], 50, 4, 96), number(xy[1], 50, 4, 96)]]]
        : [],
    ),
  );
  return p;
}

export function parseSave(raw: string): {
  activeProfile: string;
  profiles: Record<string, Profile>;
} {
  if (raw.length > 2_000_000) throw new Error("Файл слишком большой (максимум 2 МБ)");
  const v = obj(JSON.parse(raw));
  if (
    v.schemaVersion !== undefined &&
    v.schemaVersion !== 1 &&
    v.schemaVersion !== 2 &&
    v.schemaVersion !== SAVE_VERSION
  )
    throw new Error("Версия сохранения не поддерживается. Обновите игру.");
  if (v.profiles !== undefined) {
    const rows = entries(v.profiles);
    if (!rows.length || rows.length > 6 || !rows.some(([id]) => id === v.activeProfile))
      throw new Error("Некорректный список профилей");
    const profiles = Object.fromEntries(
      rows.map(([id, raw]) => {
        const x = obj(raw);
        if (typeof x.label !== "string" || !x.label.trim() || !Object.keys(obj(x.progress)).length)
          throw new Error("Профиль повреждён");
        return [
          id,
          { label: x.label.trim().slice(0, 40), progress: normalizeProgress(x.progress) },
        ];
      }),
    );
    return { activeProfile: v.activeProfile as string, profiles };
  }
  if (!["intro", "done", "settings"].some((k) => Object.hasOwn(v, k)))
    throw new Error("Это не резервная копия игры «Лисёнок»");
  return {
    activeProfile: "child-1",
    profiles: { "child-1": { label: "Ребёнок 1", progress: normalizeProgress(v) } },
  };
}
