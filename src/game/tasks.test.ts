// Every generated task is solvable: the answer is among the options, every voice key and
// picture exists. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { ALL_STOPS } from "../content/worlds.ts";
import { introKey, outroKey, shown, voiceLines } from "../content/voice.ts";
import { makeRound, type Level } from "./tasks.ts";
import { SENTENCES, STORIES, WORDS, WORDS_BY_LEVEL, similar } from "../content/words.ts";
import { sylKey, wordKey } from "../content/voice.ts";

const lines = voiceLines();
const hasPic = (p: string) => existsSync(`public/art/${p}.webp`);

test("all skills × levels give valid rounds", () => {
  for (let seed = 0; seed < 60; seed++) {
    let s = seed * 9301 + 49297;
    const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const g = [0, 0.3, 0.6, 1][seed % 4];
    for (const stop of ALL_STOPS) {
      for (const level of [1, 2, 3] as Level[]) {
        const round = makeRound(stop.skill, { level, g }, rand);
        assert.equal(round.length, 5);
        for (const t of round) {
          for (const k of [...t.prompt, ...t.hint]) assert.ok(lines[k], `voice ${k}`);
          if (t.kind === "choice") {
            const ids = t.options.map((o) => o.id);
            assert.ok(
              ids.includes(t.answer),
              `${stop.skill} L${level}: answer ${t.answer} in ${ids}`,
            );
            assert.equal(
              new Set(ids).size,
              ids.length,
              `${stop.skill} L${level}: unique options ${ids}`,
            );
            for (const o of t.options) {
              if (o.say) assert.ok(lines[o.say], `voice ${o.say}`);
              if (o.pic) assert.ok(hasPic(o.pic), `pic ${o.pic}`);
            }
            const v = t.visual;
            if ("pic" in v && v.pic) assert.ok(hasPic(v.pic), `pic ${v.pic}`);
          } else {
            assert.ok(hasPic(t.pic), `pic ${t.pic}`);
            for (const p of t.target) assert.ok(t.pieces.includes(p));
          }
        }
      }
    }
  }
});

test("every stop has art and voice", () => {
  for (const stop of ALL_STOPS) {
    assert.ok(hasPic(stop.resident) && hasPic(stop.gift), stop.id);
    assert.ok(stop.intro.length && stop.outro.length);
    stop.intro.forEach((l, i) => assert.equal(shown(lines[introKey(stop.id, i)]), l.text));
    stop.outro.forEach((l, i) => assert.equal(shown(lines[outroKey(stop.id, i)]), l.text));
    stop.young?.intro.forEach((l, i) =>
      assert.equal(shown(lines[introKey(`${stop.id}-young`, i)]), l.text),
    );
  }
});

test("every word has a picture, a voice line and matching syllables", () => {
  const ids = new Set<string>();
  for (const w of WORDS) {
    assert.ok(!ids.has(w.id), `unique id ${w.id}`);
    ids.add(w.id);
    assert.ok(hasPic(w.pic), `pic ${w.pic}`);
    assert.ok(lines[wordKey(w.id)], `voice ${w.id}`);
    assert.equal(w.syl.replaceAll("-", ""), w.word, `syllables of ${w.word}`);
    for (const s of w.syl.split("-")) assert.ok(lines[sylKey(s)], `syllable ${s}`);
    if (w.say)
      assert.equal(
        w.say.replaceAll("+", "").replace(/^йу/, "ю"),
        w.word.toLowerCase(),
        `say ${w.word}`,
      );
  }
  assert.ok(WORDS.length >= 200, `${WORDS.length} words`);
  for (const level of [1, 2, 3] as const) assert.ok(WORDS_BY_LEVEL[level].length >= 20);
});

