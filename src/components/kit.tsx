/** Small shared pieces: pictures, the grown-up hold button, top bar, the fox. */
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { useNavigate } from "@tanstack/react-router";
import { art } from "../game/assets";
import { sfx } from "../game/audio";
import { openParents } from "./parents-state";
import { MediaImage } from "./media-image";
import { IconBack, IconGear } from "./icons";
import { motionArt, animatedFoxPose, useMotionAllowed } from "../game/motion";

export function Pic({
  name,
  className,
  alt = "",
  style,
  ref,
}: {
  name: string;
  ref?: Ref<HTMLImageElement>;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}) {
  return (
    <MediaImage
      ref={ref}
      className={className}
      src={art(name)}
      alt={alt}
      draggable={false}
      style={style}
    />
  );
}

export type FoxPose = "wave" | "walk" | "jump" | "think" | "cheer" | "read" | "point";
export function Fox({ pose, className = "" }: { pose: FoxPose; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const name = `fox-${pose}`;
  const allowed = useMotionAllowed(ref, animatedFoxPose(name));
  return (
    <Pic
      ref={ref}
      name={motionArt(name, allowed)}
      className={`fox ${className} ${animatedFoxPose(name) ? "has-frame-motion" : ""}`}
      alt="Лисёнок"
    />
  );
}

/** Grown-up button: does something only after holding it for 2.5 seconds. */
export function HoldButton({
  onDone,
  className = "",
  label,
  children,
}: {
  onDone: () => void;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const stop = () => {
    setHolding(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    if (timer.current !== null) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      stop();
      onDone();
    }, 2500);
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={label}
      className={`hold ${holding ? "is-holding" : ""} ${className}`}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          start();
        }
        if (e.key === "Escape") stop();
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          stop();
        }
      }}
      onBlur={stop}
      onPointerDown={(e) => {
        if (e.button === 0) {
          e.preventDefault();
          e.currentTarget.focus();
          start();
        }
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="hold-ring" viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="17" />
      </svg>
      {children}
    </button>
  );
}

export function ParentsButton() {
  return (
    <HoldButton label="Для взрослых: удерживайте" className="parents-btn" onDone={openParents}>
      <IconGear className="parents-icon" />
    </HoldButton>
  );
}

export function BackButton({ to, label = "Назад" }: { to: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="round-btn back-btn"
      aria-label={label}
      onClick={() => {
        void sfx("tap");
        void navigate({ to });
      }}
    >
      <IconBack />
    </button>
  );
}

export function StarCount({ n, total }: { n: number; total: number }) {
  return (
    <div className="star-count" aria-label={`Звёзды: ${n} из ${total}`}>
      <Pic name="star" className="star-count-icon" />
      <span>
        {n}
        <small>/{total}</small>
      </span>
    </div>
  );
}

/**
 * Background picture that covers the screen like `object-fit: cover`. `boxed` children are placed
 * in the picture's own coordinates (left/top in % of the 9:16 picture); other children float above.
 */
export function Scene({
  bg,
  boxed,
  children,
  className = "",
}: {
  bg: string;
  boxed?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`scene ${className}`}>
      <div className="scene-box">
        <img className="scene-bg" src={art(bg)} alt="" draggable={false} />
        {boxed}
      </div>
      <div className="scene-layer">{children}</div>
    </div>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="speaker-icon">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" className="waves" />
    </svg>
  );
}
