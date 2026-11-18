/**
 * A picture that comes alive (src/game/live.ts). The <img> stays in the layout, so the size,
 * the CSS animations and the shadow of the element are as before; the canvas is drawn over it,
 * a bit bigger (a wagging tail or a waving paw may go past the picture's edge). Without WebGL,
 * or with «reduce motion», it is just the picture.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Rig } from "../content/fox-rig";
import { art } from "../game/assets";
import { canLive, LiveSprite, setRunning } from "../game/live";

/** how far the canvas reaches past the picture: % of its width (sides) and height (top, bottom) */
const PAD = { x: 14, top: 8, bottom: 3 };

export function LivePic({
  name,
  rig,
  className = "",
  alt = "",
}: {
  name: string;
  rig: Rig;
  className?: string;
  alt?: string;
}) {
  const box = useRef<HTMLSpanElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv || !canLive()) return;
    let sprite: LiveSprite;
    try {
      sprite = new LiveSprite(cv, rig, () => setOn(true));
    } catch {
      return;
    }
    const size = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const px = (w * PAD.x) / 100;
      const top = (h * PAD.top) / 100;
      const bottom = (h * PAD.bottom) / 100;
      sprite.resize(w + 2 * px, h + top + bottom, { x: px, y: top, w, h });
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);
    size();
    // draw every frame only while it is on screen
    const io = new IntersectionObserver(([e]) => setRunning(sprite, e.isIntersecting));
    io.observe(el);
    cv.addEventListener("webglcontextlost", () => {
      setRunning(sprite, false);
      setOn(false);
    });
    sprite.load(art(name));
    return () => {
      ro.disconnect();
      io.disconnect();
      setRunning(sprite, false);
      sprite.dispose();
    };
  }, [name, rig]);

  return (
    <span
      ref={box}
      className={`live-pic ${on ? "is-live" : ""} ${className}`}
      role="img"
      aria-label={alt || undefined}
      style={{ aspectRatio: `${rig.size[0]} / ${rig.size[1]}` }}
    >
      <img className="live-pic-img" src={art(name)} alt="" draggable={false} />
      <canvas
        ref={canvas}
        className="live-pic-gl"
        aria-hidden
        style={
          {
            // a canvas is a replaced element: it needs its size, not just left/right/top/bottom
            left: `-${PAD.x}%`,
            top: `-${PAD.top}%`,
            width: `${100 + 2 * PAD.x}%`,
            height: `${100 + PAD.top + PAD.bottom}%`,
          } as CSSProperties
        }
      />
    </span>
  );
}
