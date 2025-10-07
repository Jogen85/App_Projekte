# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]
- feat: Cockpit als neue Startseite mit Projekt-/Budget-KPIs
- feat: Gesamtbudgetplanung-Tab (Projekte, IT-Kosten, VDB-S)
- refactor: Projektdashboard fokussiert auf Projektkosten, neue Highlight-URL-Parameter
- chore: Jahresbudget-Verwaltung in Gesamtbudget-Admin verschoben


## [1.4.0] - 2025-10-07

### UX-Verbesserungen & Redundanz-Beseitigung

#### Added
- **Genehmigungspflicht-Indikator** (Budget ≥ €75.000)
  - 🔐 Icon mit Tooltip "Genehmigungspflichtig (Budget ≥ €75.000)" in Projekttabelle
  - Position: Neben "Budget"-Label in Budget-Spalte
  - Prüfung: `p.budgetPlanned >= 75000`
  - Tooltip via `title` Attribut (konsistent mit bestehendem UX-Pattern)
  - Datei: `src/components/ProjectsTable.tsx` Zeile 101-106

- **Neue Komponente: ProjectDelays.tsx**
  - Zeigt **ALLE** verzögerten Projekte (nicht nur Top 3)
  - Nur laufende Projekte: `projects.filter(p => p.statusNorm === 'active')`
  - Sortiert nach Delta (schlechteste zuerst)
  - Klickbar zum Highlighten in Tabelle
  - Scrollbar bei vielen Einträgen
  - Empty State: "Alle laufenden Projekte im Plan! 🎉"
  - Props: `projects`, `tolerance`, `onSelectProject`
  - 84 Zeilen, vollständig getestet

#### Changed
- **ProgressDelta.tsx umfassend erweitert**
  - **Entfernt**: Top 3 Verzögerungen-Liste (29 Zeilen)
  - **Entfernt**: `onSelectProject` Prop (nicht mehr benötigt)
  - **Hinzugefügt**: Größere Buttons (py-4, text-2xl statt py-2, text-lg)
  - **Hinzugefügt**: Durchschnitts-Delta pro Kategorie ("Ø -12.5%")
  - **Hinzugefügt**: Gesamt-Statistik ("20 laufende Projekte")
  - **Hinzugefügt**: Verteilungsbalken (Rot/Gelb/Grün) mit Prozent-Labels
  - **Hinzugefügt**: Vertikale Zentrierung (`justify-center`)
  - Nur laufende Projekte (filter on `statusNorm === 'active'`)
  - Berechnung: `avgBehind`, `avgOntrack`, `avgAhead` im useMemo
  - +53 Zeilen (neue Features), -29 Zeilen (Top 3 raus)

- **App.tsx: Layout-Änderung**
  - `TimeStatusOverview` entfernt (Redundanz zu ProgressDelta)
  - `ProjectDelays` an Stelle von TimeStatusOverview
  - Layout: `[Budget] [Verzögerungen] [Soll-Ist]`
  - Titel erweitert: "Soll-Ist-Fortschritt (laufende Projekte)"
  - `filteredByProgress` nur laufende Projekte: `p.statusNorm === 'active'`

#### Removed
- **TimeStatusOverview.tsx** (nicht mehr verwendet)
  - Problem: Redundanz zu ProgressDelta (beide messen Soll-Ist-Delta)
  - TimeStatusOverview: Grün/Gelb/Rot mit fixen Schwellen (-5pp, -15pp)
  - ProgressDelta: Hinter/Im/Vor Plan mit adjustierbarer Toleranz
  - Entscheidung: Eine Metrik = Eine Darstellung
  - Komponente bleibt im Code (für Cleanup später)

#### Fixed
- **Kategorie-Filter nur laufende Projekte**
  - **Problem**: Klick auf "Hinter Plan" zeigte alle Projekte (inkl. geplante 0/0, abgeschlossene 100/100)
  - **Lösung**: `filteredByProgress` filtert zusätzlich auf `statusNorm === 'active'`
  - **Resultat**: Nur steuerbare, aktive Projekte bei Kategorie-Filter
  - **Konsistenz**: Beide Kacheln (Verzögerungen + Soll-Ist) zeigen gleiche Projektmenge

