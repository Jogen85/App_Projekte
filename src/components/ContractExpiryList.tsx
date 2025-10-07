import { ITCost } from '../types';
import { toDate } from '../lib';

interface Props {
  costs: ITCost[];
  year: number;
}

export default function ContractExpiryList({ costs, year }: Props) {
  const today = new Date();
  const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Filter: Nur befristete Verträge, die in den nächsten 90 Tagen auslaufen
  const expiringSoon = costs
    .filter((cost) => {
      if (!cost.endDate) return false; // Unbefristete Verträge ignorieren
      const endD = toDate(cost.endDate);
      return endD >= today && endD <= ninetyDaysFromNow;
    })
    .sort((a, b) => {
      const dateA = toDate(a.endDate);
      const dateB = toDate(b.endDate);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5); // Top 5

  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const formatDate = (dateStr: string) => {
    const d = toDate(dateStr);
    return d.toLocaleDateString('de-DE');
  };

  const getDaysUntil = (dateStr: string) => {
    const endD = toDate(dateStr);
    const diff = endD.getTime() - today.getTime();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {expiringSoon.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Keine Verträge laufen in den nächsten 90 Tagen aus
          </div>
        ) : (
          <div className="space-y-3">
            {expiringSoon.map((cost) => {
              const daysLeft = getDaysUntil(cost.endDate);
              const isUrgent = daysLeft <= 30;

              return (
                <div
                  key={cost.id}
                  className={`rounded-lg border p-3 ${
                    isUrgent ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{cost.description}</div>
                      <div className="mt-1 text-xs text-gray-600">{cost.provider}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Endet: {formatDate(cost.endDate)} ({daysLeft} Tage)
                      </div>
                    </div>
                    <div className="ml-3 text-right">
                      <div className="text-sm font-medium text-gray-900">{fmt(cost.amount)}</div>
                      <div className="text-xs text-gray-500">{cost.frequency === 'monthly' ? '/Monat' : cost.frequency === 'quarterly' ? '/Quartal' : cost.frequency === 'yearly' ? '/Jahr' : 'Einmalig'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
