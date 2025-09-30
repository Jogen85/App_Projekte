# IT-Projektübersicht (React + Vite + TypeScript)

> ✨ Interaktives Dashboard zur IT-Projektübersicht (GF/Aufsichtsrat) mit CSV-Datenbasis, Jahres-Sicht, Budget/Kosten, Ressourcen-Ampel, Gantt-ähnlicher Zeitachse und einem leichten Admin-Editor (CSV-Edit ohne Backend).

## 🚀 Features

### Dashboard
- **KPI-Kacheln**
  - Projektstatus-Übersicht (laufend/geplant/abgeschlossen)
  - Kapazitätsauslastung (aktueller Monat)
  - **Budget (Jahr)**: Großer Donut mit Hover-Tooltip, Schwellenwert-Farben (Grün ≤90%, Gelb ≤105%, Rot >105%)
    - **Budget-Überschreitung transparent**: Rotes Warning-Banner bei Überschreitung mit präzisem Betrag
    - Donut-Segmente: Ausgegeben + Überschreitung (statt gedeckelt)
  - **Ressourcen (Monat)**: Balkendiagramm + moderne Status-Badge (32px Ping-Animation)
    - Nur **aktive Projekte** zählen zur Ressourcenauslastung
  - **Soll–Ist-Fortschritt**: Interaktive Karte mit klickbaren Kategorien
    - Hinter Plan (rot), Im Plan (gelb), Vor Plan (grün)
    - Einstellbare Toleranz (±Prozentpunkte)
    - Top 3 Verzögerungen (klickbar, scrollt zu Projekt in Tabelle)

- **Projekttabelle**
  - Filter: Status, Gesellschaft, Jahr-Sicht, Soll-Ist-Kategorie
  - Mini-Budget-Donuts je Projekt (Ausgegeben/Verbleibend)
  - RAG-Ampeln (Zeit/Budget) pro Projekt
  - Highlight & Scroll-to bei Klick aus Soll–Ist-Karte
  - Fortschrittsbalken, Restzeit-Anzeige

- **Zeitachse (Gantt-ähnlich)**
  - Status-basierte Farben (Blau: laufend, Gelb mit Schraffur: geplant, Dunkelgrau: abgeschlossen)
  - Fortschritts-Overlay für laufende Projekte
  - Heute-Markierung (vertikale Linie)
  - Monatsticks mit deutschen Abkürzungen

### Admin-Editor (ohne Server)
- `/admin` Route mit Inline-Tabelle
- Projekte anlegen, bearbeiten, löschen
- **CSV importieren/exportieren**
- Lokal speichern (localStorage) → Dashboard liest lokale Daten automatisch
- Optional: Demo-CSV laden von `public/data/projects.csv`

### Technisch
- **React 18** + **Vite 5** + **TypeScript** (Strict Mode)
- **TailwindCSS 3** für modernes UI-Design
- **Recharts** mit Code-Splitting (`React.lazy` + `manualChunks`)
- **Vitest** (58 Tests: RAG-Logik, CSV-Parser, Budget-Überschreitung)
- **ESLint** + **Prettier**, **GitHub Actions CI**

## 📂 Projektstruktur

```
public/
  data/projects.csv        # Demo-CSV (optionaler Import)
src/
  App.tsx                  # Dashboard (orchestriert alle KPI-Karten)
  main.tsx                 # App-Entry, Router ("/", "/admin")
  ui.tsx                   # UI-Primitives (Card, Badge, ProgressBar, COLORS)
  lib.ts                   # Zeit/Datums-Hilfen, RAG-Logik, Budget-Berechnungen
  types.ts                 # Typen (Project, NormalizedProject)
  lib/
    csv.ts                 # CSV-Parser/Serializer (BOM, Quotes, Delimiter-Erkennung)
  components/
    BudgetDonut.tsx        # Budget-Donut mit Überschreitungs-Detektion
    ResourceTile.tsx       # Ressourcen-Balken + Status-Badge
    ProgressDelta.tsx      # Soll–Ist-Karte (klickbare Kategorien, Top-3)
    ProjectsTable.tsx      # Projekttabelle mit Filtern, Mini-Donuts, RAG-Ampeln
    TrafficLight.tsx       # Moderne Status-Badge (32px Ping-Animation)
    Timeline.tsx           # Gantt-Style Timeline
    FiltersPanel.tsx       # Status/Gesellschaft/Jahr-Filter
  pages/
    ProjectsAdmin.tsx      # Admin-Editor (CSV/Inline, localStorage)
  test/
    setup.ts               # Vitest Setup (ResizeObserver Mock)
index.html                 # HTML, UTF-8
vercel.json                # SPA-Rewrite für Vercel
```

## 🔧 Setup & Skripte

```bash
npm ci                 # Dependencies installieren
npm run dev            # Vite-Devserver (HMR, http://localhost:5173)
npm run build          # TypeScript Check + Production Build
npm run preview        # Lokale Preview des Production Builds
npm run typecheck      # TypeScript Build (no emit)
npm run lint           # ESLint Check
npm run format         # Prettier formatieren
npm run test           # Vitest (58 Tests)
npm run test:watch     # Vitest Watch-Modus
```

