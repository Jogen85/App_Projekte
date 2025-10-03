# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### 16:9 Desktop-Optimierung & UX-Verbesserungen (2025-01-03)

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