test("sentences and word problems: pictures, voice, no numbers in stories", () => {
  for (const s of SENTENCES) {
    assert.ok(lines[`sen-${s.id}`], s.id);
    for (const p of [s.answer, ...(s.options ?? [])]) assert.ok(hasPic(p), `pic ${p}`);
    assert.ok(!(s.options ?? []).includes(s.answer), s.id);
  }
  assert.ok(SENTENCES.filter((s) => s.level === 2).length >= 30);
  assert.ok(SENTENCES.filter((s) => s.level === 3).length >= 30);
  for (const op of ["+", "-"]) assert.ok(STORIES.filter((s) => s.op === op).length >= 10);
  for (const s of STORIES) {
    assert.ok(hasPic(s.pic) && lines[`st-${s.id}`], s.id);
    assert.ok(!/\d/.test(s.text), `no digits in ${s.id}`);
  }
});

test("wrong pictures are never look-alikes of the answer", () => {
  let s = 7;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 300; i++)
    for (const skill of ["read", "sentence"] as const)
      for (const level of [2, 3] as Level[])
        for (const t of makeRound(skill, level, rand)) {
          if (t.kind !== "choice") continue;
          const pic = (id: string) => t.options.find((o) => o.id === id)?.pic ?? id;
          const right = pic(t.answer);
          for (const o of t.options)
            if (o.id !== t.answer)
              assert.ok(!similar(o.pic ?? o.id, right), `${right} vs ${o.pic}`);
        }
});

test("hard words come back first, and clean answers retire them", async () => {
  const { nextWordStat, weakWordIds } = await import("./progress.ts");
  const weakId = WORDS_BY_LEVEL[2][5];
  for (let i = 0; i < 20; i++) {
    const round = makeRound("read", 2, Math.random, new Set([weakId]));
    assert.equal((round[0] as { word?: string }).word, weakId);
    assert.equal(round.filter((t) => (t as { word?: string }).word === weakId).length, 1);
  }
  let st = nextWordStat(undefined, 1, false);
  assert.equal(st.streak, 0);
  const mk = (s: typeof st) => weakWordIds({ words: { x: s } } as never).has("x");
  assert.ok(mk(st));
  st = nextWordStat(st, 0, false);
  assert.ok(mk(st));
  st = nextWordStat(st, 0, false);
  assert.ok(!mk(st));
});

test("practice on the glade: weak skills and weak words first, then mixed review", async () => {
  const { makePractice, PRACTICE } = await import("./tasks.ts");
  for (let seed = 0; seed < 40; seed++) {
    let s = seed * 7919 + 13;
    const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (const level of [1, 2, 3] as Level[]) {
      const weakWord = WORDS_BY_LEVEL[level][seed % WORDS_BY_LEVEL[level].length];
      const weakSkill = level === 1 ? "compare" : "sub";
      const tasks = makePractice(
        level,
        [weakSkill, ...(level === 1 ? (["sub"] as const) : [])],
        new Set([weakWord]),
        rand,
      );
      assert.equal(tasks.length, PRACTICE);
      assert.equal(tasks[0].skill, weakSkill, "weak skill first");
      if (level === 1) assert.ok(tasks.every((t) => t.skill !== "add" && t.skill !== "sub"));
      assert.ok(
        tasks.slice(1, 3).some((t) => t.word === weakWord),
        `weak word ${weakWord} early (level ${level})`,
      );
      const words = tasks.flatMap((t) => (t.word ? [t.word] : []));
      assert.equal(new Set(words).size, words.length, "no word twice");
      for (let i = 1; i < tasks.length; i++)
        if (i > 2) assert.notEqual(tasks[i].skill, tasks[i - 1].skill, "review mixes skills");
      for (const t of tasks) for (const k of [...t.prompt, ...t.hint]) assert.ok(lines[k], k);
    }
    // nothing weak: plain mixed review
    const plain = makePractice(2, [], new Set(), rand);
    assert.equal(plain.length, PRACTICE);
  }
});

test("glade finds have pictures and word clips", async () => {
  const { FINDS } = await import("../content/glade.ts");
  for (const f of FINDS) {
    assert.ok(hasPic(f.pic), f.pic);
    assert.ok(lines[wordKey(f.id)], f.id);
  }
  for (const k of ["glade-hello", "glade-find", "glade-more", "glade-all", "glade-open"])
    assert.ok(lines[k], k);
});
