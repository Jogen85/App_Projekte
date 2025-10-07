# IT-Projektübersicht (React + Vite + TypeScript)

> :sparkles: Interaktives Dashboard zur IT-Projektübersicht (GF/Aufsichtsrat) mit CSV-Datenbasis, 16:9 Desktop-Layout (1920×1080), Budget/Zeitstatus, AT 8.2 Compliance, Gantt-ähnlicher Zeitachse und Admin-Editor (CSV-Edit ohne Backend).

## :rocket: Features

- **16:9 Desktop-optimiertes Dashboard** (1920×1080, kein Mobile)
  - KPI-Kacheln (laufend/geplant/abgeschlossen) – 120px Höhe
  - **Jahresbudget-Verwaltung** (neu in v1.3.0)
    - Admin: Separate Tabelle für Jahresbudgets (Jahr | Budget € | Aktion)
    - Editierbar: Nur aktuelles Jahr (2025) + nächstes Jahr (2026)
    - Dashboard: Zwei Vergleichsebenen (Jahresbudget vs. Ausgaben + Projektbudgets)
    - Warnung bei Überplanung (Projektbudgets > Jahresbudget)
  - Budget (Jahr) als Donut mit UX-optimierter Farblogik
    - **Verbleibend** = Grün (>20%), Gelb (10-20%), Rot (<10%)
    - **Ausgegeben** = Blau (neutral)
    - Rote Warnung bei Budgetüberschreitung
    - Info-Zeile: "Projektbudgets geplant: €XXX" (anteilig)
  - Verzögerungen-Kachel: **ALLE** verzögerten Projekte (sortiert nach Delta, klickbar)
  - Soll–Ist-Fortschritt (laufende Projekte) mit Durchschnitts-Delta, Gesamt-Statistik & Verteilungsbalken
  - Projekttabelle mit **Projektnummern**, **Klassifizierung** (4 Typen), **Genehmigungspflicht-Indikator** (Budget ≥ €75.000), Budget-Fortschrittsbalken, AT 8.2 Compliance-Spalten, Ampeln Zeit/Budget
  - Zeitachse (Gantt-ähnlich) mit Heute-Marker
- **Projektnummern & Klassifizierung**
  - Intern (Pflicht): z.B. PINT-2025-001
  - Extern (Optional): z.B. VDB-2025-042, ERECH-2025-01
  - Klassifizierung: Interne Weiterentwicklung (Purple), Projekt (Blue), Projekt VDB-S (Cyan), Aufgabe (Slate)
  - Filter nach Klassifizierung im Dashboard
- **AT 8.2 Compliance-Tracking**
  - Zwei Felder: "erforderlich" und "durchgeführt" (boolean)
  - Filter-Dropdowns im Filterpanel
  - Checkboxen im Admin CSV Editor
- **Admin-Editor** (ohne Server)
  - `/admin` Route mit **PIN-Schutz** (4-stellig, Session-basiert)
  - 16:9-Layout (1800px) mit **Sticky Header** (scrollbar immer sichtbar)
  - **Jahresbudget-Verwaltung** (neue Tabelle oberhalb Projekttabelle)
    - CRUD: Jahr | Budget (€) | Aktion
    - Nur aktuelles + nächstes Jahr editierbar
    - Warnung bei Überplanung (anteilige Berechnung)
  - Inline-Tabelle: Projekte anlegen, bearbeiten, löschen
  - **Multi-Encoding CSV-Import** (UTF-8 + Windows-1252/ISO-8859-1)
  - CSV exportieren mit UTF-8 BOM (Excel-kompatibel)
  - Lokal speichern (localStorage) → Dashboard liest lokale Daten automatisch
  - **Gruppierte Header** (Farbcodes: Stammdaten blau, Zeitplan gelb, Budget grün, AT 8.2 lila)
- **Technisch**
  - React 18 + Vite 5 + TypeScript Strict
  - TailwindCSS 3 (Custom Utilities: max-w-presentation, h-chart, h-kpi, h-table)
  - Recharts (Charts) mit Code-Splitting (`React.lazy` + `manualChunks`)
  - ESLint + Prettier, Vitest (58 Tests passing), GitHub Actions CI

## :file_folder: Projektstruktur

