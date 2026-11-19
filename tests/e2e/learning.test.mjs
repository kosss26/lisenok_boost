import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, saved, solveTask, BASE, KEY } from "./helpers.mjs";

test("progressive help and wrong choices resume after reload; praise records once", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true, settings: { level: 2, auto: false, autoHints: false } },
  });
  await page.click(".help-btn");
  await page.waitForSelector(".task");
  await page.locator(".option:not([data-answer])").first().click();
  await page.click(".hint-btn");
  await page.waitForSelector('[data-hint-stage="1"]');
  assert.equal(await page.locator(".option.is-hint").count(), 0);
  const s = (await saved(page)).session;
  await page.reload();
  await page.waitForSelector(".task");
  assert.equal((await saved(page)).session.id, s.id);
  assert.deepEqual((await saved(page)).session.round, s.round);
  assert.equal(await page.locator(".option.is-off").count(), 1);
  await page.waitForSelector('[data-hint-stage="1"]');
  await page.click(".hint-btn");
  await page.waitForSelector('[data-hint-stage="2"]');
  assert.equal(await page.locator(".option.is-hint").count(), 0);
  await page.click(".hint-btn");
  await page.waitForSelector(".option.is-hint[data-answer]");
  await solveTask(page);
  assert.equal((await saved(page)).session.draft.complete, true);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".dot.is-done").length === 1);
  let p = await saved(page);
  assert.equal(p.skills.letters.tasks, 1);
  assert.equal(p.skills.letters.mistakes, 1);
  assert.equal(p.skills.letters.assisted, 1);
  await page.reload();
  await page.waitForSelector(".task");
  p = await saved(page);
  assert.equal(p.skills.letters.tasks, 1);
  assert.deepEqual(errors, []);
});

test("partial word resumes from title and practice gives a find without story stars", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/practice",
    progress: { intro: true, settings: { autoHints: false } },
  });
  assert.equal(await page.locator('[data-skill="add"]').count(), 0);
  await page.click('[data-skill="build"]');
  await page.waitForSelector(".task-build");
  await page.locator('.piece[data-answer="1"]').click();
  await page.waitForTimeout(500);
  const first = await saved(page);
  assert.equal(first.session.draft.used.length, 1);
  await page.goto(BASE);
  await page.click(".resume-lesson");
  await page.waitForSelector(".task-build");
  assert.equal(await page.locator(".slot.is-filled").count(), 1);
  for (let i = 0; i < 5; i++) {
    await solveTask(page);
    await page.waitForFunction(
      (n) =>
        document.querySelectorAll(".dot.is-done").length >= n ||
        document.querySelector(".glade-find"),
      i + 1,
      { timeout: 20000 },
    );
  }
  await page.waitForSelector(".glade-find");
  const p = await saved(page);
  assert.deepEqual(p.done, {});
  assert.equal(
    Object.values(p.finds).reduce((a, b) => a + b, 0),
    1,
  );
  await page.reload();
  await page.waitForSelector(".glade-find");
  assert.deepEqual((await saved(page)).finds, p.finds);
  await page.click(".glade-actions .text-action");
  await page.waitForSelector(".practice-grid");
  assert.equal((await saved(page)).session, null);
  assert.deepEqual(errors, []);
});

test("starting another skill asks before replacing the checkpoint", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/practice/read",
    progress: { intro: true },
  });
  await page.waitForSelector(".task");
  const old = (await saved(page)).session.id;
  await page.click(".back-btn");
  await page.click('[data-skill="build"]');
  await page.waitForSelector(".lesson-switch");
  assert.equal((await saved(page)).session.id, old);
  await page.getByRole("button", { name: "Продолжить прошлое", exact: true }).click();
  await page.waitForSelector(".task-read");
  await page.click(".back-btn");
  await page.click('[data-skill="build"]');
  await page.getByRole("button", { name: "Начать выбранное заново", exact: true }).click();
  await page.waitForSelector(".task-build");
  assert.notEqual((await saved(page)).session.id, old);
  assert.deepEqual(errors, []);
});

test("profile chooser keeps checkpoints separate", async (t) => {
  const { page, errors } = await openPhone(t, {
    progress: {
      schemaVersion: 3,
      activeProfile: "a",
      profiles: {
        a: { label: "Аня", progress: { intro: true, setupDone: true } },
        b: { label: "Боря", progress: { intro: true, setupDone: true } },
      },
    },
  });
  await page.goto(new URL("practice/build", BASE).href);
  await page.waitForSelector(".task-build");
  await page.locator('.piece[data-answer="1"]').click();
  const id = (await saved(page)).session.id;
  await page.goto(BASE);
  await page.click(".profile-chip");
  await page.getByRole("button", { name: "Боря", exact: true }).click();
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).activeProfile === "b", KEY);
  assert.equal(await page.locator(".resume-lesson").count(), 0);
  assert.match(await page.locator(".profile-chip").innerText(), /Боря/);
  await page.click(".profile-chip");
  await page.getByRole("button", { name: "Аня", exact: true }).click();
  await page.waitForSelector(".resume-lesson");
  await page.click(".resume-lesson");
  await page.waitForSelector(".task-build");
  assert.equal((await saved(page)).session.id, id);
  assert.equal(await page.locator(".slot.is-filled").count(), 1);
  assert.deepEqual(errors, []);
});

