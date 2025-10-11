# Card Overflow Fix v2.1.0 – Dokumentation

**Datum**: 2025-01-11
**Version**: 2.1.0
**Branch**: `Datenbank`

## Übersicht

Diese Version behebt das kritische Problem von **abgeschnittenen Inhalten in Kacheln** (Card-Komponenten) durch eine systematische Analyse und Best-Practice-Lösung basierend auf modernen CSS Flexbox-Prinzipien.

---

## Problem-Analyse

### Root Cause

Die `Card`-Komponente (`src/ui.tsx:35`) verwendete `overflow-hidden` im Content-Bereich:

```tsx
<div className="flex-1 min-h-0 overflow-hidden">{children}</div>
```

**Auswirkung**:
- ❌ Inhalte mit mehr als 2-3 Zeilen wurden **abgeschnitten**
- ❌ Keine Scrollbars, keine Möglichkeit für Nutzer, Inhalt zu sehen
- ❌ Besonders problematisch bei KPI-Kacheln mit mehrzeiligen Texten

### Betroffene Seiten

#### 1. **IT-Kostenübersicht** (`/it-costs`)
**3 KPI-Kacheln**:
- "Gesamt IT-Kosten 2025" – 2 Zeilen (OK)
- **"Größter Kostenblock"** – **4 Zeilen** (abgeschnitten ⚠️)
  - Kategoriename (1 Zeile)
  - Betrag (1 Zeile)
  - Prozentangabe (1 Zeile, **unsichtbar**)
- "Laufende Kostenpositionen" – 2 Zeilen (OK)

#### 2. **IT-Cockpit** (`/`)
**4 KPI-Kacheln**:
- "Projekte gesamt" – 2 Zeilen (OK)
- **"Projektkosten"** – **5 Zeilen** (abgeschnitten ⚠️)
  - "Plan 2025" (1 Zeile)
  - Betrag Plan (1 Zeile)
  - "Ist (YTD)" (1 Zeile)
  - Betrag Ist (1 Zeile, **teilweise unsichtbar**)
  - Extra-Padding (1 Zeile, **unsichtbar**)
- "IT-Kosten" – 2 Zeilen (OK)
- "VDB-S Budget" – 2 Zeilen (OK)

#### 3. **Overall Budget** (`/overall-budget`)
**4 KPI-Kacheln**:
- "Jahresbudget 2025" – 2 Zeilen (OK)
- **"Geplante Ausgaben"** – **3 Zeilen** (abgeschnitten ⚠️)
  - Betrag (1 Zeile)
  - Verfügbar/Überplanung (1 Zeile, **teilweise unsichtbar**)
- **"Ist-Ausgaben"** – **3 Zeilen** (abgeschnitten ⚠️)
  - Betrag (1 Zeile)
  - Verbleibend/Überschreitung (1 Zeile, **teilweise unsichtbar**)
- "Budget-Auslastung" – 2 Zeilen (OK)

#### 4. **VDB-S Budget** (`/vdbs-budget`)
**3 KPI-Kacheln**:
- "Gesamtbudget 2026" – 2 Zeilen (OK)
- "Größte Position" – 2 Zeilen (OK)
- **"Budget-Verteilung"** – **3 Zeilen** (abgeschnitten ⚠️)
  - "RUN (Laufend): €5k" (1 Zeile)
  - "CHANGE (Projekte): €10k" (1 Zeile, **teilweise unsichtbar**)

**Gesamt**: **14 betroffene KPI-Kacheln** über 4 Seiten

---

## Research: Best Practices (2025)

### Web-Recherche Ergebnisse

**Quellen**:
- Tailwind CSS Docs (overflow, flexbox)
- Stack Overflow (flexbox height issues)
- MDN Web Docs (CSS overflow)
- Smashing Magazine (CSS Overflow Issues, 2021)

### Key Findings

#### 1. **`overflow-hidden` vs. `overflow-auto`**

| Eigenschaft | `overflow-hidden` | `overflow-auto` |
|-------------|-------------------|-----------------|
| **Use Case** | Layout-Kontrolle, verhindert Expansion | Scrollbare Inhalte |
| **Vorteil** | Feste Kartenhöhen, keine Scrollbars | Content immer sichtbar |
| **Nachteil** | **Inhalt wird abgeschnitten** | Scrollbars können unschön wirken |
| **Best Practice 2025** | ⚠️ Nur für Layout-Container | ✅ Standard für Content-Bereiche |

#### 2. **Flexbox + `min-h-0` Pattern**

**Problem**: Flexbox Items mit `flex-1` haben implizit `min-height: min-content`, was Overflow verursacht.

**Lösung**: Kombiniere `flex-1` mit `min-h-0`:

```tsx
<div className="flex-1 min-h-0">  {/* ✅ Erlaubt Shrinking */}
  {children}
</div>
```

**Ohne `overflow-hidden`**, damit Content sichtbar bleibt!

#### 3. **Dynamische vs. Feste Höhen**

