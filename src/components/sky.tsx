/** The child's own night sky: every stop's star hangs where the child put it. */
import { useRef, useState } from "react";
import { FOREST } from "../content/forest";
import { say, sfx } from "../game/audio";
import { useDrag } from "../game/drag";
import { vibrate } from "../game/haptics";
import { freeSkySpot, getProgress, placeStar, useProgress } from "../game/progress";
import { Pic } from "./kit";

export function Sky({ className = "", highlight }: { className?: string; highlight?: string }) {
  const p = useProgress();
  return (
    <div className={`sky ${className}`} aria-label="Моё небо">
      <Pic name="moon" className="sky-moon" />
      {FOREST.filter((s) => p.sky[s.id]).map((s) => {
        const [x, y] = p.sky[s.id];
        return (
          <Pic
            key={s.id}
            name="star"
            className={`sky-placed ${s.id === highlight ? "is-new" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        );
      })}
    </div>
  );
}

/**
 * The reward: the new star waits below the sky; the child drags it up — or taps the sky — and it
 * stays where it was put. `onPlaced` runs once it hangs there.
 */
export function PlaceStar({ stopId, onPlaced }: { stopId: string; onPlaced: () => void }) {
  const skyRef = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState(Boolean(getProgress().sky[stopId]));
  const put = (clientX: number, clientY: number) => {
    const r = skyRef.current?.getBoundingClientRect();
    if (!r || placed) return;
    placeStar(stopId, ((clientX - r.left) / r.width) * 100, ((clientY - r.top) / r.height) * 100);
    setPlaced(true);
    void sfx("star");
    void vibrate(30);
    void say(["sky-done"]);
    onPlaced();
  };
  const drag = useDrag<string>({
    zones: () => [{ area: skyRef.current, magnet: false }],
    onDrop: (_k, _z, rect) => put(rect.left + rect.width / 2, rect.top + rect.height / 2),
    onNear: () => void sfx("tap", 0.3),
    disabled: placed,
  });
  return (
    <div className={`place-star ${placed ? "is-placed" : "is-waiting"}`}>
      <div
        ref={skyRef}
        className={`sky-frame ${drag.near !== null ? "is-near" : ""}`}
        onClick={(e) => put(e.clientX, e.clientY)}
        role="button"
        tabIndex={placed ? -1 : 0}
        aria-label="Небо: нажми, где будет сиять звёздочка"
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          const r = skyRef.current!.getBoundingClientRect();
          const [x, y] = freeSkySpot(getProgress(), Object.keys(getProgress().sky).length + 1);
          put(r.left + (r.width * x) / 100, r.top + (r.height * y) / 100);
        }}
      >
        <Sky highlight={stopId} />
        {!placed && <span className="sky-tip">Повесь звёздочку на небо!</span>}
      </div>
      {!placed && (
        <button
          type="button"
          className="new-star drag-item"
          aria-label="Звёздочка"
          {...drag.bind("star")}
          style={drag.style("star")}
          onClick={() => {
            // a tap on the star: it flies to a free spot
            const r = skyRef.current?.getBoundingClientRect();
            if (!r) return;
            const [x, y] = freeSkySpot(getProgress(), Object.keys(getProgress().sky).length + 1);
            put(r.left + (r.width * x) / 100, r.top + (r.height * y) / 100);
          }}
        >
          <Pic name="star-face" className="reward-star" />
        </button>
      )}
    </div>
  );
}
