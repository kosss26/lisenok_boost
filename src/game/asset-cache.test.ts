import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

test("media hashes track individual original and encoded files", () => {
  const dir = mkdtempSync(join(tmpdir(), "lisenok-hashes-"));
  try {
    for (const path of ["src/game", "public/voice", "tmp/media-cache/voice"])
      mkdirSync(join(dir, path), { recursive: true });
    writeFileSync(join(dir, "public/voice/one.mp3"), "one");
    writeFileSync(join(dir, "public/voice/two.mp3"), "two");
    writeFileSync(join(dir, "tmp/media-cache/voice/one.ogg"), "encoded one");
    const run = () => {
      execFileSync(process.execPath, [resolve("tools/asset-versions.mjs")], { cwd: dir });
      const generated = readFileSync(join(dir, "src/game/asset-versions.ts"), "utf8");
      return JSON.parse(
        generated
          .slice(generated.indexOf("= ") + 2)
          .trim()
          .replace(/;$/, ""),
      );
    };
    const first = run();
    writeFileSync(join(dir, "public/voice/one.mp3"), "changed one");
    const second = run();
    assert.notEqual(second["/voice/one.mp3"], first["/voice/one.mp3"]);
    assert.equal(second["/voice/two.mp3"], first["/voice/two.mp3"]);
    assert.equal(second["/voice/one.ogg"], first["/voice/one.ogg"]);
    writeFileSync(join(dir, "tmp/media-cache/voice/one.ogg"), "different encoded bytes");
    assert.notEqual(run()["/voice/one.ogg"], second["/voice/one.ogg"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