**Node 18+ empfohlen** (Vite 5 Requirement)

## 🗂️ Datenbasis (CSV)

### Format
Erwartete Spalten (Semikolon `;` oder automatische Erkennung):
```
id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
```

### Felder
- `id`: String (z.B. `p-...`)
- `title`, `owner`, `description`: String
- `status`: `planned` | `active` | `done` (kleingeschrieben in CSV)
- `start`, `end`: Datum `YYYY-MM-DD` oder `DD.MM.YYYY`
- `progress`: 0..100 (Prozent)
- `budgetPlanned`, `costToDate`, `hoursPerMonth`: Zahl ≥ 0
- `org`: z.B. `BB`, `MBG`, `BB/MBG`

### Parser-Features
- Erkennt `;` oder `,` automatisch
- Unterstützt `"..."` Felder mit `""` Escapes
- BOM/NUL-Cleanup, `\r`-Entfernung
- Numerische Normalisierung (Dezimal-Komma/Punkt)

## ✏️ Admin-Editor (ohne Backend)

### Aufruf
`/admin` – Direktaufruf funktioniert auf Vercel dank `vercel.json` SPA-Rewrite

### Funktionen
- **Neu anlegen**: Button „Neu" erstellt leeres Projekt
- **Inline editieren**: Direkt in Tabellenzellen
- **Löschen**: Pro Zeile
- **CSV importieren**: Ersetzt aktuelle Liste (mit Delimiter-Erkennung)
- **CSV exportieren**: Download als `.csv`
- **Speichern (lokal)**: Schreibt in `localStorage.projects_json`

### Dashboard-Integration
- Dashboard lädt automatisch `localStorage.projects_json`, falls vorhanden
- Sonst Fallback zu `DEMO_PROJECTS` in App.tsx
- Optional: Demo-CSV aus `public/data/` importieren

## 📊 Anzeige-Logik (Aktueller Stand)

### Budget (Jahr) – Kachel
- **Großer Donut** mit Hover-Tooltip (Prozent + Euro pro Segment)
- **Farb-Schwellen** (Ausgegeben-Segment):
  - Grün: ≤ 90% Jahresbudget
  - Gelb: ≤ 105%
  - Rot: > 105%
- **Budget-Überschreitung** (Kritischer Fix):
  - Rotes Warning-Banner bei Überschreitung
  - Präziser Betrag und Prozentsatz
  - Donut zeigt **Überschreitungs-Segment** (dunkelrot)
  - Legende ändert sich von "Verbleibend" zu "Überschreitung"

### Ressourcen (Monat) – Kachel
- **Balkendiagramm**: Kapazität vs. geplante Stunden
- **Status-Badge**: Moderne 32px-Dot mit Ping-Animation (GitHub/Slack-Style)
  - Nur **Rot pulsiert** (Gelb/Grün statisch)
  - Tailwind native `animate-ping`
- **Kritischer Fix**: Nur **aktive Projekte** zählen zur Ressourcenauslastung

### Soll–Ist-Fortschritt – Kachel
- **3 klickbare Kategorien**:
  - Hinter Plan (rot): Delta < -Toleranz
  - Im Plan (gelb): Delta innerhalb ±Toleranz
  - Vor Plan (grün): Delta > +Toleranz
- **Einstellbare Toleranz**: ±Prozentpunkte (Standard: 10pp)
- **Top 3 Verzögerungen**: Liste mit größten negativen Deltas
  - Klickbar: Scrollt zu Projekt in Tabelle und hebt es hervor
- **Delta-Berechnung**: Ist-Fortschritt % − Soll-Fortschritt %
  - Soll = (verstrichene Zeit / Gesamtzeit) × 100

### Projekttabelle
- **Mini-Donuts**: Ausgegeben (Blau) / Verbleibend (Grau) – statisch, kein Threshold-Coloring
- **RAG-Ampeln** pro Projekt:
  - **Budget-Ampel**: Rot (>105%), Gelb (>90% & Fortschritt <80%), Grün (sonst)
  - **Zeit-Ampel**: Basiert auf Delta (Fortschritt vs. erwarteter Fortschritt) und Überfälligkeit
- **Filter**: Status, Gesellschaft, Jahr, Soll-Ist-Kategorie, Projekt-Highlight
- **Scroll-to-Highlight**: Bei Klick aus Soll–Ist-Karte

## 🔍 RAG-Logik (Traffic Light)

### Budget RAG
- **Rot**: Kosten > 105% des geplanten Budgets
- **Gelb**: Kosten > 90% UND Fortschritt < 80%
- **Grün**: Sonst

### Zeit RAG
- **Rot**: Überfällig (heute > Enddatum) UND Fortschritt < 100%, ODER Delta < -15pp
- **Gelb**: Delta < -5pp
- **Grün**: Sonst
- Delta = Ist-Fortschritt % − erwarteter Fortschritt %

