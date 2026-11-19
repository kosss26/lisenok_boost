/**
 * Sound: voice lines, effects, music and forest sounds through one Web Audio graph with four
 * volume buses (voice / sounds / music / forest — set in the parents' corner). Voice lines play as sequences
 * ("Найди букву" + "эм"); a new sequence cuts the previous one. Music ducks under the voice.
 */
import { NO_OPUS, formats, musicUrl, sfxUrl, voiceUrl } from "./assets";
import type { Scene } from "./assets";

import { reportAudioIssue, clearAudioIssue } from "./media";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voiceBus: GainNode | null = null;
let soundBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let forestBus: GainNode | null = null;
export type Volumes = { voice: number; sounds: number; music: number; forest: number };
const volumes: Volumes = { voice: 1, sounds: 0.8, music: 0.5, forest: 0.6 };
const raw = new Map<string, Promise<ArrayBuffer>>();
const buffers = new Map<string, AudioBuffer>();
const decoding = new Map<string, Promise<AudioBuffer | null>>();
let paused = false;
let voiceNode: AudioBufferSourceNode | null = null;
let sequence = 0;
const MUSIC_BASE = 0.35;
const FOREST_BASE = 0.5;

function context() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.connect(ctx.destination);
    voiceBus = ctx.createGain();
    soundBus = ctx.createGain();
    musicBus = ctx.createGain();
    voiceBus.gain.value = volumes.voice;
    soundBus.gain.value = volumes.sounds;
    musicBus.gain.value = MUSIC_BASE * volumes.music;
    forestBus = ctx.createGain();
    forestBus.gain.value = FOREST_BASE * volumes.forest;
    voiceBus.connect(master);
    soundBus.connect(master);
    musicBus.connect(master);
    forestBus.connect(master);
  }
  if (ctx.state === "suspended" && !paused) void ctx.resume();
  return ctx;
}

export function setVolumes(next: Partial<Volumes>) {
  Object.assign(volumes, next);
  if (voiceBus) voiceBus.gain.value = volumes.voice;
  if (soundBus) soundBus.gain.value = volumes.sounds;
  if (musicBus) musicBus.gain.value = MUSIC_BASE * volumes.music;
  if (forestBus) forestBus.gain.value = FOREST_BASE * volumes.forest;
  if (musicWanted) startMusic();
}

// ---------- iPhone silent switch: play as media (iOS 17+) or keep a silent <audio> running ----------
let silentEl: HTMLAudioElement | null = null;
function silentWavUrl() {
  const rate = 8000;
  const samples = rate / 2;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const text = (o: number, t: string) =>
    [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
const isAppleTouch = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
function playThroughSilentSwitch() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) {
    try {
      session.type = "playback";
      return;
    } catch {
      /* fall back */
    }
  }
  if (!isAppleTouch()) return;
  if (!silentEl) {
    silentEl = document.createElement("audio");
    silentEl.src = silentWavUrl();
    silentEl.loop = true;
    silentEl.setAttribute("playsinline", "");
  }
  if (silentEl.paused && !paused) void silentEl.play().catch(() => {});
}

/** Call from a tap: opens the audio context (browsers allow sound only after a gesture). */
export function unlockAudio() {
  playThroughSilentSwitch();
  const audio = context();
  const src = audio.createBufferSource();
  src.buffer = audio.createBuffer(1, 1, audio.sampleRate);
  src.connect(audio.destination);
  src.start();
}
export const audioReady = () => Boolean(ctx && ctx.state === "running");

