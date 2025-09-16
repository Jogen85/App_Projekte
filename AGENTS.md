# Repository Guidelines

## Project Structure & Module Organization
- React entry in `src/main.tsx`; shared primitives in `src/ui.tsx`; feature components live under `src/components/`.
- `public/` stores static assets and CSV data such as `public/data/projects.csv`.
- Global Tailwind setup stays in `src/index.css`; adjust shared tokens there.
- Colocate tests as `*.test.ts` or `*.test.tsx` beside the files they cover.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server with HMR at http://localhost:5173.
- `npm run build` runs `tsc -b` and creates the production bundle.
- `npm run preview` serves the last build to mirror Vercel.
- `npm run typecheck` runs strict TypeScript checks without emitting.
- `npm run lint` executes ESLint using the repo rules.
- `npm run test` triggers Vitest; append `--watch` for interactive runs.

## Coding Style & Naming Conventions
- Use 2 space indentation, sorted imports, and no unused symbols.
- Keep React components and files in PascalCase; hooks follow `useX`.
- Tailwind utilities are preferred; add local styles near the component when necessary.
- UI copy remains German: reuse labels like `Verantwortlicher MA`, `Fortschritt %`, and `CSV-Export`.

## Testing Guidelines
- Vitest and React Testing Library cover logic and rendering.
- Ensure tests cover prop variants, memoized data, and timeline logic.
- Run `npm run test -- --coverage` before sizable refactors to watch regressions.
- Keep tests fast and colocated; mock CSV fetches as needed.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) matching history.
- Validate `npm run build` and `npm run typecheck` before pushing.
- PRs explain scope, link issues, and add German UI screenshots for visual changes.
- Confirm SPA routing stays intact; keep `vercel.json` rewrites untouched.

## Architecture & Configuration Tips
- Stack: Vite, React 18, TypeScript, TailwindCSS, and `recharts` for charts.
- Dashboard reads `public/data/projects.csv` or the `localStorage.projects_json` override.
- Timeline colors: active `#1d4ed8`, planned `#f59e0b` with 45 degree hatch, done `#334155`; only active shows progress overlay.
- Maintain today marker and German axis labels when adjusting the timeline.
