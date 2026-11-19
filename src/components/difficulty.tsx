/**
 * «Легко / средне / трудно»: a small badge shows the current choice (steps), and the child can
 * change it in a simple picker with three big buttons. The parents' corner has the same setting.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { say, sfx } from "../game/audio";
import {
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  setSettings,
  useProgress,
  type Difficulty,
} from "../game/progress";
import { useModal } from "../game/modal";

const STEPS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

function Steps({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`diff-steps ${className}`} aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className={`diff-step ${i < n ? "is-on" : ""}`} />
      ))}
    </span>
  );
}

/** The current difficulty, unobtrusive; tappable when `pick` is set (opens the picker). */
export function DifficultyBadge({ pick = false }: { pick?: boolean }) {
  const d = useProgress().settings.difficulty;
  const [open, setOpen] = useState(false);
  const label = `Сложность: ${DIFFICULTY_NAMES[d].toLowerCase()}`;
  return (
    <>
      {pick ? (
        <button
          type="button"
          className={`diff-badge diff-${d}`}
          aria-label={`${label}. Изменить`}
          onClick={() => {
            void sfx("tap");
            setOpen(true);
            void say(["diff-pick"]);
          }}
        >
          <Steps n={STEPS[d]} />
        </button>
      ) : (
        <span className={`diff-badge diff-${d} is-quiet`} aria-label={label} role="img">
          <Steps n={STEPS[d]} />
        </span>
      )}
      {open &&
        createPortal(
          <DifficultyPicker onClose={() => setOpen(false)} />,
          document.querySelector(".app") ?? document.body,
        )}
    </>
  );
}

export function DifficultyPicker({ onClose }: { onClose: () => void }) {
  const d = useProgress().settings.difficulty;
  const ref = useModal(onClose);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="diff-sheet"
      aria-modal="true"
      role="dialog"
      aria-label="Как будем играть?"
      onClick={onClose}
    >
      <div className="diff-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="dialog-close"
          aria-label="Закрыть выбор сложности"
          onClick={onClose}
        >
          ×
        </button>
        <h2>Как будем играть?</h2>
        <div className="diff-options">
          {DIFFICULTIES.map((k) => (
            <button
              key={k}
              type="button"
              className={`diff-option diff-${k} ${k === d ? "is-chosen" : ""}`}
              data-difficulty={k}
              onClick={() => {
                void sfx("pick");
                setSettings({ difficulty: k });
                void say([`diff-${k}`]);
                window.setTimeout(onClose, 350);
              }}
            >
              <Steps n={STEPS[k]} className="is-big" />
              <span>{DIFFICULTY_NAMES[k]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
