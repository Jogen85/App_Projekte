# Changelog – 2025-01-11

Umfassende UI-Fixes und Feature-Erweiterungen für das IT Portfolio Dashboard.

---

## 🎯 Übersicht der Änderungen

### 1. UI-Fix: Überlappende Budget-Zahlen in IT-Projektübersicht
### 2. UI-Fix: Abgeschnittene Legende in Budgetübersicht (Overall Budget)
### 3. Feature: Neue IT-Kosten Frequenz "Halbjährlich"
### 4. Critical Fix: Optimistische UI-Updates für ALLE Admin-Bereiche

---

## 1. UI-Fix: Überlappende Budget-Zahlen (IT-Projektübersicht)

### Problem
In der IT-Projektübersicht (`/projects`) überlappten drei Zahlenpaare (Jahresbudget, Projektplan gesamt, Ist YTD) die Projekttabelle darunter.

### Ursache
- **Doppelte Informationsanzeige**: BudgetDonut hatte bereits eine interne Legende
- **Zusätzliches Grid** (Zeile 313-330) wurde unter dem Chart angezeigt
- **Gesamthöhe überschritt Kachel**: 150px Chart + 60-80px BudgetDonut-Legende + 60-80px Grid = ~270-310px > 280px (h-chart)

### Lösung
Redundantes Zahlen-Grid entfernt (Zeile 313-330 in `src/app/projects/page.tsx`).

**Betroffene Dateien:**
- `src/app/projects/page.tsx`

**Commit:** `41ebb81` – "fix: redundante Budget-Zahlen in Projektbudget-Kachel entfernt"

---

## 2. UI-Fix: Abgeschnittene Legende (Overall Budget)

### Problem
In der Gesamtbudgetplanung (`/overall-budget`) war die BudgetDonut-Legende am unteren Rand der Kachel abgeschnitten.

### Ursache
- **Chart-Höhe zu groß**: 220px Chart + Legende (60-80px) = ~280-300px > 280px (h-chart)
- **Inkonsistente Höhe**: Chart-Prop (220px) ≠ interne Chart-Höhe in BudgetDonut.tsx (150px)

### Lösung
Chart-Höhe von 220px auf 150px reduziert (entspricht der internen Höhe in `BudgetDonut.tsx:112`).

**Betroffene Dateien:**
- `src/app/overall-budget/page.tsx` (Zeile 262: `height={150}`)

**Commit:** `2ae62e4` – "fix: BudgetDonut-Legende und neue Frequenz 'Halbjährlich'"

---

## 3. Feature: Neue IT-Kosten Frequenz "Halbjährlich"

### Anforderung
Neue Zahlungsfrequenz "Halbjährlich" für IT-Kosten hinzufügen (2× pro Jahr, Multiplikator: × 2).

### Implementierung

#### 3.1 TypeScript-Typen
**Datei:** `src/types.ts:54-59`
```typescript
export type ITCostFrequency =
  | 'monthly'      // Monatlich (× 12)
  | 'quarterly'    // Vierteljährlich (× 4)
  | 'biannual'     // Halbjährlich (× 2) ✨ NEU
  | 'yearly'       // Jährlich (× 1)
  | 'one_time';    // Einmalig (× 1)
```

#### 3.2 Berechnungslogik
**Datei:** `src/lib.ts:110-111`
```typescript
case 'biannual':
  return cost.amount * 2;
```

#### 3.3 CSV-Validierung
**Datei:** `src/lib/csv.ts:430`
```typescript
const validFrequencies: ITCostFrequency[] =
  ['monthly', 'quarterly', 'biannual', 'yearly', 'one_time'];
```

#### 3.4 Admin-UI
**Datei:** `src/app/admin/it-costs/page.tsx`
```typescript
// Labels (Zeile 29-35)
const FREQUENCY_LABELS = {
  monthly: 'Monatlich',
  quarterly: 'Quartalsweise',
  biannual: 'Halbjährlich',  // ✨ NEU
  yearly: 'Jährlich',
  one_time: 'Einmalig',
}

// Berechnung (Zeile 222-227)
const calculateYearlyCost = (cost: ITCost): number => {
  if (cost.frequency === 'monthly') return cost.amount * 12
  if (cost.frequency === 'quarterly') return cost.amount * 4
  if (cost.frequency === 'biannual') return cost.amount * 2  // ✨ NEU
  return cost.amount
}
```