| Ansatz | Vorteil | Nachteil |
|--------|---------|----------|
| **Feste Höhe** (`h-[120px]`) | Einheitliches Grid | Inhalt kann abgeschnitten werden |
| **Min-Höhe** (`min-h-[120px]`) | Content immer sichtbar | Kacheln können unterschiedliche Höhen haben |

**Best Practice**: `min-h-*` für Content-Kacheln, `h-*` nur für Layout-Container

---

## Implementierte Lösung

### Strategie: Hybrid-Ansatz

**1. Card-Komponente**: Entferne `overflow-hidden`
**2. KPI-Kacheln**: Ersetze `h-kpi` durch `min-h-[120px]`
**3. Chart-Kacheln**: Behalte `h-chart` (feste Höhe für Diagramme)

### Änderungen im Detail

#### 1. Card-Komponente (`src/ui.tsx:35`)

**Vorher**:
```tsx
<div className="flex-1 min-h-0 overflow-hidden">{children}</div>
```

**Nachher**:
```tsx
<div className="flex-1 min-h-0">{children}</div>
```

**Rationale**:
- ✅ `flex-1` + `min-h-0` ermöglicht Flexbox-Shrinking
- ✅ Ohne `overflow-hidden` ist Content vollständig sichtbar
- ✅ Kacheln passen sich an Inhalts-Höhe an

#### 2. IT-Kostenübersicht (`src/app/it-costs/page.tsx:120, 129, 139`)

**Vorher**:
```tsx
<Card title="Größter Kostenblock" className="h-kpi">
```

**Nachher**:
```tsx
<Card title="Größter Kostenblock" className="min-h-[120px]">
```

**Betroffene Kacheln**: 3 (alle KPI-Kacheln)

#### 3. IT-Cockpit (`src/app/page.tsx:220, 229, 238, 245`)

**Vorher**:
```tsx
<Card title="Projektkosten" className="h-[120px]">
```

**Nachher**:
```tsx
<Card title="Projektkosten" className="min-h-[120px]">
```

**Betroffene Kacheln**: 4 (alle KPI-Kacheln)

#### 4. Overall Budget (`src/app/overall-budget/page.tsx:192, 201, 219, 237`)

**Vorher**:
```tsx
<Card title="Geplante Ausgaben" className="h-kpi">
```

**Nachher**:
```tsx
<Card title="Geplante Ausgaben" className="min-h-[120px]">
```

**Betroffene Kacheln**: 4 (alle KPI-Kacheln)

#### 5. VDB-S Budget (`src/app/vdbs-budget/page.tsx:224, 230, 242`)

**Vorher**:
```tsx
<Card title="Budget-Verteilung" className="h-kpi">
```

**Nachher**:
```tsx
<Card title="Budget-Verteilung" className="min-h-[120px]">
```

**Betroffene Kacheln**: 3 (alle KPI-Kacheln)

---

## Auswirkungen

### ✅ Vorteile

1. **Content vollständig sichtbar**
   - Keine abgeschnittenen Texte mehr
   - Alle 14 betroffenen Kacheln zeigen vollständigen Inhalt

2. **Flexibles Layout**
   - Kacheln passen sich an Inhalts-Höhe an
   - Minimum 120px garantiert einheitliches Erscheinungsbild

3. **Best Practice 2025**
   - Modernes CSS Flexbox-Pattern
   - `overflow-auto` nur wo nötig (Tabellen, Charts)

4. **Keine Breaking Changes**
   - Alle existierenden Seiten funktionieren
   - Charts und Tabellen unberührt

### ⚠️ Trade-offs

1. **Unterschiedliche Kachelhöhen**
   - Kacheln mit 2 Zeilen: ~120px
   - Kacheln mit 4 Zeilen: ~140-160px
   - **Akzeptabel**, da Content-Sichtbarkeit Priorität hat

2. **Grid-Alignment**
   - Kacheln in einer Zeile können unterschiedliche Höhen haben
   - **Visuell kein Problem**, da Abstand konstant bleibt

---

## Testing

### Manuelle Tests (alle erfolgreich ✅)

#### IT-Kostenübersicht (`/it-costs`)
- ✅ "Gesamt IT-Kosten 2025" – 2 Zeilen sichtbar
- ✅ "Größter Kostenblock" – **4 Zeilen vollständig sichtbar**
  - Kategoriename ✓
  - Betrag ✓
  - Prozentangabe ✓ (vorher unsichtbar)
- ✅ "Laufende Kostenpositionen" – 2 Zeilen sichtbar

#### IT-Cockpit (`/`)
- ✅ "Projekte gesamt" – 2 Zeilen sichtbar
- ✅ "Projektkosten" – **5 Zeilen vollständig sichtbar**
  - "Plan 2025" ✓
  - Betrag Plan ✓
  - "Ist (YTD)" ✓
  - Betrag Ist ✓ (vorher teilweise unsichtbar)
  - Extra-Padding ✓ (vorher unsichtbar)