### Ressourcen RAG
- **Rot**: Genutzte Stunden > Kapazität
- **Gelb**: Genutzte Stunden > 90% Kapazität
- **Grün**: Sonst
- **Wichtig**: Nur **aktive Projekte** zählen

## 🧪 Tests & Qualität

### Test-Suites (58 Tests, alle passing)
- **`lib.test.ts`** (23 Tests): Datums-Utils, RAG-Logik Edge-Cases
- **`csv.test.ts`** (21 Tests): Delimiter-Erkennung, Quote-Escaping, BOM-Handling, Numerische Normalisierung
- **`BudgetDonut.test.tsx`** (14 Tests): Überschreitungs-Detektion, Schwellenwerte, Edge-Cases

### Tooling
- **ESLint** + **Prettier** für Code-Qualität
- **Vitest** + `@testing-library/react` (jsdom)
- **ResizeObserver Mock** für Recharts-Komponenten
- **Code-Splitting**: Charts/Tabelle via `React.lazy`, Vite `manualChunks` für Vendor-Bundles

## 🚢 Deployment (Vercel)

### Build
```bash
npm run build
```

### SPA-Rewrite
`vercel.json`:
```json
{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}
```
→ Funktioniert mit Direktaufrufen wie `/admin` (Client-Router übernimmt)

## 🗒️ Wichtige Änderungen & Fixes

### ✅ Budget-Transparenz & Fachliche Fixes (2025-01-30, Commit eb3c411)
**Kritisch für GF/Aufsichtsrat-Oversight**:

1. **Budget-Überschreitung transparent**
   - **Problem**: `Math.min()` cappte Anzeige bei 100%, versteckte kritische Überschreitungen
   - **Lösung**: Rotes Warning-Banner, Überschreitungs-Segment im Donut, präzise Beträge
   - 14 neue Tests für alle Edge-Cases

2. **Ressourcen nur für aktive Projekte**
   - **Problem**: Geplante/abgeschlossene Projekte inflatierten Kapazitätsauslastung
   - **Lösung**: Filter `statusNorm === 'active'` in Ressourcenberechnung
   - Realistischere Kapazitätsplanung

3. **React Hooks Dependencies**
   - `today` zu allen date-basierten `useMemo`/`useCallback` Dependencies hinzugefügt
   - Verhindert stale Closures bei Datumsberechnungen

### ✅ Status-Indikator Modernisierung (2025-01-30, Commit b751ed7)
- **Alte Version**: 3D-Bezel mit komplexen Gradienten (88 Zeilen)
- **Neue Version**: Moderne 32px Status-Badge mit Ping-Animation
  - GitHub/Slack/Linear-inspiriert
  - Tailwind native `animate-ping` (nur Rot pulsiert)
  - Container: w-16 (64px) für genug Raum
  - Keine Overflow-Probleme mehr

### ✅ Soll–Ist Feature (vor eb3c411)
- Ersetzt Burndown-Chart durch interaktive ProgressDelta-Karte
- Klickbare Kategorien filtern Projekttabelle
- Einstellbare Toleranz für "Im Plan"-Band
- Top 3 Verzögerungen mit Click-to-Scroll Highlighting

## 💡 Bekannte Punkte / Empfehlungen

### Optional für zukünftige Verbesserungen
- **Zeitgewichtete Budget-Bewertung**: AusgabenYTD vs. erwarteter Budget-YTD (weniger Verzerrung am Jahresende)
- **Konsistente Delta-basierte RAG**: Ausgaben% − Fortschritt% Schwellenwerte für alle Indikatoren
- **Mini-Donut-Farbe an Ampel koppeln**: Threshold-Coloring auch in Projekttabelle
- **CSV-Validierung**: Preview/Fehlerliste vor Import im Admin
- **Backend/Sync**: Serverless Persistence oder Git-PR-Flow für Zusammenarbeit

### Encoding & i18n
- **UTF-8** durchgängig
- **UI komplett Deutsch**:
  - "Verantwortlicher MA" (nicht "Owner")
  - "Gesellschaft" (nicht "Org")
  - "Fortschritt %" (nicht "% prog")
  - Status: "geplant", "laufend", "abgeschlossen"
- Legacy HTML-Entities in README für historische Kompatibilität

## 📋 Changelog (Relevante Highlights)

- **2025-01-30**: Budget-Überschreitung transparent, Ressourcen nur aktive Projekte, Status-Badge Modernisierung, 55 neue Tests
- **2025-01-XX**: Soll–Ist-Fortschritt-Karte, klickbare Kategorien, Top-3 Verzögerungen
- **2024-XX-XX**: Code-Split + Komponentenstruktur, Budget-Donut Redesign, Admin-Editor, ESLint/Prettier/Vitest/CI

## 🔗 Links & Ressourcen

- **Vercel Deployment**: Auto-Deploy aus `main` Branch
- **Tech Stack**: React 18, Vite 5, TypeScript, TailwindCSS 3, Recharts
- **Testing**: Vitest mit jsdom, 58 Tests passing

---

**Entwickelt für GF/Aufsichtsrat-Reporting mit Fokus auf Transparenz, Usability und Performance.**
