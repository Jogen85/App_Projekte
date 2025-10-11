import type { Project, ITCost, ITCostCategory, ITCostFrequency, VDBSBudgetItem, YearBudget } from '../types';

const REQUIRED_FIELDS = ['id','projectNumberInternal','projectNumberExternal','classification','title','owner','description','status','start','end','progress','budgetPlanned','costToDate','org','requiresAT82Check','at82Completed'] as const;
const NULL_CHAR = String.fromCharCode(0);

export type CsvDelimiter = ';' | ',';

// ==================== Error Handling ====================

export interface CSVErrorDetail {
  row: number;
  field?: string;
  value?: string;
  expected?: string;
  message: string;
}

export class CSVParseError extends Error {
  constructor(
    message: string,
    public readonly errors: CSVErrorDetail[],
    public readonly successCount: number = 0
  ) {
    super(message);
    this.name = 'CSVParseError';
  }

  toDetailedMessage(): string {
    const lines = [`${this.message} (${this.errors.length} Fehler, ${this.successCount} erfolgreich)`];

    this.errors.forEach(err => {
      let detail = `\nZeile ${err.row}:`;
      if (err.field) detail += ` (Feld: ${err.field})`;
      detail += `\n  - ${err.message}`;
      if (err.value) detail += `\n  - Wert: "${err.value}"`;
      if (err.expected) detail += `\n  - Erwartet: ${err.expected}`;
      lines.push(detail);
    });

    return lines.join('');
  }
}

// Liest File mit Auto-Encoding-Detection (UTF-8 oder Windows-1252/ISO-8859-1)
export async function readFileAsText(file: File): Promise<string> {
  // Lese als ArrayBuffer für Byte-Level Kontrolle
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Prüfe auf UTF-8 BOM (EF BB BF)
  let offset = 0;
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    offset = 3; // Skip BOM
  }

  // Versuche UTF-8 Dekodierung mit fatal flag (wirft Fehler bei ungültigen Bytes)
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const text = decoder.decode(bytes.slice(offset));
    return text;
  } catch (e) {
    // UTF-8 Dekodierung fehlgeschlagen → Fallback zu Windows-1252
    // Windows-1252 ist Superset von ISO-8859-1 und deckt Excel-Exports ab
    const decoder = new TextDecoder('windows-1252');
    return decoder.decode(bytes.slice(offset));
  }
}

export function detectDelimiter(headerLine: string): CsvDelimiter {
  let semicolons = 0;
  let commas = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch === ';') {
      semicolons++;
    } else if (!inQuotes && ch === ',') {
      commas++;
    }
  }
  return semicolons >= commas ? ';' : ',';
}

function parseRecords(text: string, delimiter: CsvDelimiter): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const input = text.replace(/\r/g, '');

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(cell.trim());
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.trim());
        result.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length || row.length) {
    row.push(cell.trim());
    result.push(row);
  }

  return result.filter((r) => r.length && r.some((c) => c !== ''));
}

function requireHeaders(headers: string[]): asserts headers is string[] {
  const missing = REQUIRED_FIELDS.filter((field) => !headers.some((h) => h.toLowerCase() === field.toLowerCase()));
  if (missing.length) {
    throw new Error(`CSV-Header unvollständig. Erwartet: ${REQUIRED_FIELDS.join(';')}`);
  }
}