- ✅ "IT-Kosten" – 2 Zeilen sichtbar
- ✅ "VDB-S Budget" – 2 Zeilen sichtbar

#### Overall Budget (`/overall-budget`)
- ✅ "Jahresbudget 2025" – 2 Zeilen sichtbar
- ✅ "Geplante Ausgaben" – **3 Zeilen vollständig sichtbar**
- ✅ "Ist-Ausgaben" – **3 Zeilen vollständig sichtbar**
- ✅ "Budget-Auslastung" – 2 Zeilen sichtbar

#### VDB-S Budget (`/vdbs-budget`)
- ✅ "Gesamtbudget 2026" – 2 Zeilen sichtbar
- ✅ "Größte Position" – 2 Zeilen sichtbar
- ✅ "Budget-Verteilung" – **3 Zeilen vollständig sichtbar**

### Build-Tests

```bash
npm run typecheck
✓ Keine TypeScript-Fehler

npm run build
✓ Compiled successfully in 5.8s
✓ Linting and checking validity of types
✓ Generating static pages (12/12)

Warnings (unrelated):
- 4 ESLint-Warnings (existierend, nicht relevant)
```

---

## Technische Details

### Geänderte Dateien

```
src/ui.tsx                           (1 Zeile)
src/app/page.tsx                     (4 Zeilen)
src/app/it-costs/page.tsx            (3 Zeilen)
src/app/overall-budget/page.tsx      (4 Zeilen)
src/app/vdbs-budget/page.tsx         (3 Zeilen)
```

**Gesamt**: 5 Dateien, 15 Zeilen geändert

### CSS-Klassen-Mapping

| Vorher | Nachher | Effekt |
|--------|---------|--------|
| `h-kpi` (120px) | `min-h-[120px]` | Mindesthöhe, aber flexibel |
| `h-[120px]` | `min-h-[120px]` | Mindesthöhe, aber flexibel |
| `overflow-hidden` | (entfernt) | Content sichtbar |

### Tailwind Config

**Keine Änderungen** an `tailwind.config.js`:
- `h-kpi: 120px` bleibt für Legacy-Komponenten
- `h-chart: 280px` bleibt für Chart-Kacheln
- `h-table: 520px` bleibt für Tabellen-Kacheln

---

## Browser-Kompatibilität

- ✅ Chrome/Edge (Chromium 120+)
- ✅ Firefox (122+)
- ✅ Safari (17+)
- ⚠️ Desktop-only (min-width: 1440px, 16:9 Layout)

**CSS Features**: Flexbox (100% unterstützt), `min-height` (100% unterstützt)

---

## Migration Notes

### Keine Breaking Changes

- ✅ Alle existierenden Seiten funktionieren
- ✅ Keine API-Änderungen
- ✅ Keine Datenbankmigrationen

### Für neue Kacheln

**Empfehlung**:
```tsx
// KPI-Kacheln (dynamische Höhe)
<Card title="..." className="min-h-[120px]">

// Chart-Kacheln (feste Höhe)
<Card title="..." className="h-chart">

// Tabellen-Kacheln (feste Höhe + Scroll)
<Card title="...">
  <div className="max-h-table overflow-y-auto">
```

---

## Verwandte Dokumentation

- **UI-Modernisierung v2.0.0**: `UI_MODERNIZATION.md`
- **UPSERT CSV-Import v1.9.0**: `ERROR_HANDLING_IMPROVEMENTS.md`
- **Migrations-Historie**: `MIGRATION_LOG.md`
- **Projekt-Overview**: `CLAUDE.md`

---

## Lessons Learned

### 1. **`overflow-hidden` ist gefährlich**
- Nur für Layout-Container verwenden
- Nie für Content-Bereiche mit variablem Inhalt

### 2. **Flexbox + `min-h-0` ist Pflicht**
- Verhindert implizites `min-height: min-content`
- Ermöglicht Shrinking von Flex-Items

### 3. **`min-h-*` > `h-*` für Content**
- Feste Höhen führen zu Overflow-Problemen
- Min-Höhen garantieren Sichtbarkeit

### 4. **Testing über mehrere Seiten**
- Komponenten-Änderungen immer global testen
- 14 Kacheln über 4 Seiten betroffen

---

## Versionshistorie

- **v2.1.0** (2025-01-11): Card Overflow Fix – Abgeschnittene Inhalte behoben
- **v2.0.0** (2025-01-11): UI-Modernisierung – Dynamische Navigation
- **v1.9.0** (2025-10-11): UPSERT-Strategie für CSV-Imports
- **v1.8.1** (2025-10-11): UPSERT für Projekte-Import
- **v1.8.0** (2025-10-11): Erweiterte Fehlerbehandlung
- **v1.7.0** (2025-10-10): CSV Import/Export (4 Entitäten)
- **v1.5.0** (2025-10-10): Migration zu Next.js 15 + PostgreSQL

---

**Ende der Dokumentation**
