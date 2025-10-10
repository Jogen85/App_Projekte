# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IT Portfolio Dashboard – Next.js 15 application for executive project oversight with PostgreSQL database (Neon), budget tracking, AT 8.2 compliance tracking, Gantt-style timeline, and admin CRUD portals. **16:9 desktop-optimized layout** (1920×1080, no mobile support).

**Stack**: Next.js 15, React 18, TypeScript (strict), PostgreSQL (Neon), TailwindCSS 3, Recharts

## Commands

### Development
- `npm run dev` – Start Next.js dev server (HMR at http://localhost:3000)
- `npm run build` – TypeScript check + production build
- `npm start` – Serve production build locally
- `npm run typecheck` – Run TypeScript checks without emit
- `npm run db:seed` – Seed PostgreSQL database with demo data

### Quality
- `npm run lint` – ESLint check
- `npm run format` – Prettier format all files

**Always run `npm run build` and `npm run typecheck` before commits.**

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router, React Server Components)
- **Database**: PostgreSQL (Neon Serverless)
- **Database Client**: `@neondatabase/serverless` (HTTP-based, edge-compatible)
- **Styling**: TailwindCSS 3
- **Charts**: Recharts (Client Components)
- **Deployment**: Vercel

### Routing (Next.js App Router)
**Dashboards** (Server/Client Components):
- `/` – IT-Cockpit (main dashboard, Server Component)
- `/projects` – Projects Dashboard (Client Component)
- `/it-costs` – IT-Kosten Dashboard (Client Component)
- `/vdbs-budget` – VDB-S Budget Dashboard (Client Component)
- `/overall-budget` – Overall Budget Dashboard (Client Component)

**Admin Portals** (Client Components with CRUD):
- `/admin/projects` – Projects Admin (CRUD + CSV Export)
- `/admin/it-costs` – IT-Kosten Admin (CRUD + CSV Export)
- `/admin/vdbs-budget` – VDB-S Budget Admin (CRUD + CSV Export)
- `/admin/overall-budget` – Overall Budget Admin (Year Budgets CRUD)

**API Routes** (Server-side):
- `/api/projects` (GET, POST)
- `/api/projects/[id]` (PUT, DELETE)
- `/api/year-budgets` (GET, POST)
- `/api/year-budgets/[year]` (PUT, DELETE)
- `/api/it-costs` (GET, POST)
- `/api/it-costs/[id]` (PUT, DELETE)
- `/api/vdbs-budget` (GET, POST)
- `/api/vdbs-budget/[id]` (PUT, DELETE)

### Database Schema (PostgreSQL/Neon)

**Neon Project**: `shy-cake-05048479` (BMV IT-Cockpit)
**Database**: `neondb`

