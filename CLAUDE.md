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
- `npm run test -- --coverage` – Run tests with coverage report

**Always run `npm run build` and `npm run typecheck` before commits.**

## Architecture

### Routing
- `/` – Dashboard (main app)
- `/it-costs` – IT-Kosten Dashboard
- `/vdbs-budget` – VDB-S Budget Dashboard
- `/admin` – CSV editor (inline table, import/export, localStorage persistence)
- `/admin/it-costs` – IT-Kosten Admin
- `/vdbs-budget-admin` – VDB-S Budget Admin
- SPA routing via `vercel.json` rewrites (all routes → `/index.html`)

### Data Flow
1. **Dashboard data source priority**:
   - `localStorage.projects_json` (if exists, set via Admin)
   - Fallback: hardcoded `DEMO_PROJECTS` in `App.tsx` (21 projects with full data)
2. **Admin editor**: Import CSV → edit inline → export CSV or save to localStorage
3. **CSV format**: Semicolon-delimited (auto-detects `;` or `,`), expects columns:
   ```
   id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
   ```
   - `projectNumberInternal`: Required (e.g., PINT-2025-001)
   - `projectNumberExternal`: Optional (e.g., VDB-2025-042)
   - `classification`: `internal_dev` | `project` | `project_vdbs` | `task`
   - `status`: `planned` | `active` | `done` (lowercase in CSV)
   - Dates: `YYYY-MM-DD` or `DD.MM.YYYY`
   - Boolean fields: `requiresAT82Check`, `at82Completed` (supports `Ja`/`Nein`, `true`/`false`, `yes`/`no`, `1`/`0`)
   - German number format: `10.000,50` → 10000.5

### Core Modules
- **`src/types.ts`**: `Project` (raw CSV), `NormalizedProject` (with parsed dates), `YearBudget` (year budget config), `VDBSBudgetItem` (VDB-S budget positions)
  - **Project Fields**: `projectNumberInternal` (string), `projectNumberExternal` (optional string), `classification` ('internal_dev' | 'project' | 'project_vdbs' | 'task')
  - **Project Fields**: `requiresAT82Check`, `at82Completed` (boolean)
  - **YearBudget**: `{ year: number, budget: number }`
  - **VDBSBudgetItem**: `{ id: string, projectNumber: string, projectName: string, category: 'RUN' | 'CHANGE', budget2026: number, year: number }`
    - category: RUN = laufende Kosten, CHANGE = Projekte
  - Removed field: `hoursPerMonth`
- **`src/lib.ts`**: Date/time utilities, RAG (Red-Amber-Green) logic, budget calculations
- **`src/lib/csv.ts`**: CSV parser/serializer (BOM handling, quote escaping, delimiter detection, German numbers, boolean parsing)
  - `parseProjectsCSV()` / `projectsToCSV()` - Projekt-CSV (16 Felder)
  - `parseITCostsCSV()` / `serializeITCostsCSV()` - IT-Kosten CSV (11 Felder)
  - `parseVDBSBudgetCSV()` / `serializeVDBSBudgetCSV()` - VDB-S Budget CSV (4 Felder: Projekt Nr., Name, Kategorie, Budget)
- **`src/ui.tsx`**: Reusable UI primitives (`Card`, `Badge` with 6 colors, `ProgressBar` with targetValue support)
  - Badge colors: green, amber, slate, blue, purple, cyan
- **`src/main.tsx`**: App entry, React Router setup
- **`src/App.tsx`**: Main dashboard, orchestrates all KPI cards, filters, table, timeline (16:9 layout, 1800px container)

### Components (`src/components/`)
- **`BudgetDonut.tsx`**: Nested donut chart mit PLAN vs. IST Visualisierung
  - **Äußerer Ring (PLAN)**: IT-Kosten (grau) | VDB-S Budget (amber) | Projektbudgets geplant (violett) | Verfügbar/Überplanung (grün/rot)
  - **Innerer Ring (IST)**: IT-Kosten (grau) | VDB-S Budget (amber) | Projekte ausgegeben (blau) | Verbleibend (grün/gelb/rot)
  - **Legende**: 2 Zeilen (Plan / Ist) mit kompakter Formatierung (≥€10k → "€40k")
  - Überschreitungs-Warnung: Rotes Banner bei `remaining < 0`
  - Überplanungs-Warnung: Roter äußerer Ring bei `totalCommitted > yearBudget`
  - **Berechnung**: totalCommitted = IT-Kosten + VDB-S Budget + Projektbudgets
  - Fixed dimensions: chartHeight=150px, Outer Ring (65-50), Inner Ring (45-28)
  - Props: `spent`, `remaining`, `itCostsTotal`, `vdbsBudgetTotal`, `yearBudget`, `projectBudgetSum`
  - Tooltip zeigt Differenz (€ + %)