export function parseProjectsCSV(text: string): Project[] {
  if (!text) return [];
  let cleaned = text;
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }
  cleaned = cleaned.split(NULL_CHAR).join('');
  const headerLine = (cleaned.split(/\n/)[0] || '').trim();
  const delimiter = detectDelimiter(headerLine);
  const records = parseRecords(cleaned, delimiter);
  if (!records.length) return [];
  const headers = records[0].map((h) => h.trim().replace(/^"|"$/g, ''));
  requireHeaders(headers);

  const indexOf = (key: string) => headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());

  const projects: Project[] = [];
  const errors: CSVErrorDetail[] = [];

  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1; // +1 for header row

    const pick = (key: string, fallback = '') => {
      const idx = indexOf(key);
      if (idx === -1 || idx >= row.length) return fallback;
      return row[idx];
    };

    const numeric = (value: string) => {
      if (value == null || value === '') return 0;
      let normalized = value.trim().replace(/\s+/g, '');
      // Handle German number format: 10.000,50 -> 10000.50
      if (normalized.includes(',') && normalized.includes('.')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else if (normalized.includes(',')) {
        // Only comma, assume decimal separator: 50,5 -> 50.5
        normalized = normalized.replace(',', '.');
      }
      const num = Number(normalized);
      return Number.isFinite(num) ? num : 0;
    };

    const parseBoolean = (val: string): boolean | undefined => {
      const v = val?.toLowerCase().trim();
      if (v === 'true' || v === 'ja' || v === 'yes' || v === '1') return true;
      if (v === 'false' || v === 'nein' || v === 'no' || v === '0') return false;
      return undefined;
    };

    // Validations
    const id = pick('id');
    const title = pick('title');
    const owner = pick('owner');
    const start = pick('start');
    const end = pick('end');
    const classification = pick('classification');
    const status = pick('status');
    const progress = pick('progress');

    // Required field checks
    if (!id) {
      errors.push({ row: rowNum, field: 'id', message: 'Pflichtfeld "id" fehlt oder ist leer' });
    }
    if (!title) {
      errors.push({ row: rowNum, field: 'title', message: 'Pflichtfeld "title" fehlt oder ist leer' });
    }
    if (!owner) {
      errors.push({ row: rowNum, field: 'owner', message: 'Pflichtfeld "owner" fehlt oder ist leer' });
    }
    if (!start) {
      errors.push({ row: rowNum, field: 'start', message: 'Pflichtfeld "start" (Datum) fehlt oder ist leer' });
    }
    if (!end) {
      errors.push({ row: rowNum, field: 'end', message: 'Pflichtfeld "end" (Datum) fehlt oder ist leer' });
    }

    // Classification validation
    const validClassifications = ['internal_dev', 'project', 'project_vdbs', 'task'];
    if (classification && !validClassifications.includes(classification)) {
      errors.push({
        row: rowNum,
        field: 'classification',
        value: classification,
        expected: validClassifications.join(', '),
        message: 'Ungültige Klassifizierung'
      });
    }

    // Status validation
    const validStatuses = ['planned', 'active', 'done'];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      errors.push({
        row: rowNum,
        field: 'status',
        value: status,
        expected: validStatuses.join(', '),
        message: 'Ungültiger Status'
      });
    }

    // Progress range validation
    const progressNum = numeric(progress);
    if (progress && (progressNum < 0 || progressNum > 100)) {
      errors.push({
        row: rowNum,
        field: 'progress',
        value: progress,
        expected: '0-100',
        message: 'Fortschritt muss zwischen 0 und 100 liegen'
      });
    }

    // Date validation (basic format check)
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      errors.push({
        row: rowNum,
        field: 'start',
        value: start,
        expected: 'YYYY-MM-DD',
        message: 'Ungültiges Datumsformat'
      });
    }
    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      errors.push({
        row: rowNum,
        field: 'end',
        value: end,
        expected: 'YYYY-MM-DD',
        message: 'Ungültiges Datumsformat'
      });
    }

    // Date logic validation
    if (start && end && start > end) {
      errors.push({
        row: rowNum,
        message: 'Start-Datum darf nicht nach End-Datum liegen',
        value: `start: ${start}, end: ${end}`
      });
    }

    projects.push({
      id: id || `row-${i}`,
      projectNumberInternal: pick('projectNumberInternal') || '',
      projectNumberExternal: pick('projectNumberExternal') || undefined,
      classification: (classification as any) || 'project',
      title: title,
      owner: owner,
      description: pick('description'),
      status: (status || 'planned').toLowerCase(),
      start: start,
      end: end,
      progress: progressNum,
      budgetPlanned: numeric(pick('budgetPlanned')),
      costToDate: numeric(pick('costToDate')),
      org: pick('org') || 'BB',
      requiresAT82Check: parseBoolean(pick('requiresAT82Check')),
      at82Completed: parseBoolean(pick('at82Completed')),
    });
  }

  if (errors.length > 0) {
    throw new CSVParseError('CSV-Import fehlgeschlagen', errors, projects.length);
  }

  return projects;
}

