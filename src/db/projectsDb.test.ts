import { beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../types';
import {
  db,
  loadProjects,
  saveProjects,
  ensureSeedData,
  resetSeedDataForTests,
} from './projectsDb';

const sampleProjects: Project[] = [
  {
    id: 't1',
    projectNumberInternal: 'TEST-1',
    classification: 'project',
    title: 'Test Projekt 1',
    owner: 'Tester',
    description: 'Erster Test',
    status: 'active',
    start: '2025-01-01',
    end: '2025-03-01',
    progress: 30,
    budgetPlanned: 10000,
    costToDate: 4000,
  },
  {
    id: 't2',
    projectNumberInternal: 'TEST-2',
    classification: 'project',
    title: 'Test Projekt 2',
    owner: 'Tester',
    description: 'Zweiter Test',
    status: 'planned',
    start: '2025-04-01',
    end: '2025-06-30',
    progress: 0,
    budgetPlanned: 20000,
    costToDate: 0,
  },
];

async function clearDatabase() {
  await db.projects.clear();
  await db.yearBudgets.clear();
  await db.itCosts.clear();
  await db.vdbsBudget.clear();
  resetSeedDataForTests();
}

describe('projectsDb', () => {
  beforeEach(async () => {
    await clearDatabase();
    window.localStorage.clear();
  });

  it('persists projects with saveProjects/loadProjects', async () => {
    await saveProjects(sampleProjects);
    const stored = await loadProjects();
    expect(stored).toEqual(sampleProjects);
  });

  it('migrates legacy localStorage data via ensureSeedData', async () => {
    window.localStorage.setItem('projects_json', JSON.stringify(sampleProjects));

    await ensureSeedData();

    const stored = await loadProjects();
    expect(stored).toEqual(sampleProjects);
    expect(window.localStorage.getItem('projects_json')).toBeNull();
  });
});
