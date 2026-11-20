/**
 * The resident and the fox under the tasks. Both react to a tap (the hedgehog giggles and curls
 * up, the hare and the frog jump, the owl turns its head...), and the fox helps a hesitating child:
 * first it glances toward the answer, then it points at it.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { tickleKey } from "../content/voice";
import { isSpeaking, say, sfx } from "../game/audio";
import { vibrate } from "../game/haptics";
import type { FoxPose } from "./kit";
import { PoseSprite } from "./pose-sprite";
import type { Guide, Mood } from "./tasks";

/** how each resident reacts to a tickle */
const REACTION: Record<string, string> = {
  hedgehog: "curl",
  hare: "jump",
  frog: "jump",
  squirrel: "jump",
  owl: "turn",
  mouse: "giggle",
  bear: "giggle",
  beaver: "giggle",
  badger: "giggle",
  "res-crab": "giggle",
  "res-turtle": "turn",
  "res-gull": "jump",
  "res-seastar": "turn",
  "res-fish": "jump",
  "res-octopus": "giggle",
  "res-dolphin": "jump",
  "res-jelly": "giggle",
  "res-seal": "giggle",
};

export function TaskFriends({
  who,
  name,
  mood,
  guide,
}: {
  /** the resident (stop id = its picture) */
  who: string;
  name: string;
  mood: Mood;
  guide: Guide;
}) {
  const [react, setReact] = useState<{ res: string | null; fox: boolean }>({
    res: null,
    fox: false,
  });
  const foxRef = useRef<HTMLButtonElement | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const tickle = (target: "res" | "fox") => {
    if (target === "fox" ? react.fox : react.res) return;
    void sfx("pick", 0.5);
    void vibrate(15);
    // a giggle never cuts the question or the praise: then the friend only moves
    if (!isSpeaking()) void say([target === "fox" ? "touch-fox" : tickleKey(who)]);
    setReact((r) =>
      target === "fox" ? { ...r, fox: true } : { ...r, res: REACTION[who] ?? "giggle" },
    );
    timers.current.push(
      window.setTimeout(
        () => setReact((r) => (target === "fox" ? { ...r, fox: false } : { ...r, res: null })),
        1100,
      ),
    );
  };

  // the fox turns toward the answer: the "point" picture points to the left, so it is mirrored
  // when the answer is on its right; it leans a little up or down toward it
  const [look, setLook] = useState<CSSProperties | undefined>(undefined);
  useLayoutEffect(() => {
    const box = foxRef.current?.getBoundingClientRect();
    if (!guide || !box) {
      setLook(undefined);
      return;
    }
    const fx = box.left + box.width / 2;
    const fy = box.top + box.height * 0.3;
    const right = guide.x > fx + 10;
    const angle = (Math.atan2(guide.y - fy, Math.abs(guide.x - fx)) * 180) / Math.PI;
    const lean = Math.max(-18, Math.min(18, (angle + 35) * 0.4)) * (right ? -1 : 1);
    setLook({ "--flip": right ? -1 : 1, "--lean": `${lean}deg` } as CSSProperties);
  }, [guide]);
  const foxPose: FoxPose =
    mood === "happy"
      ? "cheer"
      : mood === "oops"
        ? "think"
        : guide?.stage === 2
          ? "point"
          : guide?.stage === 1
            ? "think"
            : "wave";
  const residentPose = mood === "happy" ? "-happy" : "";

  return (
    <div className="task-friends">
      <button
        type="button"
        className={`friend-btn friend-res-btn ${react.res ? `react-${react.res}` : ""}`}
        aria-label={`Пощекотать: ${name}`}
        onClick={() => tickle("res")}
      >
        <PoseSprite name={who + residentPose} className={`friend-resident mood-${mood}`} />
      </button>
      <button
        ref={foxRef}
        type="button"
        className={[
          "friend-btn friend-fox-btn",
          react.fox ? "react-giggle" : "",
          guide ? `is-guiding guide-${guide.stage}` : "",
        ].join(" ")}
        style={look}
        aria-label="Пощекотать лисёнка"
        data-guide={guide?.stage ?? 0}
        onClick={() => tickle("fox")}
      >
        <PoseSprite quiet name={`fox-${foxPose}`} className={`friend-fox mood-${mood}`} />
      </button>
    </div>
  );
}
