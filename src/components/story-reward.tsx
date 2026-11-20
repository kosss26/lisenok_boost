import { useEffect, useRef, useState } from "react";
import type { Stop } from "../content/forest";
import { WORLD, findStop } from "../content/worlds";
import { giftKey, outroKey } from "../content/voice";
import { say, sfx } from "../game/audio";
import { useDialogue } from "../game/dialogue";
import { getProgress, starsIn } from "../game/progress";
import type { LessonSession } from "../game/session-state";
import { Modal } from "./modal";
import { Pic } from "./kit";
import { PoseSprite } from "./pose-sprite";
import { PlaceStar } from "./sky";

/** Reward data is already committed; this scene only presents it. Reloads reveal the earned gift. */
export function StoryReward({
  stop,
  reward,
  onNext,
}: {
  stop: Stop;
  reward: NonNullable<LessonSession["reward"]>;
  onNext: () => void;
}) {
  const world = findStop(stop.id)?.world ?? WORLD.forest;
  const [stage, setStage] = useState<"place" | "thanks" | "gift">(() =>
    getProgress().sky[stop.id] || !reward.toPlace ? "gift" : "place",
  );
  const nextButton = useRef<HTMLButtonElement | null>(null);
  const [narrate, setNarrate] = useState(true);
  useEffect(() => {
    if (stage !== "place" && document.activeElement === document.body)
      nextButton.current?.focus({ preventScroll: true });
  }, [stage]);
  useEffect(() => {
    if (stage !== "place") return;
    const timer = window.setTimeout(() => {
      if (!getProgress().sky[stop.id]) {
        void sfx("star");
        void say(["sky-place"]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [stage, stop.id]);
  useEffect(() => {
    if (stage !== "thanks") return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) {
      setStage("gift");
      return;
    }
    const timer = window.setTimeout(() => setStage("gift"), 700);
    const finish = () => {
      if (preference.matches) setStage("gift");
    };
    preference.addEventListener("change", finish);
    return () => {
      window.clearTimeout(timer);
      preference.removeEventListener("change", finish);
    };
  }, [stage]);
  return (
    <Modal className={`reward story-reward world-${world.id}`} label="Награда" onClose={onNext}>
      <div className="reward-rays" aria-hidden />
      <header className="reward-heading">
        <p>
          {world.id === "sea" ? "Звёзды моря" : "Звёзды леса"} ·{" "}
          {starsIn(getProgress(), world.stops)}/{world.stops.length}
        </p>
        <h2>{reward.first ? "Звёздочка твоя!" : "Ты снова помог!"}</h2>
      </header>
      <div className="reward-sky-stage">
        <PlaceStar stopId={stop.id} onPlaced={() => setStage("thanks")} />
      </div>
      <div className="reward-thanks-stage">
        {stage !== "place" ? (
          <RewardThanks stop={stop} enabled={narrate} onNext={() => setNarrate(true)} />
        ) : (
          <p className="reward-invite">Коснись звёздочки или перенеси её на небо</p>
        )}
      </div>
      <div className="reward-gift-stage">
        {stage === "gift" && (
          <button
            type="button"
            className="gift"
            onClick={() => {
              setNarrate(false);
              void sfx("pick");
              void say([giftKey(stop.id)]);
            }}
          >
            <Pic name={stop.gift} className="gift-pic" />
            <span>
              <small>{stop.name} дарит тебе</small>
              <strong>{stop.giftName}</strong>
            </span>
          </button>
        )}
      </div>
      <button ref={nextButton} type="button" className="big-btn next-btn" onClick={onNext}>
        Дальше
      </button>
      <span className="reward-stage-label" data-reward-stage={stage} role="status">
        {stage === "place"
          ? "Выбери место для звёздочки"
          : stage === "thanks"
            ? `${stop.name} радуется твоей помощи`
            : "Подарок ждёт тебя в альбоме"}
      </span>
    </Modal>
  );
}
function RewardThanks({
  stop,
  enabled,
  onNext,
}: {
  stop: Stop;
  enabled: boolean;
  onNext: () => void;
}) {
  const keys = [outroKey(stop.id, 0), outroKey(stop.id, 1)];
  const { index, next } = useDialogue(keys, { delay: 100, enabled });
  const line = stop.outro[Math.min(1, index)];
  return (
    <button
      type="button"
      className={`reward-talk from-${line.who}`}
      onClick={() => {
        onNext();
        next();
      }}
      aria-label="Послушать благодарность дальше"
    >
      <PoseSprite
        name={
          line.who === "res"
            ? stop.resident + (line.pose ? `-${line.pose}` : "")
            : `fox-${line.pose}`
        }
        className="reward-talker"
        label={line.who === "res" ? stop.name : "Лисёнок"}
      />
      <span className="reward-say" key={line.text}>
        {line.text}
      </span>
    </button>
  );
}
