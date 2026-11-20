import { test } from "node:test";
import assert from "node:assert/strict";
import { freshProgress, normalizeProgress, parseSave, SAVE_VERSION } from "./save.ts";
import {
  getProgress,
  importSave,
  recordTask,
  weakSkills,
  addProfile,
  switchProfile,
  getActiveProfile,
  exportSave,
} from "./progress.ts";
import { helpTiming } from "./help-timing.ts";

test("malformed saves cannot inject settings, arrays or impossible counters", () => {
  const p = normalizeProgress({
    settings: {
      level: 99,
      difficulty: "invalid",
      auto: "yes",
      volume: { voice: -20, music: 50, sounds: null },
    },
    done: [],
    words: { cat: { seen: 2, hints: 8, streak: 9 } },
    skills: { add: { tasks: 2, firstTry: 8 } },
    sky: { cat: [Infinity, 2], dog: [-20, 200] },
    adapt: -100,
  });
  assert.equal(p.settings.level, 1);
  assert.equal(p.settings.difficulty, "medium");
  assert.equal(p.settings.auto, true);
  assert.deepEqual(p.settings.volume, { voice: 0, sounds: 0.8, music: 1 });
  assert.deepEqual(p.done, {});
  assert.equal(p.words.cat.streak, 2);
  assert.equal(p.words.cat.hints, 2);
  assert.equal(p.skills.add?.firstTry, 2);
  assert.deepEqual(p.sky, { dog: [4, 96] });
  assert.equal(p.adapt, -0.45);
});

test("legacy progress migrates without fabricating independent-answer statistics", () => {
  const save = parseSave(
    JSON.stringify({
      intro: true,
      done: { hedgehog: 1 },
      skills: { add: { tasks: 4, firstTry: 4, mistakes: 0, hints: 4 } },
    }),
  );
  const p = save.profiles[save.activeProfile].progress;
  assert.equal(p.done.hedgehog, 1);
  assert.equal(p.setupDone, true);
  assert.equal(p.skills.add?.measured, undefined);
});

test("invalid and future backups fail before replacing progress", () => {
  for (const raw of [
    "{",
    "[]",
    "{}",
    '{"schemaVersion":999,"intro":true}',
    '{"profiles":{},"activeProfile":"missing"}',
  ])
    assert.throws(() => parseSave(raw));
  assert.throws(() => parseSave(" ".repeat(2_000_001)));
});

test("new statistics separate independent, assisted and retried answers; weak skills use independent results", () => {
  importSave(JSON.stringify({ intro: true }));
  recordTask("add", 0, true);
  recordTask("add", 1, false);
  recordTask("add", 0, false);
  const s = getProgress().skills.add!;
  assert.deepEqual(s, {
    tasks: 3,
    firstTry: 1,
    mistakes: 1,
    hints: 1,
    measured: 3,
    independent: 1,
    assisted: 1,
    retried: 1,
  });
  assert.ok(weakSkills(getProgress()).includes("add"));
});

test("profiles keep settings, progress and adaptation separate across backup round trips", () => {
  importSave(
    JSON.stringify({ intro: true, done: { hedgehog: 1 }, adapt: -0.3, settings: { level: 3 } }),
  );
  const first = getActiveProfile();
  addProfile("Второй ребёнок");
  const second = getActiveProfile();
  assert.equal(getProgress().setupDone, false);
  assert.equal(getProgress().settings.level, 1);
  assert.deepEqual(getProgress().done, {});
  recordTask("count", 0, false);
  const raw = exportSave();
  assert.equal(JSON.parse(raw).schemaVersion, SAVE_VERSION);
  importSave(raw);
  assert.equal(getActiveProfile(), second);
  assert.equal(getProgress().skills.count?.independent, 1);
  switchProfile(first);
  assert.equal(getProgress().settings.level, 3);
  assert.equal(getProgress().done.hedgehog, 1);
  assert.equal(getProgress().adapt, -0.3);
  const before = exportSave();
  assert.throws(() => importSave("not json"));
  assert.equal(exportSave(), before);
});

test("fresh profiles never share mutable collections", () => {
  const a = freshProgress(),
    b = freshProgress();
  a.done.hedgehog = 1;
  assert.deepEqual(b.done, {});
});

test("help allows extra thinking time for younger readers and long prompts", () => {
  assert.ok(helpTiming(1, "Найди букву").point > 18_000);
  assert.ok(helpTiming(1, "Найди букву").point > helpTiming(3, "Найди букву").point);
  assert.ok(
    helpTiming(2, "Прочитай длинное предложение и выбери подходящую к нему картинку").point >
      helpTiming(2, "Прочитай").point,
  );
});
