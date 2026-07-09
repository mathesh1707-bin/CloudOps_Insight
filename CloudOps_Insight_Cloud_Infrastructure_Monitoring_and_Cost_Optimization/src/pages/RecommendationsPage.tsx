import { useState, useEffect } from 'react';
import { CheckCircle, X, Lightbulb, TrendingDown, HardDrive, Cpu, Tag, Zap, CheckCheck } from 'lucide-react';
import type { Recommendation, RecommendationType } from '../types';
import { fetchRecommendations, MOCK_RESOURCES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import SeverityBadge from '../components/ui/SeverityBadge';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_ICON: Record<RecommendationType, React.ReactNode> = {
  'idle-resource':      <Cpu       className="w-4 h-4" />,
  'right-size':         <TrendingDown className="w-4 h-4" />,
  'unattached-storage': <HardDrive className="w-4 h-4" />,
  'governance':         <Tag       className="w-4 h-4" />,
  'anomaly-driven':     <Zap       className="w-4 h-4" />,
};

const TYPE_LABEL: Record<RecommendationType, string> = {
  'idle-resource':      'Idle Resource',
  'right-size':         'Right-size',
  'unattached-storage': 'Orphan Storage',
  'governance':         'Governance',
  'anomaly-driven':     'Anomaly',
};

const TYPE_COLOR: Record<RecommendationType, { color: string; bg: string; border: string }> = {
  'idle-resource':      { color: 'var(--status-warning)',  bg: 'var(--status-warning-bg)',  border: 'var(--status-warning-border)'  },
  'right-size':         { color: 'var(--series-a)',        bg: 'color-mix(in srgb, var(--series-a) 12%, transparent)', border: 'color-mix(in srgb, var(--series-a) 30%, transparent)' },
  'unattached-storage': { color: 'var(--series-b)',        bg: 'color-mix(in srgb, var(--series-b) 12%, transparent)', border: 'color-mix(in srgb, var(--series-b) 30%, transparent)' },
  'governance':         { color: 'var(--text-secondary)',  bg: 'var(--status-neutral-bg)',  border: 'var(--status-neutral-border)'  },
  'anomaly-driven':     { color: 'var(--status-critical)', bg: 'var(--status-critical-bg)', border: 'var(--status-critical-border)' },
};

export default function RecommendationsPage() {
  const { isAdmin } = useAuth();
  const [recs, setRecs]   = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | RecommendationType>('all');

  useEffect(() => { fetchRecommendations().then(r => { setRecs(r); setLoading(false); }); }, []);

  const dismiss = (id: string) => setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'dismissed' as const } : r));
  const resolve = (id: string) => setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : r));

  const open      = recs.filter(r => r.status === 'open');
  const dismissed = recs.filter(r => r.status === 'dismissed');
  const resolved  = recs.filter(r => r.status === 'resolved');
  const totalSavings = open.reduce((s, r) => s + r.estimatedMonthlySavings, 0);
  const filtered  = open.filter(r => filter === 'all' || r.type === filter);
  const types     = [...new Set(recs.map(r => r.type))] as RecommendationType[];

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 rounded-lg" />
      <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Optimization Recommendations</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Rule-based insights to reduce cost and improve governance</p>
      </div>

      {/* Savings banner */}
      {totalSavings > 0 ? (
        <div className="card border" style={{ background: 'color-mix(in srgb, var(--series-a) 6%, var(--bg-panel))', borderColor: 'color-mix(in srgb, var(--series-a) 25%, transparent)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg" style={{ background: 'color-mix(in srgb, var(--series-a) 18%, transparent)' }}>
                <Lightbulb className="w-5 h-5" style={{ color: 'var(--series-a)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Total potential monthly savings:{' '}
                  <span className="font-metric" style={{ color: 'var(--status-success)' }}>${totalSavings.toFixed(2)}</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {open.length} open · {dismissed.length} dismissed · {resolved.length} resolved
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {[
                { count: open.length,      label: 'Open',     color: 'var(--text-primary)' },
                { count: dismissed.length, label: 'Dismissed', color: 'var(--status-warning)' },
                { count: resolved.length,  label: 'Resolved',  color: 'var(--status-success)' },
              ].map(({ count, label, color }) => (
                <div key={label} className="text-center">
                  <p className="font-metric text-lg font-semibold" style={{ color }}>{count}</p>
                  <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : open.length === 0 && (
        <EmptyState icon={CheckCheck} title="You're fully optimized"
          description="No open recommendations at this time. Check back after the next analysis cycle." />
      )}

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          style={filter === 'all'
            ? { background: 'var(--accent-red-tint)', color: 'var(--accent-red)', borderColor: 'var(--accent-red-border)' }
            : { background: 'var(--bg-panel-hover)', color: 'var(--text-secondary)', borderColor: 'var(--border-hairline)' }
          }
        >All ({open.length})</button>
        {types.map(t => {
          const count = open.filter(r => r.type === t).length;
          const tok = TYPE_COLOR[t];
          const isActive = filter === t;
          return (
            <button key={t} onClick={() => setFilter(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={isActive
                ? { background: tok.bg, color: tok.color, borderColor: tok.border }
                : { background: 'var(--bg-panel-hover)', color: 'var(--text-secondary)', borderColor: 'var(--border-hairline)' }
              }
            >
              <span style={{ color: tok.color }}>{TYPE_ICON[t]}</span>
              {TYPE_LABEL[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* Recommendation cards */}
      <div className="space-y-3">
        {filtered.map(rec => {
          const affectedResources = MOCK_RESOURCES.filter(r => rec.affectedResourceIds.includes(r.id));
          const tok = TYPE_COLOR[rec.type];
          return (
            <div key={rec.id} className="card transition-colors"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-tertiary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hairline)'; }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg border flex-shrink-0" style={{ color: tok.color, background: tok.bg, borderColor: tok.border }}>
                    {TYPE_ICON[rec.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{rec.title}</h3>
                      <SeverityBadge severity={rec.severity} />
                      <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)' }}>
                        {TYPE_LABEL[rec.type]}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>Affected: {affectedResources.map(r => r.name).join(', ') || rec.affectedResourceIds.join(', ')}</span>
                      {rec.estimatedMonthlySavings > 0 && (
                        <span className="font-medium" style={{ color: 'var(--status-success)' }}>
                          Est. savings: ${rec.estimatedMonthlySavings.toFixed(2)}/mo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => resolve(rec.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                      style={{ color: 'var(--status-success)', background: 'var(--status-success-bg)', borderColor: 'var(--status-success-border)' }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                    <button onClick={() => dismiss(rec.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                      style={{ color: 'var(--text-secondary)', background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)' }}>
                      <X className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && open.length > 0 && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>
            No open recommendations of this type.
          </p>
        )}
      </div>

      {/* Closed recommendations */}
      {(dismissed.length > 0 || resolved.length > 0) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Closed Recommendations</p>
          {[...dismissed, ...resolved].map(rec => (
            <div key={rec.id} className="card opacity-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {rec.status === 'resolved'
                  ? <CheckCircle className="w-4 h-4" style={{ color: 'var(--status-success)' }} />
                  : <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />}
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{rec.title}</span>
              </div>
              <span
                className="text-xs capitalize px-2 py-0.5 rounded-full border"
                style={rec.status === 'resolved'
                  ? { color: 'var(--status-success)', background: 'var(--status-success-bg)', borderColor: 'var(--status-success-border)' }
                  : { color: 'var(--text-tertiary)', background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)' }
                }
              >{rec.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
