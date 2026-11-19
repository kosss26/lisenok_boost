import { useEffect, useState } from "react";
import { art } from "../game/assets";

/** Decode a new pose before fading it in; keep the previous pose until it is ready. */
export function PoseSprite({ name, className = "" }: { name: string; className?: string }) {
  const [layers, setLayers] = useState<{ shown: string; previous: string | null }>({
    shown: name,
    previous: null,
  });
  useEffect(() => {
    let alive = true;
    const image = new Image();
    const show = () => {
      if (alive)
        setLayers((old) => (old.shown === name ? old : { shown: name, previous: old.shown }));
    };
    image.onload = () => {
      void image.decode().then(show, show);
    };
    image.src = art(name);
    return () => {
      alive = false;
      image.onload = null;
    };
  }, [name]);
  useEffect(() => {
    const timer = window.setTimeout(() => setLayers((old) => ({ ...old, previous: null })), 260);
    return () => window.clearTimeout(timer);
  }, [layers.shown]);
  return (
    <span className={`pose-sprite ${className}`} aria-hidden="true">
      {layers.previous && (
        <img
          key={`old-${layers.previous}`}
          src={art(layers.previous)}
          className="pose-layer pose-out"
          alt=""
          draggable={false}
        />
      )}
      <img
        key={layers.shown}
        src={art(layers.shown)}
        className="pose-layer pose-in"
        alt=""
        draggable={false}
      />
    </span>
  );
}
