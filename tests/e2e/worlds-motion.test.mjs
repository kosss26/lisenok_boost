import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone } from "./helpers.mjs";

test("native fox motion follows reduced-motion changes and modal focus ownership", async (t) => {
  const { page, errors } = await openPhone(t, { progress: { intro: true } });
  const moving = () =>
    page.waitForFunction(() =>
      document.querySelector(".title-fox")?.src.includes("fox-wave-motion.webp"),
    );
  const still = () =>
    page.waitForFunction(() =>
      /fox-wave-still\.(webp|avif)/.test(document.querySelector(".title-fox")?.src ?? ""),
    );
  await moving();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await still();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await moving();
  await hold(page, ".parents-btn");
  await page.waitForSelector(".parents");
  await still();
  await page.keyboard.press("Escape");
  await page.waitForSelector(".parents", { state: "detached" });
  await moving();
  assert.deepEqual(errors, []);
});

test("world labels fit small screens and future-world notices restore focus", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/map",
    progress: { intro: true },
    reducedMotion: "reduce",
  });
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    const labels = await page
      .locator(".world-sign")
      .evaluateAll((es) => es.map((el) => el.getBoundingClientRect().toJSON()));
    assert.equal(labels.length, 5);
    assert.ok(labels.every((r) => r.x >= 0 && r.right <= width && r.y >= 0 && r.bottom <= height));
    const top = await page.locator(".top-bar").boundingBox();
    assert.ok(labels[4].y >= top.y + top.height - 1, "space label stays below the toolbar");
  }
  await page.locator(".world-sea").click();
  await page.getByRole("status").filter({ hasText: "Море" }).waitFor();
  await page.getByRole("button", { name: "Закрыть сообщение" }).click();
  assert.equal(
    await page.locator(".world-sea").evaluate((el) => el === document.activeElement),
    true,
  );
  assert.match(page.url(), /\/map$/);
  assert.deepEqual(errors, []);
});

test("dialogue columns keep their geometry when the speaker and pose change", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true },
    reducedMotion: "reduce",
  });
  const before = await page
    .locator(".dialogue-portrait")
    .evaluateAll((es) => es.map((el) => el.getBoundingClientRect().toJSON()));
  await page.click(".bubble");
  await page.waitForSelector(".talker-fox.is-talking");
  await page.click(".bubble");
  await page.waitForSelector(".talker-res.is-talking");
  const after = await page
    .locator(".dialogue-portrait")
    .evaluateAll((es) => es.map((el) => el.getBoundingClientRect().toJSON()));
  for (let i = 0; i < 2; i++) {
    assert.ok(Math.abs(before[i].width - after[i].width) < 1);
    assert.ok(Math.abs(before[i].x - after[i].x) < 1);
  }
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".dialogue-portrait .pose-in")].every(
      (el) => el.complete && el.naturalWidth > 0,
    ),
  );
  assert.deepEqual(errors, []);
});
