import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, saved, BASE, upTo, dragTo } from "./helpers.mjs";
import { makeRound } from "../../src/game/tasks.ts";
import { FOREST } from "../../src/content/forest.ts";
function rewardProgress(id = "hedgehog", placed = false) {
  const stop = FOREST.find((s) => s.id === id),
    round = makeRound(stop.skill, 1),
    task = round[4];
  let used = [];
  if (task.kind === "build")
    for (const letter of task.target) {
      used.push(task.pieces.findIndex((p, i) => p === letter && !used.includes(i)));
    }
  return {
    intro: true,
    settings: { level: 1, auto: false },
    done: { ...upTo(id), [id]: 1 },
    gifts: [stop.gift],
    skills: { [task.skill]: { tasks: 5, firstTry: 5 } },
    sky: placed ? { [id]: [35, 35] } : {},
    session: {
      id: "earned-" + id,
      mode: "story",
      target: id,
      level: 1,
      round,
      step: 4,
      phase: "reward",
      mistakes: 0,
      draft: {
        mistakes: 0,
        hintStage: 0,
        used,
        off: [],
        picked: task.kind === "choice" ? task.answer : null,
        complete: true,
      },
      reward: { first: true, toPlace: !placed },
    },
  };
}

test("the trail has one clear goal and rapid selections only open the first chosen stop", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest",
    progress: { intro: true, done: { hedgehog: 1 } },
    reducedMotion: "reduce",
  });
  assert.equal(await page.locator('.stop[aria-current="step"]').count(), 1);
  assert.equal(
    await page.locator('.stop[aria-current="step"]').getAttribute("data-stop"),
    "squirrel",
  );
  assert.equal(
    await page.locator(".stop.is-done .stop-ground").evaluate((e) => getComputedStyle(e).opacity),
    "1",
  );
  assert.equal(
    await page
      .locator(".stop.is-done .stop-body")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.evaluate(() => {
    document.querySelector('[data-stop="squirrel"]').click();
    document.querySelector('[data-stop="hedgehog"]').click();
  });
  await page.waitForSelector(".hello");
  assert.match(page.url(), /\/forest\/squirrel$/);
  assert.deepEqual(errors, []);
});

test("star placement is persisted before its flight, then thanks and a gift appear without moving continue", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: rewardProgress(),
  });
  const before = await page.locator(".next-btn").boundingBox();
  await page.click(".new-star");
  assert.ok((await saved(page)).sky.hedgehog);
  await page.waitForSelector(".reward-star-flight");
  assert.equal(await page.locator(".gift").count(), 0);
  await page.waitForSelector('[data-reward-stage="thanks"]');
  await page.waitForSelector(".reward-talk");
  await page.waitForSelector(".gift");
  const after = await page.locator(".next-btn").boundingBox();
  assert.ok(Math.abs(before.y - after.y) < 1);
  assert.equal((await saved(page)).done.hedgehog, 1);
  await page.waitForFunction(() => window.__voice.includes("bye-hedgehog-0"));
  const beforeReload = await saved(page);
  await page.reload();
  await page.waitForSelector(".gift");
  assert.equal(await page.locator(".new-star,.reward-star-flight").count(), 0);
  const p = await saved(page);
  assert.deepEqual(p.sky, beforeReload.sky);
  assert.deepEqual(p.skills, beforeReload.skills);
  assert.deepEqual(p.gifts, beforeReload.gifts);
  assert.equal(p.done.hedgehog, 1);
  assert.deepEqual(errors, []);
});

test("continue stays available during a flight and leaving cancels the scene", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: rewardProgress(),
  });
  await page.click(".new-star");
  const star = (await saved(page)).sky.hedgehog;
  await page.click(".next-btn");
  await page.waitForSelector(".forest-screen");
  await page.waitForTimeout(1000);
  assert.equal(await page.locator(".story-reward").count(), 0);
  assert.deepEqual((await saved(page)).sky.hedgehog, star);
  assert.equal((await saved(page)).session, null);
  await page.goto(BASE + "forest/hedgehog");
  await page.waitForSelector(".hello");
  assert.deepEqual(errors, []);
});

test("reward controls and long gift labels fit phone and tablet; reduced motion skips staging", async (t) => {
  const longest = FOREST.reduce((a, b) => (a.giftName.length > b.giftName.length ? a : b));
  for (const [width, height] of [
    [320, 568],
    [390, 664],
    [768, 1024],
  ]) {
    const { page, browser, errors } = await openPhone(null, {
      path: `/forest/${longest.id}`,
      progress: rewardProgress(longest.id),
      reducedMotion: "reduce",
    });
    t.after(() => browser.close());
    await page.setViewportSize({ width, height });
    const before = await page.locator(".next-btn").boundingBox();
    await page.locator(".sky-frame").focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector(".gift");
    assert.equal(await page.locator(".reward-star-flight").count(), 0);
    const after = await page.locator(".next-btn").boundingBox();
    assert.ok(Math.abs(before.y - after.y) < 1);
    const bounds = await page
      .locator(
        ".story-reward .reward-heading,.story-reward .sky-frame,.story-reward .gift,.story-reward .next-btn,.story-reward .reward-talk",
      )
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
    assert.ok(
      bounds.every((r) => r.x >= 0 && r.right <= width + 1 && r.y >= 0 && r.bottom <= height + 1),
      `${width}: reward fits`,
    );
    assert.deepEqual(errors, []);
    await browser.close();
  }
});

test("skipping placement still saves the star and shows the next goal", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: rewardProgress(),
    reducedMotion: "reduce",
  });
  await page.click(".next-btn");
  await page.waitForSelector(".forest-screen");
  assert.ok((await saved(page)).sky.hedgehog);
  assert.equal(
    await page.locator('.stop[aria-current="step"]').getAttribute("data-stop"),
    "squirrel",
  );
  assert.deepEqual(errors, []);
});

test("gift narration is not interrupted by delayed thanks", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: rewardProgress(),
    reducedMotion: "reduce",
  });
  await page.click(".new-star");
  await page.waitForSelector(".gift");
  await page.click(".gift");
  await page.waitForFunction(() => window.__voice.includes("gift-hedgehog"));
  await page.waitForTimeout(500);
  const requested = await page.evaluate(() => window.__voice);
  const gift = requested.lastIndexOf("gift-hedgehog");
  assert.ok(!requested.slice(gift + 1).some((k) => k.startsWith("bye-")));
  assert.deepEqual(errors, []);
});

test("dragging the reward star keeps the sky and continue button fixed", async (t) => {
  const { page, errors } = await openPhone(t, {
    path: "/forest/hedgehog",
    progress: rewardProgress(),
  });
  const before = await page
    .locator(".sky-frame,.next-btn")
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
  await dragTo(page, ".new-star", ".sky-frame", { drop: false });
  const during = await page
    .locator(".sky-frame,.next-btn")
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
  for (let i = 0; i < before.length; i++)
    for (const key of ["x", "y", "width", "height"])
      assert.ok(Math.abs(before[i][key] - during[i][key]) < 1, `drag moved ${key}`);
  await page.mouse.up();
  await page.waitForSelector(".gift");
  const [x, y] = (await saved(page)).sky.hedgehog;
  assert.ok(Math.abs(x - 50) < 5 && Math.abs(y - 50) < 5);
  assert.deepEqual(errors, []);
});
