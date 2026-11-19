import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Fox, ParentsButton, Pic, Scene } from "../components/kit";
import { say, sfx, startMusic, stopVoice, unlockAudio } from "../game/audio";
import { update, useProgress } from "../game/progress";
import { markGreeted } from "../game/greeting";

import { Setup } from "../components/setup";
import { useModal } from "../game/modal";

export function Title() {
  const p = useProgress();
  const navigate = useNavigate();
  const [story, setStory] = useState(false);
  const [setup, setSetup] = useState(false);
  const startStory = () => {
    setSetup(false);
    setStory(true);
    void say(["intro"]);
  };

  const go = () => {
    stopVoice();
    update((s) => ({ ...s, intro: true }));
    void navigate({ to: "/map" });
  };

  return (
    <Scene bg="bg-clearing" className="title-screen">
      <div className="title-sky" />
      <ParentsButton />
      <div className="title-stars" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Pic key={i} name="star" className={`title-star s${i}`} />
        ))}
      </div>
      <h1 className="title-logo">
        <span>Лисёнок</span>
        <em>и звёзды</em>
      </h1>
      <Fox pose="wave" className="title-fox" />
      {!story && !setup && (
        <button
          type="button"
          className="big-btn play-btn"
          onClick={() => {
            unlockAudio();
            void sfx("tap");
            startMusic();
            if (!p.setupDone) {
              setSetup(true);
            } else if (!p.intro) {
              startStory();
            } else {
              markGreeted(false);
              go();
            }
          }}
        >
          Играть
        </button>
      )}
      {setup && <Setup onClose={() => setSetup(false)} onDone={startStory} />}
      {story && (
        <Story
          onClose={() => {
            stopVoice();
            setStory(false);
          }}
          onNext={() => {
            void sfx("tap");
            markGreeted(true);
            go();
          }}
        />
      )}
    </Scene>
  );
}

function Story({ onClose, onNext }: { onClose: () => void; onNext: () => void }) {
  const ref = useModal(onClose);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="story-card"
      role="dialog"
      aria-modal="true"
      aria-label="История"
    >
      <Pic name="star-face" className="story-star" />
      <p>
        Однажды ночью с неба упали звёзды и рассыпались по всему свету. Лисёнок хочет вернуть их
        домой, на небо. Поможешь ему?
      </p>
      <button type="button" className="big-btn" onClick={onNext}>
        Помогу!
      </button>
    </div>
  );
}