#### Technical Details
- **4 Dateien geändert**: 140 Zeilen hinzugefügt, 32 entfernt
- **Dateien**:
  - `src/components/ProjectDelays.tsx`: Neue Komponente (+84 Zeilen)
  - `src/components/ProgressDelta.tsx`: Erweitert (+53 Zeilen), Top 3 entfernt (-29 Zeilen)
  - `src/App.tsx`: Layout-Änderung, filteredByProgress fix (+5 Zeilen, -3 Zeilen)
  - `src/components/ProjectsTable.tsx`: Genehmigungspflicht-Icon (+3 Zeilen)
- **Tests**: ✅ 49/49 passed (keine neuen Tests, da UI-Feature)
- **Build**: ✅ Erfolgreich
- **Commits**:
  - `4cad552`: feat: Genehmigungspflicht-Indikator für Projekte ≥ €75.000
  - `9b2651e`: fix: Soll-Ist-Fortschritt nur laufende Projekte (konsistent mit Zeitstatus)
  - `9b44723`: feat: Soll-Ist-Fortschritt Titel + konsistente Filterung (nur laufende)
  - `bfa3c92`: refactor: Redundanz beseitigt - Verzögerungen-Kachel statt TimeStatusOverview
  - `eafee83`: feat: Soll-Ist-Kachel erweitert - bessere Informationsdichte

---

## [1.3.0] - 2025-10-06

### Jahresbudget-Verwaltung & Anteilige Budgetberechnung

#### Added
- **Jahresbudget-Verwaltung im Admin-Portal**
  - Neue Tabelle oberhalb der Projekttabelle
  - CRUD-Funktionen: Jahr | Budget (€) | Aktion
  - Button "+ Weiteres Jahr" zum Hinzufügen neuer Jahresbudgets
  - localStorage: `yearBudgets` (Array von `{year: number, budget: number}`)
  - Separiert von `projects_json` für unabhängige Verwaltung

- **Editierbarkeit nach Zeitraum**
  - **Aktuelles Jahr (2025)**: Voll editierbar
  - **Nächstes Jahr (2026)**: Voll editierbar (für Vorausplanung)
  - **Vergangene Jahre**: Readonly, ausgegraut, Label "Gesperrt (Vergangenheit)"
  - Button "Löschen" nur für editierbare Jahre sichtbar

- **Dashboard: Zwei Vergleichsebenen**
  - BudgetDonut zeigt Jahresbudget vs. Ausgaben (falls konfiguriert)
  - Card-Titel dynamisch: "Budget 2025: €500.000" (mit Jahresbudget)
  - Fallback: "Budget (Jahr): €XXX" (ohne Jahresbudget, wie bisher)
  - Neue Info-Zeile: "Projektbudgets geplant: €308.000" (anteilig)
  - Nur sichtbar wenn Jahresbudget konfiguriert

- **Warnung bei Überplanung**
  - Admin-Portal: Roter Banner "⚠️ Projektbudgets (€308k) übersteigen Jahresbudget (€350k)"
  - Dashboard: Banner oberhalb KPIs bei Überplanung
  - Prüfung pro Jahr: Nur wenn Jahresbudget konfiguriert
  - Anteilige Berechnung: Mehrjährige Projekte fair auf Jahre verteilt

- **Type Definition**
  - `YearBudget = {year: number, budget: number}`
  - Export in `src/types.ts`
  - Import in Admin & Dashboard

#### Changed
- **BudgetDonut erweitert**
  - Neue Props: `yearBudget?: number | null`, `projectBudgetSum?: number`
  - Info-Zeile zeigt geplante Projektbudgets (nur wenn Jahresbudget gesetzt)
  - Fallback-Logik: Ohne Jahresbudget → wie bisher (nur Projektsummen)
  - Keine Breaking Changes für bestehende Implementierungen

- **Dashboard-Logik**
  - Lädt Jahresbudgets aus localStorage beim Mount
  - `currentYearBudget` useMemo: Findet Budget für aktuelles Jahr
  - `effectiveBudget`: Jahresbudget (falls vorhanden) oder Projektsumme
  - `showOverBudgetWarning`: Prüft Projektbudgets > Jahresbudget

