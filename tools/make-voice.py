#!/usr/bin/env python3
"""Voice lines with Yandex SpeechKit (API v3): assets/voice-lines.json -> public/voice/<key>.mp3
(+ the Opus copy in tmp/media-cache/voice/, encoded from the same 48 kHz master).

  YANDEX_API_KEY=... python3 tools/make-voice.py all|missing|<key> [<key>...] [--dry] [--speed=0.9]
                                                 [--text=<marked text for the one key>]
                                                 [--reprocess]  (clean the saved masters again, free)

Casting (assets/voice-cast.json, written by `npm run voice:list`): narrator = marina (friendly),
the fox = masha (good), forest residents = alena / lera / zahar with a pitch shift (src/content/forest.ts).
Stress: every word of two or more syllables without «ё» gets its stress mark from assets/voice-stress.json
(checked by hand, see assets/VOICE-STRESS.md); an unknown word stops the run. assets/voice-yandex.json
replaces the text and/or speed of single lines (retakes chosen by tools/voice-retake.py). Masters (48 kHz WAV) and the request log stay in tmp/voice-master/.
Clean-up: trim silence, 8 ms fade-in / 25 ms fade-out, -16 LUFS in the MP3 (-15.3 measured on the 48 kHz
master), a 5 ms look-ahead limiter at -2 dBFS (at most 6 dB),
60 ms of silence at the end; MP3 24 kHz 48 kbit/s, Opus 32 kbit/s."""
import json, os, re, subprocess, sys, time
import numpy as np, pyloudnorm
from scipy.ndimage import minimum_filter1d, uniform_filter1d

sys.path.insert(0, os.path.dirname(__file__))
import yandex_tts

LINES = json.load(open("assets/voice-lines.json", encoding="utf-8"))
CAST = json.load(open("assets/voice-cast.json", encoding="utf-8"))
LEX = json.load(open("assets/voice-stress.json", encoding="utf-8"))
OVERRIDE = json.load(open("assets/voice-yandex.json", encoding="utf-8"))
MASTER = "tmp/voice-master"
LOG = f"{MASTER}/requests.jsonl"
NARRATOR = {"voice": "marina", "role": "friendly", "pitch": 0}
FOX = {"voice": "masha", "role": "good", "pitch": 0}
VOWELS = set("аеёиоуыэюя")
SINGLE = re.compile(r"^(letter|syl|n|w)-")
# Yandex says a lone «ы» as «и» (formants of «и», also in «Буква Ы» and with phoneme markup), and the «ы»
# cut out of marina's «мы» glides into «и» too: this clip stays the earlier Silero take (verified «ы»).
KEEP = {"letter-y"}


def mark_word(w: str, unknown: set) -> str:
    low = w.lower()
    if "+" in w or "ё" in low or sum(c in VOWELS for c in low) < 2:
        return w
    m = LEX.get(low)
    if not m:
        unknown.add(low)
        return w
    i = m.index("+")
    return w[:i] + "+" + w[i:]


def marked(key: str, unknown: set) -> str:
    o = OVERRIDE.get(key)
    text = (o.get("text") if isinstance(o, dict) else o) or LINES[key].replace("+", "")
    text = re.sub(r"[+А-Яа-яЁё]+", lambda m: mark_word(m.group(0), unknown), text)
    # a lone syllable or short word with «е» is otherwise often read with «ё» («че» -> «чё», «кеп» -> «кёп»,
    # F2 of the vowel ~1100 Hz instead of ~2400): the stress mark pins it to «е»
    if SINGLE.match(key) and "+" not in text and sum(c in VOWELS for c in text.lower()) == 1:
        text = re.sub(r"([еЕ])", r"+\1", text, count=1)
    return text


def cast(key: str) -> dict:
    c = CAST.get(key)
    return FOX if c == "fox" else c or NARRATOR


def speed_for(key: str, voice: str) -> float:
    o = OVERRIDE.get(key)
    if isinstance(o, dict) and o.get("speed"):
        return o["speed"]
    if SINGLE.match(key):
        return 0.9
    return 0.9 if voice == "zahar" else 0.95


def clean(pcm: bytes) -> np.ndarray:
    x = np.frombuffer(pcm, np.int16).astype(np.float64) / 32768
    sr = yandex_tts.RATE
    hop = sr // 200  # 5 ms frames
    n = len(x) // hop
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    thr = max(db.max() - 42, -60)
    on = np.where(db > thr)[0]
    a = max(0, on[0] * hop - int(0.025 * sr))
    b = min(len(x), (on[-1] + 1) * hop + int(0.06 * sr))
    y = x[a:b].copy()
    fi, fo = int(0.008 * sr), int(0.025 * sr)
    y[:fi] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi))
    y[-fo:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo))
    return np.concatenate([np.zeros(int(0.025 * sr)), level(y, sr), np.zeros(int(0.06 * sr))])


