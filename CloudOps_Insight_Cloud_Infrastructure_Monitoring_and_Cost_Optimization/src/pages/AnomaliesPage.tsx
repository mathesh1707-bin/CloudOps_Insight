import { useState, useEffect } from 'react';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Zap, AlertTriangle, CheckCircle, TrendingUp, Info } from 'lucide-react';
import type { Anomaly, AnomalyStatus } from '../types';
import {
  fetchAnomalies, MOCK_COST_ENTRIES, MOCK_RESOURCES,
  MOCK_RECOMMENDATIONS,
} from '../data/mockData';
import SeverityBadge from '../components/ui/SeverityBadge';
import { Skeleton } from '../components/ui/Skeleton';

// ── Anomaly chart ─────────────────────────────────────────────────────────────

function AnomalyChart({ resourceId }: { resourceId: string }) {
  const resource = MOCK_RESOURCES.find(r => r.id === resourceId);
  const entries = MOCK_COST_ENTRIES
    .filter(e => e.resourceId === resourceId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-45); // last 45 days

  // Compute 14-day MA for each point
  const chartData = entries.map((e, i) => {
    const window = entries.slice(Math.max(0, i - 14), i);
    const mean = window.length > 0 ? window.reduce((s, x) => s + x.cost, 0) / window.length : e.cost;
    const variance = window.length > 1 ? window.reduce((s, x) => s + (x.cost - mean) ** 2, 0) / window.length : 0;
    const std = Math.sqrt(variance);
    const isAnom = std > 0.01 && Math.abs((e.cost - mean) / std) > 2;
    return {
      date: e.date.slice(5), // MM-DD
      cost: e.cost,
      ma: parseFloat(mean.toFixed(2)),
      upper: parseFloat((mean + 2 * std).toFixed(2)),
      lower: parseFloat(Math.max(0, mean - 2 * std).toFixed(2)),
      anomaly: isAnom ? e.cost : null,
    };
  });

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider">
          {resource?.name ?? resourceId} — Daily Cost with 2σ Bounds
        </p>
        <span className="text-[10px] text-[#4a5e80] ml-auto">14-day moving average</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#4a5e80' }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false}
            tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ background: '#141d2e', border: '1px solid #1a2540', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#4a5e80' }} itemStyle={{ color: '#b8c9d9' }} />
          {/* Upper/lower 2σ bands */}
          <Line type="monotone" dataKey="upper" stroke="#334466" strokeWidth={1} strokeDasharray="4 3" dot={false} name="Upper 2σ" />
          <Line type="monotone" dataKey="lower" stroke="#334466" strokeWidth={1} strokeDasharray="4 3" dot={false} name="Lower 2σ" />
          {/* MA line */}
          <Line type="monotone" dataKey="ma" stroke="#60a5fa" strokeWidth={2} dot={false} name="14d MA" />
          {/* Actual cost line */}
          <Line type="monotone" dataKey="cost" stroke="#34d399" strokeWidth={1.5} dot={false} name="Actual" />
          {/* Anomaly scatter */}
          <Scatter dataKey="anomaly" fill="#f87171" name="Anomaly" r={5} />
          <ReferenceLine y={0} stroke="#1a2540" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#4a5e80]">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" />14d MA</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block" />Actual</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-[#334466] inline-block" />±2σ bands</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Anomaly</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | 'all'>('all');

  useEffect(() => {
    fetchAnomalies().then(a => {
      setAnomalies(a);
      if (a.length > 0) setSelectedResourceId(a[0].resourceId);
      setLoading(false);
    });
  }, []);

  function acknowledge(id: string) {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' as const } : a));
  }
  function markResolved(id: string) {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as const } : a));
  }

  const open = anomalies.filter(a => a.status === 'open').length;
  const totalCostImpact = anomalies.reduce((s, a) => s + Math.max(0, a.actualCost - a.expectedCost), 0);
  const linkedRecs = MOCK_RECOMMENDATIONS.filter(r => r.anomalyId);

  const filtered = anomalies.filter(a => statusFilter === 'all' || a.status === statusFilter);
  // Unique resource IDs for chart selector
  const resourceIds = [...new Set(anomalies.map(a => a.resourceId))];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-52 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          AI-Powered Cost Anomaly Detection
        </h1>
        <p className="text-sm text-[#4a5e80] mt-0.5">
          Flags spend that deviates &gt;2 standard deviations from a 14-day trailing moving average
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">Open Anomalies</p>
            <p className="font-metric text-2xl font-semibold text-red-400">{open}</p>
            <p className="text-xs text-[#4a5e80] mt-1">{anomalies.length} total detected</p>
          </div>
          <div className="p-2.5 rounded-xl bg-red-400/10"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
        </div>
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">Total Cost Impact</p>
            <p className="font-metric text-2xl font-semibold text-amber-400">${totalCostImpact.toFixed(2)}</p>
            <p className="text-xs text-[#4a5e80] mt-1">Above expected (all anomalies)</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-400/10"><TrendingUp className="w-5 h-5 text-amber-400" /></div>
        </div>
        <div className="card flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">Auto-Recommendations</p>
            <p className="font-metric text-2xl font-semibold text-blue-400">{linkedRecs.length}</p>
            <p className="text-xs text-[#4a5e80] mt-1">Created from persistent anomalies</p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-400/10"><Zap className="w-5 h-5 text-blue-400" /></div>
        </div>
      </div>

      {/* How it works banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#6b829e] leading-relaxed">
          The detection engine scans 180 days of daily cost data per resource. For each day it computes a 14-day
          trailing mean and standard deviation. Any day where the actual spend deviates by more than 2σ is flagged
          as anomalous. High-severity anomalies (z-score &gt; 3) automatically create Optimization Recommendation cards.
        </p>
      </div>

      {/* Chart — pick resource */}
      {resourceIds.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider">Cost Chart</p>
            <div className="flex flex-wrap gap-1.5 ml-2">
              {resourceIds.map(rid => {
                const r = MOCK_RESOURCES.find(x => x.id === rid);
                return (
                  <button key={rid} onClick={() => setSelectedResourceId(rid)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedResourceId === rid ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#141d2e] text-[#4a5e80] border-[#1a2540] hover:border-[#334466]'
                    }`}>{r?.name ?? rid}</button>
                );
              })}
            </div>
          </div>
          {selectedResourceId && <AnomalyChart resourceId={selectedResourceId} />}
        </div>
      )}

      {/* Anomaly feed */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider">Anomaly Feed</p>
          <div className="flex items-center bg-[#141d2e] border border-[#1a2540] rounded-lg overflow-hidden">
            {(['all', 'open', 'acknowledged', 'resolved'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                  statusFilter === s ? 'bg-blue-500/20 text-blue-400' : 'text-[#4a5e80] hover:text-[#8fa3bc]'
                }`}>{s}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-10">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-[#b8c9d9]">No anomalies in this filter</p>
            <p className="text-xs text-[#4a5e80] mt-1">Try changing the status filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const resource = MOCK_RESOURCES.find(r => r.id === a.resourceId);
              const linkedRec = MOCK_RECOMMENDATIONS.find(r => r.anomalyId === a.id);
              return (
                <div key={a.id} className={`card hover:border-[#334466] transition-colors ${a.status !== 'open' ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <SeverityBadge severity={a.severity} />
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                          a.status === 'open' ? 'text-red-400 bg-red-400/10 border-red-400/20'
                          : a.status === 'acknowledged' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                          : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                        }`}>{a.status}</span>
                        <span className="text-xs text-[#4a5e80]">{a.date}</span>
                        {resource && <span className="text-xs font-medium text-[#8fa3bc]">{resource.name}</span>}
                      </div>
                      <p className="text-xs text-[#6b829e] leading-relaxed mb-2">{a.explanation}</p>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#4a5e80]">
                        <span>Actual: <span className="font-metric text-white">${a.actualCost.toFixed(2)}</span></span>
                        <span>Expected: <span className="font-metric text-[#8fa3bc]">${a.expectedCost.toFixed(2)}</span></span>
                        <span>Z-score: <span className="font-metric text-amber-400">{a.zScore.toFixed(2)}</span></span>
                        <span className={a.percentChange > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {a.percentChange > 0 ? '+' : ''}{a.percentChange.toFixed(1)}%
                        </span>
                        {linkedRec && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Zap className="w-3 h-3" /> Auto-recommendation created
                          </span>
                        )}
                      </div>
                    </div>
                    {a.status === 'open' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => acknowledge(a.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors">
                          Acknowledge
                        </button>
                        <button onClick={() => markResolved(a.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">
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
