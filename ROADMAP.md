# IT Portfolio Dashboard – Roadmap & Backlog

*Letzte Aktualisierung: 6. Oktober 2025*

Diese Roadmap definiert geplante Features und Verbesserungen für das IT Portfolio Dashboard. Jeder Punkt enthält Beschreibung, Akzeptanzkriterien, technische To-Dos und den aktuellen Status.

---

## Status-Legende

- ⏳ **Geplant** – Noch nicht begonnen
- 🔄 **In Arbeit** – Aktuell in Entwicklung
- ✅ **Erledigt** – Umgesetzt und deployed
- ⏸️ **Zurückgestellt** – Vorerst nicht priorisiert

---

## Priorisierung

**Phase 1 (Kritisch)**: Admin-Portal-Korrekturen → Datenintegrität & Usability
**Phase 2 (Wichtig)**: Budget & IT-Kosten → Compliance & Transparenz
**Phase 3 (Wertvoll)**: Listen & Fortschritt → UX-Optimierung
**Phase 4 (Qualität)**: CSV/UTF-8 → Technische Schulden
**Phase 5 (Erweitert)**: Klassifizierung/Projektnummern → Erweiterte Features

---

## Phase 1: Admin-Portal-Korrekturen (Kritisch)

### #3 Admin-Portal: Schutz, Felder & Usability ⏳

**Ziel**: Sicheres und komfortables Administrieren

**Beschreibung**:
- Admin-Portal mit PIN-Schutz absichern
- Fehlende Pflichtfelder ergänzen (z.B. **Beschreibung/Description**)
- Datumsfelder korrekt laden und anzeigen
- Uhrzeitformat einheitlich (HH:mm, z.B. 16:09)
- Eingabemasken optisch und ergonomisch verbessern

**Akzeptanzkriterien**:
- [x] Admin-Zugang erhält zusätzlichen PIN-Schutz
- [x] Felder **Beschreibung/Description** vorhanden und validiert
- [x] Start-/Ende-Felder zeigen vorhandene Daten korrekt an
- [x] Zeitformat **HH:mm** konsistent
- [x] Überarbeitete Eingabemaske (Tab-Reihenfolge, Field-Help, Fehlerhinweise)

**Technische To-Dos**:
- [ ] PIN-Middleware/2nd-Factor für Admin-Routen implementieren
- [ ] Form-Schema erweitern (`description` als Pflichtfeld)
- [ ] Migrationsskript für bestehende Records erstellen
- [ ] Datums-/Zeitkomponenten prüfen (Timezone/Locale)
- [ ] Default-Werte fixen (kein Überschreiben beim Öffnen)
- [ ] UI-Refit (Labels, Platzhalter, Hilfetexte, Responsivität)

**Dateien**:
- `src/pages/ProjectsAdmin.tsx`
- `src/types.ts` (Schema erweitern)

---

### #6 Admin-Dashboard: Zeitformat & Masken-Refresh ⏳

**Ziel**: Einheitliche Darstellung und bessere Bedienbarkeit

**Beschreibung**:
- Konsistentes **HH:mm-Zeitformat** (16:09) in allen Admin-Ansichten
- Optisch "hübschere" Eingabemaske (Spacing, Gruppierung, Tooltips)

**Akzeptanzkriterien**:
- [x] Alle Zeitfelder im Admin im Format HH:mm
- [x] Visuelle Konsistenz (Abstände, Gruppen-Header, Inline-Hilfen)

**Technische To-Dos**:
- [ ] UI-Komponenten zentralisieren (Date/Time-Picker)
- [ ] Style-Guide anwenden (Typografie, Abstände, States)
- [ ] TailwindCSS Custom Utilities erweitern

**Dateien**:
- `src/pages/ProjectsAdmin.tsx`
- `src/ui.tsx` (neue Time-Picker-Komponente)

---

### #7 Korrektur: Start/Ende zeigen vorhandene Werte ⏳

**Ziel**: Datenintegrität und Vertrauen der Nutzer

**Beschreibung**:
Beim Öffnen von Admin-Formularen werden bereits gespeicherte Start-/Enddaten korrekt geladen und nicht als "leer" angezeigt.

**Akzeptanzkriterien**:
- [x] Reproduzierter Fehlerfall behoben (kein Verlust/Überschreiben)
- [x] E2E-Test: Edit-Form → Speichern → Re-Open → Werte identisch