#### Fixed
- **Anteilige Budgetberechnung vereinheitlicht** (Bugfix)
  - **Problem**: Admin zählte volle Projektbudgets (€425k), Dashboard anteilige (€308k)
  - **Root Cause**: Admin nutzte `p.budgetPlanned` direkt, Dashboard `plannedBudgetForYearD`
  - **Lösung**: Admin nutzt jetzt gleiche anteilige Logik wie Dashboard
  - **Berechnung**: Projekt 2024-2026, €150k → €75k für 2025 (365 / 730 Tage)
  - **Resultat**: Konsistenz zwischen Admin und Dashboard
  - Import in Admin: `overlapDays`, `daysBetween`, `yearStart`, `yearEnd`
  - Code: `src/pages/ProjectsAdmin.tsx` Zeile 230-238

#### Technical Details
- **4 Dateien geändert**: 233 Zeilen hinzugefügt, 11 entfernt
- **Dateien**:
  - `src/types.ts`: YearBudget Type (+5 Zeilen)
  - `src/pages/ProjectsAdmin.tsx`: Jahresbudget-Tabelle + CRUD + Warnungen (+120 Zeilen)
  - `src/App.tsx`: Jahresbudget laden, Warnung, BudgetDonut-Integration (+30 Zeilen)
  - `src/components/BudgetDonut.tsx`: yearBudget/projectBudgetSum Props (+10 Zeilen)
- **Tests**: ✅ 49/49 passed (keine neuen Tests, da UI-Feature)
- **Build**: ✅ Erfolgreich
- **Commits**:
  - `93a792b`: feat: Jahresbudget-Verwaltung mit Überplanungs-Warnung
  - `c1ddc90`: fix: Budgetberechnung vereinheitlichen (anteilige Jahresberechnung)

#### Migration Notes
- **Keine Breaking Changes**
- Bestehende Installationen: Funktionieren ohne Jahresbudget-Konfiguration wie bisher
- Opt-in: Jahresbudget im Admin-Portal konfigurieren → Dashboard zeigt automatisch neue Features
- localStorage: `yearBudgets` wird automatisch initialisiert (leeres Array)

---

## [1.2.0] - 2025-10-06

### Projektnummern & Klassifizierung (Phase 5 #1 komplett)

#### Added
- **Projektnummern-System**
  - `projectNumberInternal` (Pflichtfeld): z.B. PINT-2025-001
  - `projectNumberExternal` (Optional): z.B. VDB-2025-042, ERECH-2025-01
  - Anzeige in Dashboard-Tabelle (neue Spalte "Projektnummer")
    - Intern: font-mono, normale Größe
    - Extern: font-mono, klein, grau (falls vorhanden)
  - Eingabe im Admin-Portal (2 neue Spalten: w-32)
    - Intern: Pflicht, Placeholder "PINT-YYYY-NNN"
    - Extern: Optional, Placeholder "VDB-YYYY-NNN"

- **Klassifizierung-System** (4 Typen)
  - `classification`: 'internal_dev' | 'project' | 'project_vdbs' | 'task'
  - Badge-Anzeige in Dashboard-Tabelle mit Farbcodierung:
    - **Interne Weiterentwicklung** → Purple (`bg-purple-100 text-purple-700`)
    - **Projekt** → Blue (`bg-blue-100 text-blue-700`)
    - **Projekt VDB-S** → Cyan (`bg-cyan-100 text-cyan-700`)
    - **Aufgabe** → Slate (`bg-slate-100 text-slate-700`)
  - Admin-Portal: Select-Dropdown (4 Optionen, w-40)
  - Filter: Klassifizierung-Dropdown in FiltersPanel

- **21 reale Projekte** als DEMO_PROJECTS
  - Basis: `projekte_template_2025-10-06.csv`
  - Alle Namen korrigiert (Christian Jürgens, Jens Körtge, etc.)
  - Projektnummern deterministisch generiert:
    - Alle: PINT-2025-001 bis PINT-2025-021
    - 70% mit externen Nummern (VDB/CRM/ERECH/DORA)
    - 3 ohne externe Nummer (p7, p10, p11)
  - Klassifizierung verteilt:
    - 7× project_vdbs (33%)
    - 8× project (38%)
    - 4× internal_dev (19%)
    - 2× task (10%)
  - Statistik:
    - 7 laufend, 3 abgeschlossen, 11 geplant
    - 4× AT 8.2 erforderlich, 1× durchgeführt
    - Budget: 335.000 € geplant, 228.500 € ausgegeben
    - Organisationen: BB (12), MBG (3), BB/MBG (3), Mixed

