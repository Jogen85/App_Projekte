# IT‑Projektübersicht (React + Vite + TypeScript)

Interaktives Dashboard zur IT‑Projektübersicht (GF/Aufsichtsrat) mit CSV‑Datenbasis, Jahres‑Sicht, Budget/Kosten, Ressourcen‑Ampel, Gantt‑ähnlicher Zeitachse und einem leichten Admin‑Editor (CSV‑Edit ohne Backend).

## Features

- Dashboard
  - KPI‑Kacheln (laufend/geplant/abgeschlossen, Kapazität)
  - Budget (Jahr) als großer Ring mit Legende und Hover‑Tooltip (Prozent je Segment)
  - Ressourcen (aktueller Monat) als Balken + Ampel (rot/gelb/grün)
  - Burndown‑Chart (Demo)
  - Projekttabelle mit Filter (Status, Gesellschaft, Jahr‑Sicht), Fortschritt, Budget‑Donut je Projekt, Ampeln Zeit/Budget
  - Zeitachse (Gantt‑ähnlich)
- Admin‑Editor (ohne Server)
  - /admin Route mit Inline‑Tabelle: Projekte anlegen, bearbeiten, löschen
  - CSV importieren/exportieren, lokal speichern (localStorage) – Dashboard liest lokale Daten automatisch
  - Demo‑CSV Optional‑Load von public/data/projects.csv
- Technisch
  - React 18 + Vite 5 + TypeScript Strict
  - TailwindCSS 3
  - Recharts (Charts) mit Code‑Splitting (React.lazy + manualChunks)
  - ESLint + Prettier, Vitest (Beispieltests), GitHub Actions CI

## Projektstruktur

`
public/
  data/projects.csv        # Demo‑CSV (wird nicht automatisch geladen)
src/
  App.tsx                  # Dashboard (komponiert)
  main.tsx                 # App‑Entry, Router ("/", "/admin")
  ui.tsx                   # UI‑Primitives (Card, Badge, Ampel, ProgressBar)
  lib.ts                   # Zeit/Datums‑Hilfen, RAG‑Logik, Budgetfunktionen
  types.ts                 # Typen (Project, NormalizedProject)
  components/
    BudgetDonut.tsx        # Budget‑Kachel Donut (Hover‑Tooltip)
    ResourceBar.tsx        # Ressourcen‑Balken (aktueller Monat)
    ProjectsTable.tsx      # Projekttabelle inkl. Mini‑Donuts
    BurndownChart.tsx      # Demo‑Burndown
    Timeline.tsx           # (optional nicht aktiv) Timeline‑Komponente
  pages/
    ProjectsAdmin.tsx      # Admin‑Editor (CSV/Inline, localStorage)
index.html                 # HTML, UTF‑8
vercel.json                # SPA‑Rewrite für Vercel
`

## Setup & Skripte

`ash
npm ci                 # Dependencies
npm run dev            # Vite‑Devserver (HMR)
npm run build          # Typecheck + Production‑Build
npm run preview        # Lokale Preview des Builds
npm run typecheck      # TypeScript Build (no emit)
npm run lint           # ESLint
npm run test           # Vitest (Beispiele)
`

Node 18+ empfohlen (Vite 5).

## Datenbasis (CSV)

- Erwartete Spalten (Semikolon ;):
  id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
- Felder
  - id: frei (z. B. p-...), string
  - 	itle, owner, description: string
  - status: planned | ctive | done (kleingeschrieben)
  - start, end: Datum YYYY-MM-DD oder DD.MM.YYYY
  - progress: 0..100 (Prozent)
  - udgetPlanned, costToDate, hoursPerMonth: Zahl ≥ 0
  - org: z. B. BB, MBG, BB/MBG
- Parser
  - Erkennt ;/, automatisch (auch in Anführungszeichen)
  - Unterstützt "..."‑Felder inkl. ""‑Escapes, BOM/NUL‑Cleanup, \r‑Entfernung

## Admin‑Editor (ohne Backend)