function escapeField(value: unknown, delimiter: CsvDelimiter): string {
  const str = value == null ? '' : String(value);
  const needsQuote = str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(delimiter);
  const escaped = str.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export function projectsToCSV(projects: Project[], delimiter: CsvDelimiter = ';'): string {
  const header = REQUIRED_FIELDS.join(delimiter);
  const lines = projects.map((project) => REQUIRED_FIELDS.map((field) => {
    let value = (project as Record<string, unknown>)[field];
    // Convert booleans to Ja/Nein for better readability
    if (typeof value === 'boolean') {
      value = value ? 'Ja' : 'Nein';
    }
    return escapeField(value ?? '', delimiter);
  }).join(delimiter));
  return [header, ...lines].join('\n');
}

export const CSV_HEADERS = REQUIRED_FIELDS;

// IT-Kosten CSV Parser (v1.5.0: startDate/endDate removed)
const IT_COST_REQUIRED_FIELDS = ['id', 'description', 'category', 'provider', 'amount', 'frequency', 'costCenter', 'notes', 'year'] as const;

function requireITCostHeaders(headers: string[]): asserts headers is string[] {
  const missing = IT_COST_REQUIRED_FIELDS.filter((field) => !headers.some((h) => h.toLowerCase() === field.toLowerCase()));
  if (missing.length) {
    throw new Error(`CSV-Header unvollständig. Erwartet: ${IT_COST_REQUIRED_FIELDS.join(';')}`);
  }
}

/**
 * Hilfsfunktion: Parst deutsche Zahlenformate
 */
function parseGermanNumber(value: string): number {
  if (value == null || value === '') return 0;
  let normalized = value.trim().replace(/\s+/g, '');

  // German number format: 10.000,50 -> 10000.50
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    // Only comma, assume decimal separator: 50,5 -> 50.5
    normalized = normalized.replace(',', '.');
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Parst CSV-Daten zu ITCost-Array
 * Erwartet Spalten: id;description;category;provider;amount;frequency;costCenter;notes;year
 */
export function parseITCostsCSV(csv: string): ITCost[] {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return [];

  // BOM entfernen falls vorhanden
  let firstLine = lines[0].replace(/^\uFEFF/, '');
  firstLine = firstLine.split(NULL_CHAR).join('');

  // Delimiter erkennen (Semikolon oder Komma)
  const delimiter = detectDelimiter(firstLine);

  const records = parseRecords(csv, delimiter);
  if (!records.length) return [];

  const headers = records[0].map((h) => h.trim().replace(/^"|"$/g, ''));
  requireITCostHeaders(headers); // Header validation

  const rows = records.slice(1);
  const costs: ITCost[] = [];
  const errors: CSVErrorDetail[] = [];

  const validCategories: ITCostCategory[] = ['hardware', 'software_licenses', 'maintenance_service', 'training', 'other'];
  const validFrequencies: ITCostFrequency[] = ['monthly', 'quarterly', 'yearly', 'one_time'];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 0-based index

    const pick = (key: string, fallback = '') => {
      const colIdx = headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());
      if (colIdx === -1 || colIdx >= row.length) return fallback;
      return row[colIdx];
    };

    const id = pick('id');
    const description = pick('description');
    const category = pick('category');
    const provider = pick('provider');
    const amount = pick('amount');
    const frequency = pick('frequency');
    const year = pick('year');

    // Column count validation
    if (row.length !== headers.length) {
      errors.push({
        row: rowNum,
        message: `Zeile hat ${row.length} Spalten, erwartet ${headers.length}`,
      });
    }

    // Required field checks
    if (!id) {
      errors.push({ row: rowNum, field: 'id', message: 'Pflichtfeld "id" fehlt oder ist leer' });
    }
    if (!description) {
      errors.push({ row: rowNum, field: 'description', message: 'Pflichtfeld "description" fehlt oder ist leer' });
    }
    if (!category) {
      errors.push({ row: rowNum, field: 'category', message: 'Pflichtfeld "category" fehlt oder ist leer' });
    }
    if (!provider) {
      errors.push({ row: rowNum, field: 'provider', message: 'Pflichtfeld "provider" fehlt oder ist leer' });
    }
    if (!amount) {
      errors.push({ row: rowNum, field: 'amount', message: 'Pflichtfeld "amount" fehlt oder ist leer' });
    }
    if (!frequency) {
      errors.push({ row: rowNum, field: 'frequency', message: 'Pflichtfeld "frequency" fehlt oder ist leer' });
    }
    if (!year) {
      errors.push({ row: rowNum, field: 'year', message: 'Pflichtfeld "year" fehlt oder ist leer' });
    }

    // Category validation
    if (category && !validCategories.includes(category as ITCostCategory)) {
      errors.push({
        row: rowNum,
        field: 'category',
        value: category,
        expected: validCategories.join(', '),
        message: 'Ungültige Kategorie'
      });
    }

    // Frequency validation
    if (frequency && !validFrequencies.includes(frequency as ITCostFrequency)) {
      errors.push({
        row: rowNum,
        field: 'frequency',
        value: frequency,
        expected: validFrequencies.join(', '),
        message: 'Ungültige Frequenz'
      });
    }

    // Year validation
    const yearNum = parseInt(year, 10);
    if (year && (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030)) {
      errors.push({
        row: rowNum,
        field: 'year',
        value: year,
        expected: '2020-2030',
        message: 'Jahr außerhalb des gültigen Bereichs'
      });
    }

    // Amount validation
    const amountNum = parseGermanNumber(amount);
    if (amount && amountNum < 0) {
      errors.push({
        row: rowNum,
        field: 'amount',
        value: amount,
        expected: '≥ 0',
        message: 'Betrag muss positiv sein'
      });
    }

    costs.push({
      id: id,
      description: description,
      category: (category as ITCostCategory) || 'other',
      provider: provider,
      amount: amountNum,
      frequency: (frequency as ITCostFrequency) || 'one_time',
      costCenter: pick('costCenter'),
      notes: pick('notes'),
      year: yearNum || new Date().getFullYear(),
    });
  });

  if (errors.length > 0) {
    throw new CSVParseError('CSV-Import fehlgeschlagen', errors, costs.length);
  }

  return costs;
}