**Technische To-Dos**:
- [ ] Datenbindungslogik prüfen (Controlled vs. Uncontrolled Inputs)
- [ ] Locale/Timezone-Konvertierung fixen (UTC ↔ Lokalzeit)
- [ ] E2E-Test mit Vitest + Testing Library schreiben

**Dateien**:
- `src/pages/ProjectsAdmin.tsx`
- `src/lib.ts` (Date-Parsing)

---

## Phase 2: Budget & IT-Kosten (Wichtig)

### #2 Budgetlogik: 75k-Grenze & Jahresbudget ⏳

**Ziel**: Saubere Budgetführung und Compliance-konforme Schwellenwertprüfung

**Beschreibung**:
- Abbildung einer 75.000-EUR-Schwelle
- Konfiguration fester Jahresbudgets über Admin
- Benachrichtigung bei Schwellenwertüberschreitung

**Akzeptanzkriterien**:
- [x] **Jahresbudget** pro Kostenstelle/Projekt ist im Admin-Bereich pflegbar
- [x] Bei 75k-Grenze erfolgt deutlicher Hinweis (UI-Badge + Optional: E-Mail)
- [x] Budgetverbräuche sind in Listen und Detailansicht klar visualisiert

**Technische To-Dos**:
- [ ] Datenmodell erweitern (`yearlyBudget: number`, `budgetThreshold: number`)
- [ ] Admin-Maske: Felder für Budget (inkl. Jahr), Validierung, Historie
- [ ] Schwellenwert-Watcher implementieren (useMemo mit Alert-Badge)
- [ ] Optional: Server-Job oder Event-basierte Benachrichtigung (außerhalb Scope)
- [ ] Tests (Grenzwerte, Rundung, Währung)

**Offene Fragen**:
- Gilt die 75k-Grenze pro Projekt, pro Anbieter oder konsolidiert je Jahr/Einheit?

**Dateien**:
- `src/types.ts` (Schema erweitern)
- `src/pages/ProjectsAdmin.tsx`
- `src/components/BudgetDonut.tsx`
- `src/components/ProjectsTable.tsx`

---

### #9 Neuer Reiter: Laufende IT-Kosten (Budgetbelastung) ⏳

**Ziel**: Transparenz über Kosten, die das Jahresbudget beanspruchen

**Beschreibung**:
Zusätzlicher Tab **"IT-Kosten"** mit Positionen, die das Jahresbudget belasten (inkl. Kategorie, Anbieter, Laufzeit, Betrag/Monat, Betrag/Jahr, Zuordnung zum Projekt).

**Akzeptanzkriterien**:
- [x] IT-Kosten-Tab mit Filter/Export (CSV)
- [x] Summenfelder je Jahr/Monat; Abgleich mit Jahresbudget
- [x] Verknüpfung zu Projekten (Drill-Down)

**Technische To-Dos**:
- [ ] Datenmodell **ITCost** erstellen:
  ```typescript
  interface ITCost {
    id: string;
    category: string;
    vendor: string;
    startDate: string;
    endDate: string;
    monthlyAmount: number;
    yearlyAmount: number;
    projectId?: string; // Optional: Zuordnung
  }
  ```
- [ ] CSV-Parser erweitern für IT-Kosten
- [ ] Neue Route `/it-costs` mit React Router
- [ ] UI-Tab + Tabellenansicht mit Summenzeile
- [ ] Export-Funktion (CSV)
- [ ] Reports/Benachrichtigungen bei Budgetüberzug

**Dateien**:
- `src/types.ts`
- `src/pages/ITCosts.tsx` (neu)
- `src/main.tsx` (Route hinzufügen)
- `src/lib/csv.ts`

---

### #10 Visualisierung: Einzelbudget pro Projekt ⏳

**Ziel**: Sofort-Erkenntnis über Budgetstatus je Projekt

**Beschreibung**:
**Horizontales Balkendiagramm** pro Projekt, das den Budgetverbrauch in % von links nach rechts anzeigt (analog zum Fortschrittsbalken).

**Akzeptanzkriterien**:
- [x] Balken zeigt **verbrauchtes Budget in %** (Tooltip mit EUR)
- [x] Farbe/Badge ändert sich ab definierten Schwellwerten (60%/85%/100%)

**Technische To-Dos**:
- [ ] Komponente `BudgetBar.tsx` entwickeln (analog zu `ProgressBar`)
- [ ] RAG-Logik für Budget-Schwellwerte implementieren
- [ ] Integration in `ProjectsTable.tsx`
- [ ] Tests schreiben

