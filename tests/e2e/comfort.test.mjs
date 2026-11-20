import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, solveTask } from "./helpers.mjs";
import { makeRound } from "../../src/game/tasks.ts";

const rects = (page) =>
  page
    .locator(".drop-card,.card-build,.options,.pieces,.illustration-stage")
    .evaluateAll((es) =>
      es.map((e) => ({ class: e.className, ...e.getBoundingClientRect().toJSON() })),
    );

test("help keeps artwork and answers anchored for every skill on phones and tablets", async (t) => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 1024],
  ]) {
    const { page, browser, errors } = await openPhone(null, {
      path: "/practice",
      progress: { intro: true, settings: { level: 3, autoHints: false } },
      reducedMotion: "reduce",
    });
    t.after(() => browser.close());
    await page.setViewportSize({ width, height });
    for (const skill of [
      "build",
      "read",
      "count",
      "compare",
      "sentence",
      "add",
      "syllables",
      "letters",
      "sub",
    ]) {
      await page.click(`[data-skill="${skill}"]`);
      if (await page.locator(".lesson-switch").count())
        await page.getByRole("button", { name: "Начать выбранное заново", exact: true }).click();
      await page.waitForSelector(".task");
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".task img")].every((i) => i.complete && i.naturalWidth > 0),
      );
      const before = await rects(page);
      for (let stage = 1; stage <= 3; stage++) {
        await page.click(".hint-btn");
        await page.waitForSelector(`[data-hint-stage="${stage}"]`);
        const after = await rects(page);
        assert.equal(after.length, before.length);
        for (let i = 0; i < before.length; i++)
          for (const key of ["x", "y", "width", "height"])
            assert.ok(
              Math.abs(before[i][key] - after[i][key]) < 1,
              `${width}/${skill}/${stage}: ${before[i].class} moved (${key})`,
            );
      }
      const buttons = await page
        .locator(".option,.piece")
        .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
      assert.ok(
        buttons.every(
          (r) =>
            r.x >= 0 && r.right <= width + 1 && r.y >= 0 && r.bottom <= height && r.height >= 44,
        ),
        `${width}/${skill}: answers fit`,
      );
      if (await page.locator(".illustration-stage").count()) {
        const art = await page.locator(".illustration-stage").boundingBox();
        assert.ok(art.height >= 64, `${width}/${skill}: subject remains readable`);
      }
      await page.click(".back-btn");
      await page.waitForSelector(".practice-grid");
    }
    assert.deepEqual(errors, []);
    await browser.close();
  }
});

test("long words remain legible beside their picture on a short phone", async (t) => {
  const candidates = Array.from({ length: 30 }, () =>
    makeRound("build", { level: 3, g: 1 }),
  ).flat();
  const task = candidates.reduce((a, b) => (a.target.length > b.target.length ? a : b));
  assert.ok(task.target.length >= 7);
  const session = {
    id: "long-word",
    mode: "practice",
    target: "build",
    level: 3,
    round: Array.from({ length: 5 }, () => task),
    step: 0,
    phase: "task",
    mistakes: 0,
    draft: { mistakes: 0, hintStage: 0, used: [], off: [], picked: null, complete: false },
    reward: null,
  };
  const { page, errors } = await openPhone(t, {
    path: "/practice/build",
    progress: { intro: true, settings: { level: 3, autoHints: false }, session },
    reducedMotion: "reduce",
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForSelector(".card-build");
  const geometry = await page
    .locator(".card-build,.illustration-stage,.slots,.pieces")
    .evaluateAll((es) =>
      es.map((e) => ({ class: e.className, ...e.getBoundingClientRect().toJSON() })),
    );
  const card = geometry.find((r) => r.class.includes("card-build")),
    art = geometry.find((r) => r.class.includes("illustration-stage")),
    slots = geometry.find((r) => r.class.includes("slots"));
  assert.ok(art.height >= 64);
  assert.ok(slots.y >= card.y && slots.bottom <= card.bottom + 1);
  assert.ok(art.right <= slots.x + 1);
  assert.deepEqual(errors, []);
});

test("the fox makes one occasional gesture and rests during reduced motion and inert background", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/practice/letters",
    progress: { intro: true, settings: { autoHints: false } },
    beforeGoto: (c) => c.clock.install(),
  });
  await page.waitForSelector('.friend-fox[data-motion="still"]');
  await page.clock.runFor(6100);
  await page.waitForSelector('.friend-fox[data-motion="gesture"]');
  await page.clock.runFor(6900);
  await page.waitForSelector('.friend-fox[data-motion="still"]');
  await page.clock.runFor(10000);
  assert.equal(await page.locator(".friend-fox").getAttribute("data-motion"), "still");
  await page.clock.runFor(10000);
  await page.waitForSelector('.friend-fox[data-motion="gesture"]');
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector('.friend-fox[data-motion="still"]');
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(6100);
  await page.waitForSelector('.friend-fox[data-motion="gesture"]');
  // Native animation is stopped by the same inert ownership used by real dialogs.
  await page.locator(".game-root").evaluate((e) => (e.inert = true));
  await page.waitForSelector('.friend-fox[data-motion="still"]');
  await page.locator(".game-root").evaluate((e) => (e.inert = false));
  await page.clock.runFor(6100);
  await page.waitForSelector('.friend-fox[data-motion="gesture"]');
  assert.deepEqual(errors, []);
});

test("mistakes get a small wobble and successes a local six-star response", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/practice/letters",
    progress: { intro: true, settings: { level: 2, autoHints: false } },
  });
  await page.locator(".option:not([data-answer])").first().click();
  assert.equal(
    await page.locator(".option.is-shaking").evaluate((e) => getComputedStyle(e).animationName),
    "soft-retry",
  );
  assert.equal(await page.locator('.friend-resident img[src*="-sad."]').count(), 0);
  await solveTask(page);
  await page.waitForSelector(".option.is-right");
  assert.equal(await page.locator(".option.is-right .burst-star").count(), 6);
  assert.equal(
    await page
      .locator(".burst-star")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).width)),
    15,
  );
  assert.deepEqual(errors, []);
});
