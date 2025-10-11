# CSV-Import Fehlerbehandlung – Verbesserungen

## Problem (vorher)
Beim CSV-Import von Projekten gab es nur die generische Fehlermeldung **"Fehler beim Speichern"**, ohne Details zum tatsächlichen Problem.

**Ursachen:**
1. API-Routes verschluckten PostgreSQL-Fehlerdetails
2. Admin-Komponente zeigte nur Status 500 ohne Details
3. CSV-Import mit 21× einzelnen API-Calls ohne Fehlertracking

---

## Lösung (nachher)

### 1. Erweiterte API-Fehlerbehandlung (`/api/projects`)

**Validierung vor Datenbank-Operation:**
- ✅ Pflichtfeld-Checks (id, title, owner, start, end)
- ✅ Datumsformat-Validierung (`YYYY-MM-DD`)
- ✅ PostgreSQL Error-Code-Mapping

**PostgreSQL Error Codes:**
```typescript
23505: Unique constraint violation → "Projekt existiert bereits"
23502: Not-null constraint      → "Pflichtfeld fehlt"
23514: Check constraint         → "Ungültiger Wert"
22P02: Invalid date format      → "Datumsformat ungültig"
```

**API Response Format:**
```json
{
  "error": "Datumsformat ungültig",
  "details": "Erwartetes Format: YYYY-MM-DD. Erhalten: start=\"01.05.2025\", end=\"01.12.2025\""
}
```

---

### 2. Detailliertes Error-Feedback (Admin-Komponente)

**Vorher:**
```
❌ Fehler beim Speichern
```

**Nachher:**
```
❌ Datumsformat ungültig

Details: Erwartetes Format: YYYY-MM-DD. Erhalten: start="01.05.2025", end="01.12.2025"
```

**Timeout angepasst:** 3s → 5s (mehr Zeit zum Lesen)

---

### 3. Batch-CSV-Import mit Fehlertracking

**Features:**
- ✅ **Progress-Anzeige**: `⏳ Importiere 21 Projekte...`
- ✅ **Row-Level Error Tracking**: Zeigt genau welche Zeile fehlgeschlagen ist
- ✅ **Detaillierte Fehler**: Erste 10 Fehler mit Zeilennummer + Projekt-ID
- ✅ **Erfolgs-Zähler**: Zeigt wie viele erfolgreich importiert wurden
- ✅ **Extra langer Timeout**: 15s für Batch-Fehler

**Beispiel-Ausgabe:**
```
❌ CSV-Import abgeschlossen: 18 erfolgreich, 3 fehlgeschlagen

Zeile 2 (ID: p1):
  - Datumsformat ungültig – Erwartetes Format: YYYY-MM-DD. Erhalten: start="01.05.2025"

Zeile 8 (ID: p7):
  - Projekt existiert bereits – Projekt-ID "p7" ist bereits vergeben

Zeile 15 (ID: p14):
  - Ungültiger Status – Erwartet: planned, active, done
```

---

## CSV-Format-Unterstützung

### ✅ Datum-Formate (beide unterstützt):
- **Deutsch**: `01.05.2025`, `31.12.2025`
- **ISO**: `2025-05-01`, `2025-12-31`

### ✅ Boolean-Formate:
- `Ja` / `Nein` (deutsch)
- `true` / `false` (englisch)
- `yes` / `no` (englisch)
- `1` / `0` (numerisch)

### ✅ Zahlen-Formate:
- Deutsch: `10.000,50` → 10000.5
- Standard: `10000.50` → 10000.5

### ✅ Encoding:
- UTF-8 (mit/ohne BOM)
- Windows-1252 (Excel-Export)

---

## Debugging-Tipps

### Problem: "Datumsformat ungültig"
**Ursache:** CSV verwendet deutsches Format (`DD.MM.YYYY`)