**Hinweis**: Teilweise bereits implementiert (Budget Progress Bars in ProjectsTable.tsx:72), aber noch ohne Schwellenwert-Farben.

**Dateien**:
- `src/components/BudgetBar.tsx` (neu oder Erweiterung von `ProgressBar`)
- `src/components/ProjectsTable.tsx`
- `src/lib.ts` (neue RAG-Funktion)

---

## Phase 3: Listen & Fortschritt (Wertvoll)

### #4 Projektlisten & Fortschritt (Soll-Ist) ⏳

**Ziel**: Relevanz und Signalstärke der Übersichten erhöhen

**Beschreibung**:
In Übersichten nur **laufende Projekte** und nur solche mit **Fortschritt > 0%** anzeigen (optional per Filter umschaltbar).

**Akzeptanzkriterien**:
- [x] Standardfilter "Nur laufende Projekte mit Fortschritt > 0%" aktiv
- [x] Umschaltbarer Filter, um alle Projekte anzuzeigen
- [x] Kennzeichnung "inaktiv/abgeschlossen" klar erkennbar

**Technische To-Dos**:
- [ ] Query/Filterlogik in `App.tsx` anpassen
- [ ] UI-Toggle/Chips in `FiltersPanel.tsx` hinzufügen
- [ ] Default-Filter auf `status: 'active' && progress > 0` setzen
- [ ] Regression-Tests auf Export/Reports

**Dateien**:
- `src/App.tsx`
- `src/components/FiltersPanel.tsx`
- `src/components/ProjectsTable.tsx`

---

### #8 Listenansicht: Unterteilung/Sortierung nach Klassifizierung ⏳

**Ziel**: Schnellere Orientierung in großen Portfolios

**Beschreibung**:
Optionale **Unterteilung der Ansicht** oder **Sortierung nach Klassifizierung** (z.B. Gruppierung nach "Projekt", "Interne Weiterentwicklung", …).

**Akzeptanzkriterien**:
- [x] Gruppierte Liste mit einklappbaren Sektionen
- [x] Sortieroption "nach Klassifizierung" verfügbar
- [x] Einstellung wird pro Nutzer gemerkt (Persistenz)

**Technische To-Dos**:
- [ ] Datenmodell erweitern (`classification` Field)
- [ ] Group-By-Logik implementieren (useMemo)
- [ ] UI-Akkordeons in `ProjectsTable.tsx` hinzufügen
- [ ] User-Preferences speichern (LocalStorage)

**Dateien**:
- `src/types.ts`
- `src/components/ProjectsTable.tsx`
- `src/App.tsx`

---

### #11 Statusübersicht "Aktueller Monat" (zeitliche Komponente) ⏳

**Ziel**: Monatsbezogene Steuerung aller laufenden Projekte

**Beschreibung**:
Kachel "Aktueller Monat" zeigt den **zeitlichen Status** (Milestones/Deadlines) aller laufenden Projekte für den laufenden Monat.

**Akzeptanzkriterien**:
- [x] Monatsübersicht listet relevante Meilensteine/Tasks mit Fälligkeiten
- [x] Filter: nur laufende Projekte; Sortierung nach Datum/Dringlichkeit
- [x] Export als CSV

**Technische To-Dos**:
- [ ] Datenmodell erweitern (Milestones/Deadlines als Array)
- [ ] Query für Termine/Milestones im laufenden Monat
- [ ] UI-Kachel `CurrentMonthOverview.tsx` mit kompakter Timeline/Badges
- [ ] Integration in Dashboard (neue Zeile oder Tab)

**Dateien**:
- `src/types.ts`
- `src/components/CurrentMonthOverview.tsx` (neu)
- `src/App.tsx`

---

## Phase 4: CSV/UTF-8 & Qualität (Technische Schulden)

### #5 CSV-Import & UTF-8-Korrektur ⏳

**Ziel**: Fehlerfreie Datenimporte und korrekte Zeichencodierung

**Beschreibung**:
- CSV-Import ausschließlich über das **Admin-Dashboard**
- Behebung des **UTF-8-Problems** (Umlaute/Sonderzeichen)

**Akzeptanzkriterien**:
- [x] CSV-Uploads werden **robust als UTF-8** verarbeitet (BOM-Handling, Fallbacks)
- [x] Validierungsbericht zeigt Zeilenfehler mit genauen Ursachen
- [x] Import ist nur für Admins verfügbar und wird protokolliert (Audit-Trail)