def loudness(y: np.ndarray, sr: int) -> float:
    # short clips are measured looped: the meter needs 400 ms blocks
    probe = np.tile(y, int(np.ceil(1.5 * sr / len(y)))) if len(y) < 1.5 * sr else y
    return pyloudnorm.Meter(sr).integrated_loudness(probe)


def limit(y: np.ndarray, sr: int, ceiling: float) -> np.ndarray:
    """look-ahead peak limiter (5 ms): smooth gain, never above the ceiling"""
    n = int(0.005 * sr)
    g = np.minimum(1.0, ceiling / np.maximum(np.abs(y), 1e-9))
    g = minimum_filter1d(g, 2 * n + 1, mode="nearest")
    g = uniform_filter1d(g, n, mode="nearest")
    return y * g


def level(y: np.ndarray, sr: int, target: float = -15.3, ceiling_db: float = -2.0) -> np.ndarray:
    """gain to the target loudness; peaks above the ceiling go through the limiter (at most 6 dB)"""
    ceiling = 10 ** (ceiling_db / 20)
    out = y
    for _ in range(3):
        gain = 10 ** ((target - loudness(out, sr)) / 20)
        out = out * gain
        over = np.abs(out).max() / ceiling
        if over > 2.0:  # more than 6 dB of limiting would squash the voice: lower the level instead
            out = out / (over / 2.0)
        out = limit(out, sr, ceiling)
        if abs(loudness(out, sr) - target) < 0.3:
            break
    return out


def encode(key: str, y: np.ndarray) -> None:
    wav = f"{MASTER}/{key}.clean.f32"
    y.astype(np.float32).tofile(wav)
    src = ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(yandex_tts.RATE), "-ac", "1", "-i", wav]
    subprocess.run(src + ["-af", "aresample=24000:resampler=soxr:precision=28", "-c:a", "libmp3lame",
                          "-b:a", "48k", f"public/voice/{key}.mp3"], check=True)
    os.makedirs("tmp/media-cache/voice", exist_ok=True)
    subprocess.run(src + ["-c:a", "libopus", "-b:a", "32k", "-application", "voip",
                          f"tmp/media-cache/voice/{key}.ogg"], check=True)
    os.remove(wav)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) if "=" in a else (a[2:], "1") for a in sys.argv[1:] if a.startswith("--"))
    if not args:
        sys.exit(__doc__)
    keys = list(LINES) if args[0] in ("all", "missing") else args
    if args[0] in ("all", "missing"):
        keys = [k for k in keys if k not in KEEP]
    if args[0] == "missing":
        keys = [k for k in keys if not os.path.exists(f"public/voice/{k}.mp3")]
    bad = [k for k in keys if k not in LINES]
    if bad:
        sys.exit(f"unknown keys: {bad}")
    unknown: set = set()
    texts = {k: opts.get("text") or marked(k, unknown) for k in keys}
    if unknown:
        sys.exit("words without a stress entry in assets/voice-stress.json: " + ", ".join(sorted(unknown)))
    os.makedirs(MASTER, exist_ok=True)
    spent = 0.0
    for i, k in enumerate(keys):
        c = cast(k)
        speed = float(opts.get("speed") or speed_for(k, c["voice"]))
        if "dry" in opts:
            print(k, c["voice"], c["pitch"], speed, texts[k])
            continue
        if "reprocess" in opts:  # clean up the saved master again, no request
            encode(k, clean(open(f"{MASTER}/{k}.raw", "rb").read()))
            continue
        pcm = yandex_tts.synth(texts[k], c["voice"], c["role"], speed, c["pitch"])
        cost = yandex_tts.units(texts[k]) * yandex_tts.PRICE_PER_UNIT
        spent += cost
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps({"key": k, "text": texts[k], **c, "speed": speed, "rub": cost,
                                "t": time.strftime("%Y-%m-%d %H:%M:%S")}, ensure_ascii=False) + "\n")
        with open(f"{MASTER}/{k}.raw", "wb") as f:
            f.write(pcm)
        encode(k, clean(pcm))
        if (i + 1) % 50 == 0:
            print(f"{i + 1}/{len(keys)}  {spent:.1f} ₽", flush=True)
    print(f"done: {len(keys)} lines, {spent:.2f} ₽", flush=True)


if __name__ == "__main__":
    main()
