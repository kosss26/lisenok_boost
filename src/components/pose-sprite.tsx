import { useEffect, useState, useRef } from "react";
import { MediaImage } from "./media-image";
import { art } from "../game/assets";
import { motionArt, animatedFoxPose, useMotionAllowed } from "../game/motion";

/** Decode a new pose before fading it in; keep the previous pose until it is ready. */
export function PoseSprite({
  name,
  className = "",
  imageClassName = "",
  label,
}: {
  name: string;
  className?: string;
  imageClassName?: string;
  label?: string;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const allowed = useMotionAllowed(root, animatedFoxPose(name));
  const target = motionArt(name, allowed);
  const [layers, setLayers] = useState<{ shown: string; previous: string | null }>({
    shown: target,
    previous: null,
  });
  useEffect(() => {
    let alive = true;
    const image = new Image();
    const show = () => {
      if (alive)
        setLayers((old) => (old.shown === target ? old : { shown: target, previous: old.shown }));
    };
    image.onload = () => {
      void image.decode().then(show, show);
    };
    image.src = art(target);
    return () => {
      alive = false;
      image.onload = null;
    };
  }, [target]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLayers((old) => ({ ...old, previous: null })), 260);
    return () => window.clearTimeout(timer);
  }, [layers.shown]);
  return (
    <span
      ref={root}
      className={`pose-sprite ${className} ${animatedFoxPose(name) ? "has-frame-motion" : ""}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {layers.previous && (
        <MediaImage
          key={`old-${layers.previous}`}
          src={art(layers.previous)}
          className="pose-layer pose-out"
          alt=""
          draggable={false}
        />
      )}
      <MediaImage
        key={layers.shown}
        src={art(layers.shown)}
        className={`pose-layer pose-in ${imageClassName}`}
        alt=""
        draggable={false}
      />
    </span>
  );
}