#### 3.5 Chart-Komponenten
**Dateien:**
- `src/components/ITCostsByFrequencyChart.tsx`
  - FREQUENCY_COLORS: `biannual: '#8b5cf6'` (violet-500)
  - FREQUENCY_LABELS: `biannual: 'Halbjährlich'`
  - aggregated: `biannual: 0`
  - chartData: Entry für biannual hinzugefügt

- `src/components/ITCostsTable.tsx`
  - frequencyLabels: `biannual: 'Halbjährlich'`

**Betroffene Dateien:**
- `src/types.ts`
- `src/lib.ts`
- `src/lib/csv.ts`
- `src/app/admin/it-costs/page.tsx`
- `src/components/ITCostsByFrequencyChart.tsx`
- `src/components/ITCostsTable.tsx`

**Commits:**
- `2ae62e4` – "fix: BudgetDonut-Legende und neue Frequenz 'Halbjährlich'"
- `f87c370` – "fix: fehlende biannual-Frequenz in Chart-Komponenten"

---

## 4. Critical Fix: Optimistische UI-Updates für ALLE Admin-Bereiche

### Problem
**Nur IT-Kosten Admin hatte funktionierende Eingaben**. Die anderen 3 Admin-Bereiche zeigten massive UX-Probleme:

- ❌ **Textfelder**: Eingaben erschienen nicht beim Tippen
- ❌ **Dropdowns**: Auswahl änderte sich nicht visuell
- ❌ **Datepicker**: Neue Daten wurden nicht angezeigt
- ❌ **Checkboxen**: Häkchen erschienen verzögert
- ❌ **Zahlen-Inputs**: Änderungen erst nach 200-500ms sichtbar
- ✅ **Toast**: "✓ Änderungen gespeichert" erschien (aber keine UI-Änderung)

### Ursache
**Fehlende optimistische UI-Updates**: Alle Admin-Bereiche (außer IT-Kosten) verwendeten das blockierende Pattern:

```typescript
// ALT (❌ blockierend):
onChange → updateField() → saveEntity() →
  API-Call (200-500ms) → State update → UI update
```

**Problem:** Input-Felder verwenden `value={entity.field}` aus dem **alten State**, da der State erst **nach** der API-Response aktualisiert wird.

### Lösung: Optimistic Update Pattern

Implementiert für **alle 4 Admin-Bereiche**:

```typescript
// NEU (✅ instant reaktiv):
onChange → updateField() →
  1. State SOFORT aktualisieren (UI zeigt neue Werte)
  2. API-Call im Hintergrund
  3. Bei Fehler: Rollback + Error-Toast
```

---

### 4.1 IT-Kosten Admin (bereits fertig)

**Status:** ✅ Bereits implementiert

**Datei:** `src/app/admin/it-costs/page.tsx`

**Funktionen:**
- `saveITCostInBackground()` (Zeile 89-113)
- `updateField()` mit optimistic update (Zeile 133-149)

**Betroffene Felder:** 9 Felder (Beschreibung, Kategorie, Dienstleister, Betrag, Frequenz, Kostenstelle, Notizen, Jahr, Jahreskosten)

---

### 4.2 Projekte Admin (jetzt gefixt)

**Status:** ✅ Implementiert

**Datei:** `src/app/admin/projects/page.tsx`

**Neue Funktionen:**
```typescript
// Save project in background (optimistic update)
const saveProjectInBackground = async (project: Project, originalIndex: number) => {
  try {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    })

    if (!res.ok) throw new Error('Fehler beim Speichern')
    showMessage('✓ Gespeichert')
  } catch (error) {
    console.error('Error saving project:', error)
    setMsg('❌ Fehler beim Speichern - Seite neu laden')
    setTimeout(() => setMsg(''), 3000)

    // Reload data on error to restore correct state
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
  }
}

// Update project field (with optimistic update)
const updateField = (i: number, k: keyof Project, v: any) => {
  // 1. Optimistic update: Update state immediately
  const updatedProjects = [...projects]
  const project = { ...updatedProjects[i] }

  if (k === 'progress' || k === 'budgetPlanned' || k === 'costToDate') {
    (project as any)[k] = Number(v) || 0
  } else if (k === 'requiresAT82Check' || k === 'at82Completed') {
    (project as any)[k] = v === true || v === 'true'
  } else {
    (project as any)[k] = v
  }

  updatedProjects[i] = project
  setProjects(updatedProjects)  // ✅ Sofort UI-Update

  // 2. Save to API in background
  saveProjectInBackground(project, i)
}
```

