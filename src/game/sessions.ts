import { type Skill } from "../content/forest.ts";
import { ALL_STOPS, findStop, storySkill } from "../content/worlds.ts";
import { FINDS, nextFind } from "../content/glade.ts";
import { makeRound, makePractice, SKILLS_BY_LEVEL } from "./tasks.ts";
import { emptyDraft, type LessonSession, type TaskDraft } from "./session-state.ts";
import {
  getProgress,
  update,
  withRecordedTask,
  tuneFor,
  gladeGrade,
  weakWordIds,
  weakSkills,
  nextAdapt,
  freeSkySpot,
  worldOpen,
  stopOpen,
} from "./progress.ts";

export function startSession(mode: LessonSession["mode"], target: string): LessonSession {
  let p = getProgress();
  if (
    mode === "story"
      ? !ALL_STOPS.some((s) => s.id === target)
      : mode === "practice"
        ? !SKILLS_BY_LEVEL[p.settings.level].includes(target as Skill)
        : target !== "mixed"
  )
    throw new Error("Неизвестное занятие");
  if (mode === "story") {
    const found = findStop(target)!;
    if (!worldOpen(p, found.world.id) || !stopOpen(p, found.index, found.world.stops))
      throw new Error("Сначала закончи предыдущие остановки");
  }
  if (p.session?.phase === "reward" && p.session.mode === "story" && !p.sky[p.session.target])
    p = {
      ...p,
      sky: {
        ...p.sky,
        [p.session.target]: freeSkySpot(
          p,
          ALL_STOPS.findIndex((s) => s.id === p.session!.target) + 1,
        ),
      },
    };
  const base = p;
  const found = findStop(target);
  const tune =
    mode === "story"
      ? tuneFor(p, found!.index, found!.world)
      : { level: p.settings.level, g: gladeGrade(p) };
  const round =
    mode === "glade"
      ? makePractice(tune, weakSkills(p), weakWordIds(p))
      : makeRound(
          mode === "story" ? storySkill(found!.stop, p.settings.level) : (target as Skill),
          tune,
          Math.random,
          weakWordIds(p),
        );
  const session: LessonSession = {
    id: crypto.randomUUID(),
    mode,
    target,
    level: p.settings.level,
    round,
    step: 0,
    phase: "task",
    mistakes: 0,
    draft: emptyDraft(),
    reward: null,
  };
  update(() => ({ ...base, session }));
  return session;
}
export function checkpoint(id: string, step: number, patch: Partial<TaskDraft>) {
  update((p) =>
    p.session?.id === id && p.session.step === step && p.session.phase === "task"
      ? { ...p, session: { ...p.session, draft: { ...p.session.draft, ...patch } } }
      : p,
  );
}
export function clearSession(id: string) {
  update((p) => (p.session?.id === id ? { ...p, session: null } : p));
}
/** Record statistics, advance the checkpoint and award the round in one storage write. */
export function completeSessionTask(
  id: string,
  expectedStep: number,
  mistakes: number,
  hinted: boolean,
) {
  update((p) => {
    const s = p.session;
    if (!s || s.id !== id || s.step !== expectedStep || s.phase !== "task") return p;
    const task = s.round[s.step],
      m = Math.max(mistakes, s.draft.mistakes),
      h = hinted || s.draft.hintStage > 0;
    let next = withRecordedTask(p, task.skill, m, h, task.word);
    const total = s.mistakes + m + (h && m === 0 ? 1 : 0);
    if (s.step < 4) {
      let round = s.round;
      if (s.mode === "story" && m > 0 && p.settings.auto) {
        next = {
          ...next,
          adapt: Math.max(-0.45, Math.round((next.adapt - Math.min(0.15, 0.05 * m)) * 100) / 100),
        };
        const found = findStop(s.target)!;
        const easier = makeRound(
          storySkill(found.stop, next.settings.level),
          tuneFor(next, found.index, found.world),
          Math.random,
          weakWordIds(next),
        );
        round = [...s.round.slice(0, s.step + 1), ...easier.slice(s.step + 1)];
      }
      return {
        ...next,
        session: { ...s, round, step: s.step + 1, mistakes: total, draft: emptyDraft() },
      };
    }
    if (s.mode === "story") {
      const stop = ALL_STOPS.find((x) => x.id === s.target)!;
      next = {
        ...next,
        done: { ...next.done, [s.target]: (next.done[s.target] ?? 0) + 1 },
        gifts: next.gifts.includes(stop.gift) ? next.gifts : [...next.gifts, stop.gift],
        recent: [...next.recent, total].slice(-3),
        adapt: p.settings.auto ? nextAdapt(next.adapt, total) : next.adapt,
      };
      return {
        ...next,
        session: {
          ...s,
          phase: "reward",
          mistakes: total,
          reward: { first: !p.done[s.target], toPlace: !p.sky[s.target] },
        },
      };
    }
    const f = nextFind(p.finds),
      all = FINDS.every((x) => x.id === f.id || p.finds[x.id]) && !p.finds[f.id];
    return {
      ...next,
      finds: { ...p.finds, [f.id]: (p.finds[f.id] ?? 0) + 1 },
      session: {
        ...s,
        phase: "reward",
        mistakes: total,
        reward: { first: true, toPlace: false, find: f.id, all },
      },
    };
  });
}
