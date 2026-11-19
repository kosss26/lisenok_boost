import "@fontsource-variable/nunito";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { detectFormats } from "./game/assets";
import { registerOffline } from "./game/offline";
import { isSpeaking, playingTracks } from "./game/audio";

// choose AVIF/Opus or the WebP/MP3 fallback once, before anything asks for a picture or a sound
await detectFormats();

// read-only probes for the e2e tests: audible music / forest tracks, a voice line playing
Object.assign(window, { __tracks: playingTracks, __speaking: isSpeaking });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Register after the page has loaded. The format check above is awaited at the top level, so the
// "load" event may already have fired by the time this line runs: then register right away.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const register = () => {
    void registerOffline();
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
