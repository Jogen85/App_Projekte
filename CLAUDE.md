# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IT Portfolio Dashboard – React/TypeScript/Vite SPA for executive project oversight with CSV data source, budget tracking, resource utilization, Gantt-style timeline, and admin CSV editor (no backend, localStorage-based).

**Stack**: React 18, TypeScript (strict), Vite 5, TailwindCSS 3, Recharts, react-router-dom, Vitest

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
- **`src/ui.tsx`**: Reusable UI primitives (`Card`, `Badge`, `ProgressBar`, `COLORS`)
- **`src/main.tsx`**: App entry, React Router setup
- **`src/App.tsx`**: Main dashboard, orchestrates all KPI cards, filters, table, timeline

### Components (`src/components/`)
- **`BudgetDonut.tsx`**: Year budget donut chart with overspend detection
  - Shows red warning banner when budget exceeded
  - Segments: Ausgegeben (threshold-colored) + Überschreitung (red-800) or Verbleibend (gray)
  - Hover tooltip shows percentage + Euro amount per segment
  - Threshold colors: Green (≤90%), Amber (≤105%), Red (>105%)

- **`ResourceTile.tsx`**: Resource bar + status badge (current month capacity vs. used hours)
  - Container: `w-16` (64px) for status indicator
  - Only counts **active projects** for resource calculation (not planned/done)

- **`TrafficLight.tsx`**: Modern status badge with ping animation
  - 32px dot with Tailwind native `animate-ping` (GitHub/Slack/Linear style)
  - Only red state pulses (amber/green static)
  - ring-4 white border + shadow-lg for visibility

- **`ProgressDelta.tsx`**: Soll–Ist (Plan vs. Actual) KPI card
  - Clickable categories: Hinter Plan (red), Im Plan (amber), Vor Plan (green)
  - Adjustable tolerance (±pp) for "on-track" band
  - Top 3 Verzögerungen list (clickable, scrolls to project in table)
  - Delta calculation: Ist% - Soll% (based on time elapsed)

- **`ProjectsTable.tsx`**: Filterable project table with mini budget donuts, RAG indicators
  - Filters: Status, Gesellschaft, Year, Soll-Ist category, highlighted project
  - Mini donuts: Ausgegeben (blue) / Verbleibend (gray) - static, no threshold coloring
  - RAG indicators for Zeit and Budget per project
  - Scroll-to-highlight when project selected from ProgressDelta

- **`Timeline.tsx`**: Gantt-style timeline with status-based colors, progress overlay, today marker
- **`FiltersPanel.tsx`**: Status/org/year filters with active filter banner

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
- **Important**: Only active projects count towards used hours (excludes planned/done)

## Critical Business Logic Fixes (Completed)

### Budget Overspend Transparency (eb3c411)
**Problem**: Budget donut used `Math.min(kpis.costSum, kpis.budgetPlannedSum)` which capped display at 100%, hiding critical overspend from executives.

**Solution**:
- Removed Math.min/Math.max capping in App.tsx budget calculation
- BudgetDonut now detects `remaining < 0` and shows:
  - Red warning banner with precise overspend amount and percentage
  - Donut segments: Budget (threshold-colored) + Überschreitung (dark red)
  - Legend changes from "Verbleibend" to "Überschreitung"
- 14 comprehensive tests added (BudgetDonut.test.tsx)

### Resource Calculation Fix (eb3c411)
**Problem**: Resource calculation included all projects (planned/done) which inflated capacity usage.

**Solution**:
- App.tsx line 107: Added `p.statusNorm === 'active'` filter
- Only active projects count towards current month resource utilization
- More realistic capacity planning for GF oversight

### React Hooks Dependencies (eb3c411)
**Problem**: Missing `today` in useMemo/useCallback dependencies could cause stale date-based calculations.

**Solution**: Added `today` to dependency arrays in App.tsx (lines 87, 110, 131)

## Timeline & Visualization

### Timeline Colors (Gantt-style)
- **Active**: Blue (`#1d4ed8`), shows progress overlay (light blue)
- **Planned**: Yellow (`#f59e0b`) with 45° hatch pattern
- **Done**: Dark gray (`#334155`)
- **Today marker**: Thin vertical line across all rows + axis
- **Month ticks**: Short marks with German month abbreviations at axis bottom

### Budget Donut (Updated)
- **Normal state**: Ausgegeben (threshold-colored) + Verbleibend (gray)
- **Overspend state**: Ausgegeben (budget portion, threshold-colored) + Überschreitung (red-800)
- Hover tooltip shows percentage + Euro amount per segment
- Red warning banner appears when budget exceeded
- No center percentage text (tooltip-only design)

