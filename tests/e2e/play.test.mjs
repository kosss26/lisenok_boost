// Plays the whole forest on a phone: 18 stops, every task type, star (hung in the sky) and gift,
// the forest celebration, the album.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, playStop, saved, STOPS } from "./helpers.mjs";

for (const level of [1, 2, 3]) {
  test(`world 1 can be finished at level ${level}`, async (t) => {
    const { page, errors } = await openPhone(t, {
      path: "/forest",
      progress: { intro: true, settings: { level, auto: false } },
    });
    for (const [i, id] of STOPS.entries()) {
      await page.waitForSelector(`.stop[data-stop="${id}"].is-next`, { state: "attached" });
      await playStop(page, id);
      // a tap on the new star hangs it in the sky; then the gift comes
      await page.click(".new-star");
      await page.waitForSelector(".gift");
      assert.equal(await page.locator(".gift").count(), 1, `${id}: gift shown`);
      await page.click(".next-btn");
      await page.waitForSelector(".forest-screen");
      assert.match(await page.locator(".star-count").innerText(), new RegExp(`^${i + 1}`));
    }
    // all stars: celebration, then the album has all the gifts
    await page.waitForSelector(".celebrate");
    await page.click(".celebrate .big-btn");
    assert.equal(await page.locator(".celebrate").count(), 0);
    const p = await saved(page);
    assert.equal(Object.keys(p.done).length, STOPS.length);
    assert.equal(p.gifts.length, STOPS.length);
    assert.equal(Object.keys(p.sky).length, STOPS.length, "every star hangs in the sky");
    assert.equal(p.settings.level, level, "level stays when auto is off");
    await page.click(".back-btn");
    await page.click(".album-btn");
    // screens change with a view transition: the album is there a moment after the tap
    await page.waitForSelector(".album-slot.is-have");
    assert.equal(await page.locator(".album-slot.is-have").count(), STOPS.length);
    assert.deepEqual(errors, []);
  });
}
