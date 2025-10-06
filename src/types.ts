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

