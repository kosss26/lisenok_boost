# Forest art and motion

The new forest entrance follows the background approved in the conversation. The deep forest
and the clearing were generated with the entrance as a style reference. Shipping artwork is
in `public/art/bg-forest.webp`, `bg-forest-2.webp`, and `bg-clearing.webp`, 720×1280 WebP.
The three WebP backgrounds total 246,358 bytes (previously 618,368, approximately 60% smaller).
AVIF versions are created by the normal build; they are not checked in.

## Keep the visual language consistent

- Soft gouache/storybook shapes, sage and moss foliage, cream-gold paths, restrained texture.
- Keep the central learning area quiet. Put mushrooms and small flowers at the outer edges.
- Existing orange fox art remains the character reference. Do not change its proportions,
  scarf, bag or face between scenes.
- Clearing positions are measured from the painted circles and stored in `src/content/forest.ts`.
  Both panels use 52% of the full map height, overlapping between 48% and 52%. The upper panel
  fades across that overlap; `onPath()` and `polish.css` must agree about this geometry.
- Keep the fox beside the next resident and above the fixed continue action.

## Motion

- Idle characters breathe slightly. Tapping and correct answers get brief distinct reactions.
- `PoseSprite` decodes a replacement image before a 240 ms crossfade; images share a fixed
  foot anchor. It preserves the current pose if a new image fails to load.
- `fox-wave-motion.webp` is a native four-frame idle animation (blink, ears, tail);
  `fox-walk-motion.webp` is a native four-phase walking cycle. Their registered posters share
  the same 320×384 canvas and foot baseline. Original generated 2×2 PNG sheets are archived
  in `assets/sheets/fox-idle-source.png` and `fox-walk-source.png`.
- Rebuild with `python3 tools/pack-fox-motion.py` (Pillow only). This splits and registers
  existing generated artwork; it does not paint or synthesize new poses. The build runs
  `check-fox-motion.py` to validate frame counts, alpha, dimensions and foot baseline.
- `useMotionAllowed` watches reduced-motion preference, page visibility and inert ancestors.
  Native animated images switch to registered posters when inactive; CSS animation pause
  alone does not stop a WebP animation. Static poster images can use AVIF; animation always
  uses its WebP bytes. The service worker caches both native animations in every format mode.
- Screens and questions enter gently; draggable pieces retain their existing magnetic snapping.
- Parent overlays, inert gameplay and hidden tabs pause decorative animation. System reduced
  motion disables animation/transitions and hides rain and ambient particles.
- Use transform/opacity for motion. Avoid moving layout, large new blur filters or a per-frame JS loop.

## Review

`tests/e2e/visual.test.mjs` covers the next-stop action, geometry at 320×568, 390×664 and 768×1024,
pose loading and reduced motion. Also review the seam, dialogue, long tasks and rewards visually.
Testing on physical devices is still needed before making frame-rate or battery claims.

## World map and dialogue

The world map now uses the same soft gouache palette as the forest. Its label positions are
measured from the painted regions. Pale paper labels mark future worlds; the forest is teal.
Future-world messages can be dismissed and return focus to their source button.
Dialogue portraits use fixed half-width columns, bottom alignment and decode-before-fade
pose transitions; speaker emphasis changes colour rather than resizing the character.
