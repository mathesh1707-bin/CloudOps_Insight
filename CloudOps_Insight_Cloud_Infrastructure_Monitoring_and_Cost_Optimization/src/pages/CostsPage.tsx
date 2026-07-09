import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { MonthlyCostSummary } from '../types';
import { fetchMonthlySummaries, MOCK_BUDGET, MOCK_RESOURCES } from '../data/mockData';
import { Skeleton } from '../components/ui/Skeleton';
import { useTheme } from '../context/ThemeContext';

// Per-theme literal hex palettes (SVG props don't resolve CSS vars)
function useChartColors(theme: string) {
  return theme === 'dark'
    ? {
        grid: '#262B31', axis: '#5C636B',
        primary: '#60A5FA', primaryFill: 'rgba(96,165,250,0.3)',
        secondary: '#F59E0B', secondaryFill: 'rgba(245,158,11,0.15)',
        tooltipBg: '#1B1F24', tooltipBorder: '#262B31', tooltipText: '#EDEBE6', tooltipLabel: '#8A9199',
        service: { EC2: '#60A5FA', RDS: '#A78BFA', S3: '#34D399', Lambda: '#F59E0B', LoadBalancer: '#F472B6' },
        region:  ['#60A5FA','#A78BFA','#34D399','#F59E0B','#F472B6'],
        barCells: ['#60A5FA','#A78BFA','#34D399','#F59E0B','#F472B6','#FB923C','#38BDF8','#4ADE80','#E879F9','#FACC15'],
        progressTrack: '#1B1F24',
      }
    : {
        grid: '#D6D4D1', axis: '#9A9A9A',
        primary: '#1565C0', primaryFill: 'rgba(21,101,192,0.25)',
        secondary: '#B45309', secondaryFill: 'rgba(180,83,9,0.12)',
        tooltipBg: '#FFFFFF', tooltipBorder: '#D6D4D1', tooltipText: '#262626', tooltipLabel: '#6B6B6B',
        service: { EC2: '#1565C0', RDS: '#5B6FD6', S3: '#1B7A4A', Lambda: '#B45309', LoadBalancer: '#C2185B' },
        region:  ['#1565C0','#5B6FD6','#1B7A4A','#B45309','#C2185B'],
        barCells: ['#1565C0','#5B6FD6','#1B7A4A','#B45309','#C2185B','#E65100','#00838F','#2E7D32','#6A1B9A','#F57F17'],
        progressTrack: '#F2F1EF',
      };
}

// Custom tooltip
function ChartTooltip({ active, payload, label, c }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[];
  label?: string; c: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 shadow-xl text-xs border" style={{ background: c.tooltipBg, borderColor: c.tooltipBorder }}>
      <p className="mb-2" style={{ color: c.tooltipLabel }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span style={{ color: c.tooltipLabel }}>{p.name}:</span>
          <span className="font-metric" style={{ color: c.tooltipText }}>${Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// Pie label
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number; name: string;
}) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="currentColor" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={500}>{name}</text>;
}

