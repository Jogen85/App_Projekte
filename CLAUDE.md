# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IT Portfolio Dashboard – React/TypeScript/Vite SPA for executive project oversight with CSV data source, budget tracking, AT 8.2 compliance tracking, Gantt-style timeline, and admin CSV editor (no backend, localStorage-based). **16:9 desktop-optimized layout** (1920×1080, no mobile support).

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
   - Fallback: hardcoded `DEMO_PROJECTS` in `App.tsx` (6 projects with AT 8.2 data)
2. **Admin editor**: Import CSV → edit inline → export CSV or save to localStorage
3. **CSV format**: Semicolon-delimited (auto-detects `;` or `,`), expects columns:
   ```
   id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
   ```
   - `status`: `planned` | `active` | `done` (lowercase in CSV)
   - Dates: `YYYY-MM-DD` or `DD.MM.YYYY`
   - Boolean fields: `requiresAT82Check`, `at82Completed` (supports `Ja`/`Nein`, `true`/`false`, `yes`/`no`, `1`/`0`)
   - German number format: `10.000,50` → 10000.5

### Core Modules
- **`src/types.ts`**: `Project` (raw CSV), `NormalizedProject` (with parsed dates)
  - Added fields: `requiresAT82Check`, `at82Completed` (boolean)
  - Removed field: `hoursPerMonth`
- **`src/lib.ts`**: Date/time utilities, RAG (Red-Amber-Green) logic, budget calculations
- **`src/lib/csv.ts`**: CSV parser/serializer (BOM handling, quote escaping, delimiter detection, German numbers, boolean parsing)
- **`src/ui.tsx`**: Reusable UI primitives (`Card`, `Badge`, `ProgressBar` with targetValue support)
- **`src/main.tsx`**: App entry, React Router setup
- **`src/App.tsx`**: Main dashboard, orchestrates all KPI cards, filters, table, timeline (16:9 layout, 1800px container)

### Components (`src/components/`)
- **`BudgetDonut.tsx`**: Year budget donut chart with overspend detection
  - **New UX Logic**: Green/Yellow/Red for "Remaining" (important), Blue for "Spent" (neutral)
  - Shows red warning banner when `remaining < 0`
  - Fixed dimensions: chartHeight=150px, outer=60, inner=40
- **`TimeStatusOverview.tsx`**: Aggregate traffic light distribution for running projects
  - 3 large status circles (48px): Green (On Track), Yellow (Delayed), Red (Critical)
  - Replaces old ResourceTile component
- **`ProgressDelta.tsx`**: Soll–Ist (Plan vs. Actual) KPI card with top-3 delays
  - Clickable categories (Behind Plan, On Track, Ahead)
  - Adjustable tolerance (±pp)
  - Top 3 delays clickable (scrolls to project in table)
  - Shows `%` instead of `pp` for delta values
- **`ProjectsTable.tsx`**: Filterable project table with budget progress bars, RAG indicators
  - AT 8.2 columns with two-line headers ("erforderlich" / "durchgeführt")
  - Budget progress bars (horizontal) instead of mini-donuts
  - Target progress visualization (black line showing expected progress)
  - Filters: Status, Org, Year, AT 8.2, highlighted project
- **`Timeline.tsx`**: Gantt-style timeline with status-based colors, progress overlay, today marker
  - "Heute" label positioned right of line (-top-7 left-1) with white background
- **`FiltersPanel.tsx`**: Status/org/year/AT 8.2 filters with active filter banner
- **`TrafficLight.tsx`**: Modern status badge (32px dot) with ping animation (Tailwind native)

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

### Resource RAG (REMOVED)
- **Note**: Resource/capacity tracking features have been completely removed (2025-01-03)
- Removed components: `ResourceTile.tsx`, `ResourceBar.tsx`
- Removed field: `hoursPerMonth`
- Replaced by: `TimeStatusOverview.tsx` (aggregate time status distribution)

## Timeline & Visualization

### Timeline Colors (Gantt-style)
- **Active**: Blue (`#1d4ed8`), shows progress overlay (light blue)
- **Planned**: Yellow (`#f59e0b`) with 45° hatch pattern
- **Done**: Dark gray (`#334155`)
- **Today marker**: Thin vertical line across all rows + axis
- **Month ticks**: Short marks with German month abbreviations at axis bottom

### Budget Donut (UX Redesigned)
- **New Logic** (2025-01-03):
  - **Remaining** = important (Green >20%, Yellow 10-20%, Red <10% free budget)
  - **Spent** = neutral (always Blue)
- **Overspend Detection**: Shows red warning banner when `remaining < 0`, adds dark-red "Überschreitung" segment
- **Legend**: "Verbleibend" first (prominent), "Ausgegeben" second (secondary)
- Hover tooltip shows percentage + Euro amount per segment
- Fixed dimensions: chartHeight=150px, outerRadius=60, innerRadius=40

## UI Language & Labels

