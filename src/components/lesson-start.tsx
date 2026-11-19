import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { getProgress } from "../game/progress";
import { startSession } from "../game/sessions";
import { sessionLocation, type LessonSession } from "../game/session-state";
import { Modal } from "./modal";
export function useLessonStart(onReady?: (session: LessonSession) => void) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<{ mode: LessonSession["mode"]; target: string } | null>(
    null,
  );
  const launch = (mode: LessonSession["mode"], target: string) => {
    const s = startSession(mode, target);
    setPending(null);
    if (onReady) onReady(s);
  };
  const request = (mode: LessonSession["mode"], target: string) => {
    const s = getProgress().session;
    if (s?.phase === "task" && (s.mode !== mode || s.target !== target)) {
      setPending({ mode, target });
      return;
    }
    if (s?.phase === "task" && s.mode === mode && s.target === target) {
      if (onReady) onReady(s);
      return;
    }
    launch(mode, target);
  };
  const dialog = pending
    ? createPortal(
        <Modal
          className="lesson-switch"
          label="Продолжить занятие?"
          onClose={() => setPending(null)}
        >
          <div className="lesson-switch-card">
            <h2>Мы ещё не закончили</h2>
            <p>
              Можно продолжить прошлое занятие или начать выбранное. Заработанные звёзды и подарки
              останутся.
            </p>
            <button
              type="button"
              className="big-btn"
              onClick={() => {
                const s = getProgress().session;
                setPending(null);
                if (s) void navigate({ to: sessionLocation(s) });
              }}
            >
              Продолжить прошлое
            </button>
            <button
              type="button"
              className="text-action"
              onClick={() => launch(pending.mode, pending.target)}
            >
              Начать выбранное заново
            </button>
            <button type="button" className="text-action" onClick={() => setPending(null)}>
              Назад
            </button>
          </div>
        </Modal>,
        document.querySelector(".app") ?? document.body,
      )
    : null;
  return { request, dialog };
}
