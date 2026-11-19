/**
 * Task generators: one stop = a short round of tasks for one skill at the child's level.
 * Pure functions (random source injectable) so they can be unit-tested.
 */
import type { Skill } from "../content/forest.ts";
import { letterKey, numKey, sylKey, wordKey } from "../content/voice.ts";
import {
  EASY_LETTERS,
  LETTER_NAMES,
  SENTENCES,
  STORIES,
  SYLLABLES,
  WORDS,
  WORDS_BY_LEVEL,
  similar as alike,
  wordById,
  type Word,
} from "../content/words.ts";

export type Level = 1 | 2 | 3;
export type Rand = () => number;

export type Option = {
  id: string;
  /** big text on the card (letter, number, word, syllable, sign) */
  label?: string;
  /** picture (public/art) */
  pic?: string;
  /** how many pictures (compare groups) */
  count?: number;
  /** voice key spoken when tapped */
  say?: string;
};

export type Visual =
  | { type: "listen" }
  | { type: "picture"; pic: string; text?: string }
  | { type: "word"; text: string }
  | { type: "sentence"; text: string }
  | { type: "count"; pic: string; n: number; mode: "loose" | "rows" | "tens" }
  | { type: "math"; a: number; b: number; op: "+" | "-"; pic?: string; c?: number; op2?: "+" | "-" }
  | { type: "compare"; left: string; right: string };

export type ChoiceTask = {
  kind: "choice";
  skill: Skill;
  prompt: string[];
  hint: string[];
  visual: Visual;
  layout: "letters" | "pictures" | "numbers" | "words" | "signs" | "groups" | "syllables";
  options: Option[];
  answer: string;
  /** the word this task is about (for word-level stats) */
  word?: string;
};

export type BuildTask = {
  kind: "build";
  skill: Skill;
  prompt: string[];
  hint: string[];
  pic: string;
  /** the pieces of the word in order (letters or syllables) */
  target: string[];
  /** shuffled pieces on the table, including distractors */
  pieces: string[];
  /** show faint letters in the slots (youngest level) */
  ghost: boolean;
  unit: "letter" | "syllable";
  word?: string;
};

export type Task = ChoiceTask | BuildTask;

/** tasks per stop */
export const ROUND = 5;

