import { Modal } from "../components/modal";
import { PoseSprite } from "../components/pose-sprite";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FOREST, timeOf, weatherOf, type Stop } from "../content/forest";
import { StopWeather } from "../components/weather";
import { introKey, outroKey, youngId } from "../content/voice";
import { useDialogue } from "../game/dialogue";
import { BackButton, Fox, Pic, Scene } from "../components/kit";
import { TaskView, type Guide, type Mood } from "../components/tasks";
import { TaskFriends } from "../components/friends";
import { DifficultyBadge } from "../components/difficulty";
import { PlaceStar } from "../components/sky";
import { giftKey } from "../content/voice";
import { say, setScene, sfx, stopVoice } from "../game/audio";
import {
  easeNow,
  finishStop,
  freeSkySpot,
  getProgress,
  placeStar,
  recordTask,
  stopOpen,
  tuneFor,
  weakWordIds,
} from "../game/progress";
import { makeRound, type Task } from "../game/tasks";
import { stopRoute } from "../router";

type Phase = "hello" | "task" | "reward";

export function StopScreen() {
  const { stopId } = stopRoute.useParams();
  const navigate = useNavigate();
  const index = FOREST.findIndex((s) => s.id === stopId);
  const stop = FOREST[index];
  const allowed = stop && stopOpen(getProgress(), index);

  useEffect(() => {
    if (!allowed) void navigate({ to: "/forest", replace: true });
  }, [allowed, navigate]);
  useEffect(() => () => stopVoice(), []);

  if (!allowed) return null;
  return <StopGame key={stop.id} stopIndex={index} />;
}

function StopGame({ stopIndex }: { stopIndex: number }) {
  const stop = FOREST[stopIndex];
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("hello");
  useEffect(() => {
    setScene(phase === "task" ? "tasks" : phase === "reward" ? "celebrate" : "map");
  }, [phase]);
  useEffect(() => () => setScene("map"), []);
  const [round, setRound] = useState<Task[]>(() =>
    makeRound(
      stop.skill,
      tuneFor(getProgress(), stopIndex),
      Math.random,
      weakWordIds(getProgress()),
    ),
  );
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<Mood>("idle");
  const [guide, setGuide] = useState<Guide>(null);
  const [reward, setReward] = useState<{ first: boolean; toPlace: boolean } | null>(null);
  const mistakes = useRef(0);

  const solved = (m: number, hinted: boolean) => {
    recordTask(round[step].skill, m, hinted, round[step].word);
    mistakes.current += m + (hinted && m === 0 ? 1 : 0);
    if (step + 1 < round.length) {
      // a mistake: the rest of the round gets easier at once (the automatic shift goes down)
      if (m >= 1 && getProgress().settings.auto) {
        easeNow(Math.min(0.15, 0.05 * m));
        const easier = makeRound(
          stop.skill,
          tuneFor(getProgress(), stopIndex),
          Math.random,
          weakWordIds(getProgress()),
        );
        setRound([...round.slice(0, step + 1), ...easier.slice(step + 1)]);
      }
      setStep(step + 1);
      return;
    }
    const r = finishStop(stop.id, mistakes.current);
    const toPlace = !getProgress().sky[stop.id];
    setReward({ ...r, toPlace });
    setStarUp(!toPlace);
    setPhase("reward");
    void sfx("star");
    if (toPlace) window.setTimeout(() => void say(["sky-place"]), 600);
  };
  /** the star hangs in the sky (or was there already): now the gift and the thanks */
  const [starUp, setStarUp] = useState(false);

  const leaveReward = () => {
    void sfx("tap");
    stopVoice();
    if (!getProgress().sky[stop.id])
      placeStar(stop.id, ...freeSkySpot(getProgress(), stopIndex + 1));
    void navigate({ to: "/forest" });
  };

  return (
    <Scene
      bg="bg-clearing"
      className={`stop-screen phase-${phase}`}
      boxed={<StopWeather time={timeOf(stopIndex)} weather={weatherOf(stopIndex)} />}
    >
      <div className="top-bar">
        <BackButton to="/forest" label="К тропинке" />
        <div className="dots" aria-label={`Задание ${step + 1} из ${round.length}`}>
          {round.map((_, i) => (
            <span
              key={i}
              className={`dot ${i < step || phase === "reward" ? "is-done" : ""} ${i === step && phase === "task" ? "is-now" : ""}`}
            />
          ))}
        </div>
        <DifficultyBadge />
      </div>

      {phase === "hello" && (
        <Hello
          stop={stop}
          onHelp={() => {
            void sfx("tap");
            stopVoice();
            setPhase("task");
          }}
        />
      )}

      {phase === "task" && (
        <>
          <TaskView
            key={step}
            task={round[step]}
            onSolved={solved}
            onMood={setMood}
            onGuide={setGuide}
          />
          <TaskFriends who={stop.resident} name={stop.name} mood={mood} guide={guide} />
        </>
      )}

      {phase === "reward" && reward && (
        <Modal className="reward" label="Награда" onClose={leaveReward}>
          <div className="reward-rays" aria-hidden />
          {reward.toPlace ? (
            <PlaceStar
              stopId={stop.id}
              onPlaced={() => window.setTimeout(() => setStarUp(true), 900)}
            />
          ) : (
            <Pic name="star-face" className="reward-star" />
          )}
          <h2>{reward.first ? "Звёздочка твоя!" : "Ты снова помог!"}</h2>
          {starUp && (
            <>
              <button
                type="button"
                className="gift"
                onClick={() => {
                  void sfx("pick");
                  void say([giftKey(stop.id)]);
                }}
              >
                <Pic name={stop.gift} className="gift-pic" />
                <span>
                  {reward.first ? `Подарок: ${stop.giftName.toLowerCase()}` : stop.giftName}
                </span>
              </button>
              <Outro stop={stop} />
            </>
          )}
          <button type="button" className="big-btn next-btn" onClick={leaveReward}>
            Дальше
          </button>
        </Modal>
      )}
    </Scene>
  );
}

