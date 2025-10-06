import type { Project } from '../types';

const REQUIRED_FIELDS = ['id','title','owner','description','status','start','end','progress','budgetPlanned','costToDate','org','requiresAT82Check','at82Completed'] as const;
const NULL_CHAR = String.fromCharCode(0);

export type CsvDelimiter = ';' | ',';

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
  for (let i = 1; i < records.length; i++) {
    const row = records[i];
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

    projects.push({
      id: pick('id') || `row-${i}`,
      title: pick('title'),
      owner: pick('owner'),
      description: pick('description'),
      status: (pick('status') || 'planned').toLowerCase(),
      start: pick('start'),
      end: pick('end'),
      progress: numeric(pick('progress')),
      budgetPlanned: numeric(pick('budgetPlanned')),
      costToDate: numeric(pick('costToDate')),
      org: pick('org') || 'BB',
      requiresAT82Check: parseBoolean(pick('requiresAT82Check')),
      at82Completed: parseBoolean(pick('at82Completed')),
    });
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