**Betroffene Felder:** 16 Felder
- Texte: Nr. intern, Nr. extern, Titel, Verantw. MA, Beschreibung, Gesellschaft
- Dropdowns: Klassifizierung (4 Optionen), Status (3 Optionen)
- Dates: Start, Ende
- Numbers: Fortschritt %, Budget geplant, Kosten bisher
- Checkboxen: AT 8.2 erforderlich, AT 8.2 durchgeführt

---

### 4.3 VDB-S Budget Admin (jetzt gefixt)

**Status:** ✅ Implementiert

**Datei:** `src/app/admin/vdbs-budget/page.tsx`

**Neue Funktionen:**
```typescript
// Save VDB-S budget item in background (optimistic update)
const saveItemInBackground = async (item: VDBSBudgetItem, originalIndex: number) => {
  try {
    const res = await fetch(`/api/vdbs-budget/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })

    if (!res.ok) throw new Error('Fehler beim Speichern')
    showMessage('✓ Gespeichert')
  } catch (error) {
    console.error('Error saving VDB-S budget item:', error)
    setMsg('❌ Fehler beim Speichern - Seite neu laden')
    setTimeout(() => setMsg(''), 3000)

    // Reload data on error
    const res = await fetch('/api/vdbs-budget')
    const data = await res.json()
    setVDBSBudget(data)
  }
}