test("failed required image blocks guessing and can be retried", async (t) => {
  let fail = true;
  const { page, errors } = await openPhone(t, {
    path: "/practice/build",
    progress: { intro: true },
    offline: true,
    beforeGoto: async (context) => {
      await context.route("**/art/**", (route) => (fail ? route.abort() : route.continue()));
    },
  });
  await page.waitForSelector(".task img[data-media-error]");
  await page.waitForSelector(".media-notice");
  assert.equal(await page.locator(".piece:disabled").count(), await page.locator(".piece").count());
  assert.equal((await saved(page)).session.draft.used.length, 0);
  fail = false;
  await page.getByRole("button", { name: "Загрузить ещё раз", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".task img[data-media-error]"));
  await page.locator('.piece[data-answer="1"]').click();
  assert.equal((await saved(page)).session.draft.used.length, 1);
  assert.deepEqual(errors, []);
});

test("unknown paths offer a friendly way back", async (t) => {
  const { page } = await openPhone(t, { path: "/unknown-path", progress: { intro: true } });
  await page.waitForSelector(".recovery-screen");
  await page.getByRole("link", { name: "На карту", exact: true }).click();
  await page.waitForSelector(".map-screen");
});

test("practice, resume and help fit small phones and tablets", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/practice",
    progress: { intro: true },
    reducedMotion: "reduce",
  });
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    const cards = await page
      .locator(".practice-card")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(cards.every((r) => r.x >= 0 && r.right <= width));
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.click('[data-skill="build"]');
  await page.waitForSelector(".task-build");
  await page.click(".hint-btn");
  const pieces = await page
    .locator(".piece")
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
  assert.ok(pieces.every((r) => r.y >= 0 && r.bottom <= 568 && r.height >= 44));
  await page.goto(BASE);
  await page.waitForTimeout(600);
  const boxes = await page.evaluate(() =>
    [".play-btn", ".resume-lesson", ".title-fox"].map((s) =>
      document.querySelector(s).getBoundingClientRect().toJSON(),
    ),
  );
  assert.ok(boxes.every((r) => r.x >= 0 && r.right <= 320 && r.y >= 0 && r.bottom <= 568));
  assert.ok(boxes[0].top >= boxes[1].bottom, "continue and play do not overlap");
  await page.goto(new URL("map", BASE).href);
  const toolbar = await page
    .locator(".map-screen .top-bar > *")
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
  assert.ok(
    toolbar.every((r) => r.x >= 0 && r.right <= 320),
    "map toolbar fits",
  );
  const book = await page.locator(".practice-btn img").boundingBox();
  assert.ok(book.width <= 30 && book.height <= 30);
  assert.deepEqual(errors, []);
});

test("missing narration leaves a readable prompt and usable answers", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/practice/letters",
    progress: { intro: true, settings: { autoHints: false } },
    offline: true,
    beforeGoto: async (context) => {
      await context.route("**/voice/**", (r) => r.abort());
    },
  });
  await page.waitForSelector(".task");
  await page.waitForSelector(".media-notice");
  await page.click(".prompt-transcript summary");
  assert.ok((await page.locator(".prompt-transcript p").innerText()).length > 5);
  await solveTask(page);
  await page.waitForFunction(() => document.querySelectorAll(".dot.is-done").length === 1);
  assert.equal((await saved(page)).skills.letters.tasks, 1);
  assert.deepEqual(errors, []);
});

test("damaged local save offers recovery and keeps the original", async (t) => {
  const { page, errors } = await openPhone(t, {
    beforeGoto: async (context) => {
      await context.addInitScript(() => {
        if (!sessionStorage.getItem("bad-seeded")) {
          sessionStorage.setItem("bad-seeded", "yes");
          localStorage.setItem("lisenok:progress", "broken-original");
        }
      });
    },
  });
  await page.waitForSelector(".save-notice");
  await page.goto(new URL("practice/read", BASE).href);
  await page.waitForSelector(".task");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("lisenok:progress:recovery")),
    "broken-original",
  );
  assert.deepEqual(errors, []);
});
