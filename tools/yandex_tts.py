"""Yandex SpeechKit API v3 client: text -> 48 kHz mono 16-bit PCM (raw bytes).
The key comes from the YANDEX_API_KEY environment variable and is never printed."""
import base64, json, os, time, urllib.error, urllib.request

URL = "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis"
RATE = 48000
PRICE_PER_UNIT = 0.1626  # ₽ per request unit (each started 250 characters), API v3, Nov 2026


def units(text: str) -> int:
    return max(1, -(-len(text) // 250))


def synth(text: str, voice: str, role: str | None = None, speed: float | None = None,
          pitch: int = 0) -> bytes:
    hints: list[dict] = [{"voice": voice}]
    if role:
        hints.append({"role": role})
    if speed:
        hints.append({"speed": speed})
    if pitch:
        hints.append({"pitchShift": pitch})
    body = {"text": text, "hints": hints,
            "outputAudioSpec": {"rawAudio": {"audioEncoding": "LINEAR16_PCM", "sampleRateHertz": RATE}},
            "loudnessNormalizationType": "LUFS"}
    if len(text) > 250:
        body["unsafeMode"] = True
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
        "Authorization": "Api-Key " + os.environ["YANDEX_API_KEY"], "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read().decode()
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2 + attempt * 3)
                continue
            raise RuntimeError(f"HTTP {e.code}: {msg}")
        except (urllib.error.URLError, TimeoutError):
            if attempt < 4:
                time.sleep(2 + attempt * 3)
                continue
            raise
    audio = b""
    for line in raw.splitlines():
        if not line.strip():
            continue
        j = json.loads(line)
        if "error" in j:
            raise RuntimeError(str(j["error"])[:300])
        d = ((j.get("result") or {}).get("audioChunk") or {}).get("data")
        if d:
            audio += base64.b64decode(d)
    if not audio:
        raise RuntimeError("no audio: " + raw[:200])
    return audio
