export type Project = {
  id: string;
  projectNumberInternal: string; // Pflichtfeld: z.B. PINT-2025-001
  projectNumberExternal?: string; // Optional: z.B. VDB-2025-042
  classification: 'internal_dev' | 'project' | 'project_vdbs' | 'task'; // Klassifizierung
  title: string;
  owner: string;
  description: string;
  status: 'planned' | 'active' | 'done' | string;
  start: string; // ISO or DD.MM.YYYY
  end: string;   // ISO or DD.MM.YYYY
  progress: number;
  budgetPlanned: number;
  costToDate: number;
  org?: string;
  requiresAT82Check?: boolean;
  at82Completed?: boolean;
};

export type NormalizedProject = Project & {
  startD: Date;
  endD: Date;
  orgNorm: string;
  statusNorm: string;
};

export type YearBudget = {
  year: number;
  budget: number;
};

/**
 * IT-Kostenposition (laufende Kosten wie Lizenzen, Wartung, etc.)
 */
export interface ITCost {
  id: string;                    // UUID oder fortlaufende Nummer
  description: string;           // "Microsoft 365 Business Lizenzen"
  category: ITCostCategory;      // Hardware, Software, etc.
  provider: string;              // "Microsoft", "Dell", "Telekom"
  amount: number;                // Betrag in Euro (bei Frequenz Monthly/Quarterly wird automatisch hochgerechnet)
  frequency: ITCostFrequency;    // Monatlich, vierteljährlich, jährlich, einmalig
  startDate: string;             // YYYY-MM-DD (Vertragsbeginn)
  endDate: string;               // YYYY-MM-DD (Vertragsende, '' = unbefristet)
  costCenter: string;            // Kostenstelle/Abteilung, '' = nicht zugeordnet
  notes: string;                 // Freitext (Vertragsnummer, Ansprechpartner, etc.)
  year: number;                  // Jahr, für das dieser Eintrag gilt (2025, 2026, etc.)
}

export type ITCostCategory =
  | 'hardware'              // Hardware (Server, PCs, Netzwerk)
  | 'software_licenses'     // Software & Lizenzen
  | 'maintenance_service'   // Wartung & Service
  | 'training'              // Schulung & Weiterbildung
  | 'other';                // Sonstiges

export type ITCostFrequency =
  | 'monthly'      // Monatliche Zahlung (× 12)
  | 'quarterly'    // Vierteljährliche Zahlung (× 4)
  | 'yearly'       // Jährliche Zahlung (× 1)
  | 'one_time';    // Einmalige Zahlung (× 1)

/**
 * Aggregierte IT-Kosten nach Kategorie
 */
export interface ITCostsByCategory {
  hardware: number;
  software_licenses: number;
  maintenance_service: number;
  training: number;
  other: number;
  total: number;
}

/**
 * Aggregierte IT-Kosten nach Dienstleister
 */
export interface ITCostsByProvider {
  provider: string;
  total: number;
}

/**
 * VDB-S Budgetposition (Servicebudgets, Arbeitskreise, Projekte)
 */
export interface VDBSBudgetItem {
  id: string;                    // UUID oder Zeilen-ID
  projectNumber: string;         // "101.0", "102.0", etc.
  projectName: string;           // "Servicebudget Basis", etc.
  budget2026: number;            // Budget für 2026 in Euro
  year: number;                  // Jahr (2026)
}

