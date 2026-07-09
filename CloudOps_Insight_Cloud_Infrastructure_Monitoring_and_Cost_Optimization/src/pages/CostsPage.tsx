import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { MonthlyCostSummary } from '../types';
import { fetchMonthlySummaries, MOCK_BUDGET, MOCK_RESOURCES } from '../data/mockData';
import { Skeleton } from '../components/ui/Skeleton';

// ── Color palette for charts ──────────────────────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
  EC2: '#60a5fa', RDS: '#a78bfa', S3: '#34d399', Lambda: '#fbbf24', LoadBalancer: '#f472b6',
};
const REGION_COLORS = ['#60a5fa','#a78bfa','#34d399','#fbbf24','#f472b6'];

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141d2e] border border-[#1a2540] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[#4a5e80] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-[#8fa3bc]">{p.name}:</span>
          <span className="font-metric text-white">${p.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Custom pie label ──────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; innerRadius: number;
  outerRadius: number; percent: number; name: string;
}) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={500}>
      {name}
    </text>
  );
}

export default function CostsPage() {
  const [summaries, setSummaries] = useState<MonthlyCostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlySummaries().then(s => { setSummaries(s); setLoading(false); });
  }, []);

  const last6 = summaries.slice(-6);
  const currentMonth = last6[last6.length - 1];
  const prevMonth = last6[last6.length - 2];
  const budgetPct = currentMonth ? (currentMonth.total / MOCK_BUDGET.monthlyBudget) * 100 : 0;
  const trend = currentMonth && prevMonth
    ? ((currentMonth.total - prevMonth.total) / prevMonth.total) * 100
    : 0;

  // Forecast: linear extrapolation from days elapsed
  const today = new Date();
  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const forecastTotal = currentMonth ? (currentMonth.total / daysElapsed) * daysInMonth : 0;

  // Service breakdown from current month
  const serviceData = currentMonth
    ? Object.entries(currentMonth.byService).map(([name, value]) => ({ name, value }))
    : [];

  // Region breakdown
  const regionData = currentMonth
    ? Object.entries(currentMonth.byRegion)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  // Top resources by cost
  const topResources = [...MOCK_RESOURCES]
    .filter(r => r.costPerMonth > 0)
    .sort((a, b) => b.costPerMonth - a.costPerMonth)
    .slice(0, 10);

  // Monthly trend data for area chart (add forecast point)
  const trendData = [
    ...last6.slice(0, -1).map(m => ({ month: m.month, actual: m.total, forecast: null as number | null })),
    ...(currentMonth ? [{
      month: currentMonth.month,
      actual: currentMonth.total,
      forecast: parseFloat(forecastTotal.toFixed(2)),
    }] : []),
  ];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Cost Analysis</h1>
        <p className="text-sm text-[#4a5e80] mt-0.5">Monthly spend, breakdowns, and forecasts</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'This Month',
            value: `$${currentMonth?.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '—'}`,
            sub: `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}% vs last month`,
            icon: <DollarSign className="w-5 h-5 text-blue-400" />,
            accent: 'text-blue-400',
            iconBg: 'bg-blue-400/10',
          },
          {
            label: 'Forecast (EOM)',
            value: `$${forecastTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            sub: `${daysElapsed}/${daysInMonth} days elapsed`,
            icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
            accent: 'text-amber-400',
            iconBg: 'bg-amber-400/10',
          },
          {
            label: 'Budget',
            value: `$${MOCK_BUDGET.monthlyBudget.toLocaleString()}`,
            sub: `${budgetPct.toFixed(1)}% consumed`,
            icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
            accent: budgetPct > 90 ? 'text-red-400' : 'text-emerald-400',
            iconBg: budgetPct > 90 ? 'bg-red-400/10' : 'bg-emerald-400/10',
          },
          {
            label: 'MoM Change',
            value: `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`,
            sub: trend >= 0 ? 'Spend increased' : 'Spend decreased',
            icon: trend >= 0
              ? <TrendingUp className="w-5 h-5 text-red-400" />
              : <TrendingDown className="w-5 h-5 text-emerald-400" />,
            accent: trend >= 0 ? 'text-red-400' : 'text-emerald-400',
            iconBg: trend >= 0 ? 'bg-red-400/10' : 'bg-emerald-400/10',
          },
        ].map(({ label, value, sub, icon, accent, iconBg }) => (
          <div key={label} className="card flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">{label}</p>
              <p className={`font-metric text-xl font-semibold ${accent}`}>{value}</p>
              <p className="text-xs text-[#4a5e80] mt-1">{sub}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Budget burn progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider">Budget Burn-down</p>
          <span className={`text-sm font-metric font-semibold ${budgetPct > 90 ? 'text-red-400' : budgetPct > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {budgetPct.toFixed(1)}% of ${MOCK_BUDGET.monthlyBudget.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-[#141d2e] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-400' : budgetPct > 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(budgetPct, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[#4a5e80]">Spent: ${currentMonth?.total.toFixed(2)}</span>
          <span className="text-xs text-[#4a5e80]">
            Remaining: ${(MOCK_BUDGET.monthlyBudget - (currentMonth?.total ?? 0)).toFixed(2)}
          </span>
        </div>
        {budgetPct >= MOCK_BUDGET.alertThresholdPercent && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs">
            ⚠ Budget alert — {budgetPct.toFixed(0)}% consumed. You have set a {MOCK_BUDGET.alertThresholdPercent}% alert threshold.
          </div>
        )}
      </div>

      {/* Monthly trend chart */}
      <div className="card">
        <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">Monthly Trend — Last 6 Months</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a5e80' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="actual" name="Actual ($)" stroke="#60a5fa" fill="url(#costGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="forecast" name="Forecast ($)" stroke="#fbbf24" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By service donut */}
        <div className="card">
          <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">Breakdown by Service</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" labelLine={false} label={PieLabel}>
                  {serviceData.map(entry => (
                    <Cell key={entry.name} fill={SERVICE_COLORS[entry.name] ?? '#60a5fa'} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {serviceData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SERVICE_COLORS[name] }} />
                    <span className="text-xs text-[#8fa3bc]">{name}</span>
                  </div>
                  <span className="font-metric text-xs text-white">${value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By region bar */}
        <div className="card">
          <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">Breakdown by Region</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={regionData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#4a5e80' }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Bar dataKey="value" name="Cost" radius={[4, 4, 0, 0]}>
                {regionData.map((_, i) => <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top resources by cost */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2540]">
          <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider">Top Resources by Monthly Cost</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a2540]">
                {['Resource', 'Type', 'Region', 'Tier', 'Cost/Month', '% of Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#4a5e80] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topResources.map(r => {
                const pct = currentMonth ? (r.costPerMonth / currentMonth.total) * 100 : 0;
                return (
                  <tr key={r.id} className="border-b border-[#1a2540]/50 hover:bg-[#141d2e] transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                    <td className="px-4 py-3 text-[#8fa3bc]">{r.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6b829e]">{r.region}</td>
                    <td className="px-4 py-3 text-xs text-[#6b829e]">{r.tier}</td>
                    <td className="px-4 py-3 font-metric text-white">${r.costPerMonth.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-[#141d2e] rounded-full">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="font-metric text-xs text-[#6b829e]">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
