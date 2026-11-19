import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone, saved } from "./helpers.mjs";

async function tab(page, title) {
  await page.getByRole("tab", { name: title, exact: true }).click();
}

test("first launch requires an explicit age choice and saves setup", async (t) => {
  const { page, errors } = await openPhone(t);
  await page.click(".play-btn");
  await page.waitForSelector(".setup-card");
  assert.equal(await page.locator('.setup-card button[type="submit"]').isDisabled(), true);
  await page.locator(".setup-card .level-card").nth(1).click();
  await page.locator('.setup-card button[type="submit"]').click();
  await page.waitForSelector(".story-card");
  assert.equal((await saved(page)).settings.level, 2);
  assert.equal((await saved(page)).setupDone, true);
  await page.click(".story-card .big-btn");
  await page.waitForSelector(".map-screen");
  assert.equal(await page.locator(".world .coming-soon").count(), 4);
  assert.deepEqual(errors, []);
});

test("hinted answers do not count as independent successes", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: { intro: true },
  });
  await page.click(".help-btn");
  await page.waitForSelector(".task");
  await page.click(".hint-btn");
  await page.locator('.option[data-answer="1"]').click();
  await page.waitForFunction(() => document.querySelectorAll(".dot.is-done").length >= 1);
  const stats = (await saved(page)).skills.letters;
  assert.equal(stats.independent, 0);
  assert.equal(stats.assisted, 1);
  assert.equal(stats.firstTry, 0);
  assert.deepEqual(errors, []);
});

test("keyboard holding opens parents; modal traps focus, Escape restores it", async (t) => {
  const { page, errors } = await openPhone(t, { path: "/map", progress: { intro: true } });
  await page.locator(".parents-btn").focus();
  await page.keyboard.down("Enter");
  await page.waitForTimeout(2700);
  await page.keyboard.up("Enter");
  await page.waitForSelector(".parents");
  assert.equal(await page.locator(".parents").getAttribute("aria-modal"), "true");
  assert.equal(await page.locator(".game-root").evaluate((e) => e.inert), true);
  await page.locator(".reset-btn").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.locator(".parents-close").evaluate((e) => e === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector(".parents", { state: "detached" });
  assert.equal(
    await page.locator(".parents-btn").evaluate((e) => e === document.activeElement),
    true,
  );
  assert.equal(await page.locator(".game-root").evaluate((e) => e.inert), false);
  assert.deepEqual(errors, []);
});

test("backup download, profile isolation, validation and confirmed restore", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/map",
    progress: { intro: true, done: { hedgehog: 1 }, settings: { level: 3 } },
  });
  await hold(page, ".parents-btn");
  await tab(page, "Данные");
  const downloaded = page.waitForEvent("download");
  await page.getByText("Скачать копию всех профилей", { exact: true }).click();
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /lisenok-.*\.json/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backup = Buffer.concat(chunks);
  await page.locator(".save-tools input[placeholder]").fill("Младший");
  await page.getByRole("button", { name: "Добавить ребёнка" }).click();
  await page.waitForSelector(".title-screen");
  let p = await saved(page);
  assert.deepEqual(p.done, {});
  assert.equal(p.settings.level, 1);
  assert.equal(Object.keys(p.profiles).length, 2);
  await hold(page, ".parents-btn");
  await tab(page, "Данные");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "wrong.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await page
    .getByRole("status")
    .filter({ hasText: "Версия сохранения не поддерживается" })
    .waitFor();
  assert.equal(Object.keys((await saved(page)).profiles).length, 2);
  await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup });
  const restore = page.getByRole("button", { name: "Заменить профили данными из копии" });
  await restore.waitFor();
  assert.equal(
    Object.keys((await saved(page)).profiles).length,
    2,
    "no replacement without confirmation",
  );
  await restore.click();
  await page.waitForSelector(".parents", { state: "detached" });
  p = await saved(page);
  assert.equal(p.done.hedgehog, 1);
  assert.equal(p.settings.level, 3);
  assert.equal(Object.keys(p.profiles).length, 1);
  await page.reload();
  assert.equal((await saved(page)).done.hedgehog, 1);
  assert.deepEqual(errors, []);
});

test("storage denial leaves the game playable and warns adults", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/map",
    progress: { intro: true },
    beforeGoto: async (_c, page) => {
      await page.addInitScript(() => {
        Storage.prototype.setItem = function () {
          throw new DOMException("Blocked", "QuotaExceededError");
        };
      });
    },
  });
  await hold(page, ".parents-btn");
  await page.locator(".level-card").nth(1).click();
  await page.getByRole("alert").filter({ hasText: "только в памяти" }).waitFor();
  await tab(page, "Данные");
  assert.equal(
    await page.getByText("Скачать копию всех профилей", { exact: true }).isEnabled(),
    true,
  );
  assert.deepEqual(errors, []);
});

test("blocked localStorage reads do not prevent production startup", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/map",
    beforeGoto: async (_c, p) =>
      p.addInitScript(() => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      }),
  });
  await page.waitForSelector(".map-screen");
  await hold(page, ".parents-btn");
  await page.getByRole("alert").waitFor();
  await page.locator(".level-card").nth(1).click();
  await page.getByRole("alert").filter({ hasText: "только в памяти" }).waitFor();
  assert.deepEqual(errors, []);
});