**Technische To-Dos**:
- [ ] Parser auf UTF-8 (mit/ohne BOM) trimmen (bereits teilweise implementiert in `lib/csv.ts`)
- [ ] Fehlertoleranz und Reporting verbessern
- [ ] Admin-Upload-Wizard (Preview, Mapping, Dry-Run)
- [ ] Logging/Audit mit Zeitstempel, User, Quelle, Ergebnis

**Hinweis**: BOM-Handling bereits implementiert (`lib/csv.ts:33`), aber weitere Tests und UI-Verbesserungen nötig.

**Dateien**:
- `src/lib/csv.ts`
- `src/pages/ProjectsAdmin.tsx`

---

### #12 Technische Qualität: UTF-8 & Internationalisierung ⏳

**Ziel**: Stabile, international kompatible Datenhaltung

**Beschreibung**:
Behebung bekannter **UTF-8-Codierungsprobleme** (insb. Umlaute, Sonderzeichen) und Absicherung gegen zukünftige Encodings.

**Akzeptanzkriterien**:
- [x] Alle Exporte/Importe im UTF-8-Standard
- [x] Automatisierte Tests mit Umlauten/Emoji/Sonderzeichen
- [x] Fehlerfreie Anzeige in UI und Reports

**Technische To-Dos**:
- [ ] Encoding-Layer zentralisieren
- [ ] Testsuiten erweitern (Unit/E2E mit Sonderzeichen)
- [ ] CSV-Export mit UTF-8-BOM für Excel-Kompatibilität

**Dateien**:
- `src/lib/csv.ts`
- `src/lib/csv.test.ts`

---

## Phase 5: Erweiterte Features

### #1 Klassifizierung & Projektnummern ⏳

**Ziel**: Eindeutige Zuordnung von Vorhaben und konsistente Auswertung in Berichten

**Beschreibung**:
Trennung zwischen internen Weiterentwicklungen, Projekten (inkl. VDB-S) und Aufgaben. Einführung/Prüfung von internen und externen Projektnummern.

**Akzeptanzkriterien**:
- [x] Pflichtfeld **Klassifizierung** mit Werten: `Interne Weiterentwicklung`, `Projekt`, `Projekt VDB-S`, `Aufgabe`
- [x] Interne und externe Projektnummern können gepflegt werden (Formatprüfung, Eindeutigkeit)
- [x] Filter und Sortierung nach Klassifizierung in allen relevanten Übersichten
- [x] Export/Reporting enthalten Klassifizierung und Projektnummern

**Technische To-Dos**:
- [ ] Datenmodell erweitern:
  ```typescript
  classification: 'internal' | 'project' | 'project_vdbs' | 'task';
  projectNumberInternal?: string;
  projectNumberExternal?: string;
  ```
- [ ] Migrationsskript zur Nachpflege bestehender Datensätze
- [ ] Filter/Sortierung in Listenansichten implementieren
- [ ] Dokumentation & Nutzerhinweis ergänzen

**Risiken/Offene Fragen**:
- Eindeutige Definition der Vergaberegeln für Projektnummern (wer, wann, wie?)

**Dateien**:
- `src/types.ts`
- `src/pages/ProjectsAdmin.tsx`
- `src/components/FiltersPanel.tsx`
- `src/components/ProjectsTable.tsx`

---

## Governance & Workflow

### Definition of Ready (DoR)
Ein Backlog-Item ist "ready", wenn:
- Ziel und Nutzen klar formuliert
- Akzeptanzkriterien definiert
- Technische To-Dos geschätzt
- Keine kritischen offenen Fragen mehr

### Definition of Done (DoD)
Ein Feature ist "done", wenn:
- Code geschrieben und reviewed
- Tests geschrieben und bestanden (Unit + E2E wo sinnvoll)
- Dokumentation aktualisiert (CLAUDE.md, README.md, CHANGELOG.md)
- Demo durchgeführt und abgenommen
- Deployed (oder bereit für Deployment)

### Review & Update
- **Wöchentlich**: Priorisierung prüfen, erledigte Items markieren
- **Monatlich**: Roadmap-Review, neue Items aufnehmen
- **Nach jedem Feature**: CHANGELOG.md aktualisieren

---

## Changelog

### 2025-10-06
- Initial Roadmap erstellt aus `offene-weiterentwicklungen.md`
- 12 Features/Verbesserungen in 5 Phasen strukturiert
- Status-Legende und Governance-Richtlinien hinzugefügt
