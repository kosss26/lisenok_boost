import { Modal } from "../components/modal";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FOREST, onPath, timeOf, weatherOf, type TimeOfDay } from "../content/forest";
import { Mist, Rain } from "../components/weather";
import { BackButton, Fox, ParentsButton, Pic, StarCount } from "../components/kit";
import { art } from "../game/assets";
import { say, sfx } from "../game/audio";
import { DifficultyBadge } from "../components/difficulty";
import {
  getActiveProfile,
  nextStopIndex,
  starsIn,
  stopOpen,
  update,
  useProgress,
} from "../game/progress";

const NEXT_NAMES: Record<string, string> = {
  hedgehog: "ёжику",
  squirrel: "белке",
  owl: "сове",
  mouse: "мышке",
  hare: "зайчику",
  beaver: "бобру",
  frog: "лягушонку",
  bear: "медвежонку",
  badger: "барсуку",
};
type Pt = { x: number; y: number };
/** Where the fox stood when the forest was last shown (this launch) — it walks on from there. */
let lastFox: { profile: string; point: Pt } | null = null;
/** the forest is two pictures high (entrance below, deep forest above); points are % of all of it */
const ENTRANCE: Pt = { x: 50, y: 99.5 };
const reduced = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The fox waits beside the next resident, leaving the bottom action and clearing unobstructed. */
function foxSpot(next: number): Pt {
  const to = onPath(FOREST[Math.min(next, FOREST.length - 1)]);
  return { x: to.x > 50 ? to.x - 19 : to.x + 19, y: to.y + 1 };
}
/** Farther stops (higher on the picture) are drawn smaller, like in perspective. */
const depth = (y: number) => Math.min(1, 0.68 + 0.32 * (y / 80));
/** A full-box layer moved by translate(%) — % of its own size = % of the picture (GPU-only). */
const at = (p: Pt): CSSProperties => ({ transform: `translate(${p.x}%, ${p.y}%)` });