**All UI text is German**. Key terms:
- "Verantwortlicher MA" (not "Owner")
- "Gesellschaft" (not "Org")
- "Fortschritt %" (not "% prog")
- Status display: "geplant", "laufend", "abgeschlossen" (CSV uses `planned`/`active`/`done`)
- "Soll–Ist-Fortschritt" (Plan vs. Actual Progress)
- "Hinter Plan", "Im Plan", "Vor Plan"
- "Top 3 Verzögerungen"
- AT 8.2 labels: "erforderlich", "durchgeführt"

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
- **Current Coverage**: 58 Tests passing
  - `lib.test.ts`: 23 Tests (Date utils, RAG logic)
  - `csv.test.ts`: 21 Tests (Delimiter detection, quote escaping, BOM, German numbers, boolean parsing)
  - `BudgetDonut.test.tsx`: 14 Tests (Overspend detection, thresholds, edge cases)
- **ResizeObserver Mock**: `src/test/setup.ts` (required for Recharts components)

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

### 16:9 Desktop-Optimierung & UX-Verbesserungen (2025-01-03)

**Major Changes**:
1. **Desktop-Only Approach**: No mobile optimization, 1440px min-width, 1800px container
2. **AT 8.2 Compliance**: Two boolean fields with filters and admin checkboxes
3. **Budget Donut UX Redesign**: Green for "Remaining" (important), Blue for "Spent" (neutral)
4. **TimeStatusOverview**: Aggregate traffic light distribution replacing ResourceTile
5. **Removed Features**: All resource/capacity tracking (hoursPerMonth, ResourceTile, ResourceBar)
6. **Timeline Heute-Label**: Positioned right of line with white background box
7. **ProgressDelta**: Shows `%` instead of `pp` for better user understanding

**Layout Structure**:
- Header: 80px (1-line, filters right)
- KPI Row: 3 tiles (120px) – Running/Planned/Completed
- Chart Row: 3 tiles (280px) – Budget/TimeStatus/Soll-Ist
- ProjectsTable: max-height 520px with scrollbar
- Timeline: Full width at end

**Breaking Changes**:
- CSV format changed: Removed `hoursPerMonth`, added `requiresAT82Check`, `at82Completed`
- No longer responsive (min-width: 1440px required)

### Status Badge Modernisierung (2025-09-30)
- Replaced 3D bezel traffic light with modern status badge
- 32px dot with ping animation (Tailwind native `animate-ping`)
- Only red state pulses (amber/green static)
- GitHub/Slack/Linear inspired design

### Soll–Ist Feature (2025-09-14)
- Replaced Burndown with ProgressDelta card
- Clickable categories filter ProjectsTable
- Adjustable tolerance for "on-track" band
- Top 3 delays with click-to-scroll highlighting

### i18n & German Labels (2025-09-11 - 2025-09-16)
- All UI text converted to German
- "Verantwortlicher MA", "Gesellschaft", "Fortschritt %"
- Status labels: "geplant", "laufend", "abgeschlossen"
- German month abbreviations in timeline

## Important Implementation Notes

**These best practices are already implemented in the current codebase**:

1. ✅ **Budget overspend detection**: Check `remaining < 0`, not just color thresholds (BudgetDonut.tsx:14)
2. ✅ **Resource calculation**: Always filter for `statusNorm === 'active'` (App.tsx:108)
3. ✅ **Date dependencies**: Include `today` in all date-based useMemo/useCallback (App.tsx:87, 111, 132)
4. ✅ **Test ResizeObserver**: Mock required for Recharts components (src/test/setup.ts)
5. ✅ **Status badge**: Use Tailwind native `animate-ping`, not custom keyframes (TrafficLight.tsx:38)
6. ✅ **German number format**: CSV parser handles `10.000,50` → 10000.5 (lib/csv.ts)
7. ✅ **Boolean parsing**: Supports `Ja`/`Nein`/`true`/`false`/`yes`/`no`/`1`/`0` (lib/csv.ts)
8. ✅ **Timeline label position**: Right of line (-top-7 left-1) with white background (Timeline.tsx:136)

## Known Limitations & Technical Debt

1. **TimelineCompact.tsx**: Created but not used (can be deleted)
2. **Timeline.tsx**: Kept at end of dashboard (full version)
3. **Budget Donut**: Fixed values (150px, outer=60, inner=40) instead of dynamic calculation
4. **Admin Link**: Only in header, no footer link
5. **Mobile**: Intentionally no optimization (desktop-only for business presentations)

## Future Enhancements (Optional, not implemented)

- **Time-weighted budget evaluation**: YTD vs. expected YTD (reduces year-end skew)
- **Consistent delta-based RAG**: Use Ausgaben% - Fortschritt% threshold for all indicators
- **Mini-donut coloring**: Couple project table mini-donuts to RAG thresholds
- **CSV validation UI**: Show preview/errors before import in Admin
- **Backend/sync**: Serverless persistence or Git-based workflow for collaboration
- **PDF/Excel Export**: Generate reports from dashboard
- **Multi-User Collaboration**: Real-time updates and permissions
