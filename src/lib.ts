// Date and math helpers
export const getToday = () => new Date();
export const getCurrentYear = () => getToday().getFullYear();

export const toDate = (s: any): Date => {
  if (s instanceof Date) return s;
  if (typeof s === 'string') {
    const str = s.trim();
    const parts = str.split('.');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const d = Number(parts[0]); const m = Number(parts[1]) - 1; const y = Number(parts[2]);
      const dt = new Date(y, m, d); if (!isNaN(dt.getTime())) return dt;
    }
    return new Date(str);
  }
  return new Date(s);
};

export const fmtDate = (d: Date) => d.toLocaleDateString('de-DE');

// Konvertiert ein Datum in ISO-Format (YYYY-MM-DD) für date-Inputs
export const toISODate = (s: any): string => {
  if (!s) return '';
  const d = toDate(s);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const daysBetween = (a: any, b: any) => {
  const A = toDate(a); const B = toDate(b);
  if (isNaN(A.getTime()) || isNaN(B.getTime())) return 0;
  return Math.max(0, Math.round((B.getTime() - A.getTime()) / MS_PER_DAY));
};

export const yearStart = (y: number) => new Date(y, 0, 1);
export const yearEnd = (y: number) => new Date(y, 11, 31, 23, 59, 59, 999);

export const overlapDays = (aStart: any, aEnd: any, bStart: any, bEnd: any) => {
  const sA = toDate(aStart); const eA = toDate(aEnd);
  const sB = toDate(bStart); const eB = toDate(bEnd);
  if ([sA, eA, sB, eB].some((d) => isNaN(d.getTime()))) return 0;
  const s = sA > sB ? sA : sB;
  const e = eA < eB ? eA : eB;
  const diff = (e.getTime() - s.getTime()) / MS_PER_DAY;
  return Math.max(0, Math.round(diff));
};

// RAGs and budget/resource helpers
export function calcTimeRAGD(p: { startD: Date; endD: Date; progress: number }) {
  const start = p.startD; const end = p.endD;
  const total = Math.max(1, end.getTime() - start.getTime());
  const now = getToday();
  const elapsed = clamp(now.getTime() - start.getTime(), 0, total);
  const expected = Math.round((elapsed / total) * 100);
  const delta = (p.progress || 0) - expected;
  if (now > end && (p.progress || 0) < 100) return 'red';
  if (delta < -15) return 'red';
  if (delta < -5) return 'amber';
  return 'green';
}

export function calcBudgetRAG(p: { budgetPlanned: number; costToDate: number; progress: number }) {
  if (p.budgetPlanned <= 0) return 'green';
  const spendPct = (p.costToDate / p.budgetPlanned) * 100;
  if (spendPct > 105) return 'red';
  if (spendPct > 90 && p.progress < 80) return 'amber';
  return 'green';
}

export const projectDaySpanD = (p: { startD: Date; endD: Date }) => Math.max(1, daysBetween(p.startD, p.endD));
export function plannedBudgetForYearD(p: { startD: Date; endD: Date; budgetPlanned: number }, y: number) {
  const overlap = overlapDays(p.startD, p.endD, yearStart(y), yearEnd(y));
  return (p.budgetPlanned || 0) * (overlap / projectDaySpanD(p));
}
export function costsYTDForYearD(p: { startD: Date; endD: Date; costToDate: number }, y: number) {
  const now = getToday();
  const elapsedEnd = new Date(Math.min(now.getTime(), p.endD.getTime()));
  const elapsedDays = Math.max(1, daysBetween(p.startD, elapsedEnd));
  const yEnd = y === now.getFullYear() ? elapsedEnd : yearEnd(y);
  const yOverlap = overlapDays(p.startD, elapsedEnd, yearStart(y), yEnd);
  return (p.costToDate || 0) * (yOverlap / elapsedDays);
}

// IT-Kosten Berechnungen
import type { ITCost, ITCostsByCategory, ITCostsByProvider } from './types';

/**
 * Hilfsfunktion: Parst Datum-String zu Date
 */
function parseDate(dateStr: string): Date {
  return toDate(dateStr);
}

/**
 * Hilfsfunktion: Prüft ob Jahr ein Schaltjahr ist
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Berechnet die jährlichen Kosten einer IT-Kostenposition
 * Berücksichtigt Frequenz und anteilige Berechnung bei unterjährigem Start/Ende
 */
export function calculateYearlyCostD(
  cost: ITCost,
  year: number,
  _today: Date = new Date()
): number {
  const yearStartD = new Date(year, 0, 1);
  const yearEndD = new Date(year, 11, 31);

  // Vertragszeitraum parsen
  const startD = parseDate(cost.startDate);
  const endD = cost.endDate ? parseDate(cost.endDate) : null;

  // Wenn Vertrag komplett außerhalb des Jahres liegt → 0
  if (startD > yearEndD) return 0;
  if (endD && endD < yearStartD) return 0;

  // Überlappende Tage im Jahr berechnen
  const effectiveStartD = startD > yearStartD ? startD : yearStartD;
  const effectiveEndD = endD && endD < yearEndD ? endD : yearEndD;
  const overlapDaysD = daysBetween(effectiveStartD, effectiveEndD) + 1; // +1 für inklusiv

  // Basis-Jahreskosten je nach Frequenz
  let yearlyBaseAmount = 0;
  switch (cost.frequency) {
    case 'monthly':
      yearlyBaseAmount = cost.amount * 12;
      break;
    case 'quarterly':
      yearlyBaseAmount = cost.amount * 4;
      break;
    case 'yearly':
      yearlyBaseAmount = cost.amount;
      break;
    case 'one_time':
      // Einmalige Kosten nur im Jahr des Starts
      if (startD.getFullYear() === year) {
        return cost.amount;
      }
      return 0;
  }

  // Anteilige Berechnung bei unterjährigem Start/Ende
  const daysInYear = isLeapYear(year) ? 366 : 365;
  return (yearlyBaseAmount * overlapDaysD) / daysInYear;
}

/**
 * Aggregiert IT-Kosten nach Kategorie für ein Jahr
 */
export function getITCostsByCategoryD(
  costs: ITCost[],
  year: number,
  today: Date = new Date()
): ITCostsByCategory {
  const result: ITCostsByCategory = {
    hardware: 0,
    software_licenses: 0,
    maintenance_service: 0,
    training: 0,
    other: 0,
    total: 0,
  };

  costs.forEach((cost) => {
    const yearlyCost = calculateYearlyCostD(cost, year, today);
    result[cost.category] += yearlyCost;
    result.total += yearlyCost;
  });

  return result;
}

/**
 * Aggregiert IT-Kosten nach Dienstleister für ein Jahr
 */
export function getITCostsByProviderD(
  costs: ITCost[],
  year: number,
  today: Date = new Date()
): ITCostsByProvider[] {
  const providerMap = new Map<string, number>();

  costs.forEach((cost) => {
    const yearlyCost = calculateYearlyCostD(cost, year, today);
    if (yearlyCost > 0) {
      const current = providerMap.get(cost.provider) || 0;
      providerMap.set(cost.provider, current + yearlyCost);
    }
  });

  return Array.from(providerMap.entries())
    .map(([provider, total]) => ({ provider, total }))
    .sort((a, b) => b.total - a.total); // Sortiert nach Höhe absteigend
}