```
public/
  data/projects.csv        # Demo-CSV (wird nicht automatisch geladen)
src/
  App.tsx                  # IT-Cockpit (Startseite, 16:9 Layout, 1800px Container)
  main.tsx                 # App-Entry, Router ("/", "/admin")
  ui.tsx                   # UI-Primitives (Card, Badge, ProgressBar mit Target-Linie)
  lib.ts                   # Zeit/Datums-Hilfen, RAG-Logik, Budgetfunktionen
  lib/csv.ts               # CSV Parser (BOM, German numbers, boolean parsing)
  types.ts                 # Typen (Project, NormalizedProject, YearBudget)
  components/
    BudgetDonut.tsx        # Budget-Kachel Donut (Jahresbudget-Integration, Overspend Detection)
    TimeStatusOverview.tsx # Zeitstatus-Übersicht (Ampel-Verteilung)
    ProgressDelta.tsx      # Soll–Ist-Fortschritt (Top 3 Verzögerungen)
    ProjectsTable.tsx      # Projekttabelle (AT 8.2, Budget-Bars, Target-Progress)
    Timeline.tsx           # Gantt-Zeitachse (Heute-Marker)
    FiltersPanel.tsx       # Filter (Status, Org, Year, AT 8.2)
    TrafficLight.tsx       # Status Badge (32px Dot mit Ping Animation)
    PINProtection.tsx      # PIN-Schutz für Admin-Portal (4-stellig)
  pages/
    ITCockpit.tsx          # IT-Cockpit (Start, KPIs, Alerts, Deep-Links)
    ProjectsDashboard.tsx  # Projektdashboard (Filter, Budget, Timeline)
    OverallBudgetDashboard.tsx # Gesamtbudgetplanung (Aggregationen Projekte/IT/VDB-S)
    YearBudgetsAdmin.tsx   # Jahresbudgets verwalten (Dexie)
    ProjectsAdmin.tsx      # Admin-Editor (CSV/Inline, Projektstammdaten)
  test/
    setup.ts               # Vitest Setup (ResizeObserver Mock)
index.html                 # HTML, UTF-8, min-width: 1440px
vercel.json                # SPA-Rewrite für Vercel
tailwind.config.js         # Custom Utilities (max-w-presentation, h-chart, etc.)
CHANGELOG.md               # Ausführliche Änderungshistorie
ROADMAP.md                 # Geplante Features (12 Items in 5 Phasen)
```

## :wrench: Setup & Skripte

```bash
npm ci                 # Dependencies
npm run dev            # Vite-Devserver (HMR)
npm run build          # Typecheck + Production-Build
npm run preview        # Lokale Preview des Builds
npm run typecheck      # TypeScript Build (no emit)
npm run lint           # ESLint
npm run test           # Vitest (Beispiele)
```

Node 18+ empfohlen (Vite 5).

## :card_index_dividers: Datenbasis (CSV)

- **Erwartete Spalten** (Semikolon `;`):
  ```
  id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
  ```
- **Felder**
  - `id`: frei (z. B. `p-...`), string
  - `projectNumberInternal`: Pflicht (z.B. PINT-2025-001), string
  - `projectNumberExternal`: Optional (z.B. VDB-2025-042), string oder leer
  - `classification`: `internal_dev` | `project` | `project_vdbs` | `task`
  - `title`, `owner`, `description`: string
  - `status`: `planned` | `active` | `done` (kleingeschrieben)
  - `start`, `end`: Datum `YYYY-MM-DD` oder `DD.MM.YYYY`
  - `progress`: 0..100 (Prozent)
  - `budgetPlanned`, `costToDate`: Zahl >= 0 (unterstützt deutsches Format: `10.000,50` → 10000.5)
  - `org`: z. B. `BB`, `MBG`, `BB/MBG`
  - `requiresAT82Check`, `at82Completed`: Boolean (`true`/`false`, `Ja`/`Nein`, `yes`/`no`, `1`/`0`)
- **Parser** (`src/lib/csv.ts`)
  - Erkennt `;`/`,` automatisch (auch in Anführungszeichen)
  - Unterstützt `"..."`-Felder inkl. `""`-Escapes, BOM/NUL-Cleanup, `\r`-Entfernung
  - Deutsche Zahlenformate: `10.000,50` → 10000.5
  - Boolean-Parsing: `Ja`/`true`/`yes`/`1` → `true`, `Nein`/`false`/`no`/`0` → `false`

## :pencil: Admin-Editor (ohne Backend)