**Lösung:** Der CSV-Parser konvertiert automatisch beide Formate zu ISO (`YYYY-MM-DD`), aber wenn das Parsing fehlschlägt:
1. Prüfe CSV-Datei auf ungültige Zeichen
2. Stelle sicher, dass Delimiter erkannt wird (`;` oder `,`)
3. Prüfe auf BOM (Byte Order Mark) – wird automatisch entfernt

### Problem: "Projekt existiert bereits"
**Ursache:** Projekt-ID ist bereits in der Datenbank

**Lösung:**
- Ändere die ID in der CSV-Datei
- Oder lösche das bestehende Projekt vor dem Import

### Problem: "Pflichtfeld fehlt"
**Ursache:** Ein Pflichtfeld (id, title, owner, start, end) ist leer

**Lösung:** Prüfe die CSV-Datei auf leere Zellen in den Pflichtfeldern

---

## Code-Änderungen

### Geänderte Dateien:
1. `src/app/api/projects/route.ts` (POST-Route)
2. `src/app/api/projects/[id]/route.ts` (PUT-Route)
3. `src/app/admin/projects/page.tsx` (CSV-Import + Error-Display)

### Neue Features:
- PostgreSQL Error-Code-Mapping
- API Response mit `error` + `details`
- Batch-Import mit Row-Level Tracking
- Detaillierte Fehlerausgabe mit Timeout

---

## Test-Szenarien

### ✅ Erfolgreich:
- CSV mit beiden Datumsformaten gemischt
- CSV mit deutschen Boolean-Werten (`Ja`/`Nein`)
- CSV mit deutschen Zahlenformaten (`10.000,50`)

### ❌ Fehlerfälle:
- Ungültiges Datumsformat (`03/10/2025` → US-Format nicht unterstützt)
- Fehlende Pflichtfelder (leere Zellen)
- Doppelte Projekt-IDs
- Ungültige Enum-Werte (Status, Classification)
- Start-Datum nach End-Datum

---

## UPSERT-Strategie (v1.8.1)

### Problem: "Projekt existiert bereits"
Beim CSV-Import von **existierenden** Projekten (z.B. nach manueller Bearbeitung in Excel) schlug der Import fehl mit:
```
❌ Projekt existiert bereits – Projekt-ID "p1" ist bereits vergeben
```

### Lösung: PostgreSQL UPSERT
Neue **PATCH-Route** `/api/projects` mit `ON CONFLICT ... DO UPDATE`:

**Strategie:**
- Wenn Projekt-ID **neu** → INSERT (erstellen)
- Wenn Projekt-ID **existiert** → UPDATE (überschreiben)
- **Keine Fehler** bei duplizierten IDs!

**SQL:**
```sql
INSERT INTO projects (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  owner = EXCLUDED.owner,
  ...
  updated_at = NOW()
```

**Erfolgsmeldung:**
```
✓ CSV importiert: 21 Projekte erfolgreich (aktualisiert/neu erstellt)
```

**Use Case:**
1. Exportiere Projekte als CSV
2. Bearbeite in Excel (Fortschritt, Budget, Status)
3. Re-importiere → **Alle Änderungen werden überschrieben**

---

## Next Steps (optional)

### Weitere Verbesserungen:
1. ✅ **UPSERT-Support**: Implementiert mit PATCH-Route
2. **Transaction-Support**: Rollback bei Fehler im Batch
3. **Dry-Run Mode**: CSV validieren ohne Import
4. **Import-History**: Log aller Importe mit Zeitstempel
5. **Duplicate Detection**: Warnung bei ähnlichen Projekttiteln
6. **Progress Bar**: Visueller Fortschritt während Import
7. **Import-Modus-Auswahl**: UI-Toggle für INSERT/UPDATE/UPSERT

---

---

## Einheitliche UPSERT-Strategie für alle CSV-Imports (v1.9.0)

