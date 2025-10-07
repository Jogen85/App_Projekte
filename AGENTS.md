# Repository Guidelines

## Project Structure & Module Organization
Source lives under `src/`. The React entry point is `src/main.tsx`; shared primitives stay in `src/ui.tsx`. Feature components belong in `src/components/`, with page-level containers in `src/pages/` such as `src/pages/ITCostsDashboard.tsx`. Static assets and CSV inputs like `public/data/projects.csv` remain under `public/`. Co-locate tests beside their targets as `*.test.ts` or `*.test.tsx`.

## Build, Test, and Development Commands
Use `npm run dev` for the Vite dev server with HMR at http://localhost:5173. `npm run build` runs `tsc -b` and bundles for production. `npm run preview` serves the last build locally. `npm run typecheck` performs strict TypeScript checks without emitting files. `npm run lint` executes ESLint with the repository rules. `npm run test` runs Vitest once; use `npm run test:watch` for interactive mode.

## Coding Style & Naming Conventions
Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask, Follow 2-space indentation, sorted imports, and remove unused symbols. Components and files are PascalCase, hooks follow the `useX` pattern, and utility modules stay camelCase. Favor Tailwind utilities; adjust shared tokens in `src/index.css` when necessary. UI copy remains German (e.g., `Verantwortlicher MA`, `Fortschritt %`, `CSV-Export`).

## Testing Guidelines
Vitest with React Testing Library covers logic and rendering. Exercise prop variants, memoized data flows, and timeline edge cases. Keep tests fast, colocated, and mock CSV fetches when exploring data-loading paths. Run `npm run test -- --coverage` before larger refactors to spot regressions.

## Commit & Pull Request Guidelines
Adhere to Conventional Commit prefixes (`feat:`, `fix:`, `chore:`, etc.) as seen in history. Validate `npm run build` and `npm run typecheck` prior to pushing. Pull requests should outline scope, link related issues, and include German UI screenshots for visual changes. Confirm SPA routing stays intact and never modify `vercel.json` rewrites.

## Architecture & Configuration Tips
Stack: Vite, React 18, TypeScript, TailwindCSS, and `recharts` for charts. Data loads from `public/data/projects.csv` or the `localStorage.projects_json` override. Timeline colors: active `#1d4ed8`, planned `#f59e0b` with a 45-degree hatch, done `#334155`, with progress overlays only on active bars. Preserve the today marker and German axis labels when altering charts.
