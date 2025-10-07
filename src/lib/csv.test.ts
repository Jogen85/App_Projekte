import { describe, it, expect } from 'vitest';
import { detectDelimiter, parseProjectsCSV, projectsToCSV } from './csv';

describe('CSV Parser', () => {
  describe('detectDelimiter', () => {
    it('detects semicolon delimiter', () => {
      expect(detectDelimiter('id;title;owner')).toBe(';');
    });

    it('detects comma delimiter', () => {
      expect(detectDelimiter('id,title,owner')).toBe(',');
    });

    it('ignores delimiters inside quotes', () => {
      expect(detectDelimiter('id;"title,with,commas";owner')).toBe(';');
    });

    it('prefers semicolon when counts are equal', () => {
      expect(detectDelimiter('id;title')).toBe(';');
      expect(detectDelimiter('id,title')).toBe(',');
    });
  });

  describe('parseProjectsCSV', () => {
    it('parses valid CSV with semicolon delimiter', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;Test Project;John;A test;active;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(result[0].title).toBe('Test Project');
      expect(result[0].progress).toBe(50);
      expect(result[0].budgetPlanned).toBe(10000);
    });

    it('parses CSV with comma delimiter', () => {
      const csv = `id,projectNumberInternal,projectNumberExternal,classification,title,owner,description,status,start,end,progress,budgetPlanned,costToDate,org,requiresAT82Check,at82Completed
p1,PINT-2025-001,,project,Test,John,Desc,active,2025-01-01,2025-12-31,50,10000,5000,BB,Nein,Nein`;
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('handles quoted fields with embedded delimiters', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;"Test; with semicolon";John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result[0].title).toBe('Test; with semicolon');
    });

    it('handles escaped quotes (double quotes)', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;"Project ""Foo""";John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result[0].title).toBe('Project "Foo"');
    });

    it('handles BOM (Byte Order Mark)', () => {
      const csv = '\ufeffid;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed\np1;PINT-2025-001;;project;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein';
      const result = parseProjectsCSV(csv);
      expect(result[0].id).toBe('p1');
    });

    it('handles null characters', () => {
      const csv = 'id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed\np1\x00;PINT-2025-001;;project;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein';
      const result = parseProjectsCSV(csv);
      expect(result[0].id).toBe('p1');
    });

    it('normalizes numeric fields', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;Test;John;Desc;active;2025-01-01;2025-12-31;50,5;10.000,50;5.000,25;BB;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result[0].progress).toBe(50.5);
      expect(result[0].budgetPlanned).toBe(10000.5);
      expect(result[0].costToDate).toBe(5000.25);
    });

    it('handles DD.MM.YYYY date format', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;Test;John;Desc;active;01.01.2025;31.12.2025;50;10000;5000;BB;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result[0].start).toBe('01.01.2025');
    });

    it('lowercases status', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;Test;John;Desc;ACTIVE;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result[0].status).toBe('active');
    });

    it('sets default org to BB if missing', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;;Nein;Nein`;
      const result = parseProjectsCSV(csv);
      expect(result[0].org).toBe('BB');
    });

    it('filters out empty rows', () => {
      const csv = `id;projectNumberInternal;projectNumberExternal;classification;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;org;requiresAT82Check;at82Completed
p1;PINT-2025-001;;project;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;BB;Nein;Nein

p2;PINT-2025-002;;project;Test2;Jane;Desc2;done;2025-01-01;2025-06-30;100;5000;5000;MBG;Ja;Ja`;
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(2);
    });
  });

  describe('projectsToCSV', () => {
    it('exports projects to CSV with semicolon delimiter', () => {
      const projects = [{
        id: 'p1',
        projectNumberInternal: 'PINT-2025-001',
        projectNumberExternal: undefined,
        classification: 'project' as const,
        title: 'Test',
        owner: 'John',
        description: 'A test',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 50,
        budgetPlanned: 10000,
        costToDate: 5000,
        org: 'BB',
        requiresAT82Check: false,
        at82Completed: false,
      }];
      const csv = projectsToCSV(projects, ';');
      expect(csv).toContain('id;projectNumberInternal;projectNumberExternal;classification;title;owner');
      expect(csv).toContain('p1;PINT-2025-001;;project;Test;John');
    });

    it('quotes fields containing delimiter', () => {
      const projects = [{
        id: 'p1',
        projectNumberInternal: 'PINT-2025-001',
        projectNumberExternal: undefined,
        classification: 'project' as const,
        title: 'Project; with semicolon',
        owner: 'John',
        description: 'Desc',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 50,
        budgetPlanned: 10000,
        costToDate: 5000,
        org: 'BB',
        requiresAT82Check: false,
        at82Completed: false,
      }];
      const csv = projectsToCSV(projects, ';');
      expect(csv).toContain('"Project; with semicolon"');
    });

    it('escapes quotes in field values', () => {
      const projects = [{
        id: 'p1',
        projectNumberInternal: 'PINT-2025-001',
        projectNumberExternal: undefined,
        classification: 'project' as const,
        title: 'Project "Foo"',
        owner: 'John',
        description: 'Desc',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 50,
        budgetPlanned: 10000,
        costToDate: 5000,
        org: 'BB',
        requiresAT82Check: false,
        at82Completed: false,
      }];
      const csv = projectsToCSV(projects, ';');
      expect(csv).toContain('"Project ""Foo"""');
    });

    it('round-trips data correctly', () => {
      const original = [{
        id: 'p1',
        projectNumberInternal: 'PINT-2025-001',
        projectNumberExternal: 'VDB-2025-042',
        classification: 'project_vdbs' as const,
        title: 'Test "Project"; Complex',
        owner: 'John Doe',
        description: 'Line1\nLine2',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 75,
        budgetPlanned: 10000,
        costToDate: 5000,
        org: 'BB/MBG',
        requiresAT82Check: true,
        at82Completed: false,
      }];
      const csv = projectsToCSV(original, ';');
      const parsed = parseProjectsCSV(csv);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe(original[0].title);
      expect(parsed[0].description).toBe(original[0].description);
      expect(parsed[0].org).toBe(original[0].org);
    });
  });
});
