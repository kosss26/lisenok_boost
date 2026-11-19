import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FOREST, WORLDS } from "../content/forest";
import { NAMES } from "../content/names";
import { Fox, ParentsButton, Pic, Scene, StarCount } from "../components/kit";
import { say, sfx } from "../game/audio";
import { IconStar } from "../components/icons";
import { greeting } from "../game/greeting";
import { getProgress, starsIn, useProgress } from "../game/progress";

export function WorldMap() {
  const p = useProgress();
  const navigate = useNavigate();
  const stars = starsIn(p);
  const noticeOrigin = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState("");
  const [shake, setShake] = useState<string | null>(null);

  useEffect(() => {
    const name = NAMES.find((n) => n.id === getProgress().settings.name);
    const lines = greeting.done
      ? []
      : greeting.afterIntro
        ? ["map-pick"]
        : [name ? `name-${name.id}-hi` : "hi", "map-pick"];
    greeting.done = true;
    greeting.afterIntro = false;
    const t = window.setTimeout(() => void say(lines), 350);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Scene
      bg="bg-map"
      className="map-screen"
      boxed={
        <>
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`world world-${w.id} ${w.open ? "is-open" : "is-locked"} ${shake === w.id ? "is-shaking" : ""}`}
              aria-label={
                w.open
                  ? `${w.name}: ${stars} из ${FOREST.length} звёзд`
                  : `${w.name}: скоро появится`
              }
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
              onClick={(e) => {
                if (w.open) {
                  void sfx("step");
                  void navigate({ to: "/forest" });
                  return;
                }
                void sfx("tap");
                noticeOrigin.current = e.currentTarget;
                setShake(w.id);
                setNotice(
                  `${w.name} — новое приключение появится позже. Сейчас можно исследовать лес.`,
                );
                window.setTimeout(() => setShake(null), 600);
                void say(["locked-soon"]);
              }}
            >
              <span className="world-sign">
                {w.name}
                {w.open ? (
                  <small>
                    <IconStar /> {stars}/{FOREST.length}
                  </small>
                ) : (
                  <small className="coming-soon">Скоро</small>
                )}
              </span>
            </button>
          ))}
          <Fox pose="wave" className="map-fox" />
        </>
      }
    >
      {notice && (
        <button
          type="button"
          className="map-notice"
          onClick={() => {
            setNotice("");
            noticeOrigin.current?.focus();
          }}
          aria-label="Закрыть сообщение"
        >
          <span role="status">{notice}</span>
          <span aria-hidden>×</span>
        </button>
      )}
      <div className="top-bar">
        <button
          type="button"
          className="round-btn album-btn"
          aria-label="Альбом"
          onClick={() => {
            void sfx("tap");
            void navigate({ to: "/album" });
          }}
        >
          <Pic name="chest" />
        </button>
        <StarCount n={stars} total={FOREST.length} />
        <button
          type="button"
          className="round-btn practice-btn"
          aria-label="Практика: выбрать навык"
          onClick={() => void navigate({ to: "/practice" })}
        >
          <Pic name="book" />
          <small>Практика</small>
        </button>
        <ParentsButton />
      </div>
    </Scene>
  );
}