#### Changed
- **Badge-Komponente erweitert** (`src/ui.tsx`)
  - Neue Farben: `blue`, `purple`, `cyan`
  - Type: `"green"|"amber"|"slate"|"blue"|"purple"|"cyan"`
  - Alle Tailwind-Klassen: `bg-{color}-100 text-{color}-700`

- **Dashboard ProjectsTable**
  - 2 neue Spalten nach "Projekt":
    - **Projektnummer** (intern + extern wenn vorhanden)
    - **Klassifizierung** (Badge mit Farbe)
  - Spalten-Anzahl: 7 → 9

- **Admin-Portal ProjectsAdmin**
  - 3 neue Spalten zwischen "ID" und "Titel":
    - **Projektnr. intern** (Input, required)
    - **Projektnr. extern** (Input, optional)
    - **Klassifizierung** (Select mit 4 Optionen)
  - emptyProject() Default: `projectNumberInternal: ''`, `classification: 'project'`

- **Filter-System**
  - FiltersPanel: Neuer Dropdown "Klassifizierung"
  - App.tsx: `classificationFilter` State + Filter-Logik
  - Dependency in filtered useMemo hinzugefügt

- **CSV-Format** (`src/lib/csv.ts`)
  - REQUIRED_FIELDS erweitert: 13 → 16 Felder
  - Neue Felder: `projectNumberInternal`, `projectNumberExternal`, `classification`
  - Parser: Defaults für fehlende Werte (intern='', classification='project')
  - Export: Alle 16 Felder im korrekten Format

#### Fixed
- **localStorage-Reset für neue DEMO_PROJECTS**
  - Problem: Alte 6 Demo-Projekte in localStorage gespeichert
  - Lösung: `localStorage.removeItem('projects_json')` beim App-Start (einmalig)
  - Nach erstem Laden: Nutzer sieht neue 21 Projekte
  - Code-Kommentar: "TEMP: kann nach erstem Laden entfernt werden"

#### Technical Details
- **10 Dateien geändert**: 290 Zeilen hinzugefügt, 80 entfernt
- **Dateien**:
  - `src/types.ts`: 3 neue Felder
  - `src/lib/csv.ts`: REQUIRED_FIELDS + Parser-Logik
  - `src/App.tsx`: 21 DEMO_PROJECTS, classificationFilter, localStorage-Reset
  - `src/pages/ProjectsAdmin.tsx`: 21 DEMO_PROJECTS, 3 neue Spalten
  - `src/components/ProjectsTable.tsx`: 2 neue Spalten mit Badges
  - `src/components/FiltersPanel.tsx`: Klassifizierung-Dropdown
  - `src/ui.tsx`: Badge-Erweiterung
  - `src/lib/csv.test.ts`: 12 Tests aktualisiert (neue Felder)
  - `src/components/BudgetDonut.test.tsx`: 1 Test-Fix (duplicate assertion)
- **Tests**: ✅ 49/49 passed
- **Build**: ✅ Erfolgreich
- **Commits**:
  - `170e9c1`: WIP Datenmodell (40%)
  - `750b638`: Feature komplett (100%)
  - `aa35e2d`: 21 reale Projekte
  - `a9e7ee4`: localStorage-Reset Fix

---

## [1.1.0] - 2025-10-06

### Admin-Portal Phase 1 Komplett + UX-Verbesserungen

#### Added
- **PIN-Schutz für Admin-Portal** (4-stellig: 0312)
  - Session-basiert (sessionStorage)
  - Einfache numerische Eingabe
  - Komponente: `src/components/PINProtection.tsx`
  - Schützt `/admin` Route vor unberechtigtem Zugriff

- **Description-Feld im Admin-Portal**
  - Textarea-Spalte in Admin-Tabelle (zwischen Titel und Verantwortlicher MA)
  - Mehrzeilige Eingabe möglich (min-h-70px)
  - War im Datenmodell vorhanden, fehlte aber in UI

