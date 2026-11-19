// Difficulty: «легко / средне / трудно» chosen by the child (steps on the forest screen) or in the
// parents' corner; harder further along the path; no arithmetic for 5–6-year-olds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone, saved, upTo } from "./helpers.mjs";

test("the child picks the difficulty; it is saved and shown on the stop", async (t) => {
  const { page, errors } = await openPhone(t, { path: "/forest", progress: { intro: true } });
  assert.equal(await page.locator(".diff-badge .diff-step.is-on").count(), 2, "«средне» first");
  await page.click(".diff-badge");
  await page.waitForSelector(".diff-sheet");
  const card = await page.locator(".diff-card").boundingBox();
  assert.ok(
    card.y >= 0 && card.y + card.height <= page.viewportSize().height + 1,
    "the entire difficulty card fits the screen",
  );
  await page.waitForFunction(() => window.__voice.includes("diff-pick"));
  await page.click('.diff-option[data-difficulty="hard"]');
  await page.waitForSelector(".diff-sheet", { state: "detached" });
  assert.equal((await saved(page)).settings.difficulty, "hard");
  assert.equal(await page.locator(".diff-badge .diff-step.is-on").count(), 3);
  await page.click('.stop[data-stop="hedgehog"]');
  await page.waitForSelector(".diff-badge.is-quiet");
  assert.equal(await page.locator(".diff-badge.is-quiet .diff-step.is-on").count(), 3);
  assert.deepEqual(errors, []);
});

test("parents can set the difficulty too", async (t) => {
  const { page } = await openPhone(t, { path: "/map", progress: { intro: true } });
  await hold(page, ".parents-btn");
  await page.waitForSelector(".parents");
  await page.click('.parents [data-difficulty="easy"]');
  assert.equal((await saved(page)).settings.difficulty, "easy");
});

test("further along the path the same task is harder", async (t) => {
  const opts = async (id, difficulty) => {
    const { page, browser } = await openPhone(null, {
      path: `/forest/${id}`,
      progress: { intro: true, done: upTo(id), settings: { level: 1, auto: false, difficulty } },
    });
    await page.click(".help-btn");
    await page.waitForSelector(".options");
    const n = await page.locator(".option").count();
    const counted = await page.locator(".count-item").count();
    await browser.close();
    return { n, counted };
  };
  const early = await opts("squirrel", "medium");
  assert.equal(early.n, 2, "the second stop: two numbers to choose from");
  assert.ok(early.counted <= 5, "counting to five");
  const later = await opts("squirrel-2", "hard");
  assert.equal(later.n, 3, "later and «трудно»: three numbers");
  void t;
});

test("age 5–6: the arithmetic stops become counting, with their own words", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/bear",
    progress: { intro: true, done: upTo("bear"), settings: { level: 1, auto: false } },
  });
  await page.waitForFunction(() => window.__voice.includes("dlg-bear-young-0"));
  await page.click(".help-btn");
  await page.waitForSelector(".task");
  assert.equal(await page.locator(".task-count").count(), 1);
  assert.equal(await page.locator(".card-math").count(), 0);
  assert.deepEqual(errors, []);
});

test("age 6–7: the same stop is addition", async (t) => {
  const { page } = await openPhone(t, {
    path: "/forest/bear",
    progress: { intro: true, done: upTo("bear"), settings: { level: 2, auto: false } },
  });
  await page.click(".help-btn");
  await page.waitForSelector(".task-add .card-math");
});
