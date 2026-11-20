import { useCallback, useEffect, useState } from "react";
import { say, stopVoice } from "./audio";

/**
 * Plays voice clips one after another and tells which one is on.
 * `index` stops at the last line; `finished` turns true once it has been heard (or skipped past).
 * `next()` cuts the current clip and moves on — a tap on the speech bubble.
 */
export function useDialogue(keys: string[], { delay = 300, gap = 350, enabled = true } = {}) {
  const [step, setStep] = useState(0);
  const count = keys.length;
  const key = keys[step];

  useEffect(() => {
    if (!enabled || step >= count) return;
    let alive = true;
    let wait = 0;
    const start = window.setTimeout(
      async () => {
        const heard = await say([key], 0);
        if (heard && alive) wait = window.setTimeout(() => alive && setStep((s) => s + 1), gap);
      },
      step === 0 ? delay : 0,
    );
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearTimeout(wait);
    };
  }, [step, count, key, delay, gap, enabled]);

  const next = useCallback(() => {
    if (step >= count) return;
    stopVoice();
    setStep((s) => Math.min(s + 1, count));
  }, [step, count]);

  return { index: Math.min(step, count - 1), finished: step >= count, next };
}
