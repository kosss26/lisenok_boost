import { NotFound } from "./recovery";
import { StoryReward } from "../components/story-reward";
import { PoseSprite } from "../components/pose-sprite";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { type Stop } from "../content/forest";
import { ALL_STOPS, findStop, type World } from "../content/worlds";
import { StopWeather } from "../components/weather";
import { introKey, youngId } from "../content/voice";
import { useDialogue } from "../game/dialogue";
import { BackButton, Scene } from "../components/kit";
import { TaskView, type Guide, type Mood } from "../components/tasks";
import { TaskFriends } from "../components/friends";
import { DifficultyBadge } from "../components/difficulty";
import { setScene, sfx, stopVoice } from "../game/audio";
import {
  freeSkySpot,
  getProgress,
  placeStar,
  stopOpen,
  useProgress,
  worldOpen,
} from "../game/progress";
import { completeSessionTask, clearSession } from "../game/sessions";
import { LessonDraftContext } from "../game/lesson-draft";
import { useLessonStart } from "../components/lesson-start";

export function StopScreen() {
  const { stopId = "" } = useParams({ strict: false }) as { stopId?: string };
  const navigate = useNavigate();
  const found = findStop(stopId);
  const p = getProgress();
  const allowed =
    found && worldOpen(p, found.world.id) && stopOpen(p, found.index, found.world.stops);
  useEffect(() => {
    if (found && !allowed)
      void navigate({
        to: worldOpen(p, found.world.id) ? `/${found.world.id}` : "/map",
        replace: true,
      });
  }, [allowed, navigate, found, p]);
  useEffect(() => () => stopVoice(), []);

  if (!found) return <NotFound />;
  if (!allowed) return null;
  return <StopGame key={found.stop.id} world={found.world} stopIndex={found.index} />;
}

function StopGame({ stopIndex, world }: { stopIndex: number; world: World }) {
  const stop = world.stops[stopIndex];
  const back = `/${world.id}`;
  const navigate = useNavigate();
  const p = useProgress();
  const session = p.session?.mode === "story" && p.session.target === stop.id ? p.session : null;
  const phase = session?.phase ?? "hello";
  const round = session?.round ?? [];
  const step = session?.step ?? 0;
  const reward = session?.reward;
  const [mood, setMood] = useState<Mood>("idle");
  const [guide, setGuide] = useState<Guide>(null);
  const { request, dialog } = useLessonStart();
  useEffect(() => {
    setScene(phase === "task" ? "tasks" : phase === "reward" ? "celebrate" : "map");
  }, [phase]);
  useEffect(() => () => setScene("map"), []);
  const solved = (m: number, h: boolean) => {
    if (!session) return;
    completeSessionTask(session.id, step, m, h);
    setMood("idle");
    setGuide(null);
  };

  const leaveReward = () => {
    void sfx("tap");
    stopVoice();
    if (!getProgress().sky[stop.id])
      placeStar(
        stop.id,
        ...freeSkySpot(getProgress(), ALL_STOPS.findIndex((s) => s.id === stop.id) + 1),
      );
    if (session) clearSession(session.id);
    void navigate({ to: back });
  };

  return (
    <Scene
      bg={world.stopBg}
      className={`stop-screen world-${world.id} phase-${phase}`}
      boxed={<StopWeather time={world.time(stopIndex)} weather={world.weather(stopIndex)} />}
    >
      {dialog}
      <div className="top-bar">
        <BackButton to={back} label={world.id === "sea" ? "К берегу" : "К тропинке"} />
        {round.length > 0 ? (
          <div className="dots" aria-label={`Задание ${step + 1} из ${round.length}`}>
            {round.map((_, i) => (
              <span
                key={i}
                className={`dot ${i < step || phase === "reward" ? "is-done" : ""} ${i === step && phase === "task" ? "is-now" : ""}`}
              />
            ))}
          </div>
        ) : (
          <span className="top-spacer" aria-hidden />
        )}
        <DifficultyBadge />
      </div>

      {phase === "hello" && (
        <Hello
          stop={stop}
          onHelp={() => {
            void sfx("tap");
            stopVoice();
            request("story", stop.id);
          }}
        />
      )}

      {phase === "task" && session && (
        <>
          <LessonDraftContext.Provider value={{ id: session.id, step }}>
            <TaskView
              key={`${session.id}-${step}`}
              task={round[step]}
              onSolved={solved}
              onMood={setMood}
              onGuide={setGuide}
            />
          </LessonDraftContext.Provider>
          <TaskFriends who={stop.resident} name={stop.name} mood={mood} guide={guide} />
        </>
      )}

      {phase === "reward" && reward && session && (
        <StoryReward key={session.id} stop={stop} reward={reward} onNext={leaveReward} />
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
