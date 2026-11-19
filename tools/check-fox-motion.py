"""Validate shipping animations without requiring their source-sheet dependencies."""
from pathlib import Path
from PIL import Image
for pose in ['wave', 'walk']:
    motion = Image.open(f'public/art/fox-{pose}-motion.webp')
    still = Image.open(f'public/art/fox-{pose}-still.webp')
    assert motion.n_frames == 4, f'{pose}: expected 4 distinct frames'
    assert motion.size == still.size == (320, 384), f'{pose}: mismatched frame canvas'
    assert motion.info.get('loop') == 0, f'{pose}: animation must loop'
    baselines = []
    for frame in range(motion.n_frames):
        motion.seek(frame)
        bbox = motion.convert('RGBA').getchannel('A').point(lambda x: 255 if x > 64 else 0).getbbox()
        assert bbox and bbox[0] > 0 and bbox[1] > 0 and bbox[2] < 320 and bbox[3] < 384, f'{pose}: clipped frame'
        baselines.append(bbox[3])
    assert max(baselines)-min(baselines) <= 1, f'{pose}: feet must share a baseline'
    assert Path(f'public/art/fox-{pose}-motion.webp').stat().st_size < 300_000, f'{pose}: oversized animation'
    print(f'{pose}: 4 registered frames, poster, alpha and size OK')
