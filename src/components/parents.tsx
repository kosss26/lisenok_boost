/** Parents' corner (opened by holding the gear button): child, progress, time limit, sound. */
import { useEffect, useState } from "react";
import { SKILL_NAMES, type Skill } from "../content/forest";
import { ALL_STOPS } from "../content/worlds";
import { NAMES } from "../content/names";
import { WORDS } from "../content/words";
import { say } from "../game/audio";
import {
  LEVEL_NAMES,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  resetProgress,
  setSettings,
  starsIn,
  today,
  useProgress,
  weakSkills,
  weakWordIds,
  useSaveWarning,
} from "../game/progress";
import type { Level } from "../game/tasks";
import { HoldButton } from "./kit";
import { IconClose } from "./icons";
import { closeParents } from "./parents-state";

import { useModal } from "../game/modal";
import { useOfflineError } from "../game/offline";
import { SaveTools } from "./save-tools";

const TABS = ["Ребёнок", "Успехи", "Время", "Звук", "Данные", "Об игре"] as const;
type Tab = (typeof TABS)[number];
const LIMITS = [0, 10, 15, 20, 30];

function useOfflineStatus() {
  const [status, setStatus] = useState<{ have: number; total: number } | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "offline-status") setStatus({ have: e.data.have, total: e.data.total });
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    const ask = () => {
      void navigator.serviceWorker
        .getRegistration()
        .then((r) => r?.active?.postMessage("status"))
        .catch(() => {});
    };
    ask();
    const timer = window.setInterval(ask, 2000);
    return () => {
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener("message", onMsg);
    };
  }, []);
  return status;
}