#### 1. `projects` (21 records)
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  project_number_internal TEXT NOT NULL,
  project_number_external TEXT,
  classification TEXT NOT NULL CHECK (classification IN ('internal_dev', 'project', 'project_vdbs', 'task')),
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'done')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  budget_planned DECIMAL(12,2) DEFAULT 0,
  cost_to_date DECIMAL(12,2) DEFAULT 0,
  org TEXT DEFAULT 'BB',
  requires_at82_check BOOLEAN DEFAULT false,
  at82_completed BOOLEAN DEFAULT false
);
```

#### 2. `year_budgets` (3 records: 2024-2026)
```sql
CREATE TABLE year_budgets (
  year INTEGER PRIMARY KEY,
  budget DECIMAL(12,2) NOT NULL CHECK (budget >= 0)
);
```

#### 3. `it_costs` (12 records)
```sql
CREATE TABLE it_costs (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software_licenses', 'maintenance_service', 'training', 'other')),
  provider TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'one_time')),
  cost_center TEXT,
  notes TEXT,
  year INTEGER NOT NULL
);
```

#### 4. `vdbs_budget` (40 records)
```sql
CREATE TABLE vdbs_budget (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  project_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('RUN', 'CHANGE')),
  budget_2026 DECIMAL(12,2) NOT NULL,
  year INTEGER DEFAULT 2026
);
```

### Data Flow

1. **Server Components** (IT-Cockpit):
   - Direct database queries via `sql` client from `@/lib/db`
   - Data fetching in async component
   - Zero client-side JS for data fetching

2. **Client Components** (Projects, IT-Costs, VDB-S, Overall-Budget):
   - Fetch data via API routes (`/api/*`)
   - State management with `useState`
   - Filter/interaction logic client-side

3. **Admin Portals**:
   - Client Components with forms
   - CRUD operations via API routes
   - CSV Export functionality (client-side serialization)
   - Auto-save on every change

### Core Modules

- **`src/types.ts`**: TypeScript types for all entities
  - `Project`: Project data (16 fields)
  - `NormalizedProject`: Project with parsed dates (`startD`, `endD`)
  - `YearBudget`: `{ year: number, budget: number }`
  - `ITCost`: IT cost data (9 fields, no startDate/endDate since v1.5.0)
  - `VDBSBudgetItem`: VDB-S budget position (5 fields)

- **`src/lib/db.ts`**: Database client setup
  ```typescript
  import { neon } from '@neondatabase/serverless'
  export const sql = neon(process.env.DATABASE_URL!)
  ```

- **`src/lib.ts`**: Utilities
  - Date/time utilities (`toDate`, `daysBetween`, `yearStart`, `yearEnd`)
  - RAG logic (`calcBudgetRAG`, `calcTimeRAGD`)
  - Budget calculations (`plannedBudgetForYearD`, `calculateYearlyCostD`)
  - Number formatting (`fmtEuro`, `fmtCompact`)

- **`src/lib/csv.ts`**: CSV serialization (for export only)
  - `projectsToCSV()`, `serializeITCostsCSV()`, `serializeVDBSBudgetCSV()`
  - German number format support
  - BOM handling for Excel compatibility

- **`src/ui.tsx`**: Reusable UI primitives
  - `Card`, `Badge` (6 colors), `ProgressBar`

- **`src/app/layout.tsx`**: Root layout with metadata
- **`src/app/page.tsx`**: IT-Cockpit (Server Component)

### Components (`src/components/`)

**Charts** (Client Components):
- **`BudgetDonut.tsx`**: Nested donut chart (PLAN vs. IST)
  - Outer Ring: IT-Kosten + VDB-S + Projektbudgets geplant + Verfügbar
  - Inner Ring: IT-Kosten + VDB-S + Projekte ausgegeben + Verbleibend
  - Props: `spent`, `remaining`, `itCostsTotal`, `vdbsBudgetTotal`, `yearBudget`, `projectBudgetSum`

- **`ProgressDelta.tsx`**: Soll-Ist-Fortschritt KPI
  - Clickable categories (Behind/On/Ahead)
  - Shows average delta per category

- **`ProjectDelays.tsx`**: Verzögerungen-Kachel
  - All delayed projects (sorted by delta)
  - Clickable to highlight in table

- **`ITCostsTrendChart.tsx`**: Year-over-year cost comparison
  - Grouped bar chart (Recharts)
  - 5 categories with delta tooltip

**Tables & Filters**:
- **`ProjectsTable.tsx`**: Filterable project table
  - Project numbers (internal + external)
  - Classification badges
  - Budget progress bars
  - AT 8.2 checkboxes

- **`FiltersPanel.tsx`**: Filter controls + CSV buttons
  - Status, Org, Classification, Year, AT 8.2 filters
  - Optional admin link

- **`Timeline.tsx`**: Gantt-style timeline
  - Status-based colors
  - Progress overlay
  - Today marker

**Navigation**:
- **`DashboardTabs.tsx`**: Tab navigation (Client Component)
  - Uses Next.js `Link` and `usePathname`

### API Routes Pattern

All API routes use:
- `export const dynamic = 'force-dynamic'` (disable static generation)
- SQL template syntax with `sql\`...\`` (auto-escaping)
- Snake_case (DB) → camelCase (TypeScript) mapping

Example:
```typescript
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await sql`
    SELECT
      id,
      project_number_internal as "projectNumberInternal",
      ...
    FROM projects
  `
  return NextResponse.json(rows.map(row => ({
    id: row.id,
    projectNumberInternal: row.projectNumberInternal,
    ...
  })))
}
```

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

## UI Language & Labels

**All UI text is German**. Key terms:
- "Verantwortlicher MA" (Owner)
- "Gesellschaft" (Org)
- "Fortschritt %" (Progress)
- Status: "geplant", "laufend", "abgeschlossen"
- "Soll–Ist-Fortschritt" (Plan vs. Actual)
- AT 8.2 labels: "erforderlich", "durchgeführt"

## Code Style

- 2 spaces indentation
- TypeScript strict mode
- PascalCase for components, camelCase for hooks (`useX`)
- Prefer Tailwind utilities
- German UI copy (match existing labels)

## Environment Variables

**.env.local** (required for local development):
```env
DATABASE_URL="postgresql://user:pass@host/database?sslmode=require"
```

**Vercel Environment Variables**:
- `DATABASE_URL` → Set in Vercel Dashboard (Production + Preview + Development)

## Deployment

- **Platform**: Vercel
- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto)
- **Environment**: Set `DATABASE_URL` in Vercel Dashboard

## Database Seeding

**Seed script** (`scripts/seed.ts`):
```bash
npm run db:seed
```

Seeds 76 records:
- 3 year budgets (2024-2026)
- 21 projects
- 12 IT costs
- 40 VDB-S budget items

Demo data source: `src/data/demoData.ts`

## Migration Status

**✅ Completed** (2025-10-10):
- All 8 pages migrated from Vite + localStorage to Next.js + PostgreSQL
- All API routes implemented (CRUD for all entities)
- Vercel deployment live (branch: `Datenbank`)

See `MIGRATION_LOG.md` for detailed migration history.

## Important Implementation Notes

1. ✅ **Server vs. Client Components**:
   - IT-Cockpit: Server Component (no interactivity)
   - Projects/IT-Costs/VDB-S/Overall-Budget: Client Components (filters, charts)
   - Admin Portals: Client Components (forms, state)

2. ✅ **Budget overspend detection**: Check `remaining < 0`, not just color thresholds

3. ✅ **Date dependencies**: Include `today` in all date-based useMemo/useCallback

4. ✅ **German number format**: CSV parser handles `10.000,50` → 10000.5

5. ✅ **Boolean parsing**: Supports `Ja`/`Nein`/`true`/`false`/`yes`/`no`/`1`/`0`

6. ✅ **Suspense Boundary**: Client Components with `useSearchParams()` must be wrapped in `<Suspense>`

## Known Limitations

1. **Desktop-only**: No mobile optimization (min-width: 1440px)
2. **Budget Donut**: Fixed dimensions (150px, outer=60, inner=40)
3. **CSV Import**: Only export functionality (no import in Next.js version)

## Future Enhancements

- CSV Import via API route (bulk insert)
- PDF/Excel Export
- Multi-User Collaboration
- Real-time updates (WebSockets)
