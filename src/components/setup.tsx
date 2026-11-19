import { useState } from "react";
import { NAMES } from "../content/names";
import { LEVEL_NAMES, update, useProgress } from "../game/progress";
import type { Level } from "../game/tasks";
import { useModal } from "../game/modal";

export function Setup({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const ref = useModal(onClose);
  const p = useProgress();
  const [level, setLevel] = useState<Level | null>(null);
  const [name, setName] = useState(p.settings.name ?? "");
  const [beginner, setBeginner] = useState(true);
  const [sound, setSound] = useState(true);
  return (
    <div className="setup-backdrop">
      <div
        ref={ref}
        tabIndex={-1}
        className="setup-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
      >
        <button
          type="button"
          className="dialog-close"
          aria-label="Закрыть настройку"
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="setup-title">Сначала — для взрослых</h2>
        <p>Подберите задания ребёнку. Эти настройки можно изменить, удерживая шестерёнку.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!level) return;
            update((s) => ({
              ...s,
              setupDone: true,
              settings: {
                ...s.settings,
                level,
                name: name || null,
                difficulty: beginner ? "easy" : "medium",
                volume: sound ? p.settings.volume : { voice: 0, sounds: 0, music: 0, forest: 0 },
              },
            }));
            onDone();
          }}
        >
          <fieldset>
            <legend>Возраст и задания</legend>
            <div className="levels">
              {([1, 2, 3] as Level[]).map((l) => (
                <button
                  type="button"
                  key={l}
                  className={`level-card ${level === l ? "is-active" : ""}`}
                  aria-pressed={level === l}
                  onClick={() => setLevel(l)}
                >
                  {LEVEL_NAMES[l]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>Имя для озвучки (необязательно)</span>
            <select value={name} onChange={(e) => setName(e.target.value)}>
              <option value="">Без имени</option>
              {NAMES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={beginner}
              onChange={(e) => setBeginner(e.target.checked)}
            />
            <span>Начать с простых заданий</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
            <span>Включить голос и звуки</span>
          </label>
          <button type="submit" className="big-btn" disabled={!level}>
            Начать приключение
          </button>
        </form>
      </div>
    </div>
  );
}
