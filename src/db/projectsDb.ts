import Dexie, { Table } from 'dexie';
import type { Project, YearBudget, ITCost, VDBSBudgetItem } from '../types';
import { parseProjectsCSV } from '../lib/csv';
import { DEMO_PROJECTS, DEMO_IT_COSTS } from '../data/demoData';

type Maybe<T> = T | null | undefined;

export interface ProjectRecord extends Project {
  sortOrder: number;
  updatedAt: string;
}

class ProjectsDexie extends Dexie {
  projects!: Table<ProjectRecord, string>;
  yearBudgets!: Table<YearBudget, number>;
  itCosts!: Table<ITCost, string>;
  vdbsBudget!: Table<VDBSBudgetItem, string>;

  constructor() {
    super('ITPortfolioDB');
    this.version(1).stores({
      projects: '&id, sortOrder, status, classification, org',
      yearBudgets: '&year',
      itCosts: '&id, year, category, provider',
      vdbsBudget: '&id, year, category',
    });
  }
}

export const db = new ProjectsDexie();

const stripProjectRecord = ({ sortOrder: _sort, updatedAt: _updated, ...project }: ProjectRecord): Project => project;

const withProjectMetadata = (project: Project, sortOrder: number): ProjectRecord => ({
  ...project,
  sortOrder,
  updatedAt: new Date().toISOString(),
});

export async function saveProjects(projects: Project[]): Promise<void> {
  await db.transaction('rw', db.projects, async () => {
    await db.projects.clear();
    const records = projects.map((project, index) => withProjectMetadata(project, index));
    if (records.length) {
      await db.projects.bulkPut(records);
    }
  });
}

export async function loadProjects(): Promise<Project[]> {
  const rows = await db.projects.orderBy('sortOrder').toArray();
  return rows.map(stripProjectRecord);
}

export async function saveYearBudgets(budgets: YearBudget[]): Promise<void> {
  await db.transaction('rw', db.yearBudgets, async () => {
    await db.yearBudgets.clear();
    if (budgets.length) {
      await db.yearBudgets.bulkPut(budgets);
    }
  });
}

export async function loadYearBudgets(): Promise<YearBudget[]> {
  return db.yearBudgets.orderBy('year').toArray();
}

export async function saveITCosts(costs: ITCost[]): Promise<void> {
  await db.transaction('rw', db.itCosts, async () => {
    await db.itCosts.clear();
    if (costs.length) {
      await db.itCosts.bulkPut(costs);
    }
  });
}

export async function loadITCosts(): Promise<ITCost[]> {
  return db.itCosts.toArray();
}

export async function saveVDBSBudget(items: VDBSBudgetItem[]): Promise<void> {
  await db.transaction('rw', db.vdbsBudget, async () => {
    await db.vdbsBudget.clear();
    if (items.length) {
      await db.vdbsBudget.bulkPut(items);
    }
  });
}

export async function loadVDBSBudget(): Promise<VDBSBudgetItem[]> {
  return db.vdbsBudget.toArray();
}

const parseJSON = <T>(value: Maybe<string>): T | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch (error) {
    console.warn('Failed to parse legacy JSON payload', error);
    return null;
  }
};

const migrateProjectsFromLocalStorage = async (): Promise<Project[] | null> => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('projects_json');
  const projects = parseJSON<Project[]>(raw);
  if (projects && projects.length) {
    await saveProjects(projects);
    window.localStorage.removeItem('projects_json');
    return projects;
  }
  return null;
};

const migrateYearBudgetsFromLocalStorage = async (): Promise<YearBudget[] | null> => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('yearBudgets');
  const budgets = parseJSON<YearBudget[]>(raw);
  if (budgets && budgets.length) {
    await saveYearBudgets(budgets);
    window.localStorage.removeItem('yearBudgets');
    return budgets;
  }
  return null;
};

const migrateITCostsFromLocalStorage = async (): Promise<ITCost[] | null> => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('itCosts');
  const itCosts = parseJSON<ITCost[]>(raw);
  if (itCosts && itCosts.length) {
    await saveITCosts(itCosts);
    window.localStorage.removeItem('itCosts');
    return itCosts;
  }
  return null;
};

const migrateVDBSBudgetFromLocalStorage = async (): Promise<VDBSBudgetItem[] | null> => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('vdbsBudget');
  const items = parseJSON<VDBSBudgetItem[]>(raw);
  if (items && items.length) {
    await saveVDBSBudget(items);
    window.localStorage.removeItem('vdbsBudget');
    return items;
  }
  return null;
};

const fetchProjectsCSV = async (): Promise<Project[] | null> => {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch('/data/projects.csv');
    if (!response.ok) return null;
    const text = await response.text();
    const parsed = parseProjectsCSV(text);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch (error) {
    console.warn('Failed to load projects.csv', error);
    return null;
  }
};

const seedProjects = async (): Promise<void> => {
  const migrated = await migrateProjectsFromLocalStorage();
  if (migrated && migrated.length) return;

  const fromCSV = await fetchProjectsCSV();
  if (fromCSV && fromCSV.length) {
    await saveProjects(fromCSV);
    return;
  }

  await saveProjects(DEMO_PROJECTS);
};

const seedYearBudgets = async (): Promise<void> => {
  const migrated = await migrateYearBudgetsFromLocalStorage();
  if (migrated && migrated.length) return;
};

const seedITCosts = async (): Promise<void> => {
  const migrated = await migrateITCostsFromLocalStorage();
  if (migrated && migrated.length) return;
  await saveITCosts(DEMO_IT_COSTS);
};

const seedVDBSBudget = async (): Promise<void> => {
  const migrated = await migrateVDBSBudgetFromLocalStorage();
  if (migrated && migrated.length) return;
};

let seedPromise: Promise<void> | null = null;

export const ensureSeedData = async () => {
  if (!seedPromise) {
    seedPromise = (async () => {
      await db.open();
      const [projectCount, budgetCount, itCostCount, vdbsCount] = await Promise.all([
        db.projects.count(),
        db.yearBudgets.count(),
        db.itCosts.count(),
        db.vdbsBudget.count(),
      ]);

      if (!projectCount) {
        await seedProjects();
      }
      if (!budgetCount) {
        await seedYearBudgets();
      }
      if (!itCostCount) {
        await seedITCosts();
      }
      if (!vdbsCount) {
        await seedVDBSBudget();
      }
    })();
  }
  return seedPromise;
};

export const resetSeedDataForTests = () => {
  seedPromise = null;
};
