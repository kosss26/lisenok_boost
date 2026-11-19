import { Modal } from "../components/modal";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FOREST } from "../content/forest";
import { FINDS, nextFind } from "../content/glade";
import { wordKey } from "../content/voice";
import { BackButton, Fox, Pic, Scene } from "../components/kit";
import { TaskView, type Guide, type Mood } from "../components/tasks";
import { TaskFriends } from "../components/friends";
import { DifficultyBadge } from "../components/difficulty";
import { say, setScene, sfx, stopVoice } from "../game/audio";
import {
  addFind,
  forestDone,
  getProgress,
  gladeGrade,
  recordTask,
  weakSkills,
  weakWordIds,
} from "../game/progress";
import { makePractice, type Task } from "../game/tasks";

type Phase = "hello" | "task" | "find";
const newRound = () => {
  const p = getProgress();
  return makePractice({ level: p.settings.level, g: gladeGrade(p) }, weakSkills(p), weakWordIds(p));
};

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

function GladeGame() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("hello");
  const [round, setRound] = useState<Task[]>(newRound);
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<Mood>("idle");
  const [find, setFind] = useState<(typeof FINDS)[number] | null>(null);
  const [all, setAll] = useState(false);
  const roundNo = useRef(0);
  const friend = FOREST[roundNo.current % FOREST.length];
  const [guide, setGuide] = useState<Guide>(null);

  useEffect(() => {
    setScene(phase === "task" ? "tasks" : phase === "find" ? "celebrate" : "map");
  }, [phase]);
  useEffect(() => () => setScene("map"), []);
  useEffect(() => {
    if (phase !== "hello") return;
    const t = window.setTimeout(() => void say(["glade-hello"]), 400);
    return () => window.clearTimeout(t);
  }, [phase]);

  const solved = (m: number, hinted: boolean) => {
    const task = round[step];
    recordTask(task.skill, m, hinted, task.word);
    if (step + 1 < round.length) {
      setStep(step + 1);
      return;
    }
    const before = getProgress().finds;
    const f = nextFind(before);
    const completes = FINDS.every((x) => x.id === f.id || before[x.id]) && !before[f.id];
    addFind(f.id);
    setFind(f);
    setAll(completes);
    setPhase("find");
    void sfx("star");
    void say(["glade-find", wordKey(f.id), ...(completes ? ["glade-all"] : []), "glade-more"]);
  };

  const again = () => {
    void sfx("tap");
    stopVoice();
    roundNo.current++;
    setRound(newRound());
    setStep(0);
    setMood("idle");
    setPhase("task");
  };

  const found = Object.keys(getProgress().finds).length;

  return (
    <Scene bg="bg-clearing" className={`stop-screen glade-screen phase-${phase}`}>
      <div className="top-bar">
        <BackButton to="/forest" label="К тропинке" />
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

      {phase === "task" && (
        <>
          <TaskView
            key={`${roundNo.current}-${step}`}
            task={round[step]}
            onSolved={solved}
            onMood={setMood}
            onGuide={setGuide}
          />
          <TaskFriends who={friend.resident} name={friend.name} mood={mood} guide={guide} />
        </>
      )}

      {phase === "find" && find && (
        <Modal
          className="reward glade-find"
          label="Находка"
          onClose={() => void navigate({ to: "/forest" })}
        >
          <div className="reward-rays" aria-hidden />
          <Pic name={find.pic} className="find-pic" />
          <h2>Находка: {find.name.toLowerCase()}!</h2>
          {all && <p className="level-note">Все находки полянки собраны!</p>}
          <p className="glade-count">
            Находки: {Object.keys(getProgress().finds).length} из {FINDS.length}
          </p>
          <div className="glade-actions">
            <button type="button" className="big-btn next-btn glade-again" onClick={again}>
              Ещё!
            </button>
          </div>
        </Modal>
      )}
    </Scene>
  );
}
