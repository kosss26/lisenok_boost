# Background music, from the freely licensed sources listed in
# assets/SOUND-CREDITS.md (downloaded into assets/music-src, not in the repository).
# Usage: python3 tools/make-music.py      (ffmpeg, numpy)
#   public/music/map.mp3        Kevin MacLeod "Carefree" (CC BY 4.0)         — world map, forest path
#   public/music/tasks.mp3      Kevin MacLeod "Easy Lemon" (CC BY 4.0)       — tasks (calm)
#   public/music/celebrate.mp3  Kevin MacLeod "Fluffing a Duck" (CC BY 4.0)  — rewards, celebration
import os, subprocess

SRC, OUT = "assets/music-src", "public/music"
os.makedirs(OUT, exist_ok=True)

def track(src, name, start, length):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(length), "-i", f"{SRC}/{src}",
                    "-af", f"afade=t=in:d=1.5,afade=t=out:st={length - 4}:d=4,loudnorm=I=-20:TP=-2",
                    "-ac", "1", "-ar", "44100", "-b:a", "64k", "-map_metadata", "-1", f"{OUT}/{name}.mp3"], check=True)

track("carefree.mp3", "map", 0, 100)
track("easy-lemon.mp3", "tasks", 0, 120)
track("fluffing-a-duck.mp3", "celebrate", 0, 45)

for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(f"{OUT}/{f}") // 1024, "KB")
