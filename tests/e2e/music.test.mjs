// The reference music changes with the screen; the removed forest/bird layer is never requested.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone, saved } from "./helpers.mjs";

const tracks = (page) => page.evaluate(() => window.__tracks().sort().join(","));
const until = (page, want) =>
  page
    .waitForFunction((w) => window.__tracks().sort().join(",") === w, want, { timeout: 8000 })
    .catch(async (e) => {
      throw new Error(
        `tracks ${await tracks(page)} errors ${await page.evaluate(() => window.__musicErrors)} at ${page.url()}, want ${want}: ${e.message}`,
      );
    });

test("music follows the screen without forest ambience, even with legacy settings", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: {
      intro: true,
      settings: { level: 1, auto: false, volume: { voice: 1, sounds: 0.8, music: 0.5, forest: 1 } },
    },
  });
  await page.evaluate(() => (window.__musicErrors = []));
  await page.mouse.click(5, 300); // first tap unlocks sound
  await until(page, "map");
  await page.click(".help-btn");
  await page.waitForSelector(".task");
  await until(page, "tasks");
  await page.click(".back-btn");
  await until(page, "map");

  await hold(page, ".parents-btn");
  await page.click(".parents-tab >> text=Звук");
  assert.equal(await page.locator("#vol-forest").count(), 0);
  assert.equal(Object.hasOwn((await saved(page)).settings.volume, "forest"), false);
  await page.locator("#vol-music").fill("0");
  await until(page, "");
  await page.locator("#vol-music").fill("0.4");
  await until(page, "map");
  assert.equal((await saved(page)).settings.volume.music, 0.4);
  assert.deepEqual(errors, []);
});