- **`ProjectDelays.tsx`**: Verzögerungen-Kachel (ALLE verzögerten Projekte)
  - Zeigt alle Projekte mit delta < -tolerance (nur laufende)
  - Sortiert nach Delta (schlechteste zuerst)
  - Klickbar zum Highlighten in Tabelle
  - Empty State: "Alle laufenden Projekte im Plan! 🎉"
- **`ProgressDelta.tsx`**: Soll–Ist (Plan vs. Actual) KPI card
  - Clickable categories (Behind Plan, On Track, Ahead) - filtert nur laufende Projekte
  - Adjustable tolerance (±pp)
  - Zeigt Durchschnitts-Delta pro Kategorie ("Ø -12.5%")
  - Gesamt-Statistik ("20 laufende Projekte") + Verteilungsbalken (Rot/Gelb/Grün)
  - Größere Buttons (py-4, text-2xl) + vertikale Zentrierung
- **`ProjectsTable.tsx`**: Filterable project table with project numbers, classification, budget progress bars, RAG indicators
  - **Projektnummer** column: Internal (font-mono) + external (small, gray, optional)
  - **Klassifizierung** column: Badge with color-coding (Purple/Blue/Cyan/Slate)
  - **Genehmigungspflicht**: 🔐 Icon bei Budget ≥ €75.000 mit Tooltip
  - AT 8.2 columns with two-line headers ("erforderlich" / "durchgeführt")
  - Budget progress bars (horizontal) instead of mini-donuts
  - Target progress visualization (black line showing expected progress)
  - Filters: Status, Org, Classification, Year, AT 8.2, highlighted project
- **`Timeline.tsx`**: Gantt-style timeline with status-based colors, progress overlay, today marker
  - "Heute" label positioned right of line (-top-7 left-1) with white background
- **`FiltersPanel.tsx`**: Status/org/classification/year/AT 8.2 filters with CSV buttons and admin link
  - Zwei-Zeilen-Layout: Filter/CSV-Buttons (Zeile 1) + Admin-Link (Zeile 2, rechtsbündig)
  - Optional admin link: `adminLink?: { href: string; label: string }`
  - Struktur: `flex flex-col gap-2 items-end` für rechtsbündige Ausrichtung
- **`TrafficLight.tsx`**: Modern status badge (32px dot) with ping animation (Tailwind native)
- **`ITCostsTrendChart.tsx`**: Jahr-über-Jahr Kostenvergleich (Grouped Bar Chart)
  - Vergleicht aktuelles Jahr vs. Vorjahr (z.B. 2025 vs. 2024)
  - 5 Kategorien: Hardware, Software, Wartung, Schulung, Sonstiges
  - Tooltip zeigt Differenz (€ + %)
  - Farben: Vorjahr (grau), Aktuelles Jahr (blau)
  - Y-Achse: Kompakt ("10k" statt "10000")

### Pages (`src/pages/`)
- **`ProjectsAdmin.tsx`**: Admin CSV editor (no backend; localStorage)
  - **Auto-Save**: Optimistic save pattern, keine "Speichern" Buttons mehr
  - **Jahresbudget-Verwaltung**: Separate Tabelle oberhalb Projekttabelle
  - Editierbarkeit: Nur aktuelles (2025) + nächstes Jahr (2026)
  - Vergangene Jahre: readonly, ausgegraut mit "Gesperrt (Vergangenheit)"
  - Warnung bei Überplanung: Projektbudgets (anteilig) > Jahresbudget
  - Speicherung: `localStorage.projects_json` + `localStorage.yearBudgets`
