import { createContext, useContext, useRef, useCallback } from "react";
import { getProgress } from "./progress";
import { checkpoint } from "./sessions";
import { emptyDraft, type TaskDraft } from "./session-state";
export const LessonDraftContext = createContext<{ id: string; step: number } | null>(null);
export function useTaskDraft() {
  const identity = useContext(LessonDraftContext);
  const id = identity?.id,
    step = identity?.step;
  const initial = useRef(
    identity &&
      getProgress().session?.id === identity.id &&
      getProgress().session?.step === identity?.step
      ? getProgress().session!.draft
      : emptyDraft(),
  );
  const save = useCallback(
    (patch: Partial<TaskDraft>) => {
      if (id !== undefined && step !== undefined) checkpoint(id, step, patch);
    },
    [id, step],
  );
  return { initial, save };
}
