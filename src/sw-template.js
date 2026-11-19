/* Service worker for offline play (generated into dist/sw.js by vite.config.ts). */
const VERSION = "__VERSION__";
const ALL = /*__URLS__*/ [];
// the page tells us (sw.js?img=avif|webp&aud=ogg|mp3) which picture and sound formats it uses
const q = new URL(self.location.href).searchParams;
const skip = [
  q.get("img") === "avif" ? ".webp" : ".avif",
  q.get("aud") === "ogg" ? ".mp3" : ".ogg",
];
const URLS = ALL.filter(
  (u) =>
    !skip.some(
      (ext) =>
        /^\/(art|voice|sfx|music)\//.test(u) &&
        u.split("?")[0].endsWith(ext) &&
        !u.split("?")[0].endsWith("-motion.webp"),
    ),
);
const CACHE = `lisenok-${VERSION}-${q.get("img")}-${q.get("aud")}`;

const MEDIA = /^\/(art|voice|sfx|music)\//;
// the shell (page, code, styles, fonts, icons) is small: it is cached during install, so the worker
// takes over within seconds. Pictures and sounds (~1500 files) are filled in afterwards.
const SHELL = URLS.filter((u) => !MEDIA.test(u));

/** Puts `urls` into the cache: a copy from an older cache when the file did not change (media
 * URLs carry a content hash), otherwise from the network. In small batches, skipping what is there. */
async function store(urls) {
  const cache = await caches.open(CACHE);
  const have = new Set(
    (await cache.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search),
  );
  const todo = urls.filter((u) => !have.has(u));
  for (let i = 0; i < todo.length; i += 16) {
    await Promise.all(
      todo.slice(i, i + 16).map(async (u) => {
        try {
          // only content-addressed files may be copied ("/" or the manifest must be fresh)
          const fixed = u.includes("?v=") || u.startsWith("/assets/");
          const old = fixed ? await caches.match(u) : undefined;
          if (old) await cache.put(u, old);
          else await cache.add(new Request(u, { cache: "reload" }));
        } catch {
          /* one missing file must not stop the rest; it is fetched again next time */
        }
      }),
    );
  }
  return todo.length;
}

let filling = null;
/** Fills in every picture and sound, then drops the caches of older versions. Resumable: after an
 * interruption the next page load asks again and only the missing files are fetched. */
function fill() {
  filling ??= store(URLS)
    .then(async () => {
      const cache = await caches.open(CACHE);
      if ((await cache.keys()).length < URLS.length) return;
      const keys = await caches.keys();
      // Retain the previous version for tabs still using its code. Never remove other apps' caches.
      const older = keys.filter((k) => k.startsWith("lisenok-") && k !== CACHE);
      await Promise.all(older.slice(0, -1).map((k) => caches.delete(k)));
    })
    .finally(() => (filling = null));
  return filling;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    store(SHELL).then(async () => {
      const cache = await caches.open(CACHE);
      const complete = await Promise.all(SHELL.map((u) => cache.match(u)));
      if (complete.some((hit) => !hit)) {
        await caches.delete(CACHE);
        throw new Error("Incomplete offline shell");
      }
      // An update waits until the player chooses it between lessons.
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  // also started by the page ("fill" message), which keeps the worker alive while it runs
  void fill();
});

self.addEventListener("message", (event) => {
  if (event.data === "activate-update") event.waitUntil(self.skipWaiting());
  if (event.data === "fill") event.waitUntil(fill());
  if (event.data === "status") {
    caches.open(CACHE).then(async (cache) => {
      const have = (await cache.keys()).length;
      event.source?.postMessage({ type: "offline-status", have, total: URLS.length });
    });
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // the game is one page: any address opens it, from the cache when offline
    event.respondWith(
      fetch(req).catch(() =>
        caches.open(CACHE).then((cache) => cache.match("/", { ignoreSearch: true })),
      ),
    );
    return;
  }
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(req, { ignoreVary: true }))
      .then((hit) => hit || caches.match(req, { ignoreVary: true }))
      .then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
  );
});