/**
 * Serialisiert ITCost-Array zu CSV (v1.5.0: ohne startDate/endDate)
 */
export function serializeITCostsCSV(costs: ITCost[], delimiter: CsvDelimiter = ';'): string {
  const headers = IT_COST_REQUIRED_FIELDS;
  const header = headers.join(delimiter);

  const lines = costs.map((c) => [
    escapeField(c.id, delimiter),
    escapeField(c.description, delimiter),
    escapeField(c.category, delimiter),
    escapeField(c.provider, delimiter),
    escapeField(c.amount.toFixed(2), delimiter),
    escapeField(c.frequency, delimiter),
    escapeField(c.costCenter || '', delimiter),
    escapeField(c.notes || '', delimiter),
    escapeField(c.year.toString(), delimiter),
  ].join(delimiter));

  return [header, ...lines].join('\n');
}

/**
 * Parst VDB-S Budget CSV
 * Format: Projekt Nr.;Projekte;Kategorie;Budget 2026
 */
export function parseVDBSBudgetCSV(text: string): VDBSBudgetItem[] {
  const cleanText = text.replace(new RegExp(NULL_CHAR, 'g'), '');
  const lines = cleanText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const records = parseRecords(cleanText, delimiter);
  if (records.length === 0) return [];

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1);

  const items: VDBSBudgetItem[] = [];
  const errors: CSVErrorDetail[] = [];

  // Header validation
  const requiredHeaders = ['projekt nr', 'projekte', 'kategorie', 'budget 2026'];
  const missingHeaders = requiredHeaders.filter(
    (req) => !headers.some((h) => h.toLowerCase().includes(req))
  );
  if (missingHeaders.length > 0) {
    throw new Error(`CSV-Header unvollständig. Fehlende Spalten: ${missingHeaders.join(', ')}`);
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 0-based index

    // Skip empty rows
    if (row.every((cell) => !cell.trim())) {
      return;
    }

    const pick = (key: string, fallback = '') => {
      const colIdx = headers.findIndex((h) => h.toLowerCase().includes(key.toLowerCase()));
      if (colIdx === -1 || colIdx >= row.length) return fallback;
      return row[colIdx];
    };

    const projectNumber = pick('projekt nr');
    const projectName = pick('projekte');
    const categoryStr = pick('kategorie', 'RUN').toUpperCase();
    const budget2026Str = pick('budget 2026');

    // Required field checks
    if (!projectNumber) {
      errors.push({ row: rowNum, field: 'Projekt Nr.', message: 'Pflichtfeld "Projekt Nr." fehlt oder ist leer' });
    }
    if (!projectName) {
      errors.push({ row: rowNum, field: 'Projekte', message: 'Pflichtfeld "Projekte" fehlt oder ist leer' });
    }
    if (!budget2026Str) {
      errors.push({ row: rowNum, field: 'Budget 2026', message: 'Pflichtfeld "Budget 2026" fehlt oder ist leer' });
    }

    // Category validation
    const validCategories = ['RUN', 'CHANGE'];
    if (categoryStr && !validCategories.includes(categoryStr)) {
      errors.push({
        row: rowNum,
        field: 'Kategorie',
        value: categoryStr,
        expected: validCategories.join(', '),
        message: 'Ungültige Kategorie'
      });
    }

    // Budget validation
    const budget2026 = parseGermanNumber(budget2026Str);
    if (budget2026Str && budget2026 < 0) {
      errors.push({
        row: rowNum,
        field: 'Budget 2026',
        value: budget2026Str,
        expected: '≥ 0',
        message: 'Budget muss positiv sein'
      });
    }

    const category = (validCategories.includes(categoryStr) ? categoryStr : 'RUN') as 'RUN' | 'CHANGE';

    items.push({
      id: `vdbs-${idx + 1}`,
      projectNumber: projectNumber.trim(),
      projectName: projectName.trim(),
      category,
      budget2026,
      year: 2026,
    });
  });

  if (errors.length > 0) {
    throw new CSVParseError('CSV-Import fehlgeschlagen', errors, items.length);
  }

  return items;
}

