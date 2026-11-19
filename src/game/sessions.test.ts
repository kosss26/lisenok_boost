import { test } from "node:test";
import assert from "node:assert/strict";
import { FOREST } from "../content/forest.ts";
import { makeRound, SKILLS_BY_LEVEL, type Level } from "./tasks.ts";
import { emptyDraft, parseSession } from "./session-state.ts";
import { freshProgress, normalizeProgress, parseSave } from "./save.ts";
import {
  getProgress,
  importSave,
  exportSave,
  addProfile,
  getActiveProfile,
  switchProfile,
  setSettings,
} from "./progress.ts";
import { startSession, checkpoint, completeSessionTask } from "./sessions.ts";
const reset = () => importSave(JSON.stringify({ intro: true, settings: { auto: false } }));
test("generated lessons at every age and skill survive checkpoint validation", () => {
  for (const level of [1, 2, 3] as Level[])
    for (const skill of SKILLS_BY_LEVEL[level])
      for (const g of [0, 0.5, 1]) {
        const s = {
          id: "test",
          mode: "practice",
          target: skill,
          level,
          round: makeRound(skill, { level, g }),
          step: 0,
          phase: "task",
          mistakes: 0,
          draft: emptyDraft(),
          reward: null,
        };
        assert.ok(parseSession(s, level), `${level}/${skill}/${g}`);
      }
});
test("partial word, mistakes and hints survive a backup and profile switch", () => {
  reset();
  const s = startSession("practice", "build"),
    task = s.round[0];
  assert.equal(task.kind, "build");
  if (task.kind !== "build") return;
  const used = [task.pieces.indexOf(task.target[0])];
  checkpoint(s.id, 0, { used, mistakes: 2, hintStage: 2 });
  const first = getActiveProfile();
  addProfile("Другой");
  assert.equal(getProgress().session, null);
  switchProfile(first);
  importSave(exportSave());
  assert.deepEqual(getProgress().session?.draft, {
    ...emptyDraft(),
    used,
    mistakes: 2,
    hintStage: 2,
  });
  assert.deepEqual(getProgress().session?.round, s.round);
  setSettings({ level: 2 });
  assert.equal(getProgress().session, null);
});
test("completed answer is recorded once and reward reload cannot duplicate stars or stats", () => {
  reset();
  const s = startSession("story", FOREST[0].id);
  for (let i = 0; i < 5; i++) {
    const task = getProgress().session!.round[i];
    checkpoint(s.id, i, {
      complete: true,
      ...(task.kind === "choice"
        ? { picked: task.answer }
        : {
            used: task.target.map((p, j) =>
              task.pieces.findIndex(
                (x, k) =>
                  x === p &&
                  !task.target
                    .slice(0, j)
                    .map((v, l) => task.pieces.indexOf(v, l))
                    .includes(k),
              ),
            ),
          }),
    });
    completeSessionTask(s.id, i, 0, false);
    completeSessionTask(s.id, i, 0, false);
  }
  assert.equal(getProgress().done.hedgehog, 1);
  assert.equal(getProgress().skills.letters?.tasks, 5);
  importSave(exportSave());
  assert.equal(getProgress().session?.phase, "reward");
  completeSessionTask(s.id, 4, 0, false);
  assert.equal(getProgress().done.hedgehog, 1);
  assert.equal(getProgress().skills.letters?.tasks, 5);
  startSession("practice", "read");
  assert.ok(getProgress().sky.hedgehog, "unplaced earned star is preserved");
});
test("practice awards finds without opening the story path", () => {
  reset();
  const s = startSession("practice", "read");
  for (let i = 0; i < 5; i++) completeSessionTask(s.id, i, 0, false);
  assert.deepEqual(getProgress().done, {});
  assert.deepEqual(getProgress().gifts, []);
  assert.equal(
    Object.values(getProgress().finds).reduce((a, b) => a + b, 0),
    1,
  );
  importSave(exportSave());
  assert.equal(getProgress().session?.phase, "reward");
  completeSessionTask(s.id, 4, 0, false);
  assert.equal(
    Object.values(getProgress().finds).reduce((a, b) => a + b, 0),
    1,
  );
});
test("bad checkpoints are dropped while earned progress and v2 saves survive", () => {
  reset();
  startSession("practice", "build");
  const p = structuredClone(getProgress());
  p.done.hedgehog = 1;
  p.session!.draft.used = [999];
  assert.equal(normalizeProgress(p).session, null);
  assert.equal(normalizeProgress(p).done.hedgehog, 1);
  const old = parseSave(
    JSON.stringify({ ...freshProgress(), schemaVersion: 2, intro: true, done: { hedgehog: 1 } }),
  );
  assert.equal(old.profiles[old.activeProfile].progress.done.hedgehog, 1);
  assert.throws(() => startSession("practice", "add"));
});