- **`ITCostsDashboard.tsx`**: IT-Kosten Dashboard mit Trend-Analyse
  - **KPIs**: Gesamt IT-Kosten | Größter Kostenblock | Laufende Kostenpositionen
  - **Charts**: Kosten nach Kategorie | Top 5 Dienstleister | Kosten nach Frequenz
  - **Analyse**: Kostentrend (Jahr-über-Jahr) | Dienstleister-Übersicht
  - Jahr-Filter rechts oben + Admin-Link "IT-Kosten verwalten" (blau)
  - Keine `startDate`/`endDate` Felder mehr (entfernt v1.5.0)
- **`ITCostsAdmin.tsx`**: IT-Kosten Verwaltung (CSV Import/Export)
  - **Auto-Save**: Speichert jede Änderung sofort in localStorage
  - 9 Spalten: Beschreibung | Kategorie | Dienstleister | Betrag | Frequenz | Kostenstelle | Notizen | Jahreskosten | Aktionen
  - Entfernt: `startDate`/`endDate` Spalten (v1.5.0)
  - CSV kompatibel: Felder optional (Rückwärtskompatibilität)
- **`VDBSBudgetDashboard.tsx`**: VDB-S Budget Dashboard (NEW v1.6.0)
  - **KPI-Zeile**: 3 Tiles (Gesamtbudget €200k | Größte Position €35k | Budget-Verteilung RUN/CHANGE)
  - **Chart-Zeile**: 3 Visualisierungen
    - Budget nach Kategorie (Pie Chart, Blau=RUN, Violett=CHANGE)
    - Top 5 Budgetpositionen (Horizontal Bar Chart)
    - Filter & Statistik (Kategorie-Buttons + Live-Stats)
  - **Tabelle**: 4 Spalten (Projekt Nr. | Name | Kategorie | Budget)
    - Sortierung klickbar (↑↓ Indikator)
    - Budget-Balken zeigen relative Größe
    - Zebra-Striping + Hover-Effekt (bg-blue-50)
    - Kategorie-Badges (Blau=Laufend, Violett=Projekt)
  - **Layout**: 3 KPIs (120px) + 3 Charts (280px) + Tabelle (520px max-height)
  - Jahr-Filter + Admin-Link "VDB-S Budget verwalten"
  - localStorage: `vdbsBudget` (40 Positionen, €200.104 gesamt)
- **`VDBSBudgetAdmin.tsx`**: VDB-S Budget Verwaltung (NEW v1.6.0)
  - **Auto-Save**: Jede Änderung sofort persistiert
  - 4 Spalten: Projekt Nr. | Name | Kategorie (RUN/CHANGE) | Budget 2026
  - Inline-Editing + CSV Import/Export
  - Kategorie-Select (RUN/CHANGE) beim Bearbeiten
  - Gesamt-Summe im Footer

### Lazy Loading
- Charts (`BudgetDonut`, `ITCostsTrendChart`, `ProgressDelta`) and `ProjectsTable` are code-split via `React.lazy`
- IT-Kosten Charts: `ITCostsByCategoryChart`, `ITCostsByProviderChart`, `ITCostsByFrequencyChart`
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
- **Current Coverage**: 49 Tests passing
  - `lib.test.ts`: 16 Tests (Date utils, RAG logic)
  - `csv.test.ts`: 19 Tests (Delimiter detection, quote escaping, BOM, German numbers, boolean parsing, new fields)
  - `BudgetDonut.test.tsx`: 14 Tests (Overspend detection, thresholds, edge cases)
- **ResizeObserver Mock**: `src/test/setup.ts` (required for Recharts components)

## Deployment

- **Platform**: Vercel (or similar SPA hosts)
- **Build command**: `npm run build`
- **SPA rewrites**: `vercel.json` ensures `/admin` and other routes fall back to `/index.html`

## Data Persistence

- **No backend**: All state lives in browser
- **Auto-Save Pattern**: Alle Admin-Portale speichern jede Änderung sofort (optimistic save)
- **localStorage Keys**:
  - `projects_json` - Projekte (JSON array of Project)
  - `yearBudgets` - Jahresbudgets (JSON array of YearBudget: `{year: number, budget: number}[]`)
  - `itCosts` - IT-Kosten (JSON array of ITCost)
  - `vdbsBudget` - VDB-S Budget (JSON array of VDBSBudgetItem)
