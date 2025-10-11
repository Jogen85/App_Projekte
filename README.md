# IT Portfolio Dashboard

> Next.js 15 application for executive project oversight with PostgreSQL database (Neon), budget tracking, AT 8.2 compliance, Gantt-style timeline, and admin CRUD portals. **16:9 desktop-optimized layout** (1920×1080, no mobile support).

## ✨ Features

- **8 Dashboard & Admin Pages**
  - IT-Cockpit (main dashboard with KPIs & alerts)
  - Projects, IT-Costs, VDB-S Budget, Overall Budget dashboards
  - 4 Admin portals with CRUD + CSV Import/Export
- **Real-time PostgreSQL Database** (Neon Serverless)
  - 76 records: 21 projects, 12 IT costs, 40 VDB-S budget items, 3 year budgets
- **Advanced Budget Visualization**
  - Nested donut chart (PLAN vs. IST)
  - Year budget tracking with overplanning warnings
  - IT costs + VDB-S budget integration
- **Project Management**
  - Project numbers (internal + external)
  - Classification (4 types with badges)
  - AT 8.2 compliance tracking
  - Gantt-style timeline with progress overlay
- **16:9 Desktop-Only Layout**
  - 1800px container, min-width: 1440px
  - Optimized for business presentations (1920×1080)

## 🚀 Quick Start

```bash
# Install dependencies
npm ci

# Set up environment
cp .env.local.example .env.local
# Edit .env.local and add your DATABASE_URL

# Seed database (first time only)
npm run db:seed

# Start development server
npm run dev
# → http://localhost:3000
```

## 🛠️ Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (TypeScript check + build)
npm start            # Serve production build
npm run typecheck    # TypeScript check only
npm run lint         # ESLint check
npm run format       # Prettier format
npm run db:seed      # Seed PostgreSQL database with demo data
```

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Database**: PostgreSQL (Neon Serverless)
- **Frontend**: React 18, TypeScript (strict), TailwindCSS 3
- **Charts**: Recharts
- **Deployment**: Vercel

## 🗂️ Project Structure

```
src/
├── app/
│   ├── page.tsx                    # IT-Cockpit (Server Component)
│   ├── projects/page.tsx           # Projects Dashboard (Client Component)
│   ├── it-costs/page.tsx           # IT-Costs Dashboard (Client Component)
│   ├── vdbs-budget/page.tsx        # VDB-S Budget Dashboard (Client Component)
│   ├── overall-budget/page.tsx     # Overall Budget Dashboard (Client Component)
│   ├── admin/
│   │   ├── projects/page.tsx       # Projects Admin (CRUD + CSV Import/Export)
│   │   ├── it-costs/page.tsx       # IT-Costs Admin (CRUD + CSV Import/Export)
│   │   ├── vdbs-budget/page.tsx    # VDB-S Budget Admin (CRUD + CSV Import/Export)
│   │   └── overall-budget/page.tsx # Overall Budget Admin (CRUD + CSV Import/Export)
│   └── api/                        # API Routes (CRUD for all entities)
├── components/                     # React components (charts, tables, filters)
├── lib/
│   ├── db.ts                       # Database client
│   ├── csv.ts                      # CSV Import/Export with validation
│   └── utils.ts                    # Date utils, RAG logic, calculations
├── types.ts                        # TypeScript types
└── data/demoData.ts                # Demo data (for seeding)

scripts/
└── seed.ts                         # Database seeding script
```

## 🗄️ Database Schema

4 tables in PostgreSQL (Neon):

1. **projects** (21 records)
   - Project numbers, classification, status, dates, progress, budget, AT 8.2 compliance

2. **year_budgets** (3 records: 2024-2026)
   - Year-based budget planning

3. **it_costs** (12 records)
   - IT cost positions (hardware, software, services)

4. **vdbs_budget** (40 records)
   - VDB-S budget positions (RUN + CHANGE categories)

## 🔐 Environment Variables

Create `.env.local`:

```env
DATABASE_URL="postgresql://user:pass@host/database?sslmode=require"
```

Get your DATABASE_URL from [Neon Console](https://console.neon.tech).

## 🚀 Deployment

Deployed on Vercel with automatic builds from Git.

**Required Environment Variable**:
- `DATABASE_URL` → Set in Vercel Dashboard (Production + Preview + Development)

## 📖 Documentation

- **CLAUDE.md**: Complete codebase documentation for Claude Code
- **MIGRATION_LOG.md**: Detailed migration history (Vite + localStorage → Next.js + PostgreSQL)

## 🎨 Key Features

### Budget Visualization
- **Nested Donut Chart**: PLAN (outer ring) vs. IST (inner ring)
- **Overplanning Detection**: Red warning when committed > year budget
- **Multi-source Budget**: IT costs + VDB-S + project budgets

### Project Management
- **Project Numbers**: Internal (required) + External (optional)
- **Classifications**: Internal Dev, Project, Project VDB-S, Task
- **AT 8.2 Compliance**: Two boolean fields (required, completed)
- **Gantt Timeline**: Status-based colors, progress overlay, today marker

### RAG (Traffic Light) Logic
- **Budget RAG**: Red (>105%), Amber (>90% + progress <80%), Green
- **Time RAG**: Red (overdue or delta <-15pp), Amber (delta <-5pp), Green

## 📥 CSV Import/Export (v1.7.0)

All admin portals support CSV Import/Export with:
- **Flexible Date Formats**: `DD.MM.YYYY` (German) or `YYYY-MM-DD` (ISO)
- **Number Formats**: German (`10.000,50`) or standard (`10000.50`)
- **Detailed Error Reporting**: Line-by-line validation with exact field/value/expected format
- **Auto-Encoding Detection**: UTF-8 + BOM, Windows-1252 fallback

**Example CSV (both formats work):**
```csv
id;...;start;end;...
p1;...;10.03.2025;31.12.2025;...  ✅ German dates
p2;...;2025-01-15;2025-06-30;...  ✅ ISO dates
```

See `CLAUDE.md` for complete validation rules.

## 🧪 Known Limitations

1. **Desktop-only**: No mobile optimization (min-width: 1440px)
2. **German UI**: All labels in German

## 📝 License

Private project - no public license

## 👥 Contributors

- **Claude Code** (AI Assistant) – Implementation & Documentation
- **Christian J.** – Requirements & UX Feedback
