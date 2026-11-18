# Notes for coding agents

- Vite + React 19 + TanStack Router (code-based routes in `src/router.tsx`), TypeScript, plain CSS
  (`src/styles.css`). No backend, no login: progress lives in localStorage (`src/game/progress.ts`).
- Content is data: `src/content/*.ts` (words, sentences, forest stops, all voice lines).
  Task generators are pure functions in `src/game/tasks.ts`, covered by `npm test`.
- Every spoken line is a key in `src/content/voice.ts` → `public/voice/<key>.mp3`. After adding text,
  regenerate with `npm run voice:list && python3 tools/make-voice.py <v5_ru.pt> only-missing`.
- Art: generated sheets in `assets/sheets`, cut into transparent WebP by `tools/cut-sheet.py`
  (rembg). Keep the fox consistent: generate new fox art with `assets/sheets/fox-ref.jpg` as reference.
- Offline: `vite.config.ts` writes `dist/sw.js` from `src/sw-template.js` with every built file.
  Media URLs carry `?v=<hash>` from `tools/asset-versions.mjs` (runs in `npm run build`).
- UI text and voice are Russian. Test on a phone viewport: `npm run test:e2e` (dev server on :8080).
- Correct answers carry `data-answer="1"` (used by the e2e tests).
- The fox is alive: `<Fox>` renders `LivePic` (`src/components/live-pic.tsx`) — the picture on a
  WebGL mesh bent by bones from `src/content/fox-rig.ts` (tail, head, ears, arms, eyelids;
  `src/game/live.ts`). A new fox pose needs a rig entry (points read off a 5 % grid). Without
  WebGL or with reduced motion it is the plain picture. Dev: `window.__live` (`debugBlink`).