- Aufruf: /admin (Direktaufruf funktioniert auf Vercel dank ercel.json Rewrite)
- Funktionen:
  - Neu anlegen („Neu“), inline editieren, löschen
  - CSV importieren (ersetzt aktuelle Liste)
  - CSV exportieren (Download)
  - Speichern (lokal): schreibt die aktuelle Liste in localStorage (projects_json)
- Dashboard‑Quelle:
  - Dashboard lädt automatisch localStorage.projects_json, falls vorhanden, sonst die in der App definierten Demodaten
  - Optionales Laden der Demo‑CSV über den Admin‑Import

## Anzeige‑Logik (Ist‑Stand)

- Budget (Jahr) Kachel
  - Großer Donut; Prozent erscheint per Hover‑Tooltip pro Segment (Ausgegeben/Verbleibend)
  - Farb‑Schwellen (Ausgegeben‑Segment):
    - Grün: Ausgaben ≤ 90% Jahresbudget
    - Gelb: Ausgaben ≤ 105%
    - Rot: Ausgaben > 105%
- Projekttabelle
  - Mini‑Donut statisch: Ausgegeben (Blau) / Verbleibend (Grau)
  - Ampeln pro Projekt:
    - Budget‑Ampel: Rot, wenn Kosten > 105% Budget; Gelb, wenn Kosten > 90% und Fortschritt < 80%; sonst Grün
    - Zeit‑Ampel: basiert auf Delta (Fortschritt vs. erwarteter Fortschritt zum heutigen Datum) und Überfälligkeit
- Ressourcen (Monat)
  - Balken (Kapazität vs. geplante Stunden) + Ampel (rot/gelb/grün)

Hinweis: Eine konsistentere, zeitgewichtete Bewertung (YTD vs. erwarteter YTD) ist möglich – siehe Empfehlungen weiter unten. Aktuell bleibt die Implementierung wie beschrieben.

## Entwicklung & Qualität

- Lint/Format: ESLint + Prettier
- Tests: Vitest (Beispieltests für lib.ts), erweiterbar für Parser/Filter/Ampeln
- Code‑Splitting: Charts und Tabelle via React.lazy; Vite‑manualChunks für eact/echarts Vendor‑Bundles
- A11y: Aria‑Labels/Tooltip; weitere Verbesserungen möglich

## Deployment (Vercel)

- Build: 
pm run build
- SPA‑Rewrite: ercel.json
  `json
  {"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}
  `
- Damit funktionieren Direktaufrufe wie /admin (Client‑Router übernimmt)

## Bekannte Punkte / Empfehlungen

- Encoding/Typografie
  - Projekt nutzt UTF‑8; in manchen UI‑Stellen wurden HTML‑Entities verwendet, um Mojibake zu vermeiden (&Uuml;, &uuml;, &mdash;). Empfohlen: Dateien durchgängig als UTF‑8 speichern.
- Bewertung/Schwellen (optional zukünftig)
  - Gesamt‑Budgetring zeitgewichtet (AusgabenYTD vs. erwarteter Budget‑YTD) – weniger Verzerrung am Jahresende
  - Projekt‑Ampel konsistent als Delta (Ausgaben% − Fortschritt%), z. B. Grün ≤ 10pp, Gelb 10–20pp, Rot > 20pp
  - Mini‑Donut‑Farbe an Ampel koppeln
- CSV‑Validierung
  - Admin‑Import könnte eine Preview/Fehlerliste anzeigen (aktuell direkter Import)
- Rollen/Sync (optional)
  - Später Serverless‑Persistenz/Headless CMS oder Git‑PR‑Flow denkbar

## Changelog (relevant)

- Code‑Split + Komponentenstruktur (components/ + pages/)
- Budget‑Donut neu (zentraler Prozenttext entfernt; Hover‑Tooltip pro Segment)
- Admin‑Editor (/admin): Inline‑Tabelle, CSV Import/Export, localStorage‑Speichern
- ESLint/Prettier/Vitest/CI ergänzt
- Vercel‑Rewrite (ercel.json) für SPA‑Routen
