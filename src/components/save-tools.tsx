import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  addProfile,
  exportSave,
  getActiveProfile,
  getProfiles,
  importSave,
  renameProfile,
  switchProfile,
  useProgress,
  useSaveWarning,
} from "../game/progress";
import { closeParents } from "./parents-state";

export function SaveTools() {
  useProgress();
  const warning = useSaveWarning();
  const navigate = useNavigate();
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [currentLabel, setCurrentLabel] = useState(
    () => getProfiles().find((p) => p.id === getActiveProfile())?.label ?? "",
  );
  const restart = () => {
    closeParents();
    void navigate({ to: "/" });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportSave()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lisenok-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Резервная копия подготовлена. Сохраните скачанный файл.");
  };
  const restore = () => {
    if (pending === null) return;
    try {
      importSave(pending);
      restart();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Не удалось загрузить файл");
    }
  };
  return (
    <section className="save-tools">
      <h3>Профили детей</h3>
      <p className="field-note">
        У каждого ребёнка свои задания, звёзды, настройки и успехи. До 6 профилей на устройстве.
      </p>
      <label className="field">
        <span>Активный профиль</span>
        <select
          value={getActiveProfile()}
          onChange={(e) => {
            switchProfile(e.target.value);
            restart();
          }}
        >
          {getProfiles().map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            renameProfile(currentLabel);
            setMessage("Название сохранено");
          } catch (err) {
            setMessage(String(err));
          }
        }}
      >
        <label className="field">
          <span>Название этого профиля</span>
          <input
            value={currentLabel}
            maxLength={40}
            required
            onChange={(e) => setCurrentLabel(e.target.value)}
          />
        </label>
        <button className="text-action" type="submit">
          Сохранить название
        </button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            addProfile(label);
            restart();
          } catch (err) {
            setMessage(String(err));
          }
        }}
      >
        <label className="field">
          <span>Новый профиль</span>
          <input
            value={label}
            maxLength={40}
            placeholder="Например, Саша"
            required
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <button type="submit" className="text-action" disabled={getProfiles().length >= 6}>
          Добавить ребёнка
        </button>
      </form>
      <h3>Резервная копия</h3>
      <p>
        Прогресс хранится в этом браузере. Очистка данных удалит его. Скачайте файл, чтобы перенести
        все профили на другое устройство или восстановить их.
      </p>
      {warning && (
        <p role="alert" className="save-warning">
          {warning}
        </p>
      )}
      <div className="save-actions">
        <button type="button" className="text-action" onClick={download}>
          Скачать копию всех профилей
        </button>
        <button type="button" className="text-action" onClick={() => file.current?.click()}>
          Загрузить копию
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        aria-label="Файл резервной копии"
        hidden
        onChange={async (e) => {
          const chosen = e.target.files?.[0];
          e.target.value = "";
          setPending(null);
          setMessage("");
          if (!chosen) return;
          if (chosen.size > 2_000_000) {
            setMessage("Файл слишком большой (максимум 2 МБ)");
            return;
          }
          try {
            const raw = await chosen.text();
            const { parseSave } = await import("../game/save");
            const parsed = parseSave(raw);
            setPending(raw);
            setMessage(
              `В копии профилей: ${Object.keys(parsed.profiles).length}. Загрузка заменит все текущие профили. Сначала скачайте текущую копию.`,
            );
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Не удалось прочитать файл");
          }
        }}
      />
      <p role="status" className="save-message">
        {message}
      </p>
      {pending && (
        <div className="save-confirm">
          <button type="button" className="text-action" onClick={restore}>
            Заменить профили данными из копии
          </button>
          <button
            type="button"
            className="text-action"
            onClick={() => {
              setPending(null);
              setMessage("");
            }}
          >
            Отмена
          </button>
        </div>
      )}
      <p className="field-note">
        Файл содержит имена и успехи детей. Передавайте его только тем, кому доверяете.
      </p>
    </section>
  );
}
