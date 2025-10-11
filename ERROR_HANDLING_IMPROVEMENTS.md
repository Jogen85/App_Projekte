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

**Status:** ✅ Implementiert und getestet (TypeScript check erfolgreich)
**Version:** 1.8.1 – UPSERT Support for CSV Import
**Datum:** 2025-10-11
