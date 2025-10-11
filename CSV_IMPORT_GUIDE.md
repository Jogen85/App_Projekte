# CSV-Import/Export Guide

Benutzer-Anleitung für den CSV-Import und -Export im IT-Portfolio Dashboard.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [CSV Export](#csv-export)
3. [CSV Bearbeitung](#csv-bearbeitung)
4. [CSV Import](#csv-import)
5. [Fehlerbehandlung](#fehlerbehandlung)
6. [Best Practices](#best-practices)
7. [Häufige Fehler](#häufige-fehler)

---

## Übersicht

Das IT-Portfolio Dashboard unterstützt **CSV-Import und -Export** für alle 4 Entitäten:

| Entität | Admin-Portal | API-Route | UPSERT Key |
|---------|--------------|-----------|------------|
| **Projekte** | `/admin/projects` | `/api/projects` | `id` |
| **IT-Kosten** | `/admin/it-costs` | `/api/it-costs` | `id` |
| **VDB-S Budget** | `/admin/vdbs-budget` | `/api/vdbs-budget` | `id` |
| **Jahresbudgets** | `/admin/overall-budget` | `/api/year-budgets` | `year` |

### Was ist UPSERT?

**UPSERT** = **UP**date + in**SERT**

- **Neue Einträge** (ID existiert nicht): Werden **eingefügt** (INSERT)
- **Bestehende Einträge** (ID existiert): Werden **aktualisiert** (UPDATE)
- **Keine Fehler** bei duplizierten IDs!

---

## CSV Export

### Schritt 1: Admin-Portal öffnen

Navigiere zu einem der 4 Admin-Portale:
- Projekte: `http://localhost:3000/admin/projects`
- IT-Kosten: `http://localhost:3000/admin/it-costs`
- VDB-S Budget: `http://localhost:3000/admin/vdbs-budget`
- Jahresbudgets: `http://localhost:3000/admin/overall-budget`

### Schritt 2: CSV exportieren

Klicke auf den Button **"CSV exportieren"**:
- CSV-Datei wird automatisch heruntergeladen
- **Dateiname**: `[entität]_YYYY-MM-DD.csv`
- **Encoding**: UTF-8 mit BOM (Excel-kompatibel)
- **Delimiter**: Semikolon (`;`)

### Beispiel-Dateinamen:
```
projekte_2025-10-11.csv
it-kosten_2025-10-11.csv
vdbs-budget_2025-10-11.csv
jahresbudgets_2025-10-11.csv
```

---

## CSV Bearbeitung

### Schritt 1: CSV in Excel öffnen

1. **Doppelklick** auf die heruntergeladene CSV-Datei
2. Excel öffnet die Datei automatisch (UTF-8 BOM erkannt)
3. Alle Spalten werden korrekt getrennt (Delimiter: `;`)

### Schritt 2: Daten bearbeiten

**✅ Erlaubt:**
- **Werte ändern**: Fortschritt, Budget, Status, Beschreibung, etc.
- **Neue Zeilen hinzufügen**: Mit **neuer** ID (z.B., `p22`, `itc-13`, etc.)
- **Datum-Formate**: Beide Formate funktionieren
  - Deutsch: `10.03.2025`
  - ISO: `2025-03-10`

**❌ Nicht erlaubt:**
- **IDs ändern**: ID dient als UPSERT-Key (außer bei neuen Einträgen)
- **Header-Zeile löschen**: Erste Zeile muss erhalten bleiben
- **Pflichtfelder leer lassen**: Siehe Validierungsregeln unten

### Beispiel: Projekt bearbeiten

**Vorher (Export):**
```csv
id;...;title;...;progress;...;status
p1;...;DMS Migration;...;70;...;active
```

**Nachher (bearbeitet):**
```csv
id;...;title;...;progress;...;status
p1;...;DMS Migration;...;85;...;active   ← Progress aktualisiert
p22;...;Neues Projekt;...;0;...;planned  ← Neue Zeile hinzugefügt
```

### Schritt 3: CSV speichern

1. **Datei → Speichern unter**
2. **Dateityp**: `CSV UTF-8 (durch Trennzeichen getrennt) (*.csv)`
3. **Speichern** klicken
4. Warnung ignorieren ("Möchten Sie das Format beibehalten?" → **Ja**)

---

## CSV Import

### Schritt 1: Admin-Portal öffnen

Öffne das **gleiche Admin-Portal**, aus dem du exportiert hast.

### Schritt 2: CSV importieren

1. Klicke auf den Button **"CSV importieren"**
2. Wähle die bearbeitete CSV-Datei aus
3. Klicke auf **"Öffnen"**

### Schritt 3: Import-Feedback

**Progress-Anzeige:**
```
⏳ Importiere 21 Projekte...
```

**Erfolg (alle erfolgreich):**
```
✓ CSV importiert: 21 Projekte erfolgreich (aktualisiert/neu erstellt)
```

**Teilerfolg (einige Fehler):**
```
⚠️ CSV-Import abgeschlossen: 18 erfolgreich, 3 fehlgeschlagen

Zeile 2 (ID: p1):
  - Datumsformat ungültig – Erwartetes Format: YYYY-MM-DD

Zeile 8 (ID: p7):
  - Pflichtfeld fehlt – Pflichtfelder fehlen: title, owner

... und 1 weitere Fehler
```

**Fehler (CSV-Parsing fehlgeschlagen):**
```
❌ CSV-Import fehlgeschlagen (3 Fehler, 18 erfolgreich)

Zeile 5: (Feld: category)
  - Ungültige Kategorie
  - Wert: "foo"
  - Erwartet: hardware, software_licenses, maintenance_service, training, other
```

---

## Fehlerbehandlung

### Validierungsregeln

#### Projekte
**Pflichtfelder:**
- `id`, `title`, `owner`, `start`, `end`

**Enum-Felder:**
- `classification`: `internal_dev`, `project`, `project_vdbs`, `task`
- `status`: `planned`, `active`, `done`

**Range-Felder:**
- `progress`: 0-100
- `budgetPlanned`, `costToDate`: ≥ 0

**Datum-Felder:**
- Format: `DD.MM.YYYY` oder `YYYY-MM-DD`
- `start` < `end`

#### IT-Kosten
**Pflichtfelder:**
- `id`, `description`, `category`, `provider`, `amount`, `frequency`, `year`

**Enum-Felder:**
- `category`: `hardware`, `software_licenses`, `maintenance_service`, `training`, `other`
- `frequency`: `monthly`, `quarterly`, `yearly`, `one_time`

**Range-Felder:**
- `amount`: ≥ 0
- `year`: 2020-2030

#### VDB-S Budget
**Pflichtfelder:**
- `id` (oder auto-generiert), `projectNumber`, `projectName`, `category`, `budget2026`, `year`

**Enum-Felder:**
- `category`: `RUN`, `CHANGE`

**Range-Felder:**
- `budget2026`: ≥ 0
- `year`: 2020-2030

#### Jahresbudgets
**Pflichtfelder:**
- `year`, `budget`

**Range-Felder:**
- `budget`: ≥ 0
- `year`: 2020-2030

### Fehler-Codes (PostgreSQL)

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| `23505` | Unique constraint violation | ID bereits vergeben (sollte bei UPSERT nicht vorkommen) |
| `23502` | Not-null constraint | Pflichtfeld fehlt oder ist leer |
| `23514` | Check constraint | Wert entspricht nicht den Anforderungen (Enum, Range) |
| `22P02` | Invalid date format | Datum muss `DD.MM.YYYY` oder `YYYY-MM-DD` sein |

### Timeouts

| Szenario | Timeout |
|----------|---------|
| CSV-Parsing-Fehler | 10 Sekunden |
| Einzelne API-Operation | 5 Sekunden |
| Batch-Import (mehrere Fehler) | 15 Sekunden |

---

## Best Practices

### 1. Vor dem Import

✅ **DO:**
- Erstelle eine **Sicherungskopie** der Original-CSV
- Teste den Import zuerst mit **wenigen Zeilen**
- Prüfe **Pflichtfelder** (nicht leer)
- Verwende **konsistente Datum-Formate** (eine Spalte = ein Format)

❌ **DON'T:**
- IDs ändern (außer bei neuen Einträgen)
- Header-Zeile löschen oder umbenennen
- Spalten vertauschen oder löschen
- Nicht-erlaubte Werte verwenden (außerhalb Enums/Ranges)

### 2. Datum-Formate

**Empfehlung**: Verwende **ISO-Format** (`YYYY-MM-DD`) für Konsistenz

**Warum?**
- Excel speichert Datum manchmal als `DD.MM.YYYY`
- ISO-Format ist eindeutig (keine Verwechslung Tag/Monat)
- Datenbank erwartet ISO-Format intern

**Konvertierung in Excel:**
```excel
=TEXT(A2, "YYYY-MM-DD")
```

### 3. Zahlen-Formate

**Deutsche Zahlen** (`10.000,50`) werden automatisch konvertiert:
- Tausender-Trennzeichen: `.` (Punkt)
- Dezimal-Trennzeichen: `,` (Komma)

**Standard-Zahlen** (`10000.50`) funktionieren auch.

### 4. Boolean-Felder

**Erlaubte Werte** (case-insensitive):
- **Deutsch**: `Ja`, `Nein`
- **Englisch**: `Yes`, `No`, `true`, `false`
- **Numerisch**: `1`, `0`

### 5. Große Importe

**Bei mehr als 100 Zeilen:**
- Import kann **länger dauern** (sequentielle Verarbeitung)
- Erwarte ~0.5 Sekunden pro Zeile
- Keine Timeout-Fehler (15s Batch-Timeout)

---

## Häufige Fehler

### Fehler 1: "Datumsformat ungültig"

**Fehlermeldung:**
```
Zeile 5: (Feld: start)
  - Ungültiges Datumsformat
  - Wert: "03/10/2025"
  - Erwartet: DD.MM.YYYY oder YYYY-MM-DD
```

**Ursache:** US-Format (`MM/DD/YYYY`) wird nicht unterstützt

**Lösung:** Konvertiere zu `DD.MM.YYYY` oder `YYYY-MM-DD`

---

### Fehler 2: "Pflichtfeld fehlt"

**Fehlermeldung:**
```
Zeile 12:
  - Pflichtfeld "title" fehlt oder ist leer
```

**Ursache:** Pflichtfeld ist leer oder fehlt

**Lösung:** Fülle alle Pflichtfelder aus (siehe Validierungsregeln)

---

### Fehler 3: "Ungültige Kategorie"

**Fehlermeldung:**
```
Zeile 8: (Feld: category)
  - Ungültige Kategorie
  - Wert: "Software"
  - Erwartet: hardware, software_licenses, maintenance_service, training, other
```

**Ursache:** Wert entspricht nicht den erlaubten Enum-Werten

**Lösung:** Verwende einen der erlaubten Werte (siehe Validierungsregeln)

---

### Fehler 4: "Projekt existiert bereits"

**Fehlermeldung:**
```
Zeile 2 (ID: p1):
  - Projekt existiert bereits – Projekt-ID "projects_pkey" ist bereits vergeben
```

**Ursache:** Bei **POST** (nicht PATCH) schlägt Duplikat fehl

**Lösung:** Sollte bei UPSERT nicht vorkommen (PATCH-Route verwenden)

---

### Fehler 5: "Start-Datum nach End-Datum"

**Fehlermeldung:**
```
Zeile 10:
  - Start-Datum darf nicht nach End-Datum liegen
  - Wert: start: 31.12.2025, end: 01.01.2025
```

**Ursache:** Logik-Fehler (Start > End)

**Lösung:** Korrigiere die Datum-Reihenfolge

---

## Workflow-Zusammenfassung

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CSV EXPORT                                               │
│    ↓                                                         │
│    Admin-Portal → "CSV exportieren" → Download              │
│    Dateiname: [entität]_2025-10-11.csv                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CSV BEARBEITUNG                                          │
│    ↓                                                         │
│    Excel öffnen → Daten ändern → CSV speichern (UTF-8)     │
│    ✓ Werte ändern                                           │
│    ✓ Neue Zeilen hinzufügen (mit neuer ID)                 │
│    ✗ IDs ändern (UPSERT-Key!)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CSV IMPORT                                               │
│    ↓                                                         │
│    Admin-Portal → "CSV importieren" → Datei auswählen      │
│    ⏳ Importiere X Einträge...                              │
│    ↓                                                         │
│    ✓ Erfolg: X erfolgreich (aktualisiert/neu erstellt)     │
│    ⚠️ Teilerfolg: X erfolgreich, Y fehlgeschlagen          │
│    ❌ Fehler: CSV-Import fehlgeschlagen (Details anzeigen)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ERGEBNIS                                                 │
│    ↓                                                         │
│    • Neue Einträge wurden eingefügt (INSERT)                │
│    • Bestehende Einträge wurden aktualisiert (UPDATE)       │
│    • Keine Duplikat-Fehler dank UPSERT! ✅                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Support

Bei Fragen oder Problemen:
1. Prüfe **Fehlerbehandlung** (oben)
2. Prüfe **Validierungsregeln** (oben)
3. Prüfe **Häufige Fehler** (oben)
4. Siehe **ERROR_HANDLING_IMPROVEMENTS.md** (technische Details)

---

**Version:** 1.9.0
**Datum:** 2025-10-11
**Autor:** IT-Portfolio Team