/**
 * Serialisiert VDBSBudgetItem-Array zu CSV
 */
export function serializeVDBSBudgetCSV(items: VDBSBudgetItem[], delimiter: CsvDelimiter = ';'): string {
  const headers = ['Projekt Nr.', 'Projekte', 'Kategorie', 'Budget 2026'];
  const header = headers.join(delimiter);

  const lines = items.map((item) => [
    escapeField(item.projectNumber, delimiter),
    escapeField(item.projectName, delimiter),
    escapeField(item.category, delimiter),
    escapeField(item.budget2026.toFixed(2), delimiter),
  ].join(delimiter));

  return [header, ...lines].join('\n');
}

// ==================== Year Budgets CSV ====================

/**
 * Parst Year Budget CSV
 * Format: Jahr;Budget
 */
export function parseYearBudgetsCSV(text: string): YearBudget[] {
  const cleanText = text.replace(new RegExp(NULL_CHAR, 'g'), '');
  const lines = cleanText.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const records = parseRecords(cleanText, delimiter);
  if (records.length === 0) return [];

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1);

  const yearBudgets: YearBudget[] = [];
  const errors: CSVErrorDetail[] = [];

  // Header validation
  const requiredHeaders = ['jahr', 'budget'];
  const missingHeaders = requiredHeaders.filter(
    (req) => !headers.some((h) => h.toLowerCase().includes(req))
  );
  if (missingHeaders.length > 0) {
    throw new Error(`CSV-Header unvollständig. Fehlende Spalten: ${missingHeaders.join(', ')}`);
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 0-based index

    // Skip empty rows
    if (row.every((cell) => !cell.trim())) {
      return;
    }

    const pick = (key: string, fallback = '') => {
      const colIdx = headers.findIndex((h) => h.toLowerCase().includes(key.toLowerCase()));
      if (colIdx === -1 || colIdx >= row.length) return fallback;
      return row[colIdx];
    };

    const yearStr = pick('jahr');
    const budgetStr = pick('budget');

    // Required field checks
    if (!yearStr) {
      errors.push({ row: rowNum, field: 'Jahr', message: 'Pflichtfeld "Jahr" fehlt oder ist leer' });
    }
    if (!budgetStr) {
      errors.push({ row: rowNum, field: 'Budget', message: 'Pflichtfeld "Budget" fehlt oder ist leer' });
    }

    // Year validation
    const year = parseInt(yearStr, 10);
    if (yearStr && (isNaN(year) || year < 2020 || year > 2030)) {
      errors.push({
        row: rowNum,
        field: 'Jahr',
        value: yearStr,
        expected: '2020-2030',
        message: 'Jahr außerhalb des gültigen Bereichs'
      });
    }

    // Budget validation
    const budget = parseGermanNumber(budgetStr);
    if (budgetStr && budget < 0) {
      errors.push({
        row: rowNum,
        field: 'Budget',
        value: budgetStr,
        expected: '≥ 0',
        message: 'Budget muss positiv sein'
      });
    }

    yearBudgets.push({
      year: year || new Date().getFullYear(),
      budget,
    });
  });

  if (errors.length > 0) {
    throw new CSVParseError('CSV-Import fehlgeschlagen', errors, yearBudgets.length);
  }

  return yearBudgets;
}

/**
 * Serialisiert YearBudget-Array zu CSV
 */
export function serializeYearBudgetsCSV(yearBudgets: YearBudget[], delimiter: CsvDelimiter = ';'): string {
  const headers = ['Jahr', 'Budget'];
  const header = headers.join(delimiter);

  const lines = yearBudgets.map((yb) => [
    escapeField(yb.year.toString(), delimiter),
    escapeField(yb.budget.toFixed(2), delimiter),
  ].join(delimiter));

  return [header, ...lines].join('\n');
}
