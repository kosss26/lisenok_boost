/** Shared feedback and patient, active-time hints for every task view. */
import { useEffect, useRef, useState } from "react";
import { NAMES } from "../content/names";
import { AGAIN, PRAISE, shown, voiceLines } from "../content/voice";
import { isSpeaking, say, sfx } from "./audio";
import { getProgress, useProgress, timeIsUp } from "./progress";
import { vibrate } from "./haptics";
import { helpTiming } from "./help-timing";
import { useParentsOpen } from "../components/parents-state";
import type { Task } from "./tasks";
import type { Mood, Solved } from "../components/tasks";
const LINES = voiceLines();
const rnd = (n: number) => 1 + Math.floor(Math.random() * n);
function praise() {
  const name = NAMES.find((n) => n.id === getProgress().settings.name);
  if (name && Math.random() < 0.35) return `name-${name.id}-bravo`;
  return `praise-${rnd(PRAISE)}`;
}

/** longest wait for the praise clip before the next task comes anyway (ms) */
const PRAISE_WAIT = 3500;

/** Shared answer logic: mistakes, hint after the 2nd, show the answer after the 3rd. */
export function useAnswering(task: Task, onSolved: Solved, onMood: (m: Mood) => void) {
  const [mistakes, setMistakes] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [solved, setSolved] = useState(false);
  const live = useRef(true);
  const answered = useRef(false);
  /** 0 → 1 (glance) → 2 (point) while the child waits; any answer starts the wait again */
  const [wait, setWait] = useState<0 | 1 | 2>(0);
  const [activity, setActivity] = useState(0);
  const progress = useProgress();
  const settings = progress.settings;
  const parentsOpen = useParentsOpen();
  const paused = parentsOpen || timeIsUp(progress);
  const [promptReady, setPromptReady] = useState(false);
  useEffect(() => {
    setWait(0);
    if (solved || !promptReady || !settings.autoHints || paused) return;
    const timing = helpTiming(
      settings.level,
      task.prompt.map((k) => shown(LINES[k] ?? "")).join(" "),
    );
    let elapsed = 0;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden && !isSpeaking()) elapsed += Math.min(500, now - last);
      last = now;
      if (elapsed >= timing.point) {
        setWait(2);
        setHinted(true);
        window.clearInterval(timer);
      } else if (elapsed >= timing.glance) setWait(1);
    }, 250);
    return () => window.clearInterval(timer);
  }, [task, mistakes, activity, solved, promptReady, settings.autoHints, settings.level, paused]);
  useEffect(() => {
    live.current = true;
    setPromptReady(false);
    // Start thinking time after narration. Failed/slow audio must never block the game.
    const t = window.setTimeout(() => {
      if (!answered.current)
        void say(task.prompt).finally(() => live.current && setPromptReady(true));
    }, 350);
    const cap = window.setTimeout(() => live.current && setPromptReady(true), 15_000);
    return () => {
      live.current = false;
      window.clearTimeout(t);
      window.clearTimeout(cap);
    };
  }, [task]);

  const hint = () => {
    setHinted(true);
    void say(task.hint);
  };
  const wrong = (spoken?: string) => {
    void vibrate([18, 60, 18]);
    const m = mistakes + 1;
    setMistakes(m);
    void sfx("wrong", 0.55);
    onMood("oops");
    window.setTimeout(() => live.current && onMood("idle"), 1200);
    const before = spoken ? [spoken] : [];
    if (m === 2) {
      setHinted(true);
      void say([...before, ...task.hint]);
    } else if (m >= 3) void say([...before, "show-answer"]);
    else void say([...before, `again-${rnd(AGAIN)}`]);
  };
  /** `before`: something to show first (counting along); the praise comes after it */
  const right = (spoken: string[] = [], before?: () => Promise<unknown>) => {
    answered.current = true;
    void vibrate(30);
    setSolved(true);
    void sfx("right");
    onMood("happy");
    if (before) {
      // never longer than ~1 s per object, even if a clip hangs
      const cap = new Promise((r) => window.setTimeout(r, 12000));
      void Promise.race([before(), cap]).then(() => live.current && praiseThenNext(spoken));
    } else praiseThenNext(spoken);
  };
  const praiseThenNext = (spoken: string[]) => {
    const started = Date.now();
    // Move on when the praise has been said — but never wait for it longer than PRAISE_WAIT:
    // on a slow network the clip may still be downloading, and the child must not be stuck.
    let moved = false;
    const next = () => {
      if (moved) return;
      moved = true;
      const wait = Math.max(0, 1300 - (Date.now() - started));
      window.setTimeout(() => {
        if (!live.current) return;
        onMood("idle");
        onSolved(mistakes, hinted);
      }, wait + 250);
    };
    void say([...spoken, praise()]).then(next);
    window.setTimeout(next, PRAISE_WAIT);
  };
  const showHint = hinted || mistakes >= 2;
  return {
    mistakes,
    hinted,
    solved,
    hint,
    repeat: () => {
      setActivity((n) => n + 1);
      void say(task.prompt);
    },
    wrong,
    right,
    /** a step forward (a piece placed): the hesitation clock starts again */
    poke: () => setActivity((n) => n + 1),
    showHint,
    reveal: mistakes >= 3,
    /** what the fox does: 0 nothing, 1 glance, 2 point (and wrong options fade, the target glows) */
    guide: (solved ? 0 : showHint || wait === 2 ? 2 : wait) as 0 | 1 | 2,
  };
}