- **Aufruf**: `/admin` (Direktaufruf funktioniert auf Vercel dank `vercel.json` Rewrite)
- **Funktionen**:
  - Neu anlegen („Neu"), inline editieren, löschen
  - CSV importieren (ersetzt aktuelle Liste)
  - CSV exportieren (Download)
  - Speichern (lokal): schreibt die aktuelle Liste in `localStorage` (`projects_json`)
  - **AT 8.2 Compliance**: Zwei Checkbox-Spalten („erforderlich" und „durchgeführt")
- **Dashboard-Quelle**:
  - Dashboard lädt automatisch `localStorage.projects_json`, falls vorhanden
  - Fallback: `DEMO_PROJECTS` in `src/data/demoData.ts` (Cockpit + Projekte)

## :bar_chart: Anzeige-Logik (Ist-Stand)

### Budget (Jahr) Kachel – **Neue UX-optimierte Farblogik** ✅
- **Großer Donut** mit Hover-Tooltip pro Segment
- **Neue Logik** (intuitiv):
  - **Verbleibend** = wichtig (fokussiert):
    - Grün: >20% Budget frei (gut)
    - Gelb: 10-20% Budget frei (Warnung)
    - Rot: <10% Budget frei (kritisch)
  - **Ausgegeben** = neutral: Immer Blau
- **Budgetüberschreitung**: Roter Banner + dark-red Segment bei `remaining < 0`
- Legende zeigt "Verbleibend" zuerst (prominent), "Ausgegeben" sekundär

### Zeitstatus-Übersicht (Laufende Projekte)
- **Aggregierte Ampel-Verteilung** statt Projekt-Liste
- 3 große Status-Kreise (48px): Grün (Im Plan), Gelb (Verzug), Rot (Kritisch)
- Prozentuale Verteilung + Gesamtzähler
- Kategorisierung:
  - **Rot**: Überfällig ODER >15pp hinter Plan
  - **Gelb**: >5pp hinter Plan
  - **Grün**: Im Plan oder voraus

### Soll–Ist-Fortschritt (ProgressDelta)
- **3 klickbare Kategorien**: Hinter Plan (rot), Im Plan (gelb), Vor Plan (grün)
- **Einstellbare Toleranz**: ±% für "Im Plan"-Band
- **Top 3 Verzögerungen**: Klickbar, scrollt zu Projekt in Tabelle
- **Delta-Anzeige**: `%` statt `pp` (z.B. `-5.3%` für bessere Verständlichkeit)

### Projekttabelle
- **Budget-Fortschrittsbalken** (horizontal) statt Mini-Donuts
- **Target-Progress-Visualisierung**: Schwarze Linie zeigt Soll-Fortschritt (erwarteter Fortschritt basierend auf Zeit)
- **AT 8.2 Spalten**: "erforderlich" und "durchgeführt" (Checkmarks)
- **Ampeln pro Projekt**:
  - **Budget-Ampel**: Rot bei Kosten >105%, Gelb bei Kosten >90% und Fortschritt <80%, sonst Grün
  - **Zeit-Ampel**: Rot bei Überfällig oder Delta <-15%, Gelb bei Delta <-5%, sonst Grün

### Timeline (Gantt-ähnlich)
- **Farben**: Laufend Blau, Geplant Gelb (Schraffur), Abgeschlossen Dunkelgrau
- **Fortschritts-Overlay**: Nur bei laufenden Projekten (hellblau)
- **Heute-Marker**: Vertikale Linie mit Label (rechts der Linie, 28px über Achse, weißer Hintergrund)
- **Monatsticks**: Deutsche Abkürzungen (Jan, Feb, Mär, ...)

## :triangular_ruler: Entwicklung & Qualität

- **Lint/Format**: ESLint + Prettier
- **Tests**: Vitest (49 Tests passing)
  - `lib.test.ts`: 16 Tests (Date utils, RAG logic)
  - `csv.test.ts`: 19 Tests (Delimiter detection, quote escaping, BOM, German numbers, new fields)
  - `BudgetDonut.test.tsx`: 14 Tests (Overspend detection, thresholds, edge cases)
  - **ResizeObserver Mock**: `src/test/setup.ts` (für Recharts)
- **Code-Splitting**: Charts und Tabelle via `React.lazy`; Vite `manualChunks` für `react`/`recharts` Vendor-Bundles
- **A11y**: Aria-Labels/Tooltip; weitere Verbesserungen möglich

## :truck: Deployment (Vercel)

- Build: `npm run build`
- SPA-Rewrite: `vercel.json`
  ```json
  {"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}
  ```
- Damit funktionieren Direktaufrufe wie `/admin` (Client-Router übernimmt)

## :bulb: Bekannte Punkte / Empfehlungen

### Encoding/Typografie
- Projekt nutzt UTF-8; an einzelnen UI-Stellen wurden HTML-Entities verwendet
- Empfohlen: Dateien durchgängig als UTF-8 speichern

### Desktop-Only Approach (16:9)
- **Bewusst keine Mobile-Optimierung**: Dashboard für Business-Präsentationen (Beamer, 1920×1080)
- **Min-Width**: 1440px erforderlich
- **Container**: `max-w-presentation` (1800px, 90% von 1920px)

### Technische Schulden
1. **TimelineCompact.tsx**: Erstellt aber nicht verwendet (kann gelöscht werden)
2. **Budget-Donut**: Feste Werte (150px, outer=60, inner=40) statt dynamischer Berechnung

### Optional (nicht implementiert)
- **Time-weighted budget evaluation**: YTD costs vs. expected YTD budget
- **Consistent delta-based RAG**: Ausgaben% − Fortschritt% Threshold
- **CSV validation UI**: Preview/Fehlerliste vor Import
- **Backend/Sync**: Serverless-Persistenz oder Git-PR-Flow

## :memo: Changelog

**Siehe ausführliche Dokumentation in `CHANGELOG.md` und `ROADMAP.md`**

### Version 1.1.0 (2025-10-06)
- **Admin-Portal Phase 1** komplett umgesetzt
  - PIN-Schutz (4-stellig: 0312)
  - Description-Feld hinzugefügt (Textarea)
  - 16:9-Layout (1800px Container)
  - Sticky Header (Navigation verbessert)
  - UX-Redesign (gruppierte Header, größere Felder, Focus-States)
- **Multi-Encoding CSV-Import** (UTF-8 + Windows-1252/ISO-8859-1)
  - Auto-Detection mit Byte-Level Kontrolle
  - Löst Umlaut-Problem bei Excel-Exports
  - UTF-8 BOM beim Export (Excel-kompatibel)
- **Dashboard Header vereinfacht** (nur Datum)
- **Phase 1 & 4 der Roadmap abgeschlossen** ✅

### Version 1.0.0 (2025-01-03)
- **16:9 Desktop-Layout** (1800px Container, kein Mobile)
- **AT 8.2 Compliance** (Filter + Admin Editor)
- **Budget-Donut UX-Redesign** (Grün für Verbleibend, Blau für Ausgegeben)
- **Zeitstatus-Übersicht** (Aggregierte Ampel-Verteilung)
- **ProgressDelta** (Soll–Ist mit Top 3 Verzögerungen)
- **Ressourcen-Features entfernt** (hoursPerMonth, ResourceTile, Capacity)
- **Timeline Heute-Label optimiert** (rechts der Linie, weißer Hintergrund)

### Ältere Änderungen
- Code-Split + Komponentenstruktur (`components/` + `pages/`)
- Admin-Editor (`/admin`): Inline-Tabelle, CSV Import/Export, `localStorage`
- ESLint/Prettier/Vitest/CI ergänzt
- Vercel-Rewrite (`vercel.json`) für SPA-Routen
- Zeitachse mit Legende, Heute-Linie, Monatsticks
- UI komplett auf Deutsch umgestellt

## :page_facing_up: Migrationsleitfaden

### Von altem Layout zu 16:9 Desktop

**Breaking Changes**:
1. **CSV-Format geändert**:
   - **Entfernt**: `hoursPerMonth`
   - **Neu**: `requiresAT82Check`, `at82Completed`

2. **Layout nicht mehr responsive**:
   - Min-width: 1440px erforderlich
   - Nicht für Tablets/Phones geeignet

**Migration Steps**:
1. CSV-Dateien aktualisieren:
   ```csv
   # Alt: id;title;owner;...;hoursPerMonth;org
   # Neu: id;title;owner;...;org;requiresAT82Check;at82Completed
   ```

2. Boolean-Werte in CSV:
   - `true`, `Ja`, `yes`, `1` → true
   - `false`, `Nein`, `no`, `0` → false

3. localStorage prüfen:
   - Falls `projects_json` existiert → CSV neu importieren oder manuell AT 8.2 Felder hinzufügen

## :busts_in_silhouette: Contributors

- **Claude Code** (AI Assistant) – Implementierung & Dokumentation
- **Christian J.** – Requirements & UX Feedback


## Gesamtbudgetplanung
- Neue Route `/overall-budget` bündelt Projektpläne, IT-Kosten und VDB-S Budgets
- Zeigt Plan/ Ist-Kennzahlen, Warnungen und Restbudget

## IT-Cockpit
- Startseite unter `/` mit wichtigsten Kennzahlen
- Kritische Projekte & Budgetüberschreitungen inkl. Deep-Link zu `/projects?highlight=<id>`
- Deadlines, Schnellzugriffe auf alle Bereiche
