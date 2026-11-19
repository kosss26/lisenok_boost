import { useEffect, useRef } from "react";

/** Focus ownership, inert background, Escape and focus restoration for stacked dialogs. */
export function useModal(onClose?: () => void) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inert: [HTMLElement, boolean][] = [];
    let node: HTMLElement = el;
    while (node.parentElement && node !== document.body) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && sibling instanceof HTMLElement) {
          inert.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      node = node.parentElement;
    }
    const focusable = () =>
      [
        ...el.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, a[href], [tabindex="0"], summary',
        ),
      ].filter((e) => e.getClientRects().length > 0);
    (focusable()[0] ?? el).focus();
    const key = (e: KeyboardEvent) => {
      if (el.inert || el.closest("[inert]")) return;
      if (e.key === "Escape" && close.current) {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key !== "Tab") return;
      const all = focusable(),
        first = all[0],
        last = all.at(-1);
      if (!first) {
        e.preventDefault();
        el.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === first || !el.contains(document.activeElement))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || !el.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("keydown", key);
      inert.forEach(([e, was]) => {
        e.inert = was;
      });
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return root;
}