- Dashboard reads localStorage on mount, falls back to DEMO_* constants
- CSV import/export via Admin pages (no server roundtrip)
- Jahresbudgets: Separate localStorage-Key für Multi-Jahr-Planung

## Recent Changes & Evolution

### VDB-S Budget Dashboard + Auto-Save Fixes (2025-10-07) - v1.6.0

**Major Features**:

#### 1. **VDB-S Budget Dashboard** (komplett neu)
- **Neues 3. Dashboard-Tab** neben Projekte & IT-Kosten
- **Routing**: `/vdbs-budget` (Dashboard) + `/vdbs-budget-admin` (Admin)
- **Datenquelle**: 40 Budgetpositionen (€200.104 gesamt) aus Excel VDB-S (1).xlsx

**Dashboard-Features**:
- **KPI-Zeile** (3 Tiles wie andere Dashboards):
  - Gesamtbudget €200.104 (40 Positionen)
  - Größte Position €35.750 (Weiterer Ausbau VDB Service)
  - Budget-Verteilung (RUN: €134k, CHANGE: €66k)

- **Chart-Zeile** (3 Visualisierungen):
  - **Pie Chart**: Budget nach Kategorie (Blau=RUN, Violett=CHANGE)
  - **Bar Chart**: Top 5 Budgetpositionen (horizontal)
  - **Filter Panel**: Live-Statistik + Kategorie-Filter (Alle/RUN/CHANGE)

- **Verbesserte Tabelle**:
  - 4 Spalten: Projekt Nr. | Name | **Kategorie** | Budget
  - **Sortierung** klickbar (↑↓ Indikator)
  - **Budget-Balken** zeigen relative Größe
  - **Zebra-Striping** (Weiß/Grau alternierend)
  - **Hover-Effekt** (bg-blue-50)
  - **Kategorie-Badges** (Blau=Laufend, Violett=Projekt)

**Kategorien-System**:
- **RUN** (27 Positionen): Laufende Kosten (Servicebudgets, AKs, Betrieb)
- **CHANGE** (13 Positionen): Projekte (Anbindungen, Modernisierungen, Features)
- Filterbar über Chart 3

**Admin-Portal**:
- Inline-Editing (4 Spalten inkl. Kategorie-Select)
- CSV Import/Export mit Kategorie-Spalte
- Auto-Save (optimistic save pattern)

**Integration**:
- **BudgetDonut erweitert**: VDB-S Budget (amber) in PLAN + IST Ring
- **Berechnung**: IT-Kosten + VDB-S + Projektbudgets vs. Jahresbudget
- **Warnung**: "Gesamtbudget überschritten!" mit Aufschlüsselung

**Technisch**:
- Neue Datei: `VDBSBudgetDashboard.tsx` (380 Zeilen)
- Neue Datei: `VDBSBudgetAdmin.tsx` (210 Zeilen)
- Type erweitert: `VDBSBudgetItem` (category: 'RUN' | 'CHANGE')
- CSV Parser: `parseVDBSBudgetCSV()` + `serializeVDBSBudgetCSV()`
- localStorage: `vdbsBudget`
- Recharts Integration: PieChart + BarChart

#### 2. **Auto-Save Pattern für Admin-Portale**
**Problem**: Race Condition beim Speichern (dirty-Flag asynchron)

**Lösung**:
- **ProjectsAdmin**: Optimistic Save statt dirty-Flag
- **Entfernt**: "Speichern (lokal)" Button + `dirty` State
- **Neu**: `saveProjects()` schreibt sofort bei jeder Änderung
- **YearBudgets**: Gleiche Logik, auto-save bei jeder Änderung
- **Feedback**: Grüne "✓ Änderungen gespeichert" Message (2s)
- **Konsistent**: Alle 3 Admin-Portale nutzen jetzt optimistic save

**Bugfix**:
- localStorage.removeItem() Bug in App.tsx behoben
- Dashboard löschte bei jedem Load die gespeicherten Projekte
- TEMP-Code entfernt (war nie entfernt worden)

