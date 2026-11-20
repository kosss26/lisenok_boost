// Offline: after the first visit the whole game (voice and pictures too) works without network.
// Needs the production build: npm run build && npm run preview, then
//   OFFLINE=1 BASE_URL=http://127.0.0.1:8081/ npm run test:e2e
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPhone, playStop, STOPS, KEY, BASE } from "./helpers.mjs";

test("plays both worlds offline", { skip: !process.env.OFFLINE }, async (t) => {
  const { page, context, errors } = await openPhone(t, {
    offline: true,
    progress: { intro: true },
  });
  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 30000 });
  // wait until the service worker reports every file of the chosen formats cached
  await page.evaluate(() => {
    window.__sw = { have: 0, total: -1 };
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "offline-status") window.__sw = e.data;
    });
  });
  await page.waitForFunction(
    () => {
      navigator.serviceWorker.controller?.postMessage("status");
      return window.__sw.total > 600 && window.__sw.have >= window.__sw.total;
    },
    null,
    { timeout: 120000, polling: 1000 },
  );
  // the page and the worker agree on the formats (AVIF/Opus where supported, WebP/MP3 otherwise)
  const fmt = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sw = new URL(reg.active.scriptURL).searchParams;
    const keys = await caches.keys();
    const urls = (await (await caches.open(keys[0])).keys()).map((r) => new URL(r.url).pathname);
    return {
      img: sw.get("img"),
      aud: sw.get("aud"),
      avif: urls.filter((u) => u.endsWith(".avif")).length,
      webp: urls.filter(
        (u) => u.startsWith("/art/") && u.endsWith(".webp") && !u.endsWith("-motion.webp"),
      ).length,
      motion: urls.filter((u) => u.endsWith("-motion.webp")).length,
      ogg: urls.filter((u) => u.endsWith(".ogg")).length,
      mp3: urls.filter((u) => u.endsWith(".mp3")).length,
      shown: document.querySelector("img[src*='/art/']")?.getAttribute("src") ?? "",
    };
  });
  const [img, other] = fmt.img === "avif" ? ["avif", "webp"] : ["webp", "avif"];
  assert.ok(
    fmt[img] > 100 && fmt[other] === 0,
    `pictures cached as ${img}: ${JSON.stringify(fmt)}`,
  );
  assert.equal(
    fmt.motion,
    2,
    "both native animated foxes are cached alongside the chosen static format",
  );
  const [aud, otherAud] = fmt.aud === "ogg" ? ["ogg", "mp3"] : ["mp3", "ogg"];
  assert.ok(
    fmt[aud] > 100 && fmt[otherAud] === 0,
    `sound cached as ${aud}: ${JSON.stringify(fmt)}`,
  );
  if (fmt.shown) assert.ok(fmt.shown.includes(`.${img}`), `page shows ${img}: ${fmt.shown}`);
  console.log("offline formats:", fmt.img, fmt.aud, `${fmt[img]} pictures, ${fmt[aud]} sounds`);
  await context.setOffline(true);
  await page.goto(new URL("forest", page.url()).href);
  await page.waitForSelector(".forest-screen");
  const broken = await page
    .waitForFunction(
      () => [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      null,
      {
        timeout: 10000,
      },
    )
    .then(() => [])
    .catch(() =>
      page.evaluate(() =>
        [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.src),
      ),
    );
  assert.deepEqual(broken, [], "pictures load offline");
  await playStop(page, "hedgehog");
  await page.addInitScript(
    ([key, stops]) => {
      if (sessionStorage.getItem("offline-sea-seeded")) return;
      sessionStorage.setItem("offline-sea-seeded", "yes");
      const v = JSON.parse(localStorage.getItem(key));
      const done = Object.fromEntries(stops.map((id) => [id, 1]));
      Object.assign(v, { done, session: null, forestCelebrated: true });
      if (v.profiles?.[v.activeProfile])
        Object.assign(v.profiles[v.activeProfile].progress, {
          done,
          session: null,
          forestCelebrated: true,
        });
      localStorage.setItem(key, JSON.stringify(v));
    },
    [KEY, STOPS],
  );
  await page.goto(BASE + "sea");
  await page.waitForSelector(".sea-screen");
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  assert.equal(
    await page.locator("img[data-media-error]").count(),
    0,
    "sea pictures load from the offline cache",
  );
  await playStop(page, "sea-crab");
  assert.deepEqual(errors, []);
});