export default function CostsPage() {
  const { theme } = useTheme();
  const c = useChartColors(theme);
  const [summaries, setSummaries] = useState<MonthlyCostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMonthlySummaries().then(s => { setSummaries(s); setLoading(false); }); }, []);

  const last6       = summaries.slice(-6);
  const current     = last6[last6.length - 1];
  const prev        = last6[last6.length - 2];
  const budgetPct   = current ? (current.total / MOCK_BUDGET.monthlyBudget) * 100 : 0;
  const trend       = current && prev ? ((current.total - prev.total) / prev.total) * 100 : 0;
  const today       = new Date();
  const daysElapsed = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const forecast    = current ? (current.total / daysElapsed) * daysInMonth : 0;

  const budgetColor = budgetPct > 90 ? 'var(--status-critical)' : budgetPct > 80 ? 'var(--status-warning)' : 'var(--status-success)';

  const serviceData = current ? Object.entries(current.byService).map(([name, value]) => ({ name, value })) : [];
  const regionData  = current ? Object.entries(current.byRegion).filter(([,v]) => v > 0).map(([name, value]) => ({ name, value })) : [];
  const topResources = [...MOCK_RESOURCES].filter(r => r.costPerMonth > 0).sort((a,b) => b.costPerMonth - a.costPerMonth).slice(0,10);
  const trendData = [
    ...last6.slice(0,-1).map(m => ({ month: m.month, actual: m.total, forecast: null as number|null })),
    ...(current ? [{ month: current.month, actual: current.total, forecast: parseFloat(forecast.toFixed(2)) }] : []),
  ];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Cost Analysis</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Monthly spend, breakdowns, and forecasts</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This Month',    value: `$${current?.total.toLocaleString(undefined,{minimumFractionDigits:2}) ?? '—'}`, sub: `${trend>=0?'+':''}${trend.toFixed(1)}% vs last month`, icon: <DollarSign className="w-5 h-5" />, color: 'var(--series-a)', bg: 'color-mix(in srgb, var(--series-a) 12%, transparent)' },
          { label: 'Forecast (EOM)',value: `$${forecast.toLocaleString(undefined,{minimumFractionDigits:2})}`, sub: `${daysElapsed}/${daysInMonth} days elapsed`, icon: <TrendingUp className="w-5 h-5" />, color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
          { label: 'Budget',        value: `$${MOCK_BUDGET.monthlyBudget.toLocaleString()}`, sub: `${budgetPct.toFixed(1)}% consumed`, icon: <DollarSign className="w-5 h-5" />, color: budgetColor, bg: budgetPct>90?'var(--status-critical-bg)':'var(--status-success-bg)' },
          { label: 'MoM Change',    value: `${trend>=0?'+':''}${trend.toFixed(1)}%`, sub: trend>=0?'Spend increased':'Spend decreased', icon: trend>=0?<TrendingUp className="w-5 h-5" />:<TrendingDown className="w-5 h-5" />, color: trend>=0?'var(--status-critical)':'var(--status-success)', bg: trend>=0?'var(--status-critical-bg)':'var(--status-success-bg)' },
        ].map(({ label, value, sub, icon, color, bg }) => (
          <div key={label} className="card flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              <p className="font-metric text-xl font-semibold" style={{ color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: bg, color }}>{icon}</div>
          </div>
        ))}
      </div>

      {/* Budget burn progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Budget Burn-down</p>
          <span className="text-sm font-metric font-semibold" style={{ color: budgetColor }}>{budgetPct.toFixed(1)}% of ${MOCK_BUDGET.monthlyBudget.toLocaleString()}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-panel-hover)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(budgetPct,100)}%`, background: budgetColor }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Spent: ${current?.total.toFixed(2)}</span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Remaining: ${(MOCK_BUDGET.monthlyBudget - (current?.total ?? 0)).toFixed(2)}</span>
        </div>
        {budgetPct >= MOCK_BUDGET.alertThresholdPercent && (
          <div className="mt-3 px-3 py-2 rounded-lg border text-xs" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-border)', color: 'var(--status-warning)' }}>
            ⚠ Budget alert — {budgetPct.toFixed(0)}% consumed. Alert threshold: {MOCK_BUDGET.alertThresholdPercent}%.
          </div>
        )}
      </div>

      {/* Monthly trend */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Monthly Trend — Last 6 Months</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={c.primary}   stopOpacity={0.3} />
                <stop offset="95%" stopColor={c.primary}   stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={c.secondary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={c.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
            <Tooltip content={<ChartTooltip c={c} />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="actual"   name="Actual ($)"   stroke={c.primary}   fill="url(#costGrad)"     strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="forecast" name="Forecast ($)" stroke={c.secondary} fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Breakdown by Service</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false} label={PieLabel}>
                  {serviceData.map(entry => (
                    <Cell key={entry.name} fill={c.service[entry.name as keyof typeof c.service] ?? c.primary} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {serviceData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.service[name as keyof typeof c.service] ?? c.primary }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                  </div>
                  <span className="font-metric text-xs" style={{ color: 'var(--text-primary)' }}>${value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Breakdown by Region</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={regionData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: c.axis }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" name="Cost" radius={[4, 4, 0, 0]}>
                {regionData.map((_, i) => <Cell key={i} fill={c.region[i % c.region.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top resources table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Top Resources by Monthly Cost</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                {['Resource','Type','Region','Tier','Cost/Month','% of Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topResources.map(r => {
                const pct = current ? (r.costPerMonth / current.total) * 100 : 0;
                return (
                  <tr key={r.id} className="border-b transition-colors"
                    style={{ borderColor: 'var(--border-hairline)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-panel-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.type}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.region}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.tier}</td>
                    <td className="px-4 py-3 font-metric text-xs" style={{ color: 'var(--text-primary)' }}>${r.costPerMonth.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full" style={{ background: 'var(--bg-panel-hover)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct,100)}%`, background: c.primary }} />
                        </div>
                        <span className="font-metric text-xs" style={{ color: 'var(--text-tertiary)' }}>{pct.toFixed(1)}%</span>
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
