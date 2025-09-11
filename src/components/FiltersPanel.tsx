import React from 'react';

type Props = {
  capacity: number;
  setCapacity: (n: number) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  orgFilter: string;
  setOrgFilter: (s: string) => void;
  yearOnly: boolean;
  setYearOnly: (b: boolean) => void;
  year: number;
  setYear: (y: number) => void;
  onCSVUpload: (file?: File) => Promise<void> | void;
  onDownloadTemplate: () => void;
};

const FiltersPanel: React.FC<Props> = ({
  capacity, setCapacity,
  statusFilter, setStatusFilter,
  orgFilter, setOrgFilter,
  yearOnly, setYearOnly,
  year, setYear,
  onCSVUpload, onDownloadTemplate,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Kapazität (h/Monat):</label>
        <input type="number" value={capacity} onChange={(e) => setCapacity(Math.max(0, Number(e.target.value)))} className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" min={0} />
      </div>
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
  );
};

export default FiltersPanel;
