import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { FOREST } from "../content/forest.ts";
import { SEA } from "../content/sea.ts";
import { WORLD, ALL_STOPS, storySkill } from "../content/worlds.ts";
import { voiceLines, voiceCast } from "../content/voice.ts";
import {
  getProgress,
  importSave,
  exportSave,
  worldOpen,
  worldDone,
  tuneFor,
  addProfile,
  switchProfile,
  getActiveProfile,
} from "./progress.ts";
import { startSession, checkpoint, completeSessionTask } from "./sessions.ts";
import { sessionLocation } from "./session-state.ts";
import { normalizeProgress } from "./save.ts";
const forestDone = Object.fromEntries(FOREST.map((s) => [s.id, 1]));
test("all imported voice recordings match the audited reference and have a three-bus sound setup", () => {
  const audit = JSON.parse(readFileSync("assets/audio-source.json", "utf8"));
  for (const key of Object.keys(voiceLines()))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(`public/voice/${key}.mp3`))
        .digest("hex"),
      audit.voice[key],
      key,
    );
  assert.equal(audit.voiceProvider, "Yandex SpeechKit");
  assert.deepEqual(audit.retainedSilero, ["letter-y"]);
  assert.equal((voiceCast()["dlg-sea-crab-0"] as { voice: string }).voice, "zahar");
  assert.equal(voiceCast()["dlg-sea-crab-1"], "fox");
  assert.equal(existsSync("public/music/forest.mp3"), false);
  const p = normalizeProgress({
    intro: true,
    done: { hedgehog: 1 },
    settings: { volume: { voice: 0.7, sounds: 0.4, music: 0.2, forest: 1 } },
  });
  assert.deepEqual(p.settings.volume, { voice: 0.7, sounds: 0.4, music: 0.2 });
  assert.equal(p.done.hedgehog, 1);
});
test("sea opens after the forest and its difficulty continues the age level", () => {
  importSave(JSON.stringify({ intro: true }));
  assert.equal(worldOpen(getProgress(), "sea"), false);
  assert.throws(() => startSession("story", SEA[0].id));
  importSave(
    JSON.stringify({ intro: true, done: forestDone, settings: { level: 2, auto: false } }),
  );
  assert.equal(worldOpen(getProgress(), "sea"), true);
  assert.equal(tuneFor(getProgress(), 0, WORLD.sea).g, 0.5);
  assert.equal(tuneFor(getProgress(), SEA.length - 1, WORLD.sea).g, 1);
  assert.equal(ALL_STOPS.length, 36);
});
test("all sea rounds at age 5–6 agree with their young dialogue and award each gift once", () => {
  importSave(
    JSON.stringify({ intro: true, done: forestDone, settings: { level: 1, auto: false } }),
  );
  for (const stop of SEA) {
    const session = startSession("story", stop.id);
    assert.ok(session.round.every((t) => t.skill === storySkill(stop, 1)));
    assert.ok(session.round.every((t) => t.skill !== "add" && t.skill !== "sub"));
    for (let step = 0; step < 5; step++) completeSessionTask(session.id, step, 0, false);
    completeSessionTask(session.id, 4, 0, false);
    assert.equal(getProgress().done[stop.id], 1);
    assert.ok(getProgress().gifts.includes(stop.gift));
  }
  assert.equal(worldDone(getProgress(), "sea"), true);
  assert.equal(getProgress().gifts.length, 18);
  assert.equal(Object.keys(getProgress().done).length, 36);
  importSave(exportSave());
  assert.equal(getProgress().session?.phase, "reward");
});
test("sea checkpoints and profile separation survive export and import", () => {
  importSave(JSON.stringify({ intro: true, done: forestDone, settings: { auto: false } }));
  assert.throws(() => startSession("story", "sea-octopus"));
  const s = startSession("story", "sea-crab");
  checkpoint(s.id, 0, { hintStage: 1, mistakes: 1 });
  const first = getActiveProfile();
  addProfile("Другой");
  assert.equal(worldOpen(getProgress(), "sea"), false);
  switchProfile(first);
  importSave(exportSave());
  assert.equal(getProgress().session?.id, s.id);
  assert.equal(getProgress().session?.draft.mistakes, 1);
  assert.equal(sessionLocation(getProgress().session!), "/sea/sea-crab");
});

test("adaptive easing preserves young sea dialogue skills after mistakes", () => {
  for (const stop of SEA.filter((s) => s.young)) {
    const index = SEA.indexOf(stop);
    importSave(
      JSON.stringify({
        intro: true,
        done: { ...forestDone, ...Object.fromEntries(SEA.slice(0, index).map((s) => [s.id, 1])) },
        settings: { level: 1, auto: true },
      }),
    );
    const s = startSession("story", stop.id);
    completeSessionTask(s.id, 0, 1, false);
    assert.ok(
      getProgress().session!.round.every((t) => t.skill === storySkill(stop, 1)),
      stop.id,
    );
    importSave(exportSave());
    assert.equal(getProgress().session?.step, 1);
  }
});
