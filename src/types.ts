export type Project = {
  id: string;
  title: string;
  owner: string;
  description: string;
  status: 'planned' | 'active' | 'done' | string;
  start: string; // ISO or DD.MM.YYYY
  end: string;   // ISO or DD.MM.YYYY
  progress: number;
  budgetPlanned: number;
  costToDate: number;
  hoursPerMonth: number;
  org?: string;
};

export type NormalizedProject = Project & {
  startD: Date;
  endD: Date;
  orgNorm: string;
  statusNorm: string;
};