export function Parents() {
  const p = useProgress();
  const ref = useModal(closeParents);
  const warning = useSaveWarning();
  const s = p.settings;
  const [tab, setTab] = useState<Tab>("Ребёнок");
  const offline = useOfflineStatus();
  const offlineError = useOfflineError();
  const played = Math.round((p.playLog[today()] ?? 0) / 60);
  const weak = weakSkills(p);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="parents"
      aria-modal="true"
      role="dialog"
      aria-label="Для взрослых"
    >
      <div className="parents-head">
        <h2>Для взрослых</h2>
        <button type="button" className="parents-close" aria-label="Закрыть" onClick={closeParents}>
          <IconClose />
        </button>
      </div>
      <div className="parents-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            id={`parent-tab-${TABS.indexOf(t)}`}
            aria-controls="parent-panel"
            tabIndex={tab === t ? 0 : -1}
            onKeyDown={(e) => {
              const i = TABS.indexOf(t);
              const next =
                e.key === "ArrowRight"
                  ? (i + 1) % TABS.length
                  : e.key === "ArrowLeft"
                    ? (i + TABS.length - 1) % TABS.length
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? TABS.length - 1
                        : -1;
              if (next >= 0) {
                e.preventDefault();
                setTab(TABS[next]);
                document.getElementById(`parent-tab-${next}`)?.focus();
              }
            }}
            className={`parents-tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        className="parents-body"
        id="parent-panel"
        role="tabpanel"
        aria-labelledby={`parent-tab-${TABS.indexOf(tab)}`}
      >
        {tab === "Данные" && <SaveTools />}
        {tab === "Об игре" && <Credits />}
        {tab === "Ребёнок" && (
          <>
            <label className="field">
              <span>Имя ребёнка (лисёнок будет обращаться по имени)</span>
              <select
                value={s.name ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSettings({ name: id });
                  if (id) void say([`name-${id}-bravo`]);
                }}
              >
                <option value="">Без имени</option>
                {NAMES.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>Возраст и уровень</span>
              <div className="levels">
                {([1, 2, 3] as Level[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`level-card ${s.level === l ? "is-active" : ""}`}
                    onClick={() => setSettings({ level: l })}
                  >
                    {LEVEL_NAMES[l]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Сложность</span>
              <div className="levels diff-levels">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-difficulty={d}
                    className={`level-card ${s.difficulty === d ? "is-active" : ""}`}
                    onClick={() => setSettings({ difficulty: d })}
                  >
                    {DIFFICULTY_NAMES[d]}
                  </button>
                ))}
              </div>
              <small className="field-note">
                Ребёнок тоже может выбрать её сам — ступеньки вверху экрана леса. Задания
                усложняются постепенно от первой остановки к последней.
              </small>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={s.autoHints}
                onChange={(e) => setSettings({ autoHints: e.target.checked })}
              />
              <span>
                Помогать, если ребёнок задумался
                <small>
                  Лисёнок подождёт окончания вопроса и даст время подумать. Можно отключить: кнопка
                  подсказки останется доступной.
                </small>
              </span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={s.auto}
                onChange={(e) => setSettings({ auto: e.target.checked })}
              />
              <span>
                Подстраивать сложность автоматически
                <small>
                  Без ошибок — чуть сложнее (медленно), после ошибок — сразу проще. Возраст не
                  меняется: в 5–6 лет примеров на сложение и вычитание нет.
                </small>
              </span>
            </label>
          </>
        )}

        {tab === "Успехи" && (
          <>
            <div className="stats-row">
              <div className="stat">
                <b>
                  {starsIn(p, ALL_STOPS)}/{ALL_STOPS.length}
                </b>
                <span>звёзд в лесу</span>
              </div>
              <div className="stat">
                <b>{played} мин</b>
                <span>сегодня</span>
              </div>
              <div className="stat">
                <b>{s.level}</b>
                <span>уровень</span>
              </div>
            </div>
            <h3>Самостоятельные ответы</h3>
            <p className="field-note">
              Без ошибок и подсказок. Старые ответы не входят в новый процент: раньше помощь
              учитывалась иначе.
            </p>
            <ul className="skills">
              {(Object.keys(SKILL_NAMES) as Skill[]).map((k) => {
                const st = p.skills[k];
                const pct = st?.measured
                  ? Math.round(((st.independent ?? 0) / st.measured) * 100)
                  : null;
                return (
                  <li key={k} className={weak.includes(k) ? "is-weak" : ""}>
                    <span className="skill-name">
                      {SKILL_NAMES[k]}
                      {st && (
                        <small className="skill-detail">
                          {st.measured ?? 0} новых заданий · с помощью: {st.assisted ?? 0} · после
                          ошибок: {st.retried ?? 0}
                          {st.tasks > (st.measured ?? 0)
                            ? ` · ранее: ${st.tasks - (st.measured ?? 0)}`
                            : ""}
                        </small>
                      )}
                    </span>
                    <span className="skill-bar">
                      <i style={{ width: `${pct ?? 0}%` }} />
                    </span>
                    <span className="skill-pct">{pct === null ? "—" : `${pct}%`}</span>
                  </li>
                );
              })}
            </ul>
            <p className="weak-note">
              {weak.length
                ? `Стоит потренировать: ${weak.map((k) => SKILL_NAMES[k].toLowerCase()).join(", ")}.`
                : "Пока всё идёт хорошо. Трудные навыки появятся здесь, когда наберётся хотя бы 3 задания."}
            </p>
            <WordDetails />
          </>
        )}

        {tab === "Время" && (
          <>
            <div className="field">
              <span>Сколько можно играть в день</span>
              <div className="limits">
                {LIMITS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`limit ${s.limit === m ? "is-active" : ""}`}
                    onClick={() => setSettings({ limit: m })}
                  >
                    {m === 0 ? "Без ограничений" : `${m} мин`}
                  </button>
                ))}
              </div>
            </div>
            <p className="hint-text">
              Сегодня сыграно: {played} мин. Когда время выйдет, лисёнок ляжет отдыхать; взрослый
              может добавить 10 минут, удерживая кнопку.
            </p>
          </>
        )}

        {tab === "Звук" && (
          <>
            {(
              [
                ["voice", "Голос"],
                ["sounds", "Звуки"],
                ["music", "Музыка"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="field range">
                <span>{label}</span>
                <input
                  id={`vol-${key}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={s.volume[key]}
                  onChange={(e) =>
                    setSettings({ volume: { ...s.volume, [key]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
          </>
        )}
      </div>

      <div className="parents-foot">
        {warning && (
          <p className="save-warning" role="alert">
            {warning}
          </p>
        )}
        <p className="offline-note">
          {offlineError ||
            (offline
              ? offline.have >= offline.total
                ? "✓ Игра сохранена на устройстве и работает без интернета."
                : `Сохраняем игру для работы без интернета: ${offline.have} из ${offline.total}…`
              : "Без интернета игра заработает после первого полного запуска.")}
        </p>
        <HoldButton
          label="Сбросить прогресс: удерживайте"
          className="reset-btn"
          onDone={resetProgress}
        >
          <span>Сбросить этот профиль (удерживать)</span>
        </HoldButton>
      </div>
    </div>
  );
}

/** Words the child stumbled on: the game brings them back until two clean answers in a row. */
function WordDetails() {
  const p = useProgress();
  const weak = weakWordIds(p);
  const rows = WORDS.filter(
    (w) => p.words[w.id] && (p.words[w.id].miss > 0 || p.words[w.id].hints > 0),
  )
    .sort((a, b) => p.words[b.id].miss - p.words[a.id].miss)
    .slice(0, 12);
  return (
    <details className="word-details">
      <summary>Слова, которые даются труднее</summary>
      {rows.length ? (
        <ul>
          {rows.map((w) => {
            const st = p.words[w.id];
            return (
              <li key={w.id}>
                <b>{w.word}</b>
                <span>
                  ошибок: {st.miss}, подсказок: {st.hints}
                </span>
                <em>{weak.has(w.id) ? "повторяем" : "уже получается"}</em>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          Пока трудных слов нет. Если ребёнок ошибётся на слове, оно появится здесь и будет чаще
          встречаться в заданиях, пока не получится дважды подряд.
        </p>
      )}
    </details>
  );
}

function Credits() {
  return (
    <section className="credits">
      <h3>Лисёнок и звёзды</h3>
      <p>
        Игра для чтения и счёта. Задания помогают практиковаться; статистика не является
        диагностикой навыков.
      </p>
      <h3>Музыка</h3>
      <p>
        Kevin MacLeod (incompetech.com): Carefree, Easy Lemon, Fluffing a Duck. Фрагменты обрезаны,
        громкость выровнена.
      </p>
      <p>
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          Лицензия CC BY 4.0
        </a>{" "}
        ·{" "}
        <a href="https://incompetech.com/" target="_blank" rel="noreferrer">
          Автор музыки
        </a>
      </p>
      <h3>Голос и иллюстрации</h3>
      <p>
        Голос: Yandex SpeechKit — marina (рассказчик), masha (лисёнок), alena, lera и zahar
        (жители). Отдельный звук «Ы» сохранён из Silero TTS, CC BY-NC 4.0. Иллюстрации сгенерированы
        для проекта, звуковые эффекты созданы программно.
      </p>
      <p>Профили и успехи хранятся в браузере. Обязательной регистрации нет.</p>
    </section>
  );
}
