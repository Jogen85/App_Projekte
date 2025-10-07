import React from 'react';

type Props = {
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  orgFilter: string;
  setOrgFilter: (s: string) => void;
  classificationFilter: string;
  setClassificationFilter: (s: string) => void;
  yearOnly: boolean;
  setYearOnly: (b: boolean) => void;
  year: number;
  setYear: (y: number) => void;
  at82RequiredFilter: string;
  setAt82RequiredFilter: (s: string) => void;
  at82CompletedFilter: string;
  setAt82CompletedFilter: (s: string) => void;
  onCSVUpload: (file?: File) => Promise<void> | void;
  onDownloadTemplate: () => void;
  adminLink?: { href: string; label: string }; // Optional admin link
};

const FiltersPanel: React.FC<Props> = ({
  statusFilter, setStatusFilter,
  orgFilter, setOrgFilter,
  classificationFilter, setClassificationFilter,
  yearOnly, setYearOnly,
  year, setYear,
  at82RequiredFilter, setAt82RequiredFilter,
  at82CompletedFilter, setAt82CompletedFilter,
  onCSVUpload, onDownloadTemplate,
  adminLink,
}) => {
  return (
    <div className="flex flex-col gap-2 items-end">
      {/* Filter-Zeile */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="all">Alle</option>
            <option value="planned">Geplant</option>
            <option value="active">Laufend</option>
            <option value="done">Abgeschlossen</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Gesellschaft:</label>
          <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="all">Alle</option>
            <option value="BB">BB</option>
            <option value="MBG">MBG</option>
            <option value="BB/MBG">BB/MBG</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Klassifizierung:</label>
          <select value={classificationFilter} onChange={(e) => setClassificationFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="all">Alle</option>
            <option value="internal_dev">Interne Weiterentwicklung</option>
            <option value="project">Projekt</option>
            <option value="project_vdbs">Projekt VDB-S</option>
            <option value="task">Aufgabe</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">AT 8.2 erforderlich:</label>
          <select value={at82RequiredFilter} onChange={(e) => setAt82RequiredFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="all">Alle</option>
            <option value="yes">Ja</option>
            <option value="no">Nein</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">AT 8.2 durchgeführt:</label>
          <select value={at82CompletedFilter} onChange={(e) => setAt82CompletedFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="all">Alle</option>
            <option value="yes">Ja</option>
            <option value="no">Nein</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Nur Jahr:</label>
          <input type="checkbox" checked={yearOnly} onChange={(e) => setYearOnly(e.target.checked)} />
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <input id="csvInput" type="file" accept=".csv" className="hidden" onChange={(e) => onCSVUpload(e.target.files?.[0])} />
          <button onClick={() => document.getElementById('csvInput')!.click()} className="rounded-lg border px-3 py-1 text-sm">CSV laden</button>
          <button onClick={onDownloadTemplate} className="rounded-lg border px-3 py-1 text-sm">CSV-Export</button>
        </div>
      </div>
      {/* Admin-Link in eigener Zeile, rechtsbündig */}
      {adminLink && (
        <div className="flex items-center">
          <a href={adminLink.href} className="text-sm text-blue-600 hover:underline">
            {adminLink.label}
          </a>
        </div>
      )}
    </div>
  );
};

export default FiltersPanel;
