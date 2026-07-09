import { useState, useEffect } from 'react';
import { CheckCircle, X, Lightbulb, TrendingDown, HardDrive, Cpu, Tag, Zap, CheckCheck } from 'lucide-react';
import type { Recommendation, RecommendationType } from '../types';
import { fetchRecommendations, MOCK_RESOURCES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import SeverityBadge from '../components/ui/SeverityBadge';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

// ── Icons per type ────────────────────────────────────────────────────────────
const TYPE_ICON: Record<RecommendationType, React.ReactNode> = {
  'idle-resource':     <Cpu className="w-4 h-4 text-amber-400" />,
  'right-size':        <TrendingDown className="w-4 h-4 text-blue-400" />,
  'unattached-storage':<HardDrive className="w-4 h-4 text-purple-400" />,
  'governance':        <Tag className="w-4 h-4 text-slate-400" />,
  'anomaly-driven':    <Zap className="w-4 h-4 text-red-400" />,
};
const TYPE_LABEL: Record<RecommendationType, string> = {
  'idle-resource':      'Idle Resource',
  'right-size':         'Right-size',
  'unattached-storage': 'Orphan Storage',
  'governance':         'Governance',
  'anomaly-driven':     'Anomaly',
};
const TYPE_BG: Record<RecommendationType, string> = {
  'idle-resource':      'bg-amber-400/10 border-amber-400/20',
  'right-size':         'bg-blue-400/10 border-blue-400/20',
  'unattached-storage': 'bg-purple-400/10 border-purple-400/20',
  'governance':         'bg-slate-400/10 border-slate-400/20',
  'anomaly-driven':     'bg-red-400/10 border-red-400/20',
};

export default function RecommendationsPage() {
  const { isAdmin } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | RecommendationType>('all');

  useEffect(() => {
    fetchRecommendations().then(r => { setRecs(r); setLoading(false); });
  }, []);

  function dismiss(id: string) {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'dismissed' as const } : r));
  }
  function resolve(id: string) {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : r));
  }

  const open = recs.filter(r => r.status === 'open');
  const dismissed = recs.filter(r => r.status === 'dismissed');
  const resolved = recs.filter(r => r.status === 'resolved');
  const totalSavings = open.reduce((s, r) => s + r.estimatedMonthlySavings, 0);

  const filtered = open.filter(r => filter === 'all' || r.type === filter);
  const types = [...new Set(recs.map(r => r.type))] as RecommendationType[];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 rounded-xl" />
      <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Optimization Recommendations</h1>
        <p className="text-sm text-[#4a5e80] mt-0.5">Rule-based insights to reduce cost and improve governance</p>
      </div>

      {/* Savings banner */}
      {totalSavings > 0 ? (
        <div className="card bg-gradient-to-r from-blue-500/10 to-emerald-500/5 border-blue-500/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <Lightbulb className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Total potential monthly savings: <span className="font-metric text-emerald-400">${totalSavings.toFixed(2)}</span>
                </p>
                <p className="text-xs text-[#4a5e80]">
                  {open.length} open recommendations · {dismissed.length} dismissed · {resolved.length} resolved
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-center">
                <p className="font-metric text-lg font-semibold text-white">{open.length}</p>
                <p className="text-[#4a5e80]">Open</p>
              </div>
              <div className="text-center">
                <p className="font-metric text-lg font-semibold text-amber-400">{dismissed.length}</p>
                <p className="text-[#4a5e80]">Dismissed</p>
              </div>
              <div className="text-center">
                <p className="font-metric text-lg font-semibold text-emerald-400">{resolved.length}</p>
                <p className="text-[#4a5e80]">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        open.length === 0 && (
          <EmptyState icon={CheckCheck} title="You're fully optimized"
            description="No open recommendations at this time. Check back after the next analysis cycle." />
        )
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#141d2e] text-[#4a5e80] border-[#1a2540] hover:border-[#334466]'}`}>
          All ({open.length})
        </button>
        {types.map(t => {
          const count = open.filter(r => r.type === t).length;
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === t ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#141d2e] text-[#4a5e80] border-[#1a2540] hover:border-[#334466]'}`}>
              {TYPE_ICON[t]}{TYPE_LABEL[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* Recommendation cards */}
      <div className="space-y-3">
        {filtered.map(rec => {
          const affectedResources = MOCK_RESOURCES.filter(r => rec.affectedResourceIds.includes(r.id));
          return (
            <div key={rec.id} className="card hover:border-[#334466] transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg border flex-shrink-0 ${TYPE_BG[rec.type]}`}>
                    {TYPE_ICON[rec.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                      <SeverityBadge severity={rec.severity} />
                      <span className="text-[10px] text-[#4a5e80] bg-[#141d2e] px-2 py-0.5 rounded-full border border-[#1a2540]">
                        {TYPE_LABEL[rec.type]}
                      </span>
                    </div>
                    <p className="text-xs text-[#6b829e] leading-relaxed mb-2">{rec.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#4a5e80]">
                      <span>
                        Affected: {affectedResources.map(r => r.name).join(', ') || rec.affectedResourceIds.join(', ')}
                      </span>
                      {rec.estimatedMonthlySavings > 0 && (
                        <span className="text-emerald-400 font-medium">
                          Est. savings: ${rec.estimatedMonthlySavings.toFixed(2)}/mo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions — admin only */}
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => resolve(rec.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                    <button onClick={() => dismiss(rec.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141d2e] text-[#4a5e80] border border-[#1a2540] hover:border-[#334466] hover:text-[#8fa3bc] transition-colors">
                      <X className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && open.length > 0 && (
          <p className="text-center text-sm text-[#4a5e80] py-8">No open recommendations of this type.</p>
        )}
      </div>

      {/* Dismissed / Resolved sections */}
      {(dismissed.length > 0 || resolved.length > 0) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#4a5e80] uppercase tracking-wider">Closed Recommendations</p>
          {[...dismissed, ...resolved].map(rec => (
            <div key={rec.id} className="card opacity-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {rec.status === 'resolved'
                  ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                  : <X className="w-4 h-4 text-[#4a5e80]" />}
                <span className="text-sm text-[#6b829e]">{rec.title}</span>
              </div>
              <span className={`text-xs capitalize px-2 py-0.5 rounded-full border ${rec.status === 'resolved' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-[#4a5e80] bg-[#141d2e] border-[#1a2540]'}`}>
                {rec.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
