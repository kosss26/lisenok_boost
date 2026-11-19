import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { ASSET_VERSIONS } from "./src/game/asset-versions.ts";

/** Every file under `dir`, as "/a/b.ext" URLs. */
function walk(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory()
      ? walk(full, root)
      : ["/" + relative(root, full).split("\\").join("/")];
  });
}

/**
 * Offline play: after the build, writes dist/sw.js that precaches the whole game (code, art,
 * voice, sounds, music) on the first visit, then serves everything cache-first.
 * Media URLs carry ?v=<hash> (tools/asset-versions.mjs), so the worker caches exactly those.
 */
function offlinePlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "lisenok:offline",
    apply: "build",
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      // AVIF / Opus copies made by tools/encode-media.py
      for (const folder of ["art", "voice", "sfx", "music"]) {
        const dir = `tmp/media-cache/${folder}`;
        if (existsSync(dir)) cpSync(dir, join(outDir, folder), { recursive: true });
      }
      const files = walk(outDir).filter((f) => f !== "/sw.js" && !f.endsWith(".map"));
      const urls = files.map((f) => {
        if (f === "/index.html") return "/";
        return ASSET_VERSIONS[f] ? `${f}?v=${ASSET_VERSIONS[f]}` : f;
      });
      const hash = createHash("sha1");
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest("hex").slice(0, 10);
      const sw = readFileSync("src/sw-template.js", "utf8")
        .replace("__VERSION__", version)
        .replace("/*__URLS__*/ []", JSON.stringify(urls));
      writeFileSync(join(outDir, "sw.js"), sw);
    },
  };
}

/** Media is immutable (versioned URLs): long cache in dev too, like in production. */
function mediaCache(): Plugin {
  return {
    name: "lisenok:media-cache",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/^\/(art|voice|sfx|music)\//.test(req.url ?? "") && (req.url ?? "").includes("?v=")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlinePlugin(), mediaCache()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "vendor", test: /node_modules/ },
            { name: "media-versions", test: /asset-versions\.ts$/ },
          ],
        },
      },
    },
  },
  server: { host: "0.0.0.0", port: 8080, allowedHosts: true },
  preview: { host: "0.0.0.0", port: 8081, allowedHosts: true },
});
