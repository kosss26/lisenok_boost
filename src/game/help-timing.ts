import type { Level } from "./tasks.ts";
/** Thinking time starts after the prompt, and grows with age needs and text length. */
export function helpTiming(level: Level, text: string) {
  const words = text.trim().split(/\s+/).length;
  const point =
    (level === 1 ? 40_000 : level === 2 ? 35_000 : 30_000) + Math.min(20_000, words * 700);
  return { glance: Math.round(point * 0.6), point };
}