export function Forest() {
  const p = useProgress();
  const navigate = useNavigate();
  const next = nextStopIndex(p);
  const allDone = next >= FOREST.length;
  const celebrate = allDone && !p.forestCelebrated;
  const [shake, setShake] = useState<string | null>(null);

  const target = foxSpot(next);
  const start = reduced()
    ? target
    : lastFox?.profile === getActiveProfile()
      ? lastFox.point
      : ENTRANCE;
  const walks = start.x !== target.x || start.y !== target.y;
  const [fox, setFox] = useState<Pt>(start);
  const [arrived, setArrived] = useState(!walks);
  const [celebrateCard, setCelebrateCard] = useState(reduced());
  const nextStop = FOREST[Math.min(next, FOREST.length - 1)];
  const enterNext = () => {
    void sfx("step");
    void navigate({ to: "/forest/$stopId", params: { stopId: nextStop.id } });
  };

  useEffect(() => {
    lastFox = { profile: getActiveProfile(), point: target };
    const timers: number[] = [];
    if (walks) {
      timers.push(window.setTimeout(() => setFox(target), 250));
      timers.push(window.setTimeout(() => setArrived(true), 250 + 1700));
    }
    timers.push(
      window.setTimeout(
        () => {
          if (celebrate) {
            void sfx("fanfare");
            void say(["forest-done"]);
          } else if (!allDone) void say(["forest-next"]);
        },
        walks && !celebrate ? 1500 : 450,
      ),
    );
    if (celebrate) timers.push(window.setTimeout(() => setCelebrateCard(true), 2600));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // only when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flipped = target.x > FOREST[Math.min(next, FOREST.length - 1)].x;
  const goingLeft = target.x < start.x;

  // the path is taller than the screen: open it where the fox is, scroll up to the sky to celebrate
  const scroller = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const tall = el.scrollHeight;
    el.scrollTop = Math.max(0, (target.y / 100) * tall - el.clientHeight * 0.62);
    // only when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!celebrate) return;
    const t = window.setTimeout(
      () => scroller.current?.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }),
      400,
    );
    return () => window.clearTimeout(t);
  }, [celebrate]);

  return (
    <div className={`scene forest-screen ${celebrate ? "is-night" : ""}`}>
      <div className="forest-scroll" ref={scroller}>
        <div className="forest-tall">
          <img
            className="forest-bg forest-bg-2"
            src={art("bg-forest-2")}
            alt=""
            draggable={false}
          />
          <img className="forest-bg forest-bg-1" src={art("bg-forest")} alt="" draggable={false} />
          <div className="forest-seam" aria-hidden />
          <div className="forest-half forest-half-1">
            <ForestAmbient />
          </div>
          <div className="forest-half forest-half-2">
            <ForestAmbient stream={false} />
          </div>
          <ForestLight />
          {FOREST.map((stop, i) => {
            const open = stopOpen(p, i);
            const done = Boolean(p.done[stop.id]);
            const isNext = i === next;
            return (
              <button
                key={stop.id}
                type="button"
                data-stop={stop.id}
                className={[
                  "stop",
                  done ? "is-done" : "",
                  isNext ? "is-next" : "",
                  isNext && arrived ? "is-greeting" : "",
                  open ? "" : "is-locked",
                  shake === stop.id ? "is-shaking" : "",
                ].join(" ")}
                style={
                  {
                    left: `${onPath(stop).x}%`,
                    top: `${onPath(stop).y}%`,
                    "--s": depth(stop.y),
                    "--d": `${(i * 0.37) % 2}s`,
                  } as CSSProperties
                }
                aria-label={`${stop.name}${done ? ", звезда получена" : open ? "" : ", пока закрыто"}`}
                onClick={() => {
                  if (!open) {
                    void sfx("tap");
                    setShake(stop.id);
                    window.setTimeout(() => setShake(null), 600);
                    void say(["stop-locked"]);
                    return;
                  }
                  void sfx("step");
                  void navigate({ to: "/forest/$stopId", params: { stopId: stop.id } });
                }}
              >
                <span className="stop-glow" aria-hidden />
                <span className="stop-body">
                  <Pic
                    name={stop.resident + (done ? "-happy" : isNext ? "-sad" : "")}
                    className="stop-pic"
                  />
                </span>
                {done && !celebrate && <Pic name="star" className="stop-star" />}
                <span className="stop-num" aria-hidden>
                  {i + 1}
                </span>
                {isNext && <span className="stop-next-label">Сюда!</span>}
              </button>
            );
          })}
          {!allDone && (
            <div className={`fox-track ${arrived ? "is-arrived" : "is-walking"}`} style={at(fox)}>
              <span
                className={`forest-fox-wrap ${(arrived ? flipped : goingLeft) ? "is-flipped" : ""}`}
              >
                <Fox pose={arrived ? "wave" : "walk"} className="forest-fox" />
              </span>
            </div>
          )}
          {celebrate && <div className="night" aria-hidden />}
          {celebrate &&
            FOREST.map((stop, i) => (
              <div
                key={stop.id}
                className="sky-star-track"
                style={
                  {
                    "--from": `translate(${onPath(stop).x}%, ${onPath(stop).y}%)`,
                    "--to": `translate(${8 + (i % 9) * 10.5}%, ${4 + Math.floor(i / 9) * 4 + (i % 2) * 1.5 + Math.abs(4 - (i % 9)) * 0.6}%)`,
                    "--delay": `${0.6 + i * 0.12}s`,
                  } as CSSProperties
                }
              >
                <Pic name="star" className="sky-star" />
              </div>
            ))}
        </div>
      </div>
      <div className="scene-layer">
        {!allDone && (
          <button
            type="button"
            className="trail-continue"
            onClick={enterNext}
            aria-label={`Продолжить: ${nextStop.name}, остановка ${next + 1} из ${FOREST.length}`}
          >
            <span className="trail-continue-icon" aria-hidden>
              ↟
            </span>
            <span>
              <small>
                Следующая остановка · {next + 1}/{FOREST.length}
              </small>
              <strong>К {NEXT_NAMES[nextStop.resident] ?? nextStop.name.toLowerCase()}</strong>
            </span>
            <span aria-hidden>→</span>
          </button>
        )}
        <div className="top-bar">
          <BackButton to="/map" label="На карту" />
          <StarCount n={starsIn(p)} total={FOREST.length} />
          <DifficultyBadge pick />
          <ParentsButton />
        </div>
        {allDone && !celebrate && (
          <button
            type="button"
            className="glade-btn"
            onClick={() => {
              void sfx("step");
              void navigate({ to: "/glade" });
            }}
          >
            <Pic name="mushroom" className="glade-btn-pic" />
            <span>Лесная полянка</span>
          </button>
        )}
        {celebrate && (
          <Modal
            className="celebrate"
            label="Лес пройден"
            onClose={() => update((s) => ({ ...s, forestCelebrated: true }))}
          >
            {celebrateCard && (
              <div className="celebrate-card">
                <Fox pose="cheer" className="celebrate-fox" />
                <h2>Звёзды вернулись на небо!</h2>
                <p>Весь лес сияет. Скоро лисёнок отправится к морю.</p>
                <button
                  type="button"
                  className="big-btn"
                  onClick={() => {
                    void sfx("tap");
                    update((s) => ({ ...s, forestCelebrated: true }));
                    void say(["glade-open"]);
                  }}
                >
                  Ура!
                </button>
              </div>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

/** Falling leaves, a sparkling stream and fireflies — CSS transforms/opacity only. */
const LEAVES = [
  { x: 12, d: 0, t: 11, pic: "leaf" },
  { x: 34, d: 4, t: 13, pic: "t-maple" },
  { x: 58, d: 7.5, t: 12, pic: "leaf" },
  { x: 80, d: 2, t: 14, pic: "t-maple" },
  { x: 92, d: 9, t: 12.5, pic: "leaf" },
];
const SPARKLES = [
  [24, 38],
  [30, 39.5],
  [37, 40.5],
  [44, 42],
  [53, 44],
  [60, 45.5],
  [67, 47],
  [74, 48.5],
  [81, 49.5],
  [20, 37.5],
];
const FLIES = [
  [8, 30],
  [88, 26],
  [14, 62],
  [90, 70],
  [70, 88],
  [22, 88],
  [52, 52],
  [6, 46],
];
function ForestAmbient({ stream = true }: { stream?: boolean }) {
  return (
    <div className="ambient" aria-hidden>
      {(stream ? SPARKLES.slice(0, 4) : []).map(([x, y], i) => (
        <span
          key={`s${i}`}
          className="sparkle"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.53) % 2.4}s` }}
        />
      ))}
      {FLIES.slice(0, 3).map(([x, y], i) => (
        <span
          key={`f${i}`}
          className={`firefly f${i % 4}`}
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.8}s` }}
        />
      ))}
      {LEAVES.slice(0, 2).map((l, i) => (
        <span
          key={`l${i}`}
          className="leaf-fall"
          style={{ left: `${l.x}%`, animationDelay: `${l.d}s`, animationDuration: `${l.t}s` }}
        >
          <Pic name={l.pic} className="leaf-pic" />
        </span>
      ))}
    </div>
  );
}

// Time of day along the path (morning at the entrance → dusk deep in the forest) and the weather
// over a few stops: a tint layer with a colour at every clearing, a shower and mist bands.
const TINT: Record<TimeOfDay, string> = {
  morning: "rgba(255, 186, 140, 0.16)",
  day: "rgba(255, 255, 240, 0)",
  evening: "rgba(255, 128, 48, 0.2)",
  dusk: "rgba(46, 38, 120, 0.24)",
};
function band(w: "rain" | "fog") {
  const ys = FOREST.flatMap((s, i) => (weatherOf(i) === w ? [onPath(s).y] : []));
  return { top: `${Math.min(...ys) - 6}%`, height: `${Math.max(...ys) - Math.min(...ys) + 12}%` };
}
function ForestLight() {
  const stops = FOREST.map((s, i) => ({ y: onPath(s).y, c: TINT[timeOf(i)] })).sort(
    (a, b) => a.y - b.y,
  );
  const gradient = `linear-gradient(${[
    `${stops[0].c} 0%`,
    ...stops.map((s) => `${s.c} ${s.y.toFixed(1)}%`),
    `${stops[stops.length - 1].c} 100%`,
  ].join(", ")})`;
  return (
    <>
      <div className="forest-light" style={{ background: gradient }} aria-hidden />
      <Rain className="forest-rain" style={band("rain")} />
      <Mist className="forest-mist" style={band("fog")} />
    </>
  );
}
