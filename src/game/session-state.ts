/** Bounded checkpoints. Invalid lesson data is dropped without discarding earned progress. */
import { FOREST, SKILL_NAMES } from "../content/forest.ts";
import { FINDS } from "../content/glade.ts";
import { voiceLines } from "../content/voice.ts";
import { SKILLS_BY_LEVEL } from "./tasks.ts";
import type { Task, Level } from "./tasks.ts";
export type TaskDraft = {
  mistakes: number;
  hintStage: number;
  used: number[];
  off: string[];
  picked: string | null;
  complete: boolean;
};
export type LessonSession = {
  id: string;
  mode: "story" | "practice" | "glade";
  target: string;
  level: Level;
  round: Task[];
  step: number;
  phase: "task" | "reward";
  mistakes: number;
  draft: TaskDraft;
  reward: { first: boolean; toPlace: boolean; find?: string; all?: boolean } | null;
};
export const emptyDraft = (): TaskDraft => ({
  mistakes: 0,
  hintStage: 0,
  used: [],
  off: [],
  picked: null,
  complete: false,
});
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const int = (v: unknown, max = 1000): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const text = (v: unknown, max = 200): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const key = (v: unknown): v is string => text(v, 80) && /^[a-zA-Z0-9_-]+$/.test(v);
const voices = new Set(Object.keys(voiceLines()));
function piecesCover(target: unknown[], pieces: unknown[]) {
  const remaining = [...pieces];
  return target.every((p) => {
    const i = remaining.indexOf(p);
    if (i < 0) return false;
    remaining.splice(i, 1);
    return true;
  });
}
function isTask(value: unknown): value is Task {
  const t = record(value);
  if (!Object.hasOwn(SKILL_NAMES, String(t.skill)) || !["choice", "build"].includes(String(t.kind)))
    return false;
  for (const k of ["prompt", "hint"])
    if (
      !Array.isArray(t[k]) ||
      !(t[k] as unknown[]).length ||
      (t[k] as unknown[]).length > 12 ||
      !(t[k] as unknown[]).every((v) => typeof v === "string" && voices.has(v))
    )
      return false;
  if (t.word !== undefined && !key(t.word)) return false;
  if (t.kind === "build")
    return (
      key(t.pic) &&
      ["letter", "syllable"].includes(String(t.unit)) &&
      typeof t.ghost === "boolean" &&
      Array.isArray(t.target) &&
      t.target.length > 0 &&
      t.target.length <= 16 &&
      t.target.every((v) => text(v, 16)) &&
      Array.isArray(t.pieces) &&
      t.pieces.length >= t.target.length &&
      t.pieces.length <= 24 &&
      t.pieces.every((v) => text(v, 16)) &&
      piecesCover(t.target, t.pieces)
    );
  if (
    !["letters", "pictures", "numbers", "words", "signs", "groups", "syllables"].includes(
      String(t.layout),
    ) ||
    !Array.isArray(t.options) ||
    t.options.length < 2 ||
    t.options.length > 8
  )
    return false;
  if (
    !t.options.every((raw) => {
      const o = record(raw);
      return (
        text(o.id, 80) &&
        (o.label === undefined || text(o.label)) &&
        (o.pic === undefined || key(o.pic)) &&
        (o.say === undefined || voices.has(String(o.say))) &&
        (o.count === undefined || int(o.count, 100))
      );
    })
  )
    return false;
  if (new Set(t.options.map((raw) => record(raw).id)).size !== t.options.length) return false;
  if (!t.options.some((raw) => record(raw).id === t.answer)) return false;
  const v = record(t.visual);
  switch (v.type) {
    case "listen":
      return true;
    case "picture":
      return key(v.pic) && (v.text === undefined || text(v.text));
    case "word":
    case "sentence":
      return text(v.text);
    case "count":
      return key(v.pic) && int(v.n, 100) && ["loose", "rows", "tens"].includes(String(v.mode));
    case "math":
      return (
        int(v.a, 200) &&
        int(v.b, 200) &&
        ["+", "-"].includes(String(v.op)) &&
        (v.c === undefined || int(v.c, 200)) &&
        (v.op2 === undefined || ["+", "-"].includes(String(v.op2))) &&
        (v.pic === undefined || key(v.pic))
      );
    case "compare":
      return text(v.left, 20) && text(v.right, 20);
    default:
      return false;
  }
}
export function parseSession(value: unknown, level: Level): LessonSession | null {
  const s = record(value);
  if (
    !key(s.id) ||
    !["story", "practice", "glade"].includes(String(s.mode)) ||
    s.level !== level ||
    !int(s.step, 4) ||
    !int(s.mistakes) ||
    !["task", "reward"].includes(String(s.phase))
  )
    return null;
  if (
    s.mode === "story"
      ? !FOREST.some((x) => x.id === s.target)
      : s.mode === "practice"
        ? !Object.hasOwn(SKILL_NAMES, String(s.target))
        : s.target !== "mixed"
  )
    return null;
  if (!Array.isArray(s.round) || s.round.length !== 5 || !s.round.every(isTask)) return null;
  if (
    level === 1 &&
    s.round.some(
      (t) =>
        t.skill === "add" || t.skill === "sub" || (t.kind === "choice" && t.visual.type === "math"),
    )
  )
    return null;
  if (
    s.mode === "practice" &&
    !SKILLS_BY_LEVEL[level].includes(s.target as keyof typeof SKILL_NAMES)
  )
    return null;
  const task = s.round[s.step],
    d = record(s.draft);
  if (
    !int(d.mistakes) ||
    !int(d.hintStage, 3) ||
    typeof d.complete !== "boolean" ||
    !Array.isArray(d.used) ||
    d.used.length > 16 ||
    !Array.isArray(d.off) ||
    d.off.length > 8
  )
    return null;
  if (
    new Set(d.used).size !== d.used.length ||
    !d.used.every(
      (i, j) => int(i, 23) && task.kind === "build" && task.pieces[i] === task.target[j],
    )
  )
    return null;
  if (
    !d.off.every(
      (id) => task.kind === "choice" && task.options.some((o) => o.id === id && id !== task.answer),
    )
  )
    return null;
  if (d.picked !== null && !(task.kind === "choice" && d.picked === task.answer)) return null;
  if (
    d.complete &&
    (task.kind === "build" ? d.used.length !== task.target.length : d.picked !== task.answer)
  )
    return null;
  if (
    !d.complete &&
    (task.kind === "build" ? d.used.length === task.target.length : d.picked !== null)
  )
    return null;
  const r = record(s.reward);
  if (
    s.phase === "reward" &&
    (s.step !== 4 ||
      typeof r.first !== "boolean" ||
      typeof r.toPlace !== "boolean" ||
      (s.mode !== "story" && !FINDS.some((f) => f.id === r.find)))
  )
    return null;
  return {
    id: s.id,
    mode: s.mode as LessonSession["mode"],
    target: s.target as string,
    level,
    round: s.round,
    step: s.step,
    phase: s.phase as LessonSession["phase"],
    mistakes: s.mistakes,
    draft: {
      mistakes: d.mistakes,
      hintStage: d.hintStage,
      used: d.used as number[],
      off: d.off as string[],
      picked: d.picked as string | null,
      complete: d.complete,
    },
    reward:
      s.phase === "reward"
        ? {
            first: r.first as boolean,
            toPlace: r.toPlace as boolean,
            ...(s.mode !== "story" ? { find: r.find as string, all: r.all === true } : {}),
          }
        : null,
  };
}
export const sessionLocation = (s: LessonSession) =>
  s.mode === "story"
    ? `/forest/${s.target}`
    : s.mode === "practice"
      ? `/practice/${s.target}`
      : "/glade";