// ---------- loading ----------
function bytes(url: string) {
  let pending = raw.get(url);
  if (!pending) {
    pending = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      return res.arrayBuffer();
    });
    pending.catch(() => raw.delete(url));
    raw.set(url, pending);
  }
  return pending;
}
function decode(url: string): Promise<AudioBuffer | null> {
  const ready = buffers.get(url);
  if (ready) return Promise.resolve(ready);
  let p = decoding.get(url);
  if (!p) {
    p = bytes(url)
      .then((data) => context().decodeAudioData(data.slice(0)))
      .then((b) => {
        if (/\/voice\//.test(url)) clearAudioIssue();
        buffers.set(url, b);
        return b;
      })
      .catch(() => {
        decoding.delete(url);
        // a browser that claims Opus but cannot decode it (some Safari versions): MP3 from now on
        if (/\.ogg(\?|$)/.test(url)) {
          formats.opus = false;
          try {
            localStorage.setItem(NO_OPUS, "1");
          } catch {
            /* private mode: MP3 for this visit only */
          }
          return decode(url.replace(/\.ogg(\?|$)/, ".mp3$1"));
        }
        if (/\/voice\//.test(url)) reportAudioIssue();
        return null; // a missing clip never blocks the game
      });
    decoding.set(url, p);
  }
  return p;
}
/** Start downloading (allowed before the first tap). */
export function prefetchVoice(keys: string[]) {
  for (const k of keys) void bytes(voiceUrl(k)).catch(() => {});
}

// ---------- voice ----------
function stopVoiceNode() {
  if (!voiceNode) return;
  try {
    voiceNode.stop();
  } catch {
    /* ended */
  }
  voiceNode.disconnect();
  voiceNode = null;
}
export function stopVoice() {
  sequence++;
  stopVoiceNode();
  duck(false);
}
let speakingListeners = new Set<(on: boolean) => void>();
export function onSpeaking(fn: (on: boolean) => void) {
  speakingListeners.add(fn);
  return () => {
    speakingListeners = new Set([...speakingListeners].filter((f) => f !== fn));
  };
}
let speakingNow = false;
/** a voice line is playing right now (a tickle giggle then waits its turn: it never cuts a task) */
export const isSpeaking = () => speakingNow;
function duck(on: boolean) {
  speakingNow = on;
  speakingListeners.forEach((f) => f(on));
  if (!ctx || !musicBus) return;
  const target = MUSIC_BASE * volumes.music * (on ? 0.35 : 1);
  musicBus.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
}

/**
 * Says voice lines one after another. Resolves `true` when all were played, `false` when
 * something else cut it off. Small gap between parts so "три плюс два" sounds natural.
 */
export async function say(keys: string[], gap = 0.12): Promise<boolean> {
  const my = ++sequence;
  stopVoiceNode();
  if (typeof window === "undefined" || !keys.length) return true;
  const list = await Promise.all(keys.map((k) => decode(voiceUrl(k))));
  if (my !== sequence) return false;
  const audio = context();
  duck(true);
  for (const buffer of list) {
    if (!buffer) continue;
    if (my !== sequence) return false;
    await new Promise<void>((resolve) => {
      const src = audio.createBufferSource();
      src.buffer = buffer;
      src.connect(voiceBus ?? audio.destination);
      voiceNode = src;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      src.onended = finish;
      // safety net: never hang if `ended` does not fire (suspended context, test browsers)
      const timer = setTimeout(finish, buffer.duration * 1000 + 1500);
      src.start();
    });
    if (my !== sequence) return false;
    await new Promise((r) => setTimeout(r, gap * 1000));
  }
  if (my === sequence) {
    voiceNode = null;
    duck(false);
  }
  return my === sequence;
}

// ---------- effects ----------
export type Sfx = "tap" | "pick" | "right" | "wrong" | "star" | "fanfare" | "step";
export async function sfx(name: Sfx, gain = 1) {
  if (typeof window === "undefined") return;
  const buffer = await decode(sfxUrl(name));
  if (!buffer || paused) return;
  const audio = context();
  const src = audio.createBufferSource();
  const g = audio.createGain();
  g.gain.value = gain;
  src.buffer = buffer;
  src.connect(g);
  g.connect(soundBus ?? audio.destination);
  src.start();
  src.onended = () => g.disconnect();
}
export function warmSfx() {
  for (const s of ["tap", "pick", "right", "wrong", "star", "fanfare", "step"] as Sfx[])
    void decode(sfxUrl(s));
}

// ---------- music and forest sounds ----------
// Three tracks (map / tasks / celebration, see assets/SOUND-CREDITS.md) and a looped forest layer
// (birds, wind, stream), each an <audio> element routed through its own gain into the music or
// forest bus. Changing the scene cross-fades the tracks; the forest layer plays under all of them.
type Track = { el: HTMLAudioElement; gain: GainNode | null; on: boolean; timer?: number };
const tracks = new Map<string, Track>();
let scene: Scene = "map";
let musicWanted = false;
const FADE = 0.6;

function track(name: Scene | "forest"): Track {
  let t = tracks.get(name);
  if (!t) {
    const audio = context();
    const el = new Audio(musicUrl(name));
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    let gain: GainNode | null = null;
    try {
      gain = audio.createGain();
      gain.gain.value = 0;
      audio.createMediaElementSource(el).connect(gain);
      gain.connect((name === "forest" ? forestBus : musicBus) ?? audio.destination);
    } catch {
      gain = null;
    }
    t = { el, gain, on: false };
    tracks.set(name, t);
  }
  return t;
}
/** A paused element some engines refuse to play again (WebKit on Linux: NotSupportedError):
 * replace it with a fresh one that starts at the same place. */
function revive(name: string, old: Track, fallbackVolume: number) {
  const at = old.el.currentTime;
  old.el.removeAttribute("src");
  old.gain?.disconnect();
  tracks.delete(name);
  const t = track(name as Scene | "forest");
  try {
    t.el.currentTime = at;
  } catch {
    /* not seekable yet */
  }
  fade(t, true, fallbackVolume, true);
}
function fade(t: Track, on: boolean, fallbackVolume: number, retried = false) {
  if (t.gain && ctx) {
    t.gain.gain.cancelScheduledValues(ctx.currentTime);
    t.gain.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, FADE / 3);
  } else t.el.volume = on ? fallbackVolume : 0;
  t.on = on;
  window.clearTimeout(t.timer);
  if (on) {
    if (t.el.paused)
      void t.el.play().catch((e: unknown) => {
        (window as { __musicErrors?: string[] }).__musicErrors?.push(String(e));
        const name = [...tracks.entries()].find(([, x]) => x === t)?.[0];
        if (!retried && t.on && name && (e as Error)?.name === "NotSupportedError")
          revive(name, t, fallbackVolume);
      });
  } else if (!t.el.paused) {
    // pause once the fade is over, unless the track was wanted again meanwhile
    t.timer = window.setTimeout(() => t.on || t.el.pause(), FADE * 1500);
  }
}
/** Start (or keep) the music for the current scene and the forest layer. */
export function startMusic() {
  musicWanted = true;
  if (typeof window === "undefined" || paused) return;
  context();
  for (const name of ["map", "tasks", "celebrate"] as Scene[]) {
    const on = name === scene && volumes.music > 0;
    if (on || tracks.has(name)) fade(track(name), on, MUSIC_BASE * volumes.music);
  }
  const forestOn = volumes.forest > 0;
  if (forestOn || tracks.has("forest"))
    fade(track("forest"), forestOn, FOREST_BASE * volumes.forest);
}
/** Which music fits the screen: the forest map, a task or a celebration. */
export function setScene(next: Scene) {
  if (next === scene) return;
  scene = next;
  if (musicWanted) startMusic();
}
export function stopMusic() {
  musicWanted = false;
  for (const t of tracks.values()) t.el.pause();
}
/** for tests: which tracks are audible now */
export function playingTracks() {
  return [...tracks.entries()]
    .filter(
      ([, t]) =>
        !t.el.paused && (t.gain ? t.gain.gain.value > 0.01 || t.el.volume > 0 : t.el.volume > 0),
    )
    .map(([name]) => name);
}

// ---------- app hidden: freeze everything ----------
let musicWasPlaying: HTMLAudioElement[] = [];
export function pauseAudio() {
  if (paused) return;
  paused = true;
  stopVoice();
  if (ctx && ctx.state === "running") void ctx.suspend();
  musicWasPlaying = [...tracks.values()].map((t) => t.el).filter((el) => !el.paused);
  for (const el of musicWasPlaying) el.pause();
  silentEl?.pause();
}
export function resumeAudio() {
  paused = false;
  if (ctx && ctx.state !== "running") void ctx.resume();
  if (silentEl) void silentEl.play().catch(() => {});
  for (const el of musicWasPlaying) void el.play().catch(() => {});
  musicWasPlaying = [];
}
