# IT‑Projektübersicht (React + Vite + TS)

Demo‑Dashboard für GF/Aufsichtsrat mit CSV‑Import, BB/MBG‑Filter, Jahres‑Sicht (2025), Budget/Kosten, Ressourcen und Gantt‑ähnlicher Timeline.

## Schnellstart

```bash
npm ci
npm run dev
# Prod
npm run build
npm run preview
```

## CSV
Erwartete Spalten (Semikolon `;`):  
`id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org`

- Datum: `DD.MM.YYYY` oder ISO `YYYY-MM-DD`
- Zahlen: rein numerisch (kein Tausenderpunkt)

Eine Demo‑CSV liegt unter `public/data/projects.csv` und wird nicht automatisch geladen. Per UI: Button „CSV laden“. Optional Auto‑Load in `App.tsx` ergänzen (Fetch von `/data/projects.csv`).

## Git (erster Push, HTTPS)
```bash
git init
git branch -M main
printf "node_modules/\ndist/\n.env\n" >> .gitignore
git add .
git commit -m "feat: initial dashboard (React + Recharts + CSV)"
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