### Übersicht
**Alle 4 Admin-Portale** nutzen jetzt die identische UPSERT-Strategie:
- ✅ Projekte (`/admin/projects`)
- ✅ IT-Kosten (`/admin/it-costs`)
- ✅ VDB-S Budget (`/admin/vdbs-budget`)
- ✅ Jahresbudgets (`/admin/overall-budget`)

### Implementierte API-Routes

| Route | Methode | UPSERT Key | Status |
|-------|---------|------------|--------|
| `/api/projects` | PATCH | `id` | ✅ |
| `/api/it-costs` | PATCH | `id` | ✅ |
| `/api/vdbs-budget` | PATCH | `id` | ✅ |
| `/api/year-budgets` | PATCH | `year` | ✅ |

### Einheitliche Features

#### 1. PostgreSQL UPSERT
Alle PATCH-Routen verwenden `ON CONFLICT ... DO UPDATE`:
```sql
INSERT INTO table (...) VALUES (...)
ON CONFLICT (unique_key) DO UPDATE SET
  field1 = EXCLUDED.field1,
  field2 = EXCLUDED.field2,
  updated_at = NOW()
```

#### 2. Validierung (Pre-DB-Check)
**Projekte:**
- Pflichtfelder: `id`, `title`, `owner`, `start`, `end`
- Datumsformat: `YYYY-MM-DD` (ISO)
- Enums: `classification`, `status`
- Ranges: `progress` (0-100)

**IT-Kosten:**
- Pflichtfelder: `id`, `description`, `category`, `provider`, `amount`, `frequency`, `year`
- Enums: `category`, `frequency`
- Ranges: `amount` (≥0), `year` (2020-2030)

**VDB-S Budget:**
- Pflichtfelder: `id`, `projectNumber`, `projectName`, `category`, `budget2026`, `year`
- Enums: `category` (RUN/CHANGE)
- Ranges: `budget2026` (≥0), `year` (2020-2030)

**Jahresbudgets:**
- Pflichtfelder: `year`, `budget`
- Ranges: `budget` (≥0), `year` (2020-2030)

#### 3. PostgreSQL Error-Code-Mapping
Einheitlich über alle Routen:
```typescript
23505: Unique constraint violation → "Existiert bereits"
23502: Not-null constraint      → "Pflichtfeld fehlt"
23514: Check constraint         → "Ungültiger Wert"
22P02: Invalid date format      → "Datumsformat ungültig"
```

#### 4. Admin-Seiten (CSV-Import)
Alle 4 Seiten nutzen identischen Code:
```typescript
// Batch import with UPSERT
for (let i = 0; i < rows.length; i++) {
  const item = rows[i]
  const res = await fetch('/api/[entity]', {
    method: 'PATCH', // UPSERT statt POST
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  // Error tracking + success counting
}
```

#### 5. Benutzer-Feedback
**Progress-Anzeige:**
```
⏳ Importiere 21 Projekte...
⏳ Importiere 12 IT-Kosten...
⏳ Importiere 40 VDB-S Budgetpositionen...
⏳ Importiere 3 Jahresbudgets...
```

**Erfolgsmeldung (alle identisch):**
```
✓ CSV importiert: 21 Projekte erfolgreich (aktualisiert/neu erstellt)
```

**Fehlermeldung (max. 10 Details):**
```
⚠️ CSV-Import abgeschlossen: 18 erfolgreich, 3 fehlgeschlagen

Zeile 2 (ID: p1):
  - Datumsformat ungültig – Erwartetes Format: YYYY-MM-DD

Zeile 8 (ID: p7):
  - Pflichtfeld fehlt – Pflichtfelder fehlen: title, owner

... und 1 weitere Fehler
```

#### 6. Timeouts
- **Einzelne Operationen**: 5 Sekunden
- **Batch-Operationen**: 15 Sekunden
- **CSV-Parsing-Fehler**: 10 Sekunden

### Workflow: CSV-Export/Import-Zyklus

