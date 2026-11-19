import { useCallback, useSyncExternalStore, type RefObject } from "react";

/** Native animated WebP must switch to its registered poster to stop playback. */
export function useMotionAllowed(ref: RefObject<HTMLElement | null>, enabled = true) {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!enabled) return () => {};
      const preference = matchMedia("(prefers-reduced-motion: reduce)");
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, {
        subtree: true,
        attributes: true,
        attributeFilter: ["inert"],
      });
      document.addEventListener("visibilitychange", notify);
      preference.addEventListener("change", notify);
      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", notify);
        preference.removeEventListener("change", notify);
      };
    },
    [enabled],
  );
  const snapshot = useCallback(
    () =>
      enabled &&
      !document.hidden &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !ref.current?.closest("[inert]"),
    [enabled, ref],
  );
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export const animatedFoxPose = (name: string) => name === "fox-wave" || name === "fox-walk";
export const motionArt = (name: string, allowed: boolean) =>
  animatedFoxPose(name) ? `${name}-${allowed ? "motion" : "still"}` : name;
