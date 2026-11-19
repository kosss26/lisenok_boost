// Parents' corner: opened only by holding, level and name, time limit with the rest screen, volume.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone, saved } from "./helpers.mjs";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

test("a short tap does not open it, holding does; settings are saved", async (t) => {
  const { page, errors } = await openPhone(t, { path: "/map", progress: { intro: true } });
  await page.click(".parents-btn");
  assert.equal(await page.locator(".parents").count(), 0);
  await hold(page, ".parents-btn");
  await page.waitForSelector(".parents");
  await page.selectOption(".parents select", "masha");
  await page.click(".level-card >> nth=2");
  await page.getByRole("checkbox", { name: /Подстраивать сложность автоматически/ }).uncheck();
  await page.click(".parents-tab >> text=Звук");
  await page.locator("#vol-music").fill("0.2");
  const s = (await saved(page)).settings;
  assert.equal(s.name, "masha");
  assert.equal(s.level, 3);
  assert.equal(s.auto, false);
  assert.equal(s.volume.music, 0.2);
  await page.click(".parents-tab >> text=Успехи");
  assert.equal(await page.locator(".skills li").count(), 9);
  await page.click(".parents-close");
  assert.equal(await page.locator(".parents").count(), 0);
  assert.deepEqual(errors, []);
});

test("weak skills are listed for grown-ups", async (t) => {
  const { page } = await openPhone(t, {
    path: "/map",
    progress: { intro: true, skills: { add: { tasks: 6, firstTry: 2, mistakes: 7, hints: 2 } } },
  });
  await hold(page, ".parents-btn");
  await page.click(".parents-tab >> text=Успехи");
  assert.match(await page.locator(".weak-note").innerText(), /сложение/);
  assert.equal(await page.locator(".skills li.is-weak").count(), 1);
});

test("time limit: rest screen, a grown-up adds 10 minutes", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/map",
    progress: { intro: true, settings: { limit: 10 }, playLog: { [today()]: 700 } },
  });
  await page.waitForSelector(".rest");
  await page.click(".rest-more");
  assert.equal(await page.locator(".rest").count(), 1, "a tap is not enough");
  await hold(page, ".rest-more");
  assert.equal(await page.locator(".rest").count(), 0);
  assert.equal(await page.locator(".world").count(), 5);
  assert.deepEqual(errors, []);
});
