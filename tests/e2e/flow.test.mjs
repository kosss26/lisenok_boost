// Title, story, world map with locked worlds, the path order, mistakes and hints, auto difficulty.
import { test } from "node:test";
import assert from "node:assert/strict";
import { artRe, openPhone, playStop, saved } from "./helpers.mjs";

test("first launch: story, map, only the forest is open", async (t) => {
  const { page, errors } = await openPhone(t);
  await page.click(".play-btn");
  await page.locator(".setup-card .level-card").first().click();
  await page.locator('.setup-card button[type="submit"]').click();
  await page.waitForSelector(".story-card");
  await page.click(".story-card .big-btn");
  await page.waitForSelector(".map-screen");
  assert.equal(await page.locator(".world.is-open").count(), 1);
  assert.equal(await page.locator(".world.is-locked").count(), 4);
  await page.click(".world-sea");
  assert.equal(await page.locator(".map-screen").count(), 1, "locked world does not open");
  await page.click(".world-forest");
  await page.waitForSelector(".forest-screen");
  assert.equal(await page.locator(".stop").count(), 18);
  assert.equal(await page.locator(".stop.is-locked").count(), 17);
  // a locked stop does not open, the first one does
  await page.click('.stop[data-stop="owl"]');
  assert.equal(await page.locator(".forest-screen").count(), 1);
  await page.click('.stop[data-stop="hedgehog"]');
  await page.waitForSelector(".hello");
  assert.ok((await saved(page)).intro);
  // back to the path
  await page.click(".back-btn");
  await page.waitForSelector(".forest-screen");
  assert.deepEqual(errors, []);
});

test("dialogue: resident and fox take turns, poses change, a tap skips a line", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true },
  });
  await page.waitForSelector(".bubble.from-res");
  assert.match(await page.locator(".talker-res").getAttribute("src"), /hedgehog-sad/);
  await page.click(".bubble");
  await page.waitForSelector(".bubble.from-fox");
  assert.match(await page.locator(".bubble").innerText(), /Лисёнок/);
  assert.equal(await page.locator(".talker-fox.is-talking").count(), 1);
  await page.click(".bubble");
  await page.waitForSelector(".bubble.from-res");
  assert.match(await page.locator(".talker-res").getAttribute("src"), artRe("hedgehog"));
  await page.click(".bubble");
  await page.waitForSelector(".help-btn.is-ready");
  assert.deepEqual(errors, []);
});

test("a locked stop cannot be opened by address", async (t) => {
  const { page } = await openPhone(t, { path: "/forest/frog-2", progress: { intro: true } });
  await page.waitForSelector(".forest-screen");
  assert.match(page.url(), /\/forest$/);
});

test("mistakes: soft retry, hint after the second, skill stats", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/squirrel",
    progress: { intro: true, done: { hedgehog: 1 }, settings: { level: 2, auto: false } },
  });
  await page.click(".help-btn");
  await page.waitForSelector(".options");
  const wrong = () => page.locator(".option:not([data-answer]):not(.is-off)").first().click();
  await wrong();
  assert.equal(await page.locator(".option.is-off").count(), 1);
  assert.equal(await page.locator(".option.is-hint").count(), 0);
  await page.waitForTimeout(600);
  await wrong();
  await page.waitForSelector('[data-hint-stage="1"]');
  assert.equal(await page.locator(".option.is-hint").count(), 0);
  await page.click(".hint-btn");
  await page.waitForSelector('[data-hint-stage="2"]');
  await page.click(".hint-btn");
  await page.waitForSelector(".option.is-hint[data-answer]");
  await page.locator('.option[data-answer="1"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".dot.is-done").length >= 1);
  const s = (await saved(page)).skills.count;
  assert.equal(s.tasks, 1);
  assert.equal(s.firstTry, 0);
  assert.equal(s.mistakes, 2);
  assert.deepEqual(errors, []);
});

test("counting: tapping objects counts them aloud", async (t) => {
  const { page } = await openPhone(t, {
    path: "/forest/squirrel",
    progress: { intro: true, done: { hedgehog: 1 }, settings: { level: 1, auto: false } },
  });
  await page.click(".help-btn");
  await page.waitForSelector(".count-item");
  await page.locator(".count-item").nth(0).click();
  await page.locator(".count-item").nth(1).click();
  assert.equal(await page.locator(".count-badge").count(), 2);
  await page.waitForTimeout(300);
  const voice = await page.evaluate(() => window.__voice);
  assert.ok(voice.includes("n-1") && voice.includes("n-2"), "numbers spoken");
});

test("auto difficulty: never changes the age level; mistakes ease the round at once", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest",
    progress: { intro: true, settings: { level: 1, auto: true } },
  });
  await playStop(page, "hedgehog");
  let p = await saved(page);
  assert.equal(p.settings.level, 1, "a 5-year-old stays at age level 1");
  assert.ok(p.adapt > 0 && p.adapt <= 0.05, `a clean stop: only a little harder (${p.adapt})`);
  await page.click(".next-btn");
  await page.click('.stop[data-stop="squirrel"]');
  await page.click(".help-btn");
  await page.waitForSelector(".options");
  const wrong = () => page.locator(".option:not([data-answer]):not(.is-off)").first().click();
  await wrong();
  await page.waitForTimeout(600);
  await page.locator('.option[data-answer="1"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".dot.is-done").length >= 1);
  p = await saved(page);
  assert.ok(p.adapt < 0, `two tries: easier at once (${p.adapt})`);
  assert.equal(p.settings.level, 1);
  assert.deepEqual(errors, []);
});
