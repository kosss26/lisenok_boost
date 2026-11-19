#!/usr/bin/env python3
"""Build step: modern copies of the media for browsers that support them.
public/art/*.webp -> AVIF, public/{voice,sfx,music}/*.mp3 -> Opus in Ogg (.ogg).
Output goes to tmp/media-cache/<folder>/ (re-encoded only when the source changed);
vite.config.ts copies it into dist/. The originals stay as the fallback.
Needs Pillow with AVIF and ffmpeg with libopus."""
import os, subprocess, sys, json, hashlib
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

CACHE = "tmp/media-cache"
OPUS_KBPS = {"voice": "28k", "sfx": "40k", "music": "64k"}

os.makedirs(CACHE, exist_ok=True)
INDEX = f"{CACHE}/.sources.json"
try:
    with open(INDEX) as f: previous = json.load(f)
except (FileNotFoundError, ValueError):
    previous = {}
current = {}

def stale(src, dst):
    with open(src, "rb") as f:
        digest = hashlib.sha256(b"avif58-speed6-opus28-40-64-v1" + f.read()).hexdigest()
    current[dst] = digest
    return not os.path.exists(dst) or previous.get(dst) != digest

def avif(job):
    src, dst = job
    Image.open(src).save(dst, quality=58, speed=6)

def opus(job):
    src, dst, kbps, mono = job
    args = ["ffmpeg", "-v", "error", "-y", "-threads", "1", "-i", src, "-threads", "1", "-c:a", "libopus", "-b:a", kbps]
    if mono:
        args += ["-ac", "1", "-application", "voip"]
    subprocess.run(args + [dst], check=True)

jobs_img, jobs_aud = [], []
for folder in ["art", "voice", "sfx", "music"]:
    os.makedirs(f"{CACHE}/{folder}", exist_ok=True)
    keep = set()
    for name in sorted(os.listdir(f"public/{folder}")):
        stem, ext = os.path.splitext(name)
        src = f"public/{folder}/{name}"
        if folder == "art" and ext == ".webp" and not stem.endswith("-motion"):
            dst = f"{CACHE}/art/{stem}.avif"
            keep.add(os.path.basename(dst))
            if stale(src, dst): jobs_img.append((src, dst))
        elif folder != "art" and ext == ".mp3":
            dst = f"{CACHE}/{folder}/{stem}.ogg"
            keep.add(os.path.basename(dst))
            if stale(src, dst): jobs_aud.append((src, dst, OPUS_KBPS[folder], folder == "voice"))
    for old in os.listdir(f"{CACHE}/{folder}"):  # sources that were removed
        if old not in keep: os.remove(f"{CACHE}/{folder}/{old}")

with ThreadPoolExecutor(max(1, min(4, int(os.environ.get("MEDIA_WORKERS", "2"))))) as ex:
    list(ex.map(avif, jobs_img)); list(ex.map(opus, jobs_aud))
with open(INDEX + ".tmp", "w") as f: json.dump(current, f, sort_keys=True)
os.replace(INDEX + ".tmp", INDEX)
print(f"encode-media: {len(jobs_img)} avif, {len(jobs_aud)} opus (re-encoded)", file=sys.stderr)
