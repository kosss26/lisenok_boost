import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-media-error", "data-media-slow", "data-media-loading"],
  });
  return () => observer.disconnect();
};
export function useImageFailures(taskOnly = false) {
  return useSyncExternalStore(
    subscribe,
    () => document.querySelectorAll(`${taskOnly ? ".task " : ""}img[data-media-error]`).length,
    () => 0,
  );
}
export function useSlowImages() {
  return useSyncExternalStore(
    subscribe,
    () => document.querySelectorAll("img[data-media-slow]").length,
    () => 0,
  );
}
export function retryImages() {
  for (const img of document.querySelectorAll<HTMLImageElement>(
    "img[data-retry-src],img[data-media-slow]",
  )) {
    const src = img.dataset.retrySrc ?? img.getAttribute("src");
    if (src) img.src = src;
  }
}
let audioIssue = "";
const listeners = new Set<() => void>();
export function reportAudioIssue() {
  audioIssue = "Голос пока недоступен. Можно открыть текст задания или попробовать звук ещё раз.";
  listeners.forEach((f) => f());
}
export function clearAudioIssue() {
  audioIssue = "";
  listeners.forEach((f) => f());
}
export function useAudioIssue() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => audioIssue,
    () => "",
  );
}

export function useTaskMediaUnavailable() {
  return useSyncExternalStore(
    subscribe,
    () =>
      document.querySelectorAll(".task img[data-media-error],.task img[data-media-loading]").length,
    () => 0,
  );
}
