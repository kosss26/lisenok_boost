import { useEffect } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import {
  pauseAudio,
  resumeAudio,
  say,
  setVolumes,
  startMusic,
  unlockAudio,
  warmSfx,
} from "../game/audio";
import {
  addPlayTime,
  addTenMinutes,
  timeIsUp,
  useProgress,
  getActiveProfile,
} from "../game/progress";
import { SaveNotice } from "../components/save-notice";
import { MediaNotice } from "../components/media-notice";
import { UpdateNotice } from "../components/update-notice";
import { Parents } from "../components/parents";
import { useParentsOpen } from "../components/parents-state";
import { Fox, HoldButton, ParentsButton } from "../components/kit";

/** Root layout: sound unlock on the first tap, pause in the background, play time and rest screen. */
import { useModal } from "../game/modal";

export function Shell() {
  const p = useProgress();
  const parentsOpen = useParentsOpen();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const resting = timeIsUp(p) && !parentsOpen;

  useEffect(() => setVolumes(p.settings.volume), [p.settings.volume]);

  useEffect(() => {
    const first = () => {
      window.removeEventListener("pointerdown", first);
      window.removeEventListener("keydown", first);
      unlockAudio();
      warmSfx();
      if (window.location.pathname !== "/") startMusic();
    };
    window.addEventListener("pointerdown", first, { once: true });
    window.addEventListener("keydown", first, { once: true });
    const vis = () => {
      document.documentElement.toggleAttribute("data-game-hidden", document.hidden);
      if (document.hidden) pauseAudio();
      else resumeAudio();
    };
    vis();
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerdown", first);
      window.removeEventListener("keydown", first);
      document.removeEventListener("visibilitychange", vis);
      document.documentElement.removeAttribute("data-game-hidden");
    };
  }, []);

  // count play time (not on the title screen and not while resting)
  useEffect(() => {
    if (path === "/" || resting || parentsOpen) return;
    const id = window.setInterval(() => {
      if (!document.hidden) addPlayTime(5);
    }, 5000);
    return () => window.clearInterval(id);
  }, [path, resting, parentsOpen]);

  useEffect(() => {
    if (resting) void say(["rest"]);
  }, [resting]);

  return (
    <div className={`app ${parentsOpen || resting ? "is-paused" : ""}`}>
      <div className="game-root" key={getActiveProfile()}>
        <Outlet />
        <MediaNotice />
        <SaveNotice />
        <UpdateNotice />
      </div>
      {resting && <RestScreen />}
      {parentsOpen && <Parents />}
    </div>
  );
}

function RestScreen() {
  const ref = useModal();
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rest"
      role="dialog"
      aria-modal="true"
      aria-label="Пора отдохнуть"
    >
      <ParentsButton />
      <div className="rest-moon" />
      <Fox pose="read" className="rest-fox" />
      <h2>Лисёнок отдыхает</h2>
      <p>На сегодня игра закончилась. Поиграем завтра!</p>
      <HoldButton label="Ещё 10 минут (для взрослых)" className="rest-more" onDone={addTenMinutes}>
        <span>+10 минут</span>
        <small>для взрослых: удерживайте</small>
      </HoldButton>
    </div>
  );
}