**Commits**:
- `7385182`: VDB-S Budget Dashboard + Integration in Jahresbudget
- `dba393e`: VDB-S Budget Daten korrigiert + Projektnummern bereinigt
- `bdd2924`: localStorage Reset für VDB-S Budget
- `4e16b87`: Admin auto-save statt dirty-Flag (verhindert Datenverlust)
- `496221a`: localStorage.removeItem() entfernt (verhinderte Persistierung)
- `5918b69`: VDB-S Budget Dashboard UX-Verbesserungen (Charts, KPIs, Kategorien)

---

### Nested Budget Donut + IT-Kosten Redesign (2025-10-07) - v1.5.0

**Major Changes**:

#### 1. Nested Budget Donut (PLAN vs. IST Visualisierung)
**Problem**: Nur IST-Zahlen sichtbar (Ausgaben), Verplanung nicht erkennbar

**Lösung**: Doppelring-Donut mit 2 Ebenen
- **Äußerer Ring (PLAN-Ebene)**: Was ist verplant?
  - IT-Kosten (fix): grau
  - Projektbudgets geplant: violett (#7c3aed)
  - Verfügbar für neue Projekte: grün (oder rot bei Überplanung)
- **Innerer Ring (IST-Ebene)**: Was ist ausgegeben?
  - IT-Kosten (fix): grau
  - Projekte ausgegeben: blau
  - Verbleibend: grün/gelb/rot (nach Threshold)

**Legende (2 Zeilen)**:
```
Plan: IT-Kosten: €200k | Projektbudgets: €308k | Überpl.: €40k
Ist:  IT-Kosten: €200k | Projekte: €80k | Verbleibend: €220k
```

**Features**:
- Kompakte Formatierung (≥€10k → "€40k")
- Überplanungs-Warnung visuell im Donut (roter äußerer Ring)
- Tooltip zeigt Differenz (€ + %)
- Korrekte Berechnung: `yearBudget - totalCommitted` (erlaubt negative Werte)

**Technisch**:
- 2x `<Pie>` in einem PieChart (nested rings)
- Ring-Größen: Outer (65-50), Inner (45-28)
- Props: `yearBudget`, `projectBudgetSum`, `itCostsTotal`
- Neue Funktion: `fmtCompact(n)` für große Beträge
- Files: BudgetDonut.tsx (+125 lines, -56 lines), App.tsx (+1 line)

**Bugfixes**:
- Überplanung zeigte €0 statt €40.000 (`Math.max(0, ...)` entfernt)
- Text gekürzt: "Überpl." statt "Überplanung"

#### 2. IT-Kosten Dashboard Redesign
**Problem**:
- `startDate`/`endDate` nicht sinnvoll für laufende Kosten
- "Auslaufende Verträge" ohne Dates sinnlos
- "Aktive Verträge" KPI verwirrend

**Lösung**:
1. **Admin aufgeräumt**:
   - `startDate`/`endDate` Spalten entfernt (11 → 9 Spalten)
   - CSV Import/Export: Felder bleiben optional (Kompatibilität)

2. **KPI umbenannt**:
   - "Aktive Verträge" → **"Laufende Kostenpositionen"**
   - Berechnung: `yearCosts.length` (einfache Anzahl)

3. **Neue Komponente: ITCostsTrendChart.tsx**:
   - **Ersetzt**: "Auslaufende Verträge (nächste 90 Tage)"
   - **Chart-Typ**: Grouped Bar Chart (Recharts)
   - **Daten**: Jahr-über-Jahr-Vergleich (z.B. 2024 vs. 2025)
   - **Kategorien**: 5 Kostenblöcke (Hardware, Software, Wartung, Schulung, Sonstiges)
   - **Features**:
     - Tooltip zeigt Differenz (€ + %)
     - Legende: Vorjahr (grau), Aktuelles Jahr (blau)
     - Y-Achse: "k" Format (€10k statt €10.000)
     - X-Achse: Kategorie-Namen (45° gedreht)
   - **Mehrwert**: Trend-Erkennung, Kostensteigerung/-reduktion sichtbar

**Technisch**:
- Neue Datei: `src/components/ITCostsTrendChart.tsx` (110 Zeilen)
- Entfernt: ContractExpiryList Import, activeContracts Logik
- Admin: -2 Spalten, -33 Zeilen
- Dashboard: -7 Zeilen

#### 3. Verwaltungslinks Redesign
**Problem**: Links unter Titel (links) kollidierten mit Tabs, uneinheitliche Farben (blau + lila)

**Lösung**:
1. **Position**: Links nach rechts oben (bei Filter/CSV-Bereich)
2. **Farbe**: Einheitlich blau (text-blue-600)
3. **Kontextabhängig**:
   - Projekt-Dashboard → nur "Projekte verwalten"
   - IT-Kosten Dashboard → nur "IT-Kosten verwalten"
4. **Layout**: Zwei-Zeilen-Struktur mit rechtsbündigem Link
   ```
   [Filter... CSV-Buttons]
           [Projekte verwalten]  ← rechtsbündig, eigene Zeile
   ```

**Technisch**:
- FiltersPanel: Neuer Prop `adminLink?: { href: string; label: string }`
- Struktur: `flex flex-col gap-2 items-end` (äußerer Container)
- App.tsx: Links von Titel entfernt, via FiltersPanel übergeben
- ITCostsDashboard: Link lila → blau, rechts oben platziert

**Files Modified**:
- FiltersPanel.tsx: +7 lines (adminLink Support)
- App.tsx: -4 lines (Links entfernt)
- ITCostsDashboard.tsx: +2 lines (Link umgezogen)

**Commits**:
- `86d5f37`: Nested Budget Donut mit PLAN/IST
- `91c90fe`: Überplanungs-Berechnung Fix + kompakte Formatierung
- `93aa1c0`: IT-Kosten Redesign - Kostentrend statt Verträge
- `c286585`: Verwaltungslinks nach rechts + blau + kontextabhängig
- `1e69560`: Admin-Link rechtsbündig in eigener Zeile

---

### UX-Verbesserungen & Redundanz-Beseitigung (2025-10-07) - v1.4.0

**Major Changes**:
1. **Genehmigungspflicht-Indikator** (Budget ≥ €75.000):
   - 🔐 Icon mit Tooltip "Genehmigungspflichtig (Budget ≥ €75.000)" in Projekttabelle
   - Position: Neben "Budget"-Label in Budget-Spalte
   - Prüfung: `p.budgetPlanned >= 75000`

2. **Redundanz beseitigt**: TimeStatusOverview entfernt:
   - Problem: TimeStatusOverview und ProgressDelta maßen beide Soll-Ist-Delta (nur andere Visualisierung)
   - Lösung: TimeStatusOverview komplett entfernt
   - Neue Komponente: **ProjectDelays.tsx** (zeigt ALLE verzögerten Projekte, nicht nur Top 3)
   - Layout: `[Budget] [Verzögerungen] [Soll-Ist]`

3. **ProgressDelta vereinfacht & erweitert**:
   - **Entfernt**: Top 3 Verzögerungen-Liste, onSelectProject Prop
   - **Erweitert**:
     - Größere Buttons (py-4, text-2xl)
     - Durchschnitts-Delta pro Kategorie ("Ø -12.5%")
     - Gesamt-Statistik ("20 laufende Projekte")
     - Verteilungsbalken (Rot/Gelb/Grün mit Prozent-Labels)
     - Vertikale Zentrierung (justify-center)
   - Nur laufende Projekte (konsistent mit Verzögerungen-Kachel)
   - Titel erweitert: "Soll-Ist-Fortschritt (laufende Projekte)"

4. **ProjectDelays.tsx** (neue Komponente):
   - Zeigt ALLE verzögerten Projekte (delta < -tolerance)
   - Sortiert nach Delta (schlechteste zuerst)
   - Klickbar zum Highlighten in Tabelle
   - Scrollbar bei vielen Einträgen
   - Empty State: "Alle laufenden Projekte im Plan! 🎉"

5. **Kategorie-Filter konsistent**:
   - Klick auf "Hinter Plan"/"Im Plan"/"Vor Plan" filtert jetzt nur **laufende** Projekte
   - Vorher: Alle Projekte (inkl. geplante 0/0 und abgeschlossene 100/100)
   - Jetzt: Nur steuerbare, aktive Projekte

**Technisch**:
- Neue Komponente: `src/components/ProjectDelays.tsx` (84 Zeilen)
- ProgressDelta: +53 Zeilen (Durchschnitt, Balken, Statistik), -29 Zeilen (Top 3 raus)
- App.tsx: TimeStatusOverview → ProjectDelays, filteredByProgress nur active
- ProjectsTable: +3 Zeilen (Genehmigungspflicht-Icon)

**Files Modified**: 4 files (+140 lines, -32 lines)

---

### Jahresbudget-Verwaltung (2025-10-06) - v1.3.0

**Major Changes**:
1. **Jahresbudget-Verwaltung im Admin-Portal**:
   - Separate Tabelle oberhalb Projekttabelle
   - CRUD für Jahresbudgets: Jahr | Budget (€) | Aktion
   - Editierbarkeit: Nur aktuelles Jahr (2025) + nächstes Jahr (2026)
   - Vergangene Jahre: readonly, ausgegraut, "Gesperrt (Vergangenheit)"
   - localStorage: `yearBudgets` (separiert von projects_json)

2. **Dashboard: Zwei Vergleichsebenen**:
   - BudgetDonut zeigt Jahresbudget vs. Ausgaben (falls konfiguriert)
   - Card-Titel: "Budget 2025: €500.000" statt nur Projektsumme
   - Info-Zeile: "Projektbudgets geplant: €308.000" (anteilig)
   - Fallback: Ohne Jahresbudget → wie bisher (nur Projektsummen)

3. **Warnung bei Überplanung**:
   - Admin: Banner "⚠️ Projektbudgets (€308k) übersteigen Jahresbudget (€350k)"
   - Dashboard: Banner oberhalb KPIs bei Überplanung
   - Anteilige Berechnung: Mehrjährige Projekte fair auf Jahre verteilt

4. **Anteilige Budgetberechnung** (Bugfix):
   - Admin nutzt gleiche anteilige Logik wie Dashboard (`plannedBudgetForYearD`)
   - Beispiel: Projekt 2024-2026, €150k → €75k für 2025 (365 / 730 Tage)
   - Konsistenz: Admin und Dashboard zeigen gleiche Werte

**Technisch**:
- Neuer Type: `YearBudget = {year: number, budget: number}`
- BudgetDonut erweitert: Props `yearBudget`, `projectBudgetSum`
- Admin: +120 Zeilen (Jahresbudget-Tabelle + CRUD + Warnungen)
- App.tsx: +30 Zeilen (Jahresbudget laden, Warnung, BudgetDonut-Integration)
- Import in Admin: `overlapDays`, `daysBetween`, `yearStart`, `yearEnd`

**Files Modified**: 4 files (+233 lines, -11 lines)

---

### Projektnummern & Klassifizierung (2025-10-06) - v1.2.0

**Major Changes**:
1. **Projektnummern-System**: Internal (required) + External (optional)
   - Format: PINT-2025-001 (intern), VDB-2025-042 (extern)
   - Display: Dashboard table with font-mono styling
   - Admin: 2 new input columns (w-32)
2. **Klassifizierung**: 4 types with color-coded badges
   - internal_dev → Purple, project → Blue, project_vdbs → Cyan, task → Slate
   - Filter dropdown in FiltersPanel
   - Admin: Select dropdown with 4 options
3. **21 Real Projects**: Replaced 6 demo projects
   - Data from: `projekte_template_2025-10-06.csv`
   - All names corrected (Jürgens, Körtge, etc.)
   - Project numbers deterministical generated (70% with external)
   - Classification distributed: 33% VDB-S, 38% Project, 19% Internal, 10% Task
4. **Badge Component Extended**: 3 new colors (blue, purple, cyan)
5. **localStorage Reset**: One-time clear to load new DEMO_PROJECTS

**Breaking Changes**:
- CSV format: 13 → 16 fields (+projectNumberInternal, +projectNumberExternal, +classification)
- Dashboard table: 7 → 9 columns
- Admin table: +3 columns

**Layout Structure** (no changes):
- Header: 80px, KPI Row: 3×120px, Chart Row: 3×280px, Table: 520px, Timeline: full-width

**Files Modified**: 10 files, +290 lines, -80 lines

---

### 16:9 Desktop-Optimierung & UX-Verbesserungen (2025-01-03) - v1.0.0

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
