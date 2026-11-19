"""Prepare generated 2x2 transparent sheets for the game's native WebP animation.
No artwork is painted here: split, trim, register the head/feet, scale and encode.
Usage: python3 tools/pack-fox-motion.py [idle-sheet.png walk-sheet.png]
With no arguments, rebuild from the archived source sheets in assets/sheets.
"""
from pathlib import Path
import sys, shutil
from PIL import Image

OUT = Path('public/art')
SHEETS = Path('assets/sheets')
SPECS = [
    ('wave', 'fox-idle-source.png', [3800, 110, 1500, 1400], 145),
    ('walk', 'fox-walk-source.png', [180, 140, 180, 140], 190),
]
for index, (pose, archived, durations, anchor_x) in enumerate(SPECS):
    source = Path(sys.argv[index + 1]) if len(sys.argv) > index + 1 else SHEETS / archived
    sheet = Image.open(source).convert('RGBA')
    if source != SHEETS / archived:
        shutil.copyfile(source, SHEETS / archived)
    frames = []
    for cell in range(4):
        x, y = cell % 2, cell // 2
        frame = sheet.crop((x * sheet.width // 2, y * sheet.height // 2,
                            (x + 1) * sheet.width // 2, (y + 1) * sheet.height // 2))
        # Ignore nearly transparent generation speckles when finding the canvas.
        bbox = frame.getchannel('A').point(lambda x: 255 if x > 64 else 0).getbbox()
        if not bbox: raise ValueError('Empty sprite cell')
        left, top, right, bottom = bbox
        body = frame.crop((left, top, right, bottom))
        target_height = 342
        factor = target_height / body.height
        body = body.resize((round(body.width * factor), target_height), Image.Resampling.LANCZOS)
        head_bbox = body.getchannel('A').crop((0, 0, body.width, round(target_height * .32))).point(lambda x: 255 if x > 64 else 0).getbbox()
        head_centre = (head_bbox[0] + head_bbox[2] - 1) / 2
        dx = round(anchor_x - head_centre)
        if dx < 2 or dx + body.width > 318: raise ValueError(f'{pose} cell {cell}: sprite would be clipped')
        canvas = Image.new('RGBA', (320, 384))
        canvas.alpha_composite(body, (dx, 366 - target_height))
        frames.append(canvas)
    frames[0].save(OUT / f'fox-{pose}-still.webp', quality=88, method=2)
    frames[0].save(OUT / f'fox-{pose}-motion.webp', save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, quality=86, method=2, allow_mixed=True)
    print(f'{pose}: 4 frames, 320x384, {sum(durations)} ms loop')