1. **Export**: Klick auf "CSV exportieren" in Admin-Portal
   - Exportiert aktuellen Stand als CSV mit UTF-8 BOM
   - Dateiname: `[entity]_YYYY-MM-DD.csv`

2. **Bearbeitung**: CSV in Excel öffnen und bearbeiten
   - Daten ändern (Fortschritt, Budget, Status, etc.)
   - Neue Zeilen hinzufügen (mit neuer ID)
   - IDs **nicht** ändern (dienen als UPSERT-Key)

3. **Import**: Klick auf "CSV importieren"
   - **UPSERT-Logik**: Bestehende Einträge werden aktualisiert, neue werden eingefügt
   - **Keine Fehler** bei duplizierten IDs!
   - Detailliertes Feedback mit Row-Level-Tracking

### Technische Details

#### Error-Handling-Kette
```
User → CSV-Datei auswählen
  ↓
1. CSV-Parsing (src/lib/csv.ts)
   - BOM-Entfernung
   - Delimiter-Detection (;,)
   - Encoding-Detection (UTF-8/Windows-1252)
   - Format-Validierung (Header, Typen, Ranges)
   → CSVParseError bei Fehler
  ↓
2. Batch-Import (Admin-Seite)
   - PATCH-Request pro Zeile
   - Error-Tracking mit { row, item, error }
   - Success-Counting
  ↓
3. API-Route (Backend)
   - Pre-DB-Validierung (Pflichtfelder, Formate)
   - PostgreSQL UPSERT
   - Error-Code-Mapping
   → { error, details } bei Fehler
  ↓
4. User-Feedback (Admin-Seite)
   - Progress-Anzeige während Import
   - Detaillierte Fehler-Liste (max. 10)
   - Erfolgs-Zähler
```

#### Datei-Struktur
```
src/
├── app/
│   ├── api/
│   │   ├── projects/route.ts           # PATCH: UPSERT
│   │   ├── it-costs/route.ts           # PATCH: UPSERT
│   │   ├── vdbs-budget/route.ts        # PATCH: UPSERT
│   │   └── year-budgets/route.ts       # PATCH: UPSERT
│   └── admin/
│       ├── projects/page.tsx           # CSV-Import mit PATCH
│       ├── it-costs/page.tsx           # CSV-Import mit PATCH
│       ├── vdbs-budget/page.tsx        # CSV-Import mit PATCH
│       └── overall-budget/page.tsx     # CSV-Import mit PATCH
├── lib/
│   └── csv.ts                          # Parser + Serializer + Error-Klasse
└── types.ts                            # TypeScript-Typen
```

### Vorteile der einheitlichen Strategie

1. **Konsistente UX**: Alle CSV-Imports funktionieren identisch
2. **Wartbarkeit**: Änderungen an einer Stelle → gilt für alle
3. **Testbarkeit**: Einheitliche Test-Szenarien
4. **Fehlerbehandlung**: Gleiche Fehler → gleiche Meldungen
5. **Dokumentation**: Eine Anleitung für alle Imports

### Bekannte Einschränkungen

1. **Sequentielle Verarbeitung**: Keine parallelen Requests (Performance-Optimierung möglich)
2. **Keine Transaktionen**: Erfolgreiche Einträge bleiben bei Fehler erhalten
3. **Max. 10 Fehler**: Detaillierte Ausgabe nur für erste 10 Fehler
4. **Keine Rollback-Option**: Änderungen sind sofort permanent

### Zukunft (Optional)

1. **Bulk-UPSERT**: Ein API-Call statt N Calls
2. **Transaction-Support**: Rollback bei Fehler
3. **Preview-Mode**: CSV validieren ohne Import
4. **Import-History**: Log aller Importe
5. **Parallel-Requests**: Bessere Performance

---

**Status:** ✅ Vollständig implementiert und getestet
**Version:** 1.9.0 – Unified UPSERT Strategy for All CSV Imports
**Datum:** 2025-10-11
**TypeScript Check:** ✅ Erfolgreich (keine Fehler)
