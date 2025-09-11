# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript source (e.g., `main.tsx`, `App.tsx`, `ui.tsx`).
- `public/`: Static assets served as‑is (e.g., `data/projects.csv`).
- `src/index.css`: Global styles (Tailwind entry).
- Config: `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server with HMR.
- `npm run build`: Type-check (`tsc -b`) and create production build.
- `npm run preview`: Preview the production build locally.
- `npm run typecheck`: Run TypeScript checks without emitting.
Tip: Use Node 18+ for Vite 5 compatibility.

## Coding Style & Naming Conventions
- TypeScript: `strict` mode is enabled; fix all type errors.
- Formatting: Prefer 2‑space indentation; keep imports sorted and minimal.
- React: Components and files in `PascalCase` (e.g., `ChartPanel.tsx`); hooks `useX`.
- CSS: Use Tailwind utility classes; colocate component‑specific styles in the component when needed.
- Files: Group UI primitives in `src/ui.tsx`; app entry in `src/main.tsx`.

## Testing Guidelines
- No test tooling is configured yet. If adding tests, use Vitest + React Testing Library.
- Suggested layout: colocate tests as `*.test.tsx` next to components (e.g., `src/components/Button.test.tsx`).
- Aim for meaningful coverage of rendering, props, and critical state logic.

## Commit & Pull Request Guidelines
- Commits: Use concise, imperative messages. Recommended format (Conventional Commits): `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- PRs: Include purpose, scope, and before/after screenshots for UI changes. Link related issues. Keep diffs focused and incremental.
- Checks: Ensure `npm run build` and `npm run typecheck` pass before requesting review.

## Architecture & Configuration Tips
- Stack: Vite + React 18 + TypeScript + TailwindCSS; charts with `recharts`.
- Data: Static CSV lives under `public/data/`. Reference via relative paths or `fetch('/data/projects.csv')` at runtime.
- Performance: Prefer memoized derived data (`useMemo`/`useCallback`) in frequently re-rendered components.
- Env: Add environment variables via Vite prefixed `VITE_` if/when needed.

