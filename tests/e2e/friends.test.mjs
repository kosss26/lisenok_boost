// Friends react to a tap; a hesitating child gets help: the fox glances, then points,
// wrong options fade and the target glows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone } from "./helpers.mjs";

async function hedgehogTask(t, beforeGoto) {
  const r = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true, settings: { level: 1, auto: false } },
    beforeGoto,
  });
  await r.page.click(".help-btn");
  await r.page.waitForSelector(".task");
  return r;
}

test("tapping the hedgehog makes it curl up and giggle; the fox giggles too", async (t) => {
  const { page, errors } = await hedgehogTask(t);
  // wait until `key` has been asked for and nothing is being said
  const quiet = async (key) => {
    await page.waitForFunction((k) => window.__voice.includes(k), key, { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.waitForFunction(() => !window.__speaking(), null, { timeout: 15000 });
  };
  await quiet("q-letter-find"); // the question has been said
  await page.click(".friend-res-btn");
  await page.waitForSelector(".friend-res-btn.react-curl");
  await quiet("touch-hedgehog");
  await page.click(".friend-fox-btn");
  await page.waitForSelector(".friend-fox-btn.react-giggle");
  await page.waitForFunction(() => window.__voice.includes("touch-fox"));
  await page.waitForFunction(() => !document.querySelector(".react-giggle, .react-curl"), null, {
    timeout: 3000,
  });
  assert.deepEqual(errors, []);
});

test("hesitation: the fox glances, then points; wrong options fade, the target glows", async (t) => {
  const { page, errors } = await hedgehogTask(t, (context) => context.clock.install());
  assert.equal(await page.locator('.friend-fox-btn[data-guide="0"]').count(), 1);
  await page.waitForFunction(() => window.__voice.includes("q-letter-find"));
  await page.waitForFunction(() => !window.__speaking());
  await page.clock.runFor(30_000);
  await page.waitForSelector('.friend-fox-btn[data-guide="1"]');
  assert.equal(await page.locator(".option.is-faded").count(), 0);
  await page.clock.runFor(22_000);
  await page.waitForSelector('.friend-fox-btn[data-guide="2"]');
  assert.equal(await page.locator('.option[data-answer="1"].is-hint').count(), 1);
  assert.ok((await page.locator(".option.is-faded").count()) >= 1);
  assert.equal(await page.locator(".drop-card.is-target").count(), 1);
  const style = await page.locator(".friend-fox-btn").getAttribute("style");
  assert.match(style ?? "", /--lean/);
  await page.locator('.option[data-answer="1"]').click();
  await page.waitForSelector('.friend-fox-btn[data-guide="0"]');
  assert.deepEqual(errors, []);
});

test("automatic pointing can be disabled while manual help stays available", async (t) => {
  const { page } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true, settings: { level: 1, autoHints: false } },
    beforeGoto: (c) => c.clock.install(),
  });
  await page.click(".help-btn");
  await page.waitForSelector(".task");
  await page.clock.runFor(65_000);
  assert.equal(await page.locator('.friend-fox-btn[data-guide="2"]').count(), 0);
  assert.equal(await page.locator(".option.is-hint").count(), 0);
  await page.click(".hint-btn");
  await page.waitForSelector('.option[data-answer="1"].is-hint');
});