const residentPic = (stop: Stop, pose: string) => stop.resident + (pose ? `-${pose}` : "");

/** The resident and the fox talk before the tasks: voiced lines, poses change with each line. */
function Hello({ stop, onHelp }: { stop: Stop; onHelp: () => void }) {
  // 5–6-year-olds get the stop's no-arithmetic version (another skill, other words)
  const young = getProgress().settings.level === 1 && stop.young;
  const intro = young ? young.intro : stop.intro;
  const keys = intro.map((_, i) => introKey(young ? youngId(stop.id) : stop.id, i));
  const { index, finished, next } = useDialogue(keys);
  const line = intro[index];
  const seen = intro.slice(0, index + 1);
  const resPose = seen.filter((l) => l.who === "res").pop()?.pose ?? "sad";
  const foxPose = seen.flatMap((l) => (l.who === "fox" ? [l.pose] : [])).pop() ?? "wave";

  return (
    <div className={`hello speaker-${line.who}`}>
      <button
        type="button"
        className={`bubble from-${line.who}`}
        key={index}
        onClick={next}
        aria-label="Дальше"
      >
        <span className="bubble-name">{line.who === "fox" ? "Лисёнок" : stop.name}</span>
        <p>{line.text}</p>
      </button>
      <div className="talkers">
        <PoseSprite
          name={residentPic(stop, resPose)}
          className={`dialogue-portrait ${line.who === "res" ? "is-speaking" : ""}`}
          imageClassName={`talker-res ${line.who === "res" ? "is-talking" : ""}`}
          label={stop.name}
        />
        <PoseSprite
          name={`fox-${foxPose}`}
          className={`dialogue-portrait is-fox ${line.who === "fox" ? "is-speaking" : ""}`}
          imageClassName={`talker-fox ${line.who === "fox" ? "is-talking" : ""}`}
          label="Лисёнок"
        />
      </div>
      <button
        type="button"
        className={`big-btn help-btn ${finished ? "is-ready" : ""}`}
        onClick={onHelp}
      >
        Помочь!
      </button>
    </div>
  );
}

/** After the star: the resident thanks, the fox answers. */
function Outro({ stop }: { stop: Stop }) {
  const keys = [outroKey(stop.id, 0), outroKey(stop.id, 1)];
  const { index, next } = useDialogue(keys, { delay: 700 });
  const line = stop.outro[index === keys.length - 1 ? 1 : 0];
  return (
    <button
      type="button"
      className={`reward-talk from-${line.who}`}
      onClick={next}
      aria-label="Дальше"
    >
      {line.who === "res" ? (
        <Pic name={residentPic(stop, line.pose)} className="reward-talker" alt={stop.name} />
      ) : (
        <Fox pose={line.pose} className="reward-talker" />
      )}
      <span className="reward-say" key={line.text}>
        {line.text}
      </span>
    </button>
  );
}
