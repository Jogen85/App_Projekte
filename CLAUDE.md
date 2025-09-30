# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IT Portfolio Dashboard – React/TypeScript/Vite SPA for executive project oversight with CSV data source, budget tracking, resource utilization, Gantt-style timeline, and admin CSV editor (no backend, localStorage-based).

**Stack**: React 18, TypeScript (strict), Vite 5, TailwindCSS 3, Recharts, react-router-dom

## Commands

### Development
- `npm run dev` – Start Vite dev server (HMR at http://localhost:5173)
- `npm run build` – TypeScript check + production build
- `npm run preview` – Serve production build locally
- `npm run typecheck` – Run TypeScript checks without emit

### Quality
- `npm run lint` – ESLint check
- `npm run format` – Prettier format all files
- `npm run test` – Run Vitest tests (single run)
- `npm run test:watch` – Run Vitest in watch mode

**Always run `npm run build` and `npm run typecheck` before commits.**

## Architecture

### Routing
- `/` – Dashboard (main app)
- `/admin` – CSV editor (inline table, import/export, localStorage persistence)
- SPA routing via `vercel.json` rewrites (all routes → `/index.html`)

### Data Flow
1. **Dashboard data source priority**:
   - `localStorage.projects_json` (if exists, set via Admin)
   - Fallback: hardcoded `DEMO_PROJECTS` in `App.tsx`
2. **Admin editor**: Import CSV → edit inline → export CSV or save to localStorage
3. **CSV format**: Semicolon-delimited (auto-detects `;` or `,`), expects columns:
   ```
   id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
   ```
   - `status`: `planned` | `active` | `done` (lowercase in CSV)
   - Dates: `YYYY-MM-DD` or `DD.MM.YYYY`

### Core Modules
- **`src/types.ts`**: `Project` (raw CSV), `NormalizedProject` (with parsed dates)
- **`src/lib.ts`**: Date/time utilities, RAG (Red-Amber-Green) logic, budget/resource calculations
- **`src/lib/csv.ts`**: CSV parser/serializer (BOM handling, quote escaping, delimiter detection)
- **`src/ui.tsx`**: Reusable UI primitives (`Card`, `Badge`, `ProgressBar`, traffic lights)
- **`src/main.tsx`**: App entry, React Router setup
- **`src/App.tsx`**: Main dashboard, orchestrates all KPI cards, filters, table, timeline

### Components (`src/components/`)
- **`BudgetDonut.tsx`**: Year budget donut chart (hover tooltip per segment)
- **`ResourceTile.tsx`**: Resource bar + traffic light (current month capacity vs. used hours)
- **`ProgressDelta.tsx`**: Soll–Ist (Plan vs. Actual) KPI card with top-3 delays
- **`ProjectsTable.tsx`**: Filterable project table with mini budget donuts, RAG indicators
- **`Timeline.tsx`**: Gantt-style timeline with status-based colors, progress overlay, today marker
- **`FiltersPanel.tsx`**: Status/org/year filters
- **`TrafficLight.tsx`**: Red/Amber/Green indicator component

### Pages (`src/pages/`)
- **`ProjectsAdmin.tsx`**: Admin CSV editor (no backend; localStorage)

### Lazy Loading
- Charts (`BudgetDonut`, `ResourceTile`, `ProgressDelta`) and `ProjectsTable` are code-split via `React.lazy`
- Vite config (`vite.config.ts`) splits vendor bundles: `react-vendor`, `recharts-vendor`, `vendor`

## RAG (Traffic Light) Logic

### Budget RAG (`calcBudgetRAG`)
- **Red**: Cost > 105% of planned budget
- **Amber**: Cost > 90% AND progress < 80%
- **Green**: Otherwise

### Time RAG (`calcTimeRAGD`)
- **Red**: Overdue (today > end date) and progress < 100%, OR progress delta < -15pp
- **Amber**: Progress delta < -5pp
- **Green**: Otherwise
- Progress delta = actual progress % − expected progress % (based on elapsed time)

### Resource RAG (`calcResourceRAG`)
- **Red**: Used hours > capacity
- **Amber**: Used hours > 90% capacity
- **Green**: Otherwise

## Timeline & Visualization

### Timeline Colors (Gantt-style)
- **Active**: Blue (`#1d4ed8`), shows progress overlay (light blue)
- **Planned**: Yellow (`#f59e0b`) with 45° hatch pattern
- **Done**: Dark gray (`#334155`)
- **Today marker**: Thin vertical line across all rows + axis
- **Month ticks**: Short marks with German month abbreviations at axis bottom

### Budget Donut
- Segments: Spent (blue), Remaining (gray)
- Hover tooltip shows percentage per segment
- Removed center percentage text (only tooltip now)

## UI Language & Labels

**All UI text is German**. Key terms:
- "Verantwortlicher MA" (not "Owner")
- "Gesellschaft" (not "Org")
- "Fortschritt %" (not "% prog")
- Status display: "geplant", "laufend", "abgeschlossen" (CSV uses `planned`/`active`/`done`)

## Code Style

- 2 spaces indentation
- TypeScript strict mode
- PascalCase for components, camelCase for hooks (`useX`)
- Prefer Tailwind utilities; add inline styles only when necessary
- Colocation: Place tests next to source files (`*.test.ts`, `*.test.tsx`)
- Sorted imports, no unused symbols
- German UI copy (match existing labels)

## Testing

- **Vitest** + `@testing-library/react`, `jsdom` environment
- Config: `vitest.config.ts` (globals enabled, setup in `src/test/setup.ts`)
- Run `npm run test -- --coverage` before major refactors
- Test coverage: Date/RAG logic in `lib.test.ts`, CSV parser, component rendering

## Deployment

- **Platform**: Vercel (or similar SPA hosts)
- **Build command**: `npm run build`
- **SPA rewrites**: `vercel.json` ensures `/admin` and other routes fall back to `/index.html`

## Data Persistence

- **No backend**: All state lives in browser
- Admin saves to `localStorage.projects_json` (JSON array of projects)
- Dashboard reads localStorage on mount, falls back to `DEMO_PROJECTS`
- CSV import/export via Admin page (no server roundtrip)
