import { useState, useEffect, useCallback } from 'react';
import { Server, DollarSign, AlertTriangle, TrendingUp, Search, Filter, X, ChevronRight, ExternalLink } from 'lucide-react';
import type { Resource, ResourceType, ResourceStatus, Region } from '../types';
import { fetchResources, getDashboardSummary, fetchMetrics, MOCK_BUDGET, MOCK_MONTHLY_SUMMARIES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/ui/Badge';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';

// ── Shared input style helper ─────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-1.5 rounded-lg text-sm transition-colors focus:outline-none';
const inputStyle = { background: 'var(--bg-panel-hover)', border: '1px solid var(--border-hairline)', color: 'var(--text-primary)' };
const selectCls = 'py-1.5 px-2 rounded-lg text-xs transition-colors focus:outline-none';

// ── Summary card ─────────────────────────────────────────────────────────────
interface SummaryCardProps {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; accentColor: string; accentBg: string; loading?: boolean;
}
function SummaryCard({ title, value, sub, icon, accentColor, accentBg, loading }: SummaryCardProps) {
  if (loading) return (
    <div className="card space-y-3">
      <Skeleton className="h-3 w-1/2" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-3 w-1/3" />
    </div>
  );
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>{title}</p>
        <p className="font-metric text-2xl font-semibold" style={{ color: accentColor }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
      </div>
      <div className="p-2.5 rounded-lg" style={{ background: accentBg }}>{icon}</div>
    </div>
  );
}

// ── Resource detail drawer ────────────────────────────────────────────────────
function ResourceDrawer({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const [metrics, setMetrics] = useState<{ cpu: number; memory: number } | null>(null);
  useEffect(() => {
    fetchMetrics(resource.id, '24h').then(pts => {
      const last = pts[pts.length - 1];
      if (last) setMetrics({ cpu: last.cpu, memory: last.memory });
    });
  }, [resource.id]);

  const barColor = (v: number) =>
    v > 85 ? 'var(--status-critical)' : v > 65 ? 'var(--status-warning)' : 'var(--status-success)';

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl border-l"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline)' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{resource.name}</h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{resource.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-panel-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <StatusBadge status={resource.status} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{resource.type} · {resource.tier}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Region',     value: resource.region },
              { label: 'Uptime',     value: `${resource.uptimePercent}%` },
              { label: 'Cost/month', value: `$${resource.costPerMonth.toFixed(2)}` },
              { label: 'CPU avg 7d', value: `${resource.cpuAvg7d}%` },
              { label: 'Mem avg 7d', value: `${resource.memAvg7d}%` },
              { label: 'Created',    value: resource.createdAt },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: 'var(--bg-panel-hover)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                <p className="font-metric text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>

          {metrics && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Current metrics (last datapoint)
              </p>
              <div className="space-y-2">
                {[
                  { label: 'CPU',    value: metrics.cpu },
                  { label: 'Memory', value: metrics.memory },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className="font-metric" style={{ color: 'var(--text-primary)' }}>{value.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-panel-hover)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${value}%`, background: barColor(value) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(resource.tags).length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(resource.tags).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border"
                    style={{ background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                  >
                    <span style={{ color: 'var(--text-tertiary)' }}>{k}:</span>{v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TYPES: ResourceType[]   = ['EC2', 'S3', 'RDS', 'Lambda', 'LoadBalancer'];
const STATUSES: ResourceStatus[] = ['running', 'stopped', 'terminated', 'warning', 'critical'];
const REGIONS: Region[]       = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [resources, setResources]       = useState<Resource[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState<ResourceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | ''>('');
  const [filterRegion, setFilterRegion] = useState<Region | ''>('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [sortKey, setSortKey]   = useState<keyof Resource>('name');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  useEffect(() => { fetchResources().then(r => { setResources(r); setLoading(false); }); }, []);

  const summary      = getDashboardSummary();
  const currentMonth = MOCK_MONTHLY_SUMMARIES[MOCK_MONTHLY_SUMMARIES.length - 1];
  const budgetPct    = currentMonth ? (currentMonth.total / MOCK_BUDGET.monthlyBudget) * 100 : 0;
  const budgetColor  = budgetPct > 90 ? 'var(--status-critical)' : budgetPct > 80 ? 'var(--status-warning)' : 'var(--status-success)';

  const filtered = resources.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType   && r.type   !== filterType)   return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterRegion && r.region !== filterRegion) return false;
    return true;
  }).sort((a, b) => {
    const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = useCallback((key: keyof Resource) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  const hasFilters = search || filterType || filterStatus || filterRegion;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Cloud infrastructure overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard loading={loading} title="Total Resources" value={summary.totalResources}
          sub={`${summary.running} running`}
          accentColor="var(--series-a)" accentBg="color-mix(in srgb, var(--series-a) 12%, transparent)"
          icon={<Server className="w-5 h-5" style={{ color: 'var(--series-a)' }} />} />
        <SummaryCard loading={loading} title="Monthly Spend"
          value={`$${summary.totalMonthlySpend.toLocaleString()}`}
          sub={`${budgetPct.toFixed(0)}% of $${MOCK_BUDGET.monthlyBudget.toLocaleString()} budget`}
          accentColor="var(--status-success)" accentBg="var(--status-success-bg)"
          icon={<DollarSign className="w-5 h-5" style={{ color: 'var(--status-success)' }} />} />
        <SummaryCard loading={loading} title="Active Alerts" value={summary.activeAlerts}
          sub={`${summary.warning} resources in warning/critical`}
          accentColor="var(--status-warning)" accentBg="var(--status-warning-bg)"
          icon={<AlertTriangle className="w-5 h-5" style={{ color: 'var(--status-warning)' }} />} />
        <SummaryCard loading={loading} title="Status"
          value={`${summary.running}/${summary.totalResources}`}
          sub={`${summary.stopped} stopped · ${summary.terminated} terminated`}
          accentColor="var(--status-success)" accentBg="var(--status-success-bg)"
          icon={<TrendingUp className="w-5 h-5" style={{ color: 'var(--status-success)' }} />} />
      </div>

      {/* Budget progress */}
      {!loading && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Budget this month
              </p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                ${currentMonth?.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} of ${MOCK_BUDGET.monthlyBudget.toLocaleString()}
              </p>
            </div>
            <span className="text-sm font-metric font-semibold" style={{ color: budgetColor }}>
              {budgetPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-panel-hover)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(budgetPct, 100)}%`, background: budgetColor }}
            />
          </div>
        </div>
      )}

      {/* Resource table */}
      <div className="card p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className={`${inputCls} pl-9 pr-3`} style={inputStyle}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            {[
              { value: filterType,   set: setFilterType as (v: string) => void,   opts: TYPES,    placeholder: 'Type'   },
              { value: filterStatus, set: setFilterStatus as (v: string) => void, opts: STATUSES, placeholder: 'Status' },
              { value: filterRegion, set: setFilterRegion as (v: string) => void, opts: REGIONS,  placeholder: 'Region' },
            ].map(({ value, set, opts, placeholder }) => (
              <select
                key={placeholder} value={value} onChange={e => set(e.target.value)}
                className={selectCls}
                style={{ ...inputStyle, width: 'auto' }}
              >
                <option value="">{placeholder}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterRegion(''); }}
                className="flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs border transition-colors"
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-tertiary)', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--status-critical)'; e.currentTarget.style.background = 'var(--status-critical-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>{filtered.length} resources</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-4"><SkeletonTable rows={6} cols={6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                  {[
                    { key: 'name',         label: 'Name'    },
                    { key: 'type',         label: 'Type'    },
                    { key: 'region',       label: 'Region'  },
                    { key: 'status',       label: 'Status'  },
                    { key: 'uptimePercent',label: 'Uptime'  },
                    { key: 'costPerMonth', label: 'Cost/mo' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key as keyof Resource)}
                      className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors"
                      style={{ color: sortKey === key ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                    >
                      {label}{sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedResource(r)}
                    className="border-b cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border-hairline)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-panel-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                      <span className="block text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{r.tier}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.type}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.region}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 font-metric text-xs" style={{ color: 'var(--text-secondary)' }}>{r.uptimePercent}%</td>
                    <td className="px-4 py-3 font-metric text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {r.costPerMonth > 0 ? `$${r.costPerMonth.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin
                        ? <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                        : <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      No resources match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedResource && (
        <ResourceDrawer resource={selectedResource} onClose={() => setSelectedResource(null)} />
      )}
    </div>
  );
}
