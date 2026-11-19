/** Shared feedback and patient, active-time hints for every task view. */
import { useEffect, useRef, useState, useCallback } from "react";
import { NAMES } from "../content/names";
import { AGAIN, PRAISE, shown, voiceLines } from "../content/voice";
import { isSpeaking, say, sfx } from "./audio";
import { getProgress, useProgress, timeIsUp } from "./progress";
import { vibrate } from "./haptics";
import { helpTiming } from "./help-timing";
import { useParentsOpen } from "../components/parents-state";
import type { Task } from "./tasks";
import type { Mood, Solved } from "../components/tasks";
import { useTaskDraft } from "./lesson-draft";
import { methodVoice } from "./hints";
import type { TaskDraft } from "./session-state";

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
  const { initial, save } = useTaskDraft();
  const [mistakes, setMistakes] = useState(initial.current.mistakes);
  const [hintStage, setHintStage] = useState(initial.current.hintStage);
  const hinted = hintStage > 0;
  const helpStage = useRef(initial.current.hintStage);
  const offerHelp = useCallback(
    (n: number) => {
      const stage = Math.min(3, Math.max(n, helpStage.current));
      helpStage.current = stage;
      setHintStage(stage);
      save({ hintStage: stage });
    },
    [save],
  );
  const [solved, setSolved] = useState(initial.current.complete);
  const onSolvedRef = useRef(onSolved);
  useEffect(() => {
    onSolvedRef.current = onSolved;
  }, [onSolved]);
  useEffect(() => {
    if (!initial.current.complete) return;
    const timer = window.setTimeout(
      () => onSolvedRef.current(initial.current.mistakes, initial.current.hintStage > 0),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [initial]);
  const live = useRef(true);
  const answered = useRef(initial.current.complete);
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
        offerHelp(3);
        window.clearInterval(timer);
      } else if (elapsed >= timing.glance) {
        setWait(1);
        if (helpStage.current === 0) offerHelp(1);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [
    task,
    mistakes,
    activity,
    solved,
    promptReady,
    settings.autoHints,
    settings.level,
    paused,
    offerHelp,
  ]);
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
    const stage = Math.min(3, helpStage.current + 1);
    offerHelp(stage);
    void say(stage === 3 ? ["show-answer", ...task.hint] : methodVoice(task));
  };
  const wrong = (spoken?: string) => {
    if (answered.current) return;
    void vibrate([18, 60, 18]);
    const m = mistakes + 1;
    setMistakes(m);
    save({ mistakes: m });
    void sfx("wrong", 0.55);
    onMood("oops");
    window.setTimeout(() => live.current && onMood("idle"), 1200);
    const before = spoken ? [spoken] : [];
    if (m >= 2) {
      const stage = Math.min(3, m - 1);
      offerHelp(stage);
      void say([...before, ...(stage === 3 ? ["show-answer", ...task.hint] : methodVoice(task))]);
    } else void say([...before, `again-${rnd(AGAIN)}`]);
  };
  /** `before`: something to show first (counting along); the praise comes after it */
  const right = (
    spoken: string[] = [],
    before?: () => Promise<unknown>,
    patch: Partial<TaskDraft> = {},
  ) => {
    if (answered.current) return;
    save({ ...patch, complete: true, mistakes, hintStage: helpStage.current });
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
  const showHint = hintStage >= 3;
  return {
    mistakes,
    hinted,
    hintStage,
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
    reveal: hintStage >= 3,
    /** what the fox does: 0 nothing, 1 glance, 2 point (and wrong options fade, the target glows) */
    guide: (solved ? 0 : showHint || wait === 2 ? 2 : hintStage > 0 ? 1 : wait) as 0 | 1 | 2,
  };
}
