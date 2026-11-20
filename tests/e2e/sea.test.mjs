import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, saved, solveTask, BASE } from "./helpers.mjs";
import { FOREST } from "../../src/content/forest.ts";
import { SEA } from "../../src/content/sea.ts";
import { storySkill } from "../../src/content/worlds.ts";
const forestDone = Object.fromEntries(FOREST.map((s) => [s.id, 1]));
const seed = (level = 1) => ({
  intro: true,
  setupDone: true,
  forestCelebrated: true,
  done: forestDone,
  gifts: FOREST.map((s) => s.gift),
  sky: Object.fromEntries(
    FOREST.map((s, i) => [s.id, [8 + ((i * 17) % 84), 12 + ((i * 13) % 76)]]),
  ),
  settings: { level, auto: false, autoHints: false },
});

test("sea routes stay locked until the forest is complete and later sea stops stay sequential", async (t) => {
  const { page, errors } = await openPhone(t, { path: "/sea", progress: { intro: true } });
  await page.waitForSelector(".map-screen");
  assert.equal(await page.locator(".world-sea.is-locked").count(), 1);
  await page.goto(BASE + "sea/sea-crab");
  await page.waitForSelector(".map-screen");
  await page.evaluate((p) => localStorage.setItem("lisenok:progress", JSON.stringify(p)), seed());
  await page.goto(BASE + "sea/sea-turtle");
  await page.waitForSelector(".sea-screen");
  assert.match(page.url(), /\/sea$/);
  assert.equal(await page.locator(".stop.is-next").getAttribute("data-stop"), "sea-crab");
  assert.deepEqual(errors, []);
});

test("sea uses the polished map, stop and resumable partial-word views", async (t) => {
  const p = seed();
  p.done = { ...p.done, ...Object.fromEntries(SEA.slice(0, 5).map((s) => [s.id, 1])) };
  const { page, errors } = await openPhone(t, {
    path: "/map",
    progress: p,
    reducedMotion: "reduce",
  });
  await page.click(".world-sea");
  await page.waitForSelector(".sea-screen");
  assert.equal(
    await page.locator('.stop[aria-current="step"]').getAttribute("data-stop"),
    "sea-octopus",
  );
  await page.click(".trail-continue");
  await page.waitForSelector(".hello");
  assert.ok((await page.locator(".scene-bg").getAttribute("src")).includes("/bg-shore."));
  await page.click(".help-btn");
  await page.waitForSelector(".task-build");
  await page.locator('.piece[data-answer="1"]').click();
  await page.click(".hint-btn");
  const id = (await saved(page)).session.id;
  await page.goto(BASE);
  await page.click(".resume-lesson");
  await page.waitForSelector(".task-build");
  assert.match(page.url(), /\/sea\/sea-octopus$/);
  assert.equal(await page.locator(".slot.is-filled").count(), 1);
  await page.waitForSelector('[data-hint-stage="1"]');
  assert.equal((await saved(page)).session.id, id);
  assert.deepEqual(errors, []);
});

test("sea arithmetic has the age-specific dialogue and difficulty without introducing examples for young children", async (t) => {
  for (const [id, level, skill] of [
    ["sea-dolphin-2", 1, "syllables"],
    ["sea-seal-2", 1, "build"],
    ["sea-dolphin-2", 2, "add"],
    ["sea-seal-2", 3, "sub"],
  ]) {
    const p = seed(level),
      index = SEA.findIndex((s) => s.id === id);
    p.done = { ...p.done, ...Object.fromEntries(SEA.slice(0, index).map((s) => [s.id, 1])) };
    if (level === 1) p.settings.auto = true;
    const { page, browser, errors } = await openPhone(null, {
      path: `/sea/${id}`,
      progress: p,
      reducedMotion: "reduce",
    });
    t.after(() => browser.close());
    await page.setViewportSize({ width: 320, height: 568 });
    const controls = await page
      .locator(".bubble,.help-btn")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(controls.every((r) => r.y >= 0 && r.bottom <= 568));
    await page.click(".help-btn");
    await page.waitForSelector(`.task-${skill}`);
    if (level === 1) assert.equal(await page.locator(".card-math").count(), 0);
    if (level === 1) {
      await page.locator(".option:not([data-answer]),.piece:not([data-answer])").first().click();
      await solveTask(page);
      await page.waitForFunction(() => document.querySelectorAll(".dot.is-done").length === 1);
      await page.waitForSelector(`.task-${skill}`);
    }
    assert.deepEqual(errors, []);
    await browser.close();
  }
});

test("the whole sea can be completed with gifts, sky, celebration and album", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/sea",
    progress: seed(),
    reducedMotion: "reduce",
  });
  for (const stop of SEA) {
    await page.locator(`.stop[data-stop="${stop.id}"]`).scrollIntoViewIfNeeded();
    await page.click(`.stop[data-stop="${stop.id}"]`);
    await page.waitForSelector(".help-btn");
    await page.click(".help-btn");
    for (let step = 0; step < 5; step++) {
      await page.waitForSelector(`.task-${storySkill(stop, 1)}`);
      await solveTask(page);
      await page.waitForFunction(
        (n) =>
          document.querySelectorAll(".dot.is-done").length >= n ||
          document.querySelector(".story-reward"),
        step + 1,
        { timeout: 20000 },
      );
    }
    await page.waitForSelector(".story-reward");
    await page.click(".new-star");
    await page.waitForSelector(".gift");
    assert.ok((await saved(page)).gifts.includes(stop.gift));
    await page.click(".next-btn");
    await page.waitForSelector(".sea-screen");
  }
  await page.waitForSelector(".celebrate-card");
  assert.match(await page.locator(".celebrate-card h2").innerText(), /Море сияет/);
  await page.click(".celebrate .big-btn");
  const p = await saved(page);
  assert.equal(p.seaCelebrated, true);
  assert.equal(SEA.filter((s) => p.done[s.id]).length, 18);
  assert.equal(Object.keys(p.sky).length, 36);
  assert.equal(p.gifts.length, 36);
  await page.goto(BASE + "album");
  assert.equal(await page.locator(".album-sea .album-slot.is-have").count(), 18);
  assert.equal(await page.locator(".sky-placed").count(), 36);
  assert.deepEqual(errors, []);
});
