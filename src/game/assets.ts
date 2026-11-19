import { ASSET_VERSIONS } from "./asset-versions";

/**
 * Modern formats: the production build ships AVIF pictures and Opus (Ogg) sound next to the
 * WebP / MP3 originals (tools/encode-media.py). The browser picks once, before the first screen.
 */
export const formats = { avif: false, opus: false };
/** set when this browser claimed Opus but could not decode it (audio.ts): MP3 on the next visits too,
 * and the service worker (registered as sw.js?aud=mp3) then caches the MP3 files for offline play */
export const NO_OPUS = "lisenok:no-opus";

export async function detectFormats() {
  if (!import.meta.env.PROD) return;
  formats.opus = new Audio().canPlayType('audio/ogg; codecs="opus"') !== "";
  try {
    if (localStorage.getItem(NO_OPUS)) formats.opus = false;
  } catch {
    /* storage may be disabled */
  }
  formats.avif = await new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0);
    img.onerror = () => resolve(false);
    img.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAcAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  });
}

/** "/voice/hi.mp3" → "/voice/hi.mp3?v=1a2b3c4d" (cache-busting for the immutable media cache). */
export function asset(path: string) {
  const v = ASSET_VERSIONS[path];
  return v ? `${path}?v=${v}` : path;
}
const sound = (path: string) => asset(formats.opus ? path.replace(/\.mp3$/, ".ogg") : path);
export const art = (name: string) =>
  asset(formats.avif && !name.endsWith("-motion") ? `/art/${name}.avif` : `/art/${name}.webp`);
export const voiceUrl = (key: string) => sound(`/voice/${key}.mp3`);
export const sfxUrl = (name: string) => sound(`/sfx/${name}.mp3`);
export type Scene = "map" | "tasks" | "celebrate";
export const musicUrl = (name: Scene | "forest") => sound(`/music/${name}.mp3`);
/** which formats the service worker should precache (it cannot test them itself) */
export const swUrl = () =>
  `/sw.js?img=${formats.avif ? "avif" : "webp"}&aud=${formats.opus ? "ogg" : "mp3"}`;