// Update field (with optimistic update)
const updateField = (i: number, k: keyof VDBSBudgetItem, v: any) => {
  // 1. Optimistic update
  const updatedBudget = [...vdbsBudget]
  const item = { ...updatedBudget[i] }

  if (k === 'budget2026' || k === 'year') {
    (item as any)[k] = Number(v) || 0
  } else {
    (item as any)[k] = v
  }

  updatedBudget[i] = item
  setVDBSBudget(updatedBudget)  // ✅ Sofort UI-Update

  // 2. Save to API in background
  saveItemInBackground(item, i)
}
```

**Betroffene Felder:** 5 Felder
- Texte: Projekt Nr., Projektname
- Dropdown: Kategorie (RUN/CHANGE)
- Numbers: Budget 2026, Jahr

**Zusatz-Feature:**
- Gesamt-Übersicht mit Live-Kalkulation (Total, RUN, CHANGE)
- Totals werden durch `useMemo` automatisch bei jeder Änderung neu berechnet

---

### 4.4 Overall Budget Admin (jetzt gefixt)

**Status:** ✅ Implementiert

**Datei:** `src/app/admin/overall-budget/page.tsx`

**Neue Funktionen:**
```typescript
// Save year budget in background (optimistic update)
const saveYearBudgetInBackground = async (yb: YearBudget) => {
  try {
    const res = await fetch(`/api/year-budgets/${yb.year}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yb),
    })

    if (!res.ok) throw new Error('Fehler beim Speichern')
    showMessage('✓ Gespeichert')
  } catch (error) {
    console.error('Error saving year budget:', error)
    setMsg('❌ Fehler beim Speichern - Seite neu laden')
    setTimeout(() => setMsg(''), 3000)

    // Reload data on error
    const res = await fetch('/api/year-budgets')
    const data = await res.json()
    setYearBudgets(data)
  }
}

const updateYearBudgetField = (year: number, budget: number) => {
  // 1. Optimistic update
  const updatedBudgets = yearBudgets.map((yb) =>
    yb.year === year ? { ...yb, budget } : yb
  )
  setYearBudgets(updatedBudgets)  // ✅ Sofort UI-Update

  // 2. Save to API in background
  const yb = updatedBudgets.find((y) => y.year === year)
  if (yb) {
    saveYearBudgetInBackground(yb)
  }
}
```

**Betroffene Felder:** 1 Feld
- Number: Budget (€)

**Zusatz-Features:**
- Über-Budget-Warnungen (useMemo mit Projekt-Overlap-Berechnung)
- Editierbarkeit nur für aktuelles Jahr + nächstes Jahr
- Vergangene Jahre werden als "Gesperrt" markiert

---

## Betroffene Dateien (Gesamt-Übersicht)

### UI-Fixes
- `src/app/projects/page.tsx` (Budget-Zahlen entfernt)
- `src/app/overall-budget/page.tsx` (Chart-Höhe reduziert)

### Feature: Halbjährlich
- `src/types.ts` (ITCostFrequency Type)
- `src/lib.ts` (calculateYearlyCostD)
- `src/lib/csv.ts` (validFrequencies)
- `src/app/admin/it-costs/page.tsx` (Labels + Berechnung)
- `src/components/ITCostsByFrequencyChart.tsx` (Chart + Legende)
- `src/components/ITCostsTable.tsx` (Filter-Labels)

### Optimistic Updates
- `src/app/admin/it-costs/page.tsx` (bereits fertig)
- `src/app/admin/projects/page.tsx` (neu implementiert)
- `src/app/admin/vdbs-budget/page.tsx` (neu implementiert)
- `src/app/admin/overall-budget/page.tsx` (neu implementiert)

**Total:** 10 Dateien geändert

---

## Commits

1. **41ebb81** – "fix: redundante Budget-Zahlen in Projektbudget-Kachel entfernt"
2. **2ae62e4** – "fix: BudgetDonut-Legende und neue Frequenz 'Halbjährlich'"
3. **f87c370** – "fix: fehlende biannual-Frequenz in Chart-Komponenten"
4. **a7ce7cd** – "fix: Optimistische UI-Updates in IT-Kostenverwaltung"
5. **78509ab** – "fix: Optimistische UI-Updates für ALLE Admin-Bereiche"

---

## Erwartetes Verhalten (nach Deployment)

### Dashboard-Seiten
✅ **IT-Projektübersicht** – Kachel passt vollständig (280px), keine Überlappung
✅ **Gesamtbudgetplanung** – Legende vollständig sichtbar
✅ **IT-Kosten Dashboard** – "Halbjährlich" in Charts/Tabellen sichtbar

### Admin-Portale
✅ **IT-Kosten Admin** – Alle Eingaben sofort sichtbar (bereits funktionierte)
✅ **Projekte Admin** – 16 Felder reagieren instant
✅ **VDB-S Budget Admin** – 5 Felder + Live-Gesamt-Übersicht
✅ **Overall Budget Admin** – Budget-Eingabe instant + Über-Budget-Warnungen

### Allgemein
✅ **Textfelder** reagieren sofort beim Tippen
✅ **Dropdowns** ändern sich instant (inkl. neue "Halbjährlich"-Option)
✅ **Datepicker** aktualisieren sich sofort
✅ **Checkboxen** reagieren instant
✅ **Zahlen-Inputs** zeigen Änderungen sofort
✅ **Speichern-Toast** erscheint nach API-Success (ca. 200-500ms nach Eingabe)
✅ **Bei Fehler** – Rollback + "Fehler - Seite neu laden" + automatischer Reload

---

## Testing-Checklist

### UI-Tests
- [ ] IT-Projektübersicht: Projektbudget-Kachel zeigt keine überlappenden Zahlen
- [ ] Gesamtbudgetplanung: BudgetDonut-Legende vollständig sichtbar

### Feature-Tests (Halbjährlich)
- [ ] IT-Kosten Admin: Dropdown zeigt 5 Frequenzen (inkl. "Halbjährlich")
- [ ] IT-Kosten Admin: Jahreskosten-Berechnung korrekt (Betrag × 2)
- [ ] IT-Kosten Dashboard: Chart zeigt "Halbjährlich"-Segment (violet)
- [ ] IT-Kosten Dashboard: Tabellen-Filter zeigt "Halbjährlich"
- [ ] CSV-Import: Validierung akzeptiert "biannual"
- [ ] CSV-Export: "biannual" wird korrekt exportiert

### Admin-Portal-Tests
**IT-Kosten Admin:**
- [ ] Textfeld (Beschreibung): Eingabe sofort sichtbar
- [ ] Dropdown (Frequenz): "Halbjährlich" wählbar + instant sichtbar
- [ ] Zahlen (Betrag): Änderung sofort sichtbar
- [ ] Toast: "✓ Gespeichert" nach ~200ms

**Projekte Admin:**
- [ ] Textfeld (Titel): Eingabe sofort sichtbar
- [ ] Dropdown (Status): Änderung instant sichtbar
- [ ] Datepicker (Start): Datum sofort sichtbar
- [ ] Checkbox (AT 8.2): Häkchen instant sichtbar
- [ ] Zahlen (Budget): Änderung sofort sichtbar
- [ ] Toast: "✓ Gespeichert" nach ~200ms

**VDB-S Budget Admin:**
- [ ] Textfeld (Projektname): Eingabe sofort sichtbar
- [ ] Dropdown (Kategorie): Änderung instant sichtbar (RUN/CHANGE)
- [ ] Zahlen (Budget 2026): Änderung sofort sichtbar
- [ ] Gesamt-Übersicht: Summen aktualisieren sich live
- [ ] Toast: "✓ Gespeichert" nach ~200ms

**Overall Budget Admin:**
- [ ] Zahlen (Budget): Änderung sofort sichtbar
- [ ] Über-Budget-Warnung: Erscheint/verschwindet bei Änderung
- [ ] Toast: "✓ Gespeichert" nach ~200ms

### Error-Handling-Tests
- [ ] Netzwerkfehler simulieren → "Fehler - Seite neu laden" + Reload
- [ ] API-Fehler simulieren (z.B. 500) → Rollback + Error-Toast

---

## Technische Details

### Pattern: Optimistic Update
```typescript
// 1. State-Update (sofort sichtbar)
const updated = [...items]
updated[i] = { ...updated[i], field: newValue }
setItems(updated)

// 2. API-Call (nicht blockierend)
async function saveInBackground() {
  try {
    await api.save(updated[i])
    toast('✓ Gespeichert')
  } catch (error) {
    // Rollback: Daten neu laden
    const fresh = await api.loadAll()
    setItems(fresh)
    toast('❌ Fehler - Seite neu laden')
  }
}
saveInBackground()
```

### Vorteile
✅ **Instant Feedback** – UI reagiert ohne Verzögerung (0ms statt 200-500ms)
✅ **Nicht blockierend** – User kann weiter tippen während API-Call läuft
✅ **Error-Recovery** – Automatischer Rollback bei Fehler
✅ **Standard UX-Pattern** – Verhalten wie Google Docs, Notion, etc.

### Nachteile / Trade-offs
⚠️ **Kurzes Fenster für Inkonsistenz** – Zwischen State-Update und API-Response können Daten theoretisch inkonsistent sein (aber nur ~200-500ms)
⚠️ **Rollback bei Fehler** – User sieht kurz den neuen Wert, dann Rollback (aber mit Error-Toast)

**Fazit:** Vorteile überwiegen massiv – Standard-Pattern für moderne Web-Apps.

---

## Performance-Überlegungen

### API-Call-Frequenz
- **Vorher:** 1 API-Call pro Eingabe (blockierend)
- **Nachher:** 1 API-Call pro Eingabe (nicht blockierend)
- **Änderung:** Keine – gleiche Anzahl API-Calls

### Potential für Debouncing (zukünftig)
```typescript
// Optional: Debouncing für Text-Inputs (300ms)
const debouncedSave = useMemo(
  () => debounce((item) => saveInBackground(item), 300),
  []
)

// Bei jedem Tastendruck:
setItems(updated)        // Sofort
debouncedSave(item)      // Nur alle 300ms
```

**Vorteil:** Reduziert API-Calls bei schnellem Tippen (z.B. "Test" = 1 statt 4 Calls)
**Nachteil:** Komplexität + potenzieller Datenverlust bei Seitenwechsel während Debounce
**Empfehlung:** Nicht nötig für aktuelle Nutzung – 1 Call pro Änderung ist akzeptabel

---

## Referenzen

### CLAUDE.md
Projekt-Dokumentation aktualisiert mit:
- Neue IT-Kosten Frequenz "Halbjährlich" (v1.5.0 → v1.10.0)
- Optimistic Update Pattern für Admin-Portale

### Migration Status
- ✅ Alle 8 Seiten auf Next.js + PostgreSQL migriert
- ✅ Alle Admin-Portale mit CRUD + CSV-Import/Export
- ✅ UPSERT-Support für alle CSV-Imports (v1.9.0)
- ✅ Optimistic Updates für alle Admin-Portale (v1.10.0)

---

## Version

**v1.10.0** – Optimistic UI-Updates + Halbjährliche Frequenz (2025-01-11)

**Vorherige Version:** v2.0.0 – UI-Modernisierung (2025-01-11)
