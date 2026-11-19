import { Modal } from "../components/modal";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FOREST } from "../content/forest";
import { FINDS } from "../content/glade";
import { wordKey } from "../content/voice";
import { BackButton, Fox, Pic, Scene } from "../components/kit";
import { TaskView, type Guide, type Mood } from "../components/tasks";
import { TaskFriends } from "../components/friends";
import { DifficultyBadge } from "../components/difficulty";
import { say, setScene, sfx, stopVoice } from "../game/audio";
import { forestDone, getProgress, useProgress } from "../game/progress";
import type { Skill } from "../content/forest";
import { completeSessionTask, clearSession, startSession } from "../game/sessions";
import { LessonDraftContext } from "../game/lesson-draft";
import { useLessonStart } from "../components/lesson-start";

/** Лесная полянка: endless practice after the forest — weak skills and words first, then review. */
export function Glade() {
  const navigate = useNavigate();
  const allowed = forestDone(getProgress());
  useEffect(() => {
    if (!allowed) void navigate({ to: "/forest", replace: true });
  }, [allowed, navigate]);
  useEffect(() => () => stopVoice(), []);
  return allowed ? <GladeGame /> : null;
}

export function GladeGame({
  mode = "glade",
  skill,
}: {
  mode?: "glade" | "practice";
  skill?: Skill;
}) {
  const navigate = useNavigate();
  const p = useProgress();
  const target = mode === "glade" ? "mixed" : skill!;
  const session = p.session?.mode === mode && p.session.target === target ? p.session : null;
  const phase = session ? (session.phase === "reward" ? "find" : "task") : "hello";
  const round = session?.round ?? [],
    step = session?.step ?? 0;
  const find = FINDS.find((f) => f.id === session?.reward?.find);
  const all = session?.reward?.all ?? false;
  const [mood, setMood] = useState<Mood>("idle");
  const [guide, setGuide] = useState<Guide>(null);
  const friend = FOREST[step % FOREST.length];
  const { request, dialog } = useLessonStart();
  useEffect(() => {
    setScene(phase === "task" ? "tasks" : phase === "find" ? "celebrate" : "map");
  }, [phase]);
  useEffect(
    () => () => {
      stopVoice();
      setScene("map");
    },
    [],
  );
  useEffect(() => {
    if (phase === "hello" && mode === "glade") {
      const t = window.setTimeout(() => void say(["glade-hello"]), 400);
      return () => window.clearTimeout(t);
    }
  }, [phase, mode]);
  const solved = (m: number, h: boolean) => {
    if (!session) return;
    completeSessionTask(session.id, step, m, h);
    setMood("idle");
    setGuide(null);
    const done = getProgress().session;
    if (done?.reward?.find) {
      void sfx("star");
      void say([
        "glade-find",
        wordKey(done.reward.find),
        ...(done.reward.all ? ["glade-all"] : []),
        "glade-more",
      ]);
    }
  };
  const again = () => {
    void sfx("tap");
    stopVoice();
    setMood("idle");
    setGuide(null);
    if (session?.phase === "reward") startSession(mode, target);
    else request(mode, target);
  };
  const back = mode === "practice" ? "/practice" : "/forest";
  const leave = () => {
    if (session) clearSession(session.id);
    void navigate({ to: back });
  };

  const found = Object.keys(getProgress().finds).length;

  return (
    <Scene bg="bg-clearing" className={`stop-screen glade-screen phase-${phase}`}>
      {dialog}
      <div className="top-bar">
        <BackButton to={back} label={mode === "practice" ? "Выбрать навык" : "К тропинке"} />
        <div className="dots" aria-label={`Задание ${step + 1} из ${round.length}`}>
          {round.map((_, i) => (
            <span
              key={i}
              className={`dot ${i < step || phase === "find" ? "is-done" : ""} ${i === step && phase === "task" ? "is-now" : ""}`}
            />
          ))}
        </div>
        <DifficultyBadge pick={phase === "hello"} />
      </div>

      {phase === "hello" && (
        <div className="glade-hello">
          <div className="bubble from-fox glade-bubble">
            <span className="bubble-name">Лесная полянка</span>
            <p>Здесь можно играть сколько захочешь. После каждых пяти заданий — находка!</p>
          </div>
          <p className="glade-count">
            Находки: {found} из {FINDS.length}
          </p>
          <Fox pose="wave" className="glade-fox" />
          <button type="button" className="big-btn help-btn is-ready glade-play" onClick={again}>
            Играть!
          </button>
        </div>
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
          <TaskFriends who={friend.resident} name={friend.name} mood={mood} guide={guide} />
        </>
      )}

      {phase === "find" && find && (
        <Modal className="reward glade-find" label="Находка" onClose={leave}>
          <div className="reward-rays" aria-hidden />
          <Pic name={find.pic} className="find-pic" />
          <h2>Находка: {find.name.toLowerCase()}!</h2>
          {all && <p className="level-note">Все находки полянки собраны!</p>}
          <p className="glade-count">
            Находки: {Object.keys(getProgress().finds).length} из {FINDS.length}
          </p>
          <div className="glade-actions">
            <button type="button" className="text-action" onClick={leave}>
              К занятиям
            </button>
            <button type="button" className="big-btn next-btn glade-again" onClick={again}>
              Ещё!
            </button>
          </div>
        </Modal>
      )}
    </Scene>
  );
}
