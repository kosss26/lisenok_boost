import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { WORLDS } from "../content/forest";
import { WORLD, WORLD_LIST, type WorldId } from "../content/worlds";
import { NAMES } from "../content/names";
import { Fox, ParentsButton, Pic, Scene, StarCount } from "../components/kit";
import { say, sfx } from "../game/audio";
import { IconStar } from "../components/icons";
import { greeting } from "../game/greeting";
import { getProgress, starsIn, useProgress, worldOpen, worldDone } from "../game/progress";

export function WorldMap() {
  const p = useProgress();
  const navigate = useNavigate();
  const openWorlds = WORLD_LIST.filter((w) => worldOpen(p, w.id));
  const stars = openWorlds.reduce((n, w) => n + starsIn(p, w.stops), 0),
    total = openWorlds.reduce((n, w) => n + w.stops.length, 0);
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
    if (worldDone(getProgress(), "forest") && !worldDone(getProgress(), "sea")) {
      for (let i = 0; i < lines.length; i++) if (lines[i] === "map-pick") lines[i] = "map-pick-sea";
    }
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
          {WORLDS.map((w) => {
            const world = WORLD[w.id as WorldId];
            const isOpen = Boolean(world && worldOpen(p, world.id));
            return (
              <button
                key={w.id}
                type="button"
                className={`world world-${w.id} ${isOpen ? "is-open" : "is-locked"} ${shake === w.id ? "is-shaking" : ""}`}
                aria-label={
                  isOpen
                    ? `${w.name}: ${world ? starsIn(p, world.stops) : 0} из ${world?.stops.length ?? 0} звёзд`
                    : w.id === "sea"
                      ? "Море: откроется после леса"
                      : `${w.name}: скоро появится`
                }
                style={{ left: `${w.x}%`, top: `${w.y}%` }}
                onClick={(e) => {
                  if (isOpen) {
                    void sfx("step");
                    void navigate({ to: world!.id === "sea" ? "/sea" : "/forest" });
                    return;
                  }
                  void sfx("tap");
                  noticeOrigin.current = e.currentTarget;
                  setShake(w.id);
                  setNotice(
                    w.id === "sea"
                      ? "Море откроется, когда все звёзды леса вернутся на небо."
                      : `${w.name} — новое приключение появится позже. Сейчас можно исследовать лес и море.`,
                  );
                  window.setTimeout(() => setShake(null), 600);
                  void say(["locked-soon"]);
                }}
              >
                <span className="world-sign">
                  {w.name}
                  {isOpen ? (
                    <small>
                      <IconStar /> {world ? starsIn(p, world.stops) : 0}/{world?.stops.length}
                    </small>
                  ) : (
                    <small className="coming-soon">{w.id === "sea" ? "После леса" : "Скоро"}</small>
                  )}
                </span>
              </button>
            );
          })}
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
        <StarCount n={stars} total={total} />
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