- **Multi-Encoding CSV-Import** (UTF-8 + Windows-1252/ISO-8859-1)
  - Auto-Detection mit Byte-Level Kontrolle
  - Versucht UTF-8 mit fatal flag → Fallback zu Windows-1252
  - Löst Umlaut-Problem bei Excel-Exports (ü, ö, ä, ß)
  - Neue Funktion: `readFileAsText()` in `csv.ts`

- **UTF-8 BOM beim CSV-Export**
  - Fügt Byte Order Mark (U+FEFF) hinzu
  - Excel erkennt UTF-8 automatisch
  - Keine Umlaut-Probleme mehr beim Öffnen in Excel

- **Sticky Header für Admin-Tabelle**
  - Header bleibt beim vertikalen Scrollen oben sichtbar
  - Max-Height Container: `calc(100vh-250px)`
  - Horizontal-Scroll sofort verfügbar (nicht erst nach unten scrollen)
  - Bessere Navigation bei 20+ Projekten

- **ROADMAP.md erstellt**
  - 12 Features in 5 Phasen strukturiert
  - Status-Legende (⏳ Geplant, 🔄 In Arbeit, ✅ Erledigt)
  - Definition of Ready & Definition of Done
  - Basiert auf `offene-weiterentwicklungen.md`

#### Changed
- **Dashboard Header vereinfacht**
  - Vorher: "Portfolio-Überblick für Geschäftsführung & Aufsichtsrat — Stand: 06.10.2025"
  - Nachher: "Stand: 06.10.2025"
  - Reduziert visuellen Lärm

- **Admin-Portal 16:9-Layout**
  - Container: `max-w-7xl` (1280px) → `max-w-presentation` (1800px)
  - Konsistent mit Dashboard-Layout
  - Bessere Ausnutzung von Breitbildschirmen

- **Admin-Portal UX komplett überarbeitet**
  - **Gruppierte Header** mit Farbcodes:
    - Blau: Stammdaten (ID, Titel, Beschreibung, MA, Status)
    - Gelb: Zeitplan (Start, Ende, Fortschritt)
    - Grün: Budget (Budget, Kosten, Gesellschaft)
    - Lila: AT 8.2 Compliance
  - **Größere Eingabefelder**: `px-2 py-1.5` (war: `px-1`)
  - **Focus-States**: Farbige Ringe (Ring-2) pro Gruppe
  - **Hover-Effekte**: Zeilen heben sich hervor
  - **Bessere Buttons**:
    - "Neu" → Blau mit Icon (+ Neu)
    - "Speichern" → Grün
    - "Löschen" → Rot mit Icon (🗑️)
  - **Placeholders** für alle Eingabefelder
  - **Größere Checkboxen**: 5×5 (war: Standard)

- **Datumsfelder korrekt laden**
  - Neue Funktion: `toISODate()` in `lib.ts`
  - Konvertiert deutsche Daten (`DD.MM.YYYY`) zu ISO (`YYYY-MM-DD`)
  - Verhindert Überschreiben beim Öffnen von Admin-Formularen

- **CLAUDE.md aktualisiert**
  - `npm run test -- --coverage` Command hinzugefügt
  - Lazy-Loading Referenz korrigiert (ResourceTile → TimeStatusOverview)

#### Fixed
- **UTF-8 Umlaute-Problem beim CSV-Import** (komplett gelöst)
  - Root Cause: CSV in ISO-8859-1/Windows-1252 statt UTF-8
  - Browser's `file.text()` wählte falsch → Umlaute als `�`
  - Lösung: Byte-Level Detection mit TextDecoder fatal flag
  - Funktioniert mit UTF-8, Windows-1252, ISO-8859-1

#### Technical Details
- **7 Dateien geändert**, 699 Zeilen hinzugefügt, 46 entfernt
- **Neue Dateien**:
  - `src/components/PINProtection.tsx` (104 Zeilen)
  - `ROADMAP.md` (402 Zeilen)
- **TypeScript-Check**: ✅ Alle erfolgreich
- **5 Commits** in dev-Branch

---

## [1.0.0] - 2025-01-03

### 16:9 Desktop-Optimierung & UX-Verbesserungen

#### Added
- **16:9 Desktop-Layout** für Business-Präsentationen (1920×1080 / Beamer)
  - Container: `max-w-presentation` (1800px, 90% von 1920px)
  - Keine Mobile-Optimierung mehr (min-width: 1440px)
  - Alle Inhalte auf einer Bildschirmseite ohne vertikales Scrolling (außer Tabelle)

