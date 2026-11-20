/**
 * Drag and drop with magnetic snapping, for pieces, numbers, pictures and counted objects.
 * One item is dragged at a time (by a finger or the mouse). Near a drop zone the item is pulled
 * toward the zone's target and the zone lights up; let go there and onDrop runs. Let go elsewhere
 * and the item springs back. A plain tap (no movement) stays a normal click, so tapping — and the
 * keyboard — keep working as the accessible way to answer.
 */
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { vibrate } from "./haptics";

export type Zone = {
  /** the area that accepts a drop (enlarged by SLACK px on every side) */
  area: HTMLElement | null;
  /** where the item snaps to (defaults to the area) */
  target?: HTMLElement | null;
  /** false: no pull — the item lands exactly where it is let go (the sky) */
  magnet?: boolean;
};
type Active = { key: string; dx: number; dy: number; near: number | null };

const START = 8; // px of movement before a press becomes a drag
const SLACK = 34; // a drop a little outside the zone still counts
const MAGNET = 90; // px from the target's centre where the pull starts
const PULL = 0.55; // how strongly the item is pulled at the target itself

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

export function useDrag<K extends string | number>({
  zones,
  onDrop,
  onNear,
  disabled = false,
}: {
  zones: () => Zone[];
  /** dropped on zone `zone`; `rect` is where the item is on screen now (to fly on from there) */
  onDrop: (key: K, zone: number, rect: DOMRect) => void;
  /** the item came close to a zone (once per approach): a soft sound, a buzz */
  onNear?: (zone: number) => void;
  disabled?: boolean;
}) {
  const [active, setActive] = useState<Active | null>(null);
  const press = useRef<{
    key: K;
    id: number;
    x: number;
    y: number;
    base: DOMRect;
    el: HTMLElement;
    moved: boolean;
    near: number | null;
  } | null>(null);
  const justDragged = useRef(false);

  const locate = (dx: number, dy: number, base: DOMRect) => {
    const c = { x: center(base).x + dx, y: center(base).y + dy };
    let best: { i: number; d: number; t: { x: number; y: number }; m: boolean } | null = null;
    zones().forEach((z, i) => {
      if (!z.area) return;
      const a = z.area.getBoundingClientRect();
      const t = center((z.target ?? z.area).getBoundingClientRect());
      const d = Math.hypot(t.x - c.x, t.y - c.y);
      const inside =
        c.x > a.left - SLACK &&
        c.x < a.right + SLACK &&
        c.y > a.top - SLACK &&
        c.y < a.bottom + SLACK;
      const m = z.magnet !== false;
      if ((inside || (m && d < MAGNET)) && (!best || d < best.d)) best = { i, d, t, m };
    });
    if (!best) return { dx, dy, near: null };
    const b = best as { i: number; d: number; t: { x: number; y: number }; m: boolean };
    // magnetic pull: stronger the closer the item is
    const k = b.m ? PULL * Math.max(0, 1 - b.d / (MAGNET * 1.6)) : 0;
    return { dx: dx + (b.t.x - c.x) * k, dy: dy + (b.t.y - c.y) * k, near: b.i };
  };

  const finish = (drop: boolean) => {
    const p = press.current;
    press.current = null;
    if (!p || !p.moved) return;
    justDragged.current = true;
    window.setTimeout(() => (justDragged.current = false), 0);
    if (drop && p.near !== null) {
      const r = p.el.getBoundingClientRect();
      onDrop(p.key, p.near, r);
    }
    setActive(null);
  };

  const bind = (key: K) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      press.current = {
        key,
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        base: e.currentTarget.getBoundingClientRect(),
        el: e.currentTarget,
        moved: false,
        near: null,
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const p = press.current;
      if (!p || p.id !== e.pointerId || p.key !== key) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved) {
        if (Math.hypot(dx, dy) < START) return;
        p.moved = true;
        try {
          p.el.setPointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }
      const at = locate(dx, dy, p.base);
      if (at.near !== null && at.near !== p.near) {
        vibrate(8); // a tiny "click" as the magnet catches the item
        onNear?.(at.near);
      }
      p.near = at.near;
      setActive({ key: String(key), ...at });
    },
    onPointerUp: () => finish(true),
    onPointerCancel: () => finish(false),
    onLostPointerCapture: () => finish(true),
    /** a drag ends with a click on the same element: that click is not a tap */
    onClickCapture: (e: { preventDefault(): void; stopPropagation(): void }) => {
      if (justDragged.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });

  const style = (key: K): CSSProperties | undefined =>
    active && active.key === String(key)
      ? {
          transform: `translate(${active.dx}px, ${active.dy}px) scale(1.06)`,
          transition: "none",
          zIndex: 30,
          position: "relative",
        }
      : undefined;

  return {
    bind,
    style,
    dragging: active ? active.key : null,
    near: active?.near ?? null,
  };
}