// ---------- helpers ----------
export const pick = <T>(arr: readonly T[], rand: Rand): T => arr[Math.floor(rand() * arr.length)];
export function shuffle<T>(arr: readonly T[], rand: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const int = (lo: number, hi: number, rand: Rand) => lo + Math.floor(rand() * (hi - lo + 1));
/** `count` different items from `pool` (without `not`). */
function sample<T>(pool: readonly T[], count: number, rand: Rand, not: T[] = []): T[] {
  return shuffle(
    pool.filter((x) => !not.includes(x)),
    rand,
  ).slice(0, count);
}
/** Wrong numbers near the right one, all within [lo, hi]. */
function nearNumbers(answer: number, count: number, lo: number, hi: number, rand: Rand) {
  const out = new Set<number>();
  const spread = [1, -1, 2, -2, 10, -10, 3, -3, 5, -5];
  for (const d of shuffle(spread.slice(0, answer >= 20 ? 10 : 6), rand)) {
    const v = answer + d;
    if (v >= lo && v <= hi && v !== answer) out.add(v);
    if (out.size === count) break;
  }
  for (let v = lo; out.size < count && v <= hi; v++) if (v !== answer) out.add(v);
  return [...out];
}
const numberOptions = (answer: number, wrong: number[], rand: Rand): Option[] =>
  shuffle([answer, ...wrong], rand).map((n) => ({
    id: String(n),
    label: String(n),
    say: numKey(n),
  }));
const wordsAt = (level: Level) => WORDS_BY_LEVEL[level].map(wordById);
/** take from the start of a shuffled deck so a round never repeats an item */
function deck<T>(items: readonly T[], rand: Rand) {
  let d = shuffle(items, rand);
  return () => {
    if (!d.length) d = shuffle(items, rand);
    return d.shift() as T;
  };
}

/** words the child stumbled on recently: they come back (at most one per round, spaced out) */
let weakIds: ReadonlySet<string> = new Set();
/** like deck(), but a word the child finds hard comes first (when the level has one) */
function wordDeck(items: readonly Word[], rand: Rand) {
  const inner = deck(items, rand);
  const weak = shuffle(
    items.filter((w) => weakIds.has(w.id)),
    rand,
  );
  let first = weak[0];
  return () => {
    if (first) {
      const w = first;
      first = undefined as unknown as Word;
      return w;
    }
    let w = inner();
    if (weakIds.has(w.id) && weak[0] && w.id === weak[0].id) w = inner();
    return w;
  };
}

// ---------- difficulty ----------
/**
 * How hard a round is inside the child's age level: `g` goes from 0 (easiest) to 1 (hardest).
 * It grows slowly along the forest path, is shifted by the «легко / средне / трудно» choice and by
 * how the child is doing (see grade() in progress.ts). Every generator reads it the same way:
 * small numbers, short words and few options at 0; bigger numbers, longer words, more options at 1.
 */
export type Tune = { level: Level; g: number };
const by = (g: number, steps: readonly number[]) =>
  steps[Math.min(steps.length - 1, Math.floor(g * steps.length))];
const lerp = (g: number, lo: number, hi: number) => Math.round(lo + (hi - lo) * g);

/** words of the level, shortest and simplest first; `g` decides how far into the list we go */
function wordsFor({ level, g }: Tune, filter: (w: Word) => boolean = () => true): Word[] {
  let pool = wordsAt(level);
  // the youngest also get easy four-letter words in the second half of the path
  if (level === 1 && g >= 0.5)
    pool = pool.concat(
      wordsAt(2).filter(
        (w) =>
          w.word.length === 4 &&
          [...w.word].every((c) => EASY_LETTERS.includes(c) || "АОУИЫЭЕЯ".includes(c)),
      ),
    );
  const hardness = (w: Word) =>
    w.word.length * 10 + [...w.word].filter((c) => !EASY_LETTERS.includes(c)).length;
  const sorted = pool.filter(filter).sort((x, y) => hardness(x) - hardness(y));
  const n = Math.max(Math.min(8, sorted.length), Math.round(sorted.length * (0.3 + 0.7 * g)));
  // words the child stumbled on stay in the game whatever the difficulty
  return [...sorted.slice(0, n), ...sorted.slice(n).filter((w) => weakIds.has(w.id))];
}

// ---------- skills ----------
function letters(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  if (level === 1 && g < 0.75) {
    // hear a sound, find its letter: vowels and a few consonants first, the pool grows with g
    const pool = EASY_LETTERS.slice(0, lerp(g / 0.75, 4, EASY_LETTERS.length));
    const n = g < 0.35 ? 2 : 3;
    const next = deck(pool, rand);
    return Array.from({ length: ROUND }, () => {
      const l = next();
      const opts = shuffle([l, ...sample(pool, n - 1, rand, [l])], rand);
      return {
        kind: "choice",
        skill: "letters",
        prompt: ["q-letter-find", letterKey(l)],
        hint: ["h-letter", letterKey(l)],
        visual: { type: "listen" },
        layout: "letters",
        options: opts.map((x) => ({ id: x, label: x, say: letterKey(x) })),
        answer: l,
      };
    });
  }
  const firstSound = level === 1 || (level === 2 && g < 0.55);
  const pool = wordsFor(
    t,
    (w) => w.word[0] !== "Ё" && (level > 1 || EASY_LETTERS.includes(w.word[0])),
  );
  const next = wordDeck(pool, rand);
  const all =
    level === 1 ? EASY_LETTERS : Object.keys(LETTER_NAMES).filter((l) => !"ЙЪЬЁЩ".includes(l));
  const n = level === 1 ? 3 : g < 0.4 && level === 2 ? 3 : 4;
  return Array.from({ length: ROUND }, () => {
    const w = next();
    if (firstSound) {
      const l = w.word[0];
      const opts = shuffle([l, ...sample(all, n - 1, rand, [l])], rand);
      return {
        kind: "choice",
        word: w.id,
        skill: "letters",
        prompt: ["q-letter-first", wordKey(w.id)],
        hint: ["q-letter-first", wordKey(w.id)],
        visual: { type: "picture", pic: w.pic },
        layout: "letters",
        options: opts.map((x) => ({ id: x, label: x, say: letterKey(x) })),
        answer: l,
      };
    }
    // a letter is missing (not the first)
    const i = int(1, w.word.length - 1, rand);
    let at = i;
    while ("ЬЪ".includes(w.word[at])) at = at === 1 ? w.word.length - 1 : at - 1;
    const l = w.word[at];
    const opts = shuffle([l, ...sample(all, n - 1, rand, [l])], rand);
    return {
      kind: "choice",
      word: w.id,
      skill: "letters",
      prompt: ["q-letter-gap", wordKey(w.id)],
      hint: ["h-letter-gap", wordKey(w.id)],
      visual: {
        type: "picture",
        pic: w.pic,
        text: w.word.slice(0, at) + "_" + w.word.slice(at + 1),
      },
      layout: "letters",
      options: opts.map((x) => ({ id: x, label: x, say: letterKey(x) })),
      answer: l,
    };
  });
}

const COUNTABLE = [
  "cone",
  "acorn",
  "mushroom",
  "apple",
  "raspberry",
  "leaf",
  "strawberry",
  "cherry",
  "nut",
  "plum",
  "candy",
  "button",
  "snowflake",
  "egg",
  "cookie",
];

/** the counting range for a tune: to 5, then to 10 for the youngest; to 20; to 100 */
export function countRange({ level, g }: Tune): [number, number] {
  if (level === 1) return g < 0.45 ? [1, 5] : g < 0.75 ? [3, 7] : [4, 10];
  if (level === 2) {
    const hi = lerp(g, 10, 20);
    return [Math.max(5, hi - 8), hi];
  }
  const hi = lerp(g, 35, 99);
  return [Math.max(21, hi - 30), hi];
}

function count(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  const pics = deck(COUNTABLE, rand);
  const used = new Set<number>();
  const [lo, hi] = countRange(t);
  return Array.from({ length: ROUND }, () => {
    const pic = pics();
    let n = 0;
    let guard = 0;
    do n = int(level === 1 ? Math.max(2, lo) : lo, hi, rand);
    while (used.has(n) && guard++ < 20);
    used.add(n);
    const nOpts = level === 1 ? (g < 0.35 ? 1 : 2) : 3;
    return {
      kind: "choice",
      skill: "count",
      prompt: [`q-count-${level}`],
      hint: [level === 3 ? "h-count-3" : "h-count"],
      visual: {
        type: "count",
        pic,
        n,
        mode: level === 1 ? "loose" : level === 2 ? "rows" : "tens",
      },
      layout: "numbers",
      options: numberOptions(
        n,
        nearNumbers(
          n,
          nOpts,
          level === 1 ? 1 : Math.max(1, lo - 3),
          level === 3 ? 100 : hi + 3,
          rand,
        ),
        rand,
      ),
      answer: String(n),
    };
  });
}

function build(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  const next = wordDeck(wordsFor(t), rand);
  const alphabet = "АОУИЫЭМСЛНДКРБТП".split("");
  const extras = level === 1 ? 0 : level === 2 ? by(g, [0, 1, 1, 2]) : by(g, [1, 2, 2, 3]);
  const ghost = level === 1 ? g < 0.8 : level === 2 && g < 0.2;
  return Array.from({ length: ROUND }, () => {
    const w = next();
    const target = [...w.word];
    return {
      kind: "build",
      word: w.id,
      skill: "build",
      prompt: ["q-build", wordKey(w.id)],
      hint: ["h-build", wordKey(w.id)],
      pic: w.pic,
      target,
      pieces: shuffle([...target, ...sample(alphabet, extras, rand, target)], rand),
      ghost,
      unit: "letter",
    };
  });
}

function read(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  const next = wordDeck(wordsFor(t), rand);
  // more pictures to choose from later; look-alike first letters only once reading is steady
  const n = level === 1 ? (g < 0.35 ? 1 : 2) : level === 2 ? (g < 0.75 ? 2 : 3) : 3;
  const tricky = level === 1 ? g >= 0.7 : level === 2 ? g >= 0.4 : true;
  return Array.from({ length: ROUND }, () => {
    const w = next();
    const others = WORDS.filter((x) => !alike(x.pic, w.pic));
    const similar = shuffle(
      others.filter((x) => x.word[0] === w.word[0]),
      rand,
    );
    const rest = shuffle(
      others.filter((x) => x.word[0] !== w.word[0]),
      rand,
    );
    const wrong = [...(tricky ? similar : []), ...rest].slice(0, n);
    return {
      kind: "choice",
      word: w.id,
      skill: "read",
      prompt: ["q-read"],
      hint: ["h-read", wordKey(w.id)],
      visual: { type: "word", text: w.word },
      layout: "pictures",
      options: shuffle([w, ...wrong], rand).map((x) => ({ id: x.id, pic: x.pic })),
      answer: w.id,
    };
  });
}

/** the largest result for + and − at a tune (age level 1 has no arithmetic at all) */
export function mathMax({ level, g }: Tune) {
  return level === 2 ? by(g, [10, 10, 15, 20]) : level === 3 ? by(g, [50, 100, 100, 100]) : 0;
}

function addSub(op: "+" | "-", t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  const seen = new Set<string>();
  const story = deck(
    STORIES.filter((st) => st.op === op),
    rand,
  );
  const max = mathMax(t);
  // two-step problems (a + b − c) only at the very end of age level 3
  const twoStep = level === 3 && g >= 0.7;
  return Array.from({ length: ROUND }, (_, k) => {
    let a = 0;
    let b = 0;
    let c = 0;
    const two = twoStep && k % 2 === 1;
    let guard = 0;
    do {
      if (op === "+") {
        a = int(level === 2 ? 1 : 10, Math.max(2, max - (level === 2 ? 2 : 12)), rand);
        b = int(level === 2 ? 1 : 3, Math.max(1, max - a), rand);
        // no carrying over ten in the first part of level 3
        if (level === 3 && g < 0.35 && (a % 10) + (b % 10) >= 10) b = Math.max(1, b - (b % 10));
      } else {
        a = int(level === 2 ? 4 : 20, max, rand);
        b = int(1, Math.max(1, a - (level === 2 ? 1 : 5)), rand);
        if (level === 3 && g < 0.35 && a % 10 < b % 10) b = b - (b % 10) || 1;
      }
      if (two)
        c =
          op === "+"
            ? int(2, Math.max(2, Math.min(30, a + b - 2)), rand)
            : int(2, Math.min(30, max - (a - b)), rand);
    } while (seen.has(`${a}${op}${b}${c}`) && guard++ < 30);
    seen.add(`${a}${op}${b}${c}`);
    const first = op === "+" ? a + b : a - b;
    const op2: "+" | "-" = op === "+" ? "-" : "+";
    const answer = two ? (op2 === "+" ? first + c : first - c) : first;
    const st = story();
    const hi = level === 2 ? 20 : 100;
    return {
      kind: "choice",
      skill: op === "+" ? "add" : "sub",
      prompt: two
        ? [
            "q-solve",
            numKey(a),
            op === "+" ? "plus" : "minus",
            numKey(b),
            op2 === "+" ? "plus" : "minus",
            numKey(c),
          ]
        : [`st-${st.id}`, numKey(a), op === "+" ? "plus" : "minus", numKey(b)],
      hint: [op === "+" ? (level === 3 ? "h-add-3" : "h-add") : level === 3 ? "h-sub-3" : "h-sub"],
      visual: two
        ? { type: "math", a, b, op, c, op2 }
        : { type: "math", a, b, op, pic: level === 3 || a > 12 ? undefined : st.pic },
      layout: "numbers",
      options: numberOptions(answer, nearNumbers(answer, 3, 0, hi, rand), rand),
      answer: String(answer),
    };
  });
}

function syllables(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  if (level === 1) {
    const next = deck(SYLLABLES, rand);
    const n = g < 0.35 ? 2 : 3;
    return Array.from({ length: ROUND }, () => {
      const s = next();
      // later the wrong syllables share a letter, so the child really listens
      const close = SYLLABLES.filter((x) => x !== s && (x[0] === s[0] || x[1] === s[1]));
      const pool = g >= 0.5 && close.length >= n - 1 ? close : SYLLABLES;
      const wrong = sample(pool, n - 1, rand, [s]);
      return {
        kind: "choice",
        skill: "syllables",
        prompt: ["q-syl-find", sylKey(s)],
        hint: ["h-letter", sylKey(s)],
        visual: { type: "listen" },
        layout: "syllables",
        options: shuffle([s, ...wrong], rand).map((x) => ({ id: x, label: x, say: sylKey(x) })),
        answer: s,
      };
    });
  }
  const maxSyl = level === 2 ? (g < 0.6 ? 2 : 3) : g < 0.5 ? 3 : 4;
  const pool = WORDS.filter((w) => {
    const n = w.syl.split("-").length;
    if (w.syl.startsWith("Ё-")) return false; // a lone "ё" syllable sounds unclear
    return level === 2
      ? n >= 2 && n <= maxSyl && w.word.length <= 6
      : n >= 2 && n <= maxSyl && w.word.length >= 5;
  });
  const next = wordDeck(pool, rand);
  const allSyl = [...new Set(WORDS.flatMap((w) => w.syl.split("-")))];
  const extras = level === 2 ? (g < 0.5 ? 1 : 2) : g < 0.5 ? 2 : 3;
  return Array.from({ length: ROUND }, () => {
    const w = next();
    const target = w.syl.split("-");
    return {
      kind: "build",
      word: w.id,
      skill: "syllables",
      prompt: ["q-syl-build", wordKey(w.id)],
      hint: ["h-syl", wordKey(w.id)],
      pic: w.pic,
      target,
      pieces: shuffle([...target, ...sample(allSyl, extras, rand, target)], rand),
      ghost: false,
      unit: "syllable",
    };
  });
}

const SIGNS: Option[] = [
  { id: "<", label: "<", say: "less" },
  { id: "=", label: "=", say: "equal" },
  { id: ">", label: ">", say: "more" },
];

function compare(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  if (level === 1) {
    // which group has more / fewer: small groups with a clear difference first
    const max = g < 0.45 ? 5 : g < 0.75 ? 7 : 10;
    const gap = g < 0.45 ? 2 : 1;
    return Array.from({ length: ROUND }, (_, i) => {
      const more = g < 0.3 ? true : i % 2 === 0;
      let l = int(1, max, rand);
      let r = int(1, max, rand);
      while (Math.abs(l - r) < gap) r = int(1, max, rand);
      if (rand() < 0.5) [l, r] = [r, l];
      const pic = pick(["cheese", "strawberry", "acorn", "cherry", "candy", "button"], rand);
      const answer = more ? (l > r ? "left" : "right") : l < r ? "left" : "right";
      return {
        kind: "choice",
        skill: "compare",
        prompt: [more ? "q-cmp-more" : "q-cmp-less"],
        hint: ["h-cmp"],
        visual: { type: "listen" },
        layout: "groups",
        options: [
          { id: "left", pic, count: l, say: numKey(l) },
          { id: "right", pic, count: r, say: numKey(r) },
        ],
        answer,
      };
    });
  }
  const kinds = shuffle(["<", ">", "=", "<", ">"], rand);
  return kinds.map((want) => {
    let left = "";
    let right = "";
    let lv = 0;
    let rv = 0;
    if (level === 2) {
      const max = lerp(g, 10, 20);
      lv =
        want === "<" ? int(1, max - 3, rand) : want === ">" ? int(4, max, rand) : int(1, max, rand);
      rv = want === "=" ? lv : want === "<" ? int(lv + 1, max, rand) : int(1, lv - 1, rand);
      left = String(lv);
      right = String(rv);
    } else if (g < 0.4) {
      lv = int(10, 99, rand);
      rv =
        want === "="
          ? lv
          : Math.min(100, Math.max(1, lv + (want === "<" ? int(1, 20, rand) : -int(1, 20, rand))));
      left = String(lv);
      right = String(rv);
    } else {
      const a = int(10, lerp(g, 40, 60), rand);
      const b = int(2, 30, rand);
      lv = a + b;
      rv = want === "=" ? lv : lv + (want === "<" ? int(1, 9, rand) : -int(1, 9, rand));
      left = `${a} + ${b}`;
      right = String(rv);
    }
    const sign = lv < rv ? "<" : lv > rv ? ">" : "=";
    return {
      kind: "choice",
      skill: "compare",
      prompt: ["q-cmp-sign"],
      hint: ["h-cmp-sign"],
      visual: { type: "compare", left, right },
      layout: "signs",
      options: SIGNS,
      answer: sign,
    } satisfies ChoiceTask;
  });
}

function sentence(t: Tune, rand: Rand): Task[] {
  const { level, g } = t;
  if (level === 1) {
    const words = wordsFor(t);
    const next = deck(words, rand);
    const n = g < 0.35 ? 2 : 3;
    return Array.from({ length: ROUND }, () => {
      const w = next();
      const wrong = sample(words, n - 1, rand, [w]);
      return {
        kind: "choice",
        skill: "sentence",
        prompt: ["q-word-find", wordKey(w.id)],
        hint: ["h-word-find", wordKey(w.id)],
        visual: { type: "listen" },
        layout: "words",
        options: shuffle([w, ...wrong], rand).map((x) => ({ id: x.id, label: x.word })),
        answer: w.id,
      };
    });
  }
  // shorter notes first
  const all = SENTENCES.filter((s) => s.level === level).sort(
    (x, y) => x.text.length - y.text.length,
  );
  const pool = all.slice(0, Math.max(8, Math.round(all.length * (0.35 + 0.65 * g))));
  const next = deck(pool, rand);
  return Array.from({ length: ROUND }, () => {
    const s = next();
    return {
      kind: "choice",
      skill: "sentence",
      prompt: [level === 3 ? "q-sentence-3" : "q-sentence"],
      hint: ["h-sentence", `sen-${s.id}`],
      visual: { type: "sentence", text: s.text },
      layout: "pictures",
      options: shuffle([s.answer, ...(s.options ?? otherAnswers(pool, s.answer, rand))], rand).map(
        (p) => ({ id: p, pic: p }),
      ),
      answer: s.answer,
    };
  });
}

/** two pictures from other sentences of the level that cannot be mixed up with the answer */
function otherAnswers(pool: typeof SENTENCES, answer: string, rand: Rand) {
  const pics = [...new Set(pool.map((s) => s.answer))].filter((p) => !alike(p, answer));
  return sample(pics, 2, rand);
}

/** No arithmetic for 5–6-year-olds: these skills are what they get instead. */
export const SKILLS_BY_LEVEL: Record<Level, Skill[]> = {
  1: ["letters", "count", "build", "read", "syllables", "compare", "sentence"],
  2: ["letters", "count", "build", "read", "add", "syllables", "sub", "compare", "sentence"],
  3: ["letters", "count", "build", "read", "add", "syllables", "sub", "compare", "sentence"],
};
const NO_MATH: Partial<Record<Skill, Skill>> = { add: "count", sub: "compare" };
/** the skill really played: + and − become counting and comparing at age level 1 */
export const playableSkill = (skill: Skill, level: Level): Skill =>
  level === 1 ? (NO_MATH[skill] ?? skill) : skill;

export function makeRound(
  skill: Skill,
  tune: Tune | Level,
  rand: Rand = Math.random,
  weak: ReadonlySet<string> = new Set(),
): Task[] {
  weakIds = weak;
  const t: Tune = typeof tune === "number" ? { level: tune, g: 0.5 } : tune;
  t.g = Math.max(0, Math.min(1, t.g));
  switch (playableSkill(skill, t.level)) {
    case "letters":
      return letters(t, rand);
    case "count":
      return count(t, rand);
    case "build":
      return build(t, rand);
    case "read":
      return read(t, rand);
    case "add":
      return addSub("+", t, rand);
    case "sub":
      return addSub("-", t, rand);
    case "syllables":
      return syllables(t, rand);
    case "compare":
      return compare(t, rand);
    case "sentence":
      return sentence(t, rand);
  }
}

// ---------- лесная полянка: free play after the forest ----------
export const PRACTICE = 5;
const WORD_SKILLS: Skill[] = ["read", "build", "syllables", "letters"];

/**
 * A practice round: tasks of the weak skills first (up to two), then up to two words the child
 * stumbled on, then mixed review — no skill twice in a row, no word twice in a round.
 * Only skills of the child's age level (no + and − for 5–6-year-olds).
 */
export function makePractice(
  tune: Tune | Level,
  weakSkills: readonly Skill[],
  weak: ReadonlySet<string>,
  rand: Rand = Math.random,
): Task[] {
  const t: Tune = typeof tune === "number" ? { level: tune, g: 0.5 } : tune;
  const allowed = SKILLS_BY_LEVEL[t.level];
  const out: Task[] = [];
  const words = new Set<string>();
  const add = (x: Task | undefined) => {
    if (!x || out.length >= PRACTICE || (x.word && words.has(x.word))) return false;
    out.push(x);
    if (x.word) words.add(x.word);
    return true;
  };
  const weakOk = weakSkills.filter((k) => allowed.includes(k));
  for (const s of shuffle(weakOk, rand).slice(0, 2)) add(makeRound(s, { ...t }, rand, weak)[0]);
  if (weak.size) {
    let n = 0;
    for (const s of shuffle(WORD_SKILLS, rand)) {
      if (n >= 2) break;
      const x = makeRound(s, { ...t }, rand, weak).find((y) => y.word && weak.has(y.word));
      if (add(x)) n++;
    }
  }
  for (let guard = 0; out.length < PRACTICE && guard < 60; guard++) {
    const last = out[out.length - 1]?.skill;
    const s = pick(
      allowed.filter((k) => k !== last),
      rand,
    );
    add(makeRound(s, { ...t }, rand, weak)[0]);
  }
  return out;
}