- **AT 8.2 Compliance-Tracking**
  - Neue Felder: `requiresAT82Check` und `at82Completed` (boolean)
  - Spalten in ProjectsTable mit zweizeiligem Header
  - Filter in FiltersPanel (2 Dropdowns)
  - Admin CSV Editor mit Checkboxen
  - Demodaten mit AT 8.2 Werten gefüllt (4/6 Projekte erforderlich, 2/4 durchgeführt)

- **TimeStatusOverview-Komponente**
  - Aggregate Ampel-Verteilung statt individuelle Projekt-Liste
  - 3 große Status-Kreise (48px): Grün (Im Plan), Gelb (Verzug), Rot (Kritisch)
  - Prozentuale Verteilung + Gesamtzähler

- **TimelineCompact-Komponente** (erstellt, aber nicht verwendet)
  - Schmale 4-Zeilen-Variante für KPI-Kachel
  - Heute-Marker, erste 4 Projekte + Zähler

#### Changed
- **Layout-Struktur neu organisiert**
  - Header: 80px (1-zeilig, Filter rechts)
  - KPI-Zeile: 3 Kacheln (120px) – Laufend/Geplant/Abgeschlossen
  - Chart-Zeile: 3 Kacheln (280px) – Budget/Zeitstatus/Soll-Ist
  - ProjectsTable: max-height 520px mit Scrollbar
  - Timeline: Vollständig am Ende

- **Budget-Donut komplett neugestaltet** (UX-optimiert)
  - **Alte Logik** (verwirrend): Grün für "Ausgegeben", Grau für "Verbleibend"
  - **Neue Logik** (intuitiv):
    - **Verbleibend** = wichtig: Grün (>20% frei), Gelb (10-20%), Rot (<10%)
    - **Ausgegeben** = neutral: Immer Blau
  - Reihenfolge umgedreht: Verbleibend zuerst (prominent)
  - Legende: "Verbleibend" hervorgehoben (font-medium)
  - Chart-Höhe: 150px (fest statt dynamisch)
  - Radius: outer=60px, inner=40px (feste Werte)

- **ProgressDelta Darstellung**
  - "pp" (Prozentpunkte) → "%" (bessere Verständlichkeit für nicht-technische User)
  - Delta-Werte: z.B. "-5.3%" statt "-5.3 pp"

- **Timeline "Heute"-Label Position**
  - Finale Position: `-top-7 left-1` (rechts neben Linie, 28px über Achse)
  - Weißer Hintergrund + Border (bg-white px-1 rounded border border-rose-200)
  - z-10 für korrekte Layer-Reihenfolge
  - Keine Überlappung mehr mit Monats-Labels oder Projekt-Balken

- **Card-Komponente robuster**
  - Flex-Container: `flex flex-col`
  - Content-Wrapper: `flex-1 min-h-0 overflow-hidden`
  - Title: `flex-shrink-0`
  - Verhindert Overflow bei Chart-Komponenten

- **ProjectsTable**
  - AT 8.2 Spalten hinzugefügt (zweizeiliger Header)
  - Budget-Fortschrittsbalken statt Mini-Donuts
  - Target-Progress-Visualisierung (Soll-Fortschritt als schwarze Linie)
  - Card-Wrapper entfernt (sitzt jetzt in App.tsx)

- **Tailwind-Config erweitert**
  - `max-w-presentation`: 1800px
  - `h-kpi`: 120px
  - `h-chart`: 280px
  - `h-table`: 520px

#### Fixed
- **Budget-Overspend Transparenz**
  - Math.min/max Capping entfernt
  - Überschreitung jetzt korrekt sichtbar (roter Banner + dark-red Segment)
  - 14 Tests hinzugefügt (BudgetDonut.test.tsx)

- **Resource Calculation**
  - Nur `active` Projekte zählen (nicht planned/done)
  - Realistischere Kapazitätsplanung

- **React Hooks Dependencies**
  - `today` in useMemo/useCallback Dependencies hinzugefügt
  - Verhindert stale Date-Berechnungen

