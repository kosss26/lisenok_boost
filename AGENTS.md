# Notes for coding agents

- Vite + React 19 + TanStack Router (code-based routes in `src/router.tsx`), TypeScript, plain CSS
  (`src/styles.css` imports `src/styles/*.css`). No backend, no login: progress lives in localStorage (`src/game/progress.ts`).
- Content is data: `src/content/*.ts` (words, sentences, forest stops, all voice lines).
  Task generators are pure functions in `src/game/tasks.ts`, covered by `npm test`.
- Every spoken line is a key in `src/content/voice.ts` → `public/voice/<key>.mp3`. After adding text,
  regenerate with `npm run voice:list && python3 tools/make-voice.py <v5_ru.pt> only-missing`.
- Art: generated sheets in `assets/sheets`, cut into transparent WebP by `tools/cut-sheet.py`
  (rembg). Keep the fox consistent: generate new fox art with `assets/sheets/fox-ref.jpg` as reference.
- Offline: `vite.config.ts` writes `dist/sw.js` from `src/sw-template.js` with every built file.
  Media URLs carry per-file `?v=<hash>` from `tools/asset-versions.mjs` (runs after encoding in `npm run build`).
- UI text and voice are Russian. Test on a phone viewport: `npm run test:e2e` (dev server on :8080).
- Correct answers carry `data-answer="1"` (used by the e2e tests).

- Save schema/migrations: `src/game/save.ts`, current v3. Never merge unvalidated backup JSON.
  `progress.ts` exposes the active profile at the top level and stores all profiles atomically.
  Keep legacy statistics as history; independent-answer counters start with new answers.
- Answer timing/feedback is in `src/game/answering.ts`; count thinking time after narration,
  excluding speaking, hidden tabs and parent settings. Do not shorten the patient defaults.
- New adult dialogs use `useModal` from `src/game/modal.ts` for focus and inert background.
- This repository predates the sea world and SpeechKit migration. Do not claim either is shipped.
  Existing speech is Silero CC BY-NC; no commercial voice rights are implied.

- A profile has one resumable lesson (`session-state.ts`, `sessions.ts`). Persist concrete tasks and draft before praise; statistics + next step + reward are one guarded update. Never count a resumed completed draft twice. Practice awards finds, never story stars.
- Hint stages: method, remove a distractor, then answer. First two stages use `methodVoice`, which must not read the answer or claim that an unhighlighted tile is glowing.
- Service worker updates wait for an explicit menu action; a failed shell install must be rejected and removed. Retain the previous offline cache and unrelated caches.
