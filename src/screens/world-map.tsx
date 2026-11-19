import { useEffect, useState } from "react";
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
              onClick={() => {
                if (w.open) {
                  void sfx("step");
                  void navigate({ to: "/forest" });
                  return;
                }
                void sfx("tap");
                setShake(w.id);
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
          <Fox pose="point" className="map-fox" />
        </>
      }
    >
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
        <ParentsButton />
      </div>
    </Scene>
  );
}
