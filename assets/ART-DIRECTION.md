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
- These are still-image pose transitions and CSS body motion, not skeletal animation or new
  walk/blink sprite sheets. A future layered character pass can animate eyes, ears and tail.
- Screens and questions enter gently; draggable pieces retain their existing magnetic snapping.
- Parent overlays, inert gameplay and hidden tabs pause decorative animation. System reduced
  motion disables animation/transitions and hides rain and ambient particles.
- Use transform/opacity for motion. Avoid moving layout, large new blur filters or a per-frame JS loop.

## Review

`tests/e2e/visual.test.mjs` covers the next-stop action, geometry at 320×568, 390×664 and 768×1024,
pose loading and reduced motion. Also review the seam, dialogue, long tasks and rewards visually.
Testing on physical devices is still needed before making frame-rate or battery claims.