### Status Badge (TrafficLight)
- **Design**: Modern minimal dot with ping animation (GitHub/Slack/Linear inspired)
- **Size**: 32px dot in 64px container (w-16)
- **Animation**: Tailwind native `animate-ping` for red state only
- **Styling**: ring-4 white border, shadow-lg for depth
- **Colors**: Tailwind semantic (red-500, amber-500, green-500)

## UI Language & Labels

**All UI text is German**. Key terms:
- "Verantwortlicher MA" (not "Owner")
- "Gesellschaft" (not "Org")
- "Fortschritt %" (not "% prog")
- Status display: "geplant", "laufend", "abgeschlossen" (CSV uses `planned`/`active`/`done`)
- "Soll–Ist-Fortschritt" (Plan vs. Actual Progress)
- "Hinter Plan", "Im Plan", "Vor Plan"
- "Top 3 Verzögerungen"

## Code Style

- 2 spaces indentation
- TypeScript strict mode
- PascalCase for components, camelCase for hooks (`useX`)
- Prefer Tailwind utilities; add inline styles only when necessary (e.g., dynamic colors, precise sizing)
- Colocation: Place tests next to source files (`*.test.ts`, `*.test.tsx`)
- Sorted imports, no unused symbols
- German UI copy (match existing labels)

## Testing

- **Vitest** + `@testing-library/react`, `jsdom` environment
- Config: `vitest.config.ts` (globals enabled, setup in `src/test/setup.ts`)
- Run `npm run test -- --coverage` before major refactors
- **Current coverage**: 58 tests passing
  - `lib.test.ts`: 23 tests (date utils, RAG logic edge cases)
  - `csv.test.ts`: 21 tests (delimiter detection, quote escaping, BOM handling, numeric normalization)
  - `BudgetDonut.test.tsx`: 14 tests (overspend detection, thresholds, edge cases)
- **ResizeObserver mock** in `src/test/setup.ts` for Recharts components

## Deployment

- **Platform**: Vercel (or similar SPA hosts)
- **Build command**: `npm run build`
- **SPA rewrites**: `vercel.json` ensures `/admin` and other routes fall back to `/index.html`

## Data Persistence

- **No backend**: All state lives in browser
- Admin saves to `localStorage.projects_json` (JSON array of projects)
- Dashboard reads localStorage on mount, falls back to `DEMO_PROJECTS`
- CSV import/export via Admin page (no server roundtrip)

## Recent Changes & Evolution

### Budget Transparency & Fachliche Fixes (2025-01-30)
- **Critical**: Budget overspend now visible to GF/Aufsichtsrat (red banner, correct donut segments)
- **Critical**: Resource calculation only counts active projects (realistic capacity view)
- React Hooks dependencies fixed (today in useMemo/useCallback)
- 55 new tests added (CSV parser, RAG edge cases, budget overspend scenarios)

### Soll–Ist Feature (Before eb3c411)
- Replaced Burndown with ProgressDelta card
- Clickable categories filter ProjectsTable
- Adjustable tolerance for "on-track" band
- Top 3 delays with click-to-scroll highlighting

### Status Indicator Modernization (b751ed7)
- Replaced 3D bezel traffic light with modern status badge
- 32px dot with ping animation (only red pulses)
- GitHub/Slack/Linear inspired design
- Container optimized to w-16 (no overflow issues)

## Known Considerations

### Future Enhancements (Optional)
- **Time-weighted budget evaluation**: YTD costs vs. expected YTD budget (reduces year-end skew)
- **Consistent delta-based RAG**: Use Ausgaben% - Fortschritt% threshold for all indicators
- **Mini-donut coloring**: Couple project table mini-donuts to RAG thresholds
- **CSV validation UI**: Show preview/errors before import in Admin
- **Backend/sync**: Serverless persistence or Git-based workflow for collaboration

### Encoding Notes
- Project uses UTF-8 throughout
- Some legacy HTML entities in README (`&uuml;`, `&auml;`, etc.) for historical compatibility
- All source code files are UTF-8 encoded

## Important Implementation Notes

1. **Budget overspend detection**: Check `remaining < 0`, not just color thresholds
2. **Resource calculation**: Always filter for `statusNorm === 'active'`
3. **Date dependencies**: Include `today` in all date-based useMemo/useCallback
4. **Test ResizeObserver**: Mock required for Recharts components in tests
5. **Status badge**: Use Tailwind native `animate-ping`, not custom keyframes
