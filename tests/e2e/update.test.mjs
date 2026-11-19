import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { openPhone, saved } from "./helpers.mjs";

test(
  "worker rejects incomplete updates, waits through a lesson, then applies on request",
  { skip: !process.env.OFFLINE },
  async (t) => {
    const dist = resolve(process.env.BUILD_DIR ?? "dist");
    const original = await readFile(join(dist, "sw.js"), "utf8");
    let version = "fixture-one";
    let incomplete = false;
    const server = createServer(async (req, res) => {
      const path = new URL(req.url, "http://localhost").pathname;
      res.setHeader("Cache-Control", "no-store");
      if (path === "/sw.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(
          original
            .replace(/const VERSION = "[^"]+";/, `const VERSION = "${version}";`)
            .replace(
              /const ALL = [\s\S]*?;\n/,
              `const ALL = ${JSON.stringify(incomplete ? ["/", "/required-shell-missing"] : ["/"])};\n`,
            ),
        );
        return;
      }
      if (path === "/required-shell-missing") {
        res.writeHead(404);
        res.end();
        return;
      }
      try {
        const file = path === "/" || !extname(path) ? "/index.html" : path;
        if (file.includes("..")) throw Error("path");
        const data = await readFile(join(dist, file));
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".webp": "image/webp",
            ".avif": "image/avif",
            ".woff2": "font/woff2",
            ".json": "application/json",
            ".webmanifest": "application/manifest+json",
            ".svg": "image/svg+xml",
            ".ogg": "audio/ogg",
            ".mp3": "audio/mpeg",
          }[extname(file)] ?? "application/octet-stream",
        );
        res.end(
          extname(file) === ".html"
            ? data
                .toString()
                .replace("</head>", `<meta name="fixture-version" content="${version}"></head>`)
            : data,
        );
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => {
      server.closeAllConnections();
      server.close();
    });
    const origin = `http://127.0.0.1:${server.address().port}/`;
    const { page } = await openPhone(t, {
      progress: { intro: true, settings: { autoHints: false } },
    });
    await page.goto(origin + "practice/build");
    await page.waitForSelector(".task-build");
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.click(".back-btn");
    assert.equal(
      await page.locator(".update-notice").count(),
      0,
      "first install is not an available update",
    );
    await page.click('[data-skill="build"]');
    await page.waitForSelector(".task-build");
    await page.locator('.piece[data-answer="1"]').click();
    const session = (await saved(page)).session;
    await page.evaluate(async () => {
      await caches.open("another-app");
      window.__samePage = "yes";
    });
    version = "fixture-broken";
    incomplete = true;
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r.update();
      await new Promise((resolve) => {
        const w = r.installing;
        if (!w) return resolve();
        w.addEventListener("statechange", () => {
          if (w.state === "redundant") resolve();
        });
      });
    });
    assert.equal(
      await page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration()).waiting),
      ),
      false,
    );
    version = "fixture-two";
    incomplete = false;
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration()).update();
    });
    await page.waitForFunction(async () =>
      Boolean((await navigator.serviceWorker.getRegistration()).waiting),
    );
    assert.equal(await page.locator(".update-notice").count(), 0);
    assert.equal(await page.evaluate(() => window.__samePage), "yes");
    assert.equal((await saved(page)).session.id, session.id);
    await page.click(".back-btn");
    await page.waitForSelector(".update-notice");
    await page.getByRole("button", { name: "Обновить игру", exact: true }).click();
    await page.waitForFunction(() => window.__samePage === undefined);
    assert.equal((await saved(page)).session.id, session.id);
    assert.deepEqual((await saved(page)).session.draft.used, session.draft.used);
    const keys = await page.evaluate(() => caches.keys());
    assert.ok(keys.includes("another-app"));
    assert.ok(keys.some((k) => k.includes("fixture-one")));
    assert.ok(keys.some((k) => k.includes("fixture-two")));
    await page.context().setOffline(true);
    await page.goto(origin);
    assert.equal(
      await page.locator('meta[name="fixture-version"]').getAttribute("content"),
      "fixture-two",
    );
    await page.click(".resume-lesson");
    await page.waitForSelector(".task-build");
    assert.equal(await page.locator(".slot.is-filled").count(), 1);
  },
);