- **Chart-Overflow-Probleme**
  - BudgetDonut: Legende schnitt ab → Flexbox + overflow-y-auto
  - ProgressDelta: Top 3 Liste lief über → flex-1 min-h-0
  - Alle Chart-Komponenten nutzen konsistentes Flexbox-Layout

- **CSV Parser Verbesserungen**
  - German number format: "10.000,50" → 10000.5
  - Boolean parsing: "Ja"/"Nein"/"Yes"/"No" → true/false
  - REQUIRED_FIELDS aktualisiert: AT 8.2 Felder hinzugefügt, hoursPerMonth entfernt

#### Removed
- **Ressourcen-Features komplett entfernt**
  - ResourceTile.tsx
  - ResourceBar.tsx
  - calcResourceRAG Funktion
  - hoursPerMonth Feld
  - Capacity State & Calculations
  - 31 Zeilen Resource RAG Tests

- **Burndown-Chart entfernt**
  - BurndownChart.tsx gelöscht
  - Durch ProgressDelta (Soll-Ist) ersetzt

- **Mobile-Optimierung entfernt**
  - Viewport Meta-Tag entfernt
  - Responsive Breakpoints (sm:/lg:) wo möglich entfernt
  - min-width: 1440px im Body

---

## Version History (vor dieser Session)

### Zeitachse & i18n (2025-09-11 bis 2025-09-16)
- Timeline als eigene Komponente mit Gantt-ähnlicher Darstellung
- Heute-Linie (vertikal durch alle Projekte + Achse)
- Monats-Ticks mit deutschen Abkürzungen
- UI komplett auf Deutsch umgestellt
- Status-Labels: "geplant", "laufend", "abgeschlossen"

### Soll-Ist Feature (2025-09-14)
- ProgressDelta-Komponente (ersetzt Burndown)
- Clickable Kategorien (Hinter Plan / Im Plan / Vor Plan)
- Adjustable Toleranz (±pp)
- Top 3 Verzögerungen mit Click-to-Scroll

### Budget Transparency & Critical Fixes (2025-09-30)
- Budget Overspend Detection (roter Banner)
- Resource Calculation Fix (nur active projects)
- 55 neue Tests (CSV parser, RAG edge cases)
- React Hooks Dependencies korrigiert

### Status Badge Modernisierung (2025-09-30)
- 3D Bezel Traffic Light → Modern Status Badge
- 32px Dot mit Ping-Animation (Tailwind native)
- GitHub/Slack/Linear inspired Design

---

## Testing

**Current Coverage**: 58 Tests passing
- `lib.test.ts`: 23 Tests (Date utils, RAG logic)
- `csv.test.ts`: 21 Tests (Delimiter detection, quote escaping, BOM, German numbers)
- `BudgetDonut.test.tsx`: 14 Tests (Overspend, thresholds, edge cases)

**ResizeObserver Mock**: `src/test/setup.ts` (für Recharts)

---

## Technische Schulden / Bekannte Einschränkungen

1. **TimelineCompact.tsx**: Erstellt aber nicht verwendet (kann gelöscht werden)
2. **Timeline.tsx**: Bleibt erhalten, wird aber am Ende angezeigt
3. **Budget-Donut**: Feste Werte (150px, outer=60, inner=40) statt dynamischer Berechnung
4. **Admin-Link**: Nur im Header, kein Footer-Link
5. **Mobile**: Bewusst keine Optimierung (Desktop-only für Business-Präsentationen)

---

## Migrationsleitfaden

### Von altem Layout zu 16:9 Desktop

**Breaking Changes**:
1. CSV-Format geändert:
   - **Entfernt**: `hoursPerMonth`
   - **Neu**: `requiresAT82Check`, `at82Completed`

2. Layout nicht mehr responsive:
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

---

## Roadmap / Future Enhancements

### Optional (nicht implementiert)
- Time-weighted budget evaluation (YTD vs. expected YTD)
- Consistent delta-based RAG (Ausgaben% - Fortschritt%)
- Mini-donut coloring gekoppelt an RAG thresholds
- CSV validation UI mit Preview/Errors
- Backend/Sync (Serverless oder Git-basiert)
- PDF/Excel Export
- Multi-User Collaboration

---

## Contributors

- Claude Code (AI Assistant) - Implementierung & Dokumentation
- Christian J. - Requirements & UX Feedback
