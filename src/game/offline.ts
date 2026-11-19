import { useSyncExternalStore } from "react";
import { swUrl } from "./assets";
let waiting: ServiceWorker | null = null;
let error = "";
let requested = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
export const useUpdateReady = () =>
  useSyncExternalStore(
    subscribe,
    () => Boolean(waiting),
    () => false,
  );
export const useOfflineError = () =>
  useSyncExternalStore(
    subscribe,
    () => error,
    () => "",
  );
export function applyUpdate() {
  if (waiting) {
    requested = true;
    waiting.postMessage("activate-update");
  }
}
export async function registerOffline() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (requested) window.location.reload();
  });
  try {
    const r = await navigator.serviceWorker.register(swUrl());
    const check = () => {
      waiting = r.active && navigator.serviceWorker.controller ? r.waiting : null;
      emit();
    };
    check();
    navigator.serviceWorker.addEventListener("controllerchange", check);
    r.addEventListener("updatefound", () => {
      r.installing?.addEventListener("statechange", check);
    });
    void navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage("fill"));
  } catch {
    error =
      "Не удалось подготовить игру без интернета. Подключение можно проверить и открыть игру ещё раз.";
    emit();
  }
}
