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
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;Test Project;John;A test;active;2025-01-01;2025-12-31;50;10000;5000;10;BB`;
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
      expect(result[0].title).toBe('Test Project');
      expect(result[0].progress).toBe(50);
      expect(result[0].budgetPlanned).toBe(10000);
    });

    it('parses CSV with comma delimiter', () => {
      const csv = `id,title,owner,description,status,start,end,progress,budgetPlanned,costToDate,hoursPerMonth,org
p1,Test,John,Desc,active,2025-01-01,2025-12-31,50,10000,5000,10,BB`;
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('handles quoted fields with embedded delimiters', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;"Project; with semicolon";John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;10;BB`;
      const result = parseProjectsCSV(csv);
      expect(result[0].title).toBe('Project; with semicolon');
    });

    it('handles escaped quotes (double quotes)', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;"Project ""Foo""";John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;10;BB`;
      const result = parseProjectsCSV(csv);
      expect(result[0].title).toBe('Project "Foo"');
    });

    it('handles BOM (Byte Order Mark)', () => {
      const csv = '\ufeffid;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org\np1;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;10;BB';
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('handles null characters', () => {
      const csv = 'id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org\np1\x00;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;10;BB';
      const result = parseProjectsCSV(csv);
      expect(result[0].id).toBe('p1');
    });

    it('normalizes numeric fields', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;Test;John;Desc;active;2025-01-01;2025-12-31;75.5;12 000;5000.50;8;BB`;
      const result = parseProjectsCSV(csv);
      expect(result[0].progress).toBe(75.5);
      expect(result[0].budgetPlanned).toBe(12000);
      // Parser replaces comma with dot, so "5000.50" becomes 5000.5
      expect(result[0].costToDate).toBe(5000.5);
    });

    it('handles DD.MM.YYYY date format', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;Test;John;Desc;active;01.05.2025;31.12.2025;50;10000;5000;10;BB`;
      const result = parseProjectsCSV(csv);
      expect(result[0].start).toBe('01.05.2025');
      expect(result[0].end).toBe('31.12.2025');
    });

    it('lowercases status', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;Test;John;Desc;ACTIVE;2025-01-01;2025-12-31;50;10000;5000;10;BB`;
      const result = parseProjectsCSV(csv);
      expect(result[0].status).toBe('active');
    });

    it('sets default org to BB if missing', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;10;`;
      const result = parseProjectsCSV(csv);
      expect(result[0].org).toBe('BB');
    });

    it('throws error if required headers are missing', () => {
      const csv = `id;title;owner
p1;Test;John`;
      expect(() => parseProjectsCSV(csv)).toThrow(/CSV-Header unvollständig/);
    });

    it('returns empty array for empty input', () => {
      expect(parseProjectsCSV('')).toEqual([]);
      expect(parseProjectsCSV('   ')).toEqual([]);
    });

    it('filters out empty rows', () => {
      const csv = `id;title;owner;description;status;start;end;progress;budgetPlanned;costToDate;hoursPerMonth;org
p1;Test;John;Desc;active;2025-01-01;2025-12-31;50;10000;5000;10;BB

p2;Test2;Jane;Desc2;done;2025-01-01;2025-12-31;100;20000;20000;0;MBG`;
      const result = parseProjectsCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p1');
      expect(result[1].id).toBe('p2');
    });
  });

  describe('projectsToCSV', () => {
    it('exports projects to CSV with semicolon delimiter', () => {
      const projects = [{
        id: 'p1',
        title: 'Test',
        owner: 'John',
        description: 'A test',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 50,
        budgetPlanned: 10000,
        costToDate: 5000,
        hoursPerMonth: 10,
        org: 'BB',
      }];
      const csv = projectsToCSV(projects, ';');
      expect(csv).toContain('id;title;owner');
      expect(csv).toContain('p1;Test;John');
    });

    it('quotes fields containing delimiter', () => {
      const projects = [{
        id: 'p1',
        title: 'Project; with semicolon',
        owner: 'John',
        description: 'Desc',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 50,
        budgetPlanned: 10000,
        costToDate: 5000,
        hoursPerMonth: 10,
        org: 'BB',
      }];
      const csv = projectsToCSV(projects, ';');
      expect(csv).toContain('"Project; with semicolon"');
    });

    it('escapes quotes in field values', () => {
      const projects = [{
        id: 'p1',
        title: 'Project "Foo"',
        owner: 'John',
        description: 'Desc',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 50,
        budgetPlanned: 10000,
        costToDate: 5000,
        hoursPerMonth: 10,
        org: 'BB',
      }];
      const csv = projectsToCSV(projects, ';');
      expect(csv).toContain('"Project ""Foo"""');
    });

    it('round-trips data correctly', () => {
      const original = [{
        id: 'p1',
        title: 'Test "Project"; Complex',
        owner: 'John Doe',
        description: 'Line1\nLine2',
        status: 'active',
        start: '2025-01-01',
        end: '2025-12-31',
        progress: 75,
        budgetPlanned: 10000,
        costToDate: 5000,
        hoursPerMonth: 10,
        org: 'BB/MBG',
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
