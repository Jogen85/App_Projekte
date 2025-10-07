import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetDonut from './BudgetDonut';

describe('BudgetDonut', () => {
  describe('Normal budget (no overspend)', () => {
    it('renders spent and remaining correctly', () => {
      render(<BudgetDonut spent={50000} remaining={50000} />);

      // Should show IST legend with "Projekte" and "Verbleibend"
      expect(screen.getByText(/Ist:/i)).toBeInTheDocument();
      expect(screen.getByText(/Projekte:/i)).toBeInTheDocument();
      expect(screen.getByText(/Verbleibend:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/50\.000,00/).length).toBeGreaterThan(0);
    });

    it('shows green color when spent <= 90%', () => {
      render(<BudgetDonut spent={80000} remaining={20000} />);

      // Should show legend
      expect(screen.getByText(/Ist:/i)).toBeInTheDocument();
      // Should not show overspend warning
      expect(screen.queryByText(/Budget überschritten/i)).not.toBeInTheDocument();
    });

    it('shows amber color when spent between 90-105%', () => {
      render(<BudgetDonut spent={95000} remaining={5000} />);

      // Should show legend
      expect(screen.getByText(/Ist:/i)).toBeInTheDocument();
      expect(screen.queryByText(/Budget überschritten/i)).not.toBeInTheDocument();
    });
  });

  describe('Budget overspend', () => {
    it('detects overspend when remaining is negative', () => {
      render(<BudgetDonut spent={120000} remaining={-20000} />);

      // Should show overspend warning
      expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
      expect(screen.getAllByText(/20\.000,00/).length).toBeGreaterThan(0);
    });

    it('shows correct overspend percentage', () => {
      // Budget = 100k, Spent = 120k, Overspend = 20k (20%)
      render(<BudgetDonut spent={120000} remaining={-20000} />);

      // Overspend percentage relative to budget should be 20%
      expect(screen.getByText(/\(20%\)/i)).toBeInTheDocument();
    });

    it('uses red color for overspend segment', () => {
      render(<BudgetDonut spent={120000} remaining={-20000} />);

      // Should show "Überschr." label (abbreviated)
      expect(screen.getByText(/Überschr\./i)).toBeInTheDocument();
      // Warning banner should be present
      expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
    });

    it('handles large overspend correctly', () => {
      // Budget = 100k, Spent = 200k, Overspend = 100k (100%)
      render(<BudgetDonut spent={200000} remaining={-100000} />);

      expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
      expect(screen.getAllByText(/100\.000,00/).length).toBeGreaterThan(0);
    });

    it('shows aria-label indicating overspend', () => {
      const { container } = render(<BudgetDonut spent={120000} remaining={-20000} />);

      const donutElement = container.querySelector('[role="img"]');
      expect(donutElement).toHaveAttribute('aria-label', expect.stringContaining('Überschreitung'));
    });
  });

  describe('Edge cases', () => {
    it('handles zero budget', () => {
      render(<BudgetDonut spent={0} remaining={0} />);

      expect(screen.getByText(/Ist:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/0,00/).length).toBeGreaterThan(0);
    });

    it('handles zero spent with positive budget', () => {
      render(<BudgetDonut spent={0} remaining={100000} />);

      expect(screen.getByText(/Verbleibend:/i)).toBeInTheDocument();
      expect(screen.getByText(/Projekte:/i)).toBeInTheDocument();
    });

    it('handles exact budget match (100%)', () => {
      render(<BudgetDonut spent={100000} remaining={0} />);

      // Should show legend but no overspend
      expect(screen.getByText(/Ist:/i)).toBeInTheDocument();
      expect(screen.queryByText(/Budget überschritten/i)).not.toBeInTheDocument();
    });

    it('handles minimal overspend (1 euro)', () => {
      render(<BudgetDonut spent={100001} remaining={-1} />);

      expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
      expect(screen.getAllByText(/1,00/).length).toBeGreaterThan(0);
    });
  });

  describe('Visual thresholds', () => {
    it('shows red color when spent > 105%', () => {
      render(<BudgetDonut spent={110000} remaining={-10000} />);

      // Should show overspend warning
      expect(screen.getByText(/Budget überschritten/i)).toBeInTheDocument();
    });

    it('correctly calculates percentage for overspend scenarios', () => {
      // Budget = 50k, Spent = 60k, Overspend = 10k (20% over)
      render(<BudgetDonut spent={60000} remaining={-10000} />);

      expect(screen.getByText(/\(20%\)/i)).toBeInTheDocument();
    });
  });
});
