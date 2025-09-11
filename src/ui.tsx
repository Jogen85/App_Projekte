import React from "react";

export const COLORS = {
  bg: "bg-slate-50",
  card: "bg-white",
  text: "text-slate-800",
  subtext: "text-slate-500",
  border: "border-slate-200",
  green: "#16a34a",
  amber: "#f59e0b",
  red: "#dc2626",
  blue: "#2563eb",
  cyan: "#0891b2",
  slate: "#64748b",
};

export const ragColorDot = (status: string) =>
  ({ green: COLORS.green, amber: COLORS.amber, red: COLORS.red } as Record<string,string>)[status] || COLORS.slate;

export const Card: React.FC<{ title?: string; className?: string; children?: React.ReactNode }> = ({ title, children, className = "" }) => (
  <div className={`rounded-2xl shadow-sm border ${COLORS.border} ${COLORS.card} p-4 ${className}`}>
    {title && <h3 className="font-semibold text-slate-700 mb-3">{title}</h3>}
    {children}
  </div>
);

const badgeStyles: Record<string,string> = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
};
export const Badge: React.FC<{ tone?: "green"|"amber"|"slate"; children?: React.ReactNode }> = ({ children, tone = "slate" }) => (
  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badgeStyles[tone]}`}>{children}</span>
);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full bg-slate-100 rounded-full h-2" aria-label="Fortschritt">
    <div className="h-2 rounded-full" style={{ width: `${clamp(value, 0, 100)}%`, backgroundColor: COLORS.blue }} />
  </div>
);

export const Ampel: React.FC<{ color?: "green"|"amber"|"red"|"slate"; label?: string }> = ({ color = "green", label }) => (
  <div className="flex items-center gap-2">
    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ragColorDot(color) }} aria-label={`Status ${color}`} />
    <span className="text-xs text-slate-600">{label}</span>
  </div>
);

export default { Card, Badge, Ampel, ProgressBar, COLORS };
