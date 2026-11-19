import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, saved, upTo } from "./helpers.mjs";

test("continue opens the next available clearing after scrolling away", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest",
    progress: { intro: true, done: upTo("frog") },
  });
  await page.locator(".forest-scroll").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.getByRole("button", { name: /Продолжить: Лягушонок/ }).click();
  await page.waitForSelector(".hello");
  assert.match(page.url(), /\/forest\/frog$/);
  assert.equal(Object.keys((await saved(page)).done).length, 8);
  assert.deepEqual(errors, []);
});

test("map art, clearings and continue control fit a small phone, phone and tablet", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest",
    reducedMotion: "reduce",
    progress: { intro: true },
  });
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    await page.reload();
    await page.waitForSelector(".trail-continue");
    const geometry = await page.evaluate(() => {
      const bounds = (s) => document.querySelector(s).getBoundingClientRect().toJSON();
      return {
        button: bounds(".trail-continue"),
        app: bounds(".app"),
        tall: bounds(".forest-tall"),
        first: bounds(".forest-bg-1"),
        second: bounds(".forest-bg-2"),
      };
    });
    assert.ok(
      geometry.button.y >= 0 && geometry.button.bottom <= height,
      `${width}: continue is on screen`,
    );
    assert.ok(
      geometry.button.x >= geometry.app.x && geometry.button.right <= geometry.app.right + 1,
    );
    assert.ok(
      Math.abs(geometry.second.height - geometry.tall.height * 0.52) < 1,
      "upper artwork and clearing coordinates use the same scale",
    );
    assert.ok(
      geometry.second.bottom > geometry.first.y,
      "the painted panels overlap for a soft seam",
    );
  }
  assert.deepEqual(errors, []);
});

test("pose sprites decode before appearing, settle and respect reduced motion", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true },
    reducedMotion: "reduce",
  });
  await page.click(".help-btn");
  await page.waitForSelector(".pose-sprite .pose-in");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".pose-in")].every((i) => i.complete && i.naturalWidth > 0),
  );
  assert.equal(
    await page.locator(".friend-fox").evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.click(".hint-btn");
  await page.click(".hint-btn");
  await page.click(".hint-btn");
  await page.waitForFunction(() =>
    document.querySelector(".friend-fox .pose-in")?.src.includes("fox-point"),
  );
  await page.waitForFunction(() => document.querySelectorAll(".pose-out").length === 0);
  assert.equal(
    await page.locator(".friend-fox .pose-in").evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  assert.deepEqual(errors, []);
});
