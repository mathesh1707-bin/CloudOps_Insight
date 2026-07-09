import { useState, useEffect } from 'react';
import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, AlertTriangle, CheckCircle, TrendingUp, Info } from 'lucide-react';
import type { Anomaly, AnomalyStatus } from '../types';
import { fetchAnomalies, MOCK_COST_ENTRIES, MOCK_RESOURCES, MOCK_RECOMMENDATIONS } from '../data/mockData';
import SeverityBadge from '../components/ui/SeverityBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { useTheme } from '../context/ThemeContext';

// ── Anomaly chart ─────────────────────────────────────────────────────────────
function AnomalyChart({ resourceId, chartColors }: {
  resourceId: string;
  chartColors: Record<string, string>;
}) {
  const resource = MOCK_RESOURCES.find(r => r.id === resourceId);
  const entries  = MOCK_COST_ENTRIES
    .filter(e => e.resourceId === resourceId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-45);

  const chartData = entries.map((e, i) => {
    const win      = entries.slice(Math.max(0, i - 14), i);
    const mean     = win.length > 0 ? win.reduce((s, x) => s + x.cost, 0) / win.length : e.cost;
    const variance = win.length > 1 ? win.reduce((s, x) => s + (x.cost - mean) ** 2, 0) / win.length : 0;
    const std      = Math.sqrt(variance);
    const isAnom   = std > 0.01 && Math.abs((e.cost - mean) / std) > 2;
    return {
      date:    e.date.slice(5),
      cost:    e.cost,
      ma:      parseFloat(mean.toFixed(2)),
      upper:   parseFloat((mean + 2 * std).toFixed(2)),
      lower:   parseFloat(Math.max(0, mean - 2 * std).toFixed(2)),
      anomaly: isAnom ? e.cost : null,
    };
  });

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {resource?.name ?? resourceId} — Daily Cost with 2σ Bounds
        </p>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>14-day moving average</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: chartColors.axis }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, fontSize: 11, color: chartColors.tooltipText }}
            labelStyle={{ color: chartColors.tooltipLabel }} />
          <Line type="monotone" dataKey="upper" stroke={chartColors.band} strokeWidth={1} strokeDasharray="4 3" dot={false} name="Upper 2σ" />
          <Line type="monotone" dataKey="lower" stroke={chartColors.band} strokeWidth={1} strokeDasharray="4 3" dot={false} name="Lower 2σ" />
          <Line type="monotone" dataKey="ma"    stroke={chartColors.ma}   strokeWidth={2} dot={false} name="14d MA" />
          <Line type="monotone" dataKey="cost"  stroke={chartColors.cost} strokeWidth={1.5} dot={false} name="Actual" />
          {/* Anomaly scatter: rendered with a CSS class for glow animation */}
          <Scatter dataKey="anomaly" fill={chartColors.anomaly} name="Anomaly" r={5} />
          <ReferenceLine y={0} stroke={chartColors.grid} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block" style={{ background: chartColors.ma }} />14d MA
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 inline-block" style={{ background: chartColors.cost }} />Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 border-t border-dashed inline-block" style={{ borderColor: chartColors.band }} />±2σ bands
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block anomaly-dot" style={{ background: chartColors.anomaly }} />Anomaly
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnomaliesPage() {
  const { theme } = useTheme();
  const [anomalies, setAnomalies]           = useState<Anomaly[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [statusFilter, setStatusFilter]     = useState<AnomalyStatus | 'all'>('all');

  // Chart colors: literal hex per theme
  const chartColors = theme === 'dark'
    ? { grid: '#262B31', axis: '#5C636B', band: '#3D4550', ma: '#60A5FA', cost: '#34D399', anomaly: '#E85D5D',
        tooltipBg: '#1B1F24', tooltipBorder: '#262B31', tooltipText: '#EDEBE6', tooltipLabel: '#8A9199' }
    : { grid: '#D6D4D1', axis: '#9A9A9A', band: '#B0B8C4', ma: '#1565C0', cost: '#1B7A4A', anomaly: '#C62828',
        tooltipBg: '#FFFFFF', tooltipBorder: '#D6D4D1', tooltipText: '#262626', tooltipLabel: '#6B6B6B' };

  useEffect(() => {
    fetchAnomalies().then(a => {
      setAnomalies(a);
      if (a.length > 0) setSelectedResourceId(a[0].resourceId);
      setLoading(false);
    });
  }, []);

  const acknowledge  = (id: string) => setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' as const } : a));
  const markResolved = (id: string) => setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a));

  const open            = anomalies.filter(a => a.status === 'open').length;
  const totalCostImpact = anomalies.reduce((s, a) => s + Math.max(0, a.actualCost - a.expectedCost), 0);
  const linkedRecs      = MOCK_RECOMMENDATIONS.filter(r => r.anomalyId);
  const filtered        = anomalies.filter(a => statusFilter === 'all' || a.status === statusFilter);
  const resourceIds     = [...new Set(anomalies.map(a => a.resourceId))];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      <Skeleton className="h-52 rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Zap className="w-5 h-5" style={{ color: 'var(--status-warning)' }} />
          AI-Powered Cost Anomaly Detection
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Flags spend that deviates &gt;2 standard deviations from a 14-day trailing moving average
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Open Anomalies',      value: open,                          sub: `${anomalies.length} total detected`, color: 'var(--status-critical)', bg: 'var(--status-critical-bg)', Icon: AlertTriangle },
          { label: 'Total Cost Impact',   value: `$${totalCostImpact.toFixed(2)}`, sub: 'Above expected (all anomalies)', color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',  Icon: TrendingUp    },
          { label: 'Auto-Recommendations',value: linkedRecs.length,              sub: 'Created from persistent anomalies', color: 'var(--series-a)',        bg: 'color-mix(in srgb, var(--series-a) 12%, transparent)', Icon: Zap },
        ].map(({ label, value, sub, color, bg, Icon }) => (
          <div key={label} className="card flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              <p className="font-metric text-2xl font-semibold" style={{ color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="flex items-start gap-3 p-4 rounded-lg border" style={{ background: 'color-mix(in srgb, var(--series-a) 5%, var(--bg-panel))', borderColor: 'color-mix(in srgb, var(--series-a) 20%, transparent)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--series-a)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The detection engine scans 180 days of daily cost data per resource. For each day it computes a 14-day
          trailing mean and standard deviation. Any day where actual spend deviates by more than 2σ is flagged.
          High-severity anomalies (z-score &gt; 3) automatically create Optimization Recommendation cards.
        </p>
      </div>

      {/* Chart — resource selector */}
      {resourceIds.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cost Chart</p>
            <div className="flex flex-wrap gap-1.5 ml-2">
              {resourceIds.map(rid => {
                const r = MOCK_RESOURCES.find(x => x.id === rid);
                const isActive = selectedResourceId === rid;
                return (
                  <button key={rid} onClick={() => setSelectedResourceId(rid)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                    style={isActive
                      ? { background: 'var(--accent-red-tint)', color: 'var(--accent-red)', borderColor: 'var(--accent-red-border)' }
                      : { background: 'var(--bg-panel-hover)', color: 'var(--text-secondary)', borderColor: 'var(--border-hairline)' }
                    }
                  >{r?.name ?? rid}</button>
                );
              })}
            </div>
          </div>
          {selectedResourceId && <AnomalyChart resourceId={selectedResourceId} chartColors={chartColors} />}
        </div>
      )}

      {/* Anomaly feed */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Anomaly Feed</p>
          <div className="flex items-center rounded-lg overflow-hidden border" style={{ background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)' }}>
            {(['all', 'open', 'acknowledged', 'resolved'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 text-xs font-medium transition-colors capitalize"
                style={statusFilter === s
                  ? { background: 'var(--accent-red-tint)', color: 'var(--accent-red)' }
                  : { background: 'transparent', color: 'var(--text-tertiary)' }
                }>{s}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-10">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--status-success)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No anomalies in this filter</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Try changing the status filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const resource  = MOCK_RESOURCES.find(r => r.id === a.resourceId);
              const linkedRec = MOCK_RECOMMENDATIONS.find(r => r.anomalyId === a.id);
              const statusStyle =
                a.status === 'open'         ? { color: 'var(--status-critical)', bg: 'var(--status-critical-bg)', border: 'var(--status-critical-border)' } :
                a.status === 'acknowledged' ? { color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',  border: 'var(--status-warning-border)'  } :
                                              { color: 'var(--status-success)',  bg: 'var(--status-success-bg)',  border: 'var(--status-success-border)'  };
              return (
                <div
                  key={a.id}
                  className="card transition-colors"
                  style={{ opacity: a.status !== 'open' ? 0.6 : 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-tertiary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hairline)'; }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <SeverityBadge severity={a.severity} />
                        <span className="text-xs px-2 py-0.5 rounded-full border capitalize"
                          style={{ color: statusStyle.color, background: statusStyle.bg, borderColor: statusStyle.border }}>
                          {a.status}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{a.date}</span>
                        {resource && <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{resource.name}</span>}
                      </div>
                      <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{a.explanation}</p>
                      <div className="flex flex-wrap items-center gap-4 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        <span>Actual: <span className="font-metric" style={{ color: 'var(--text-primary)' }}>${a.actualCost.toFixed(2)}</span></span>
                        <span>Expected: <span className="font-metric" style={{ color: 'var(--text-secondary)' }}>${a.expectedCost.toFixed(2)}</span></span>
                        <span>Z-score: <span className="font-metric" style={{ color: 'var(--status-warning)' }}>{a.zScore.toFixed(2)}</span></span>
                        <span style={{ color: a.percentChange > 0 ? 'var(--status-critical)' : 'var(--status-success)' }}>
                          {a.percentChange > 0 ? '+' : ''}{a.percentChange.toFixed(1)}%
                        </span>
                        {linkedRec && (
                          <span className="flex items-center gap-1" style={{ color: 'var(--series-a)' }}>
                            <Zap className="w-3 h-3" /> Auto-recommendation created
                          </span>
                        )}
                      </div>
                    </div>
                    {a.status === 'open' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => acknowledge(a.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                          style={{ color: 'var(--status-warning)', background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-border)' }}>
                          Acknowledge
                        </button>
                        <button onClick={() => markResolved(a.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                          style={{ color: 'var(--status-success)', background: 'var(--status-success-bg)', borderColor: 'var(--status-success-border)' }}>
                          Resolve
                        </button>
                      </div>
                    )}
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
