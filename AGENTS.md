# Project: todo-pomodoro

Pomodoro timer + task manager. Monorepo (pnpm + Turborepo) with a React shell and planned Angular/Vue micro-frontends via Native Federation.

## Stack
- **Monorepo**: pnpm workspaces, Turborepo (`apps/*`)
- **Shell** (`apps/shell`): React 18, Vite 5, TypeScript, Tailwind CSS v4, React Router v6
- **MFE**: `@softarc/native-federation` installed, Angular/Vue MFEs planned
- **Storage**: `localStorage` (via `shared/lib/storage`) — keys: `pm_data`, `pm_sound`, `pm_habitica`
- **Timer**: 30 min work / 5 min rest, SVG circular progress
- **Integrations**: Habitica (sync dailies & todos via REST API)

## Architecture: Feature-Sliced Design (FSD)
- follow base FSD principles:
  1. There are "app", "pages", "widgets", "features", "entities", "shared" folders as layers with descending hierarchy
  2. There are "ui", "model", "lib", "api", "config" as segment names
  3. Slices can have names related to business modules
  4. Use local first principle. Put all necessary code to one module-slice unless it is reused in another slice
  5. Slices can't have cross imports. Use deeper layers for reusable logic
  6. Slices should have public api with index.tsx that reexport only necessary parts

## Key files
- `apps/shell/src/pages/today/TodayPage.tsx` — main page (timer + task list)
- `apps/shell/src/shared/config/timer.ts` — timer constants and localStorage keys
- `apps/shell/src/shared/lib/storage/storage.ts` — localStorage wrapper
- `apps/shell/src/shared/lib/audio/` — sound playback
- `apps/shell/src/pages/today/useHabitica.ts` — Habitica sync hook

## Data shape (localStorage `pm_data`)
```json
{ "date": "Mon Jun 30 2026", "tasks": [...], "pomos": 3, "elapsed": 1800 }
```
Data resets daily (compared by `Date.toDateString()`).

## Dev
```bash
pnpm dev       # runs all apps in parallel (shell on :5173)
pnpm build
pnpm lint
```
