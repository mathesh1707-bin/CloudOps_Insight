import { useState, useEffect, useCallback } from 'react';
import {
  Server, DollarSign, AlertTriangle, TrendingUp,
  Search, Filter, X, ChevronRight, ExternalLink,
} from 'lucide-react';
import type { Resource, ResourceType, ResourceStatus, Region } from '../types';
import {
  fetchResources, getDashboardSummary, fetchMetrics,
  MOCK_BUDGET, MOCK_MONTHLY_SUMMARIES,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/ui/Badge';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';

// ── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  loading?: boolean;
}
function SummaryCard({ title, value, sub, icon, accent, loading }: SummaryCardProps) {
  if (loading) return (
    <div className="card space-y-3">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">{title}</p>
        <p className={`font-metric text-2xl font-semibold ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-[#4a5e80] mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${accent === 'text-emerald-400' ? 'bg-emerald-400/10' : accent === 'text-blue-400' ? 'bg-blue-400/10' : accent === 'text-amber-400' ? 'bg-amber-400/10' : 'bg-red-400/10'}`}>
        {icon}
      </div>
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

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0f1626] border-l border-[#1a2540] h-full overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#1a2540]">
          <div>
            <h2 className="text-base font-semibold text-white">{resource.name}</h2>
            <p className="text-xs text-[#4a5e80]">{resource.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#141d2e] text-[#4a5e80] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status + type */}
          <div className="flex items-center gap-3">
            <StatusBadge status={resource.status} />
            <span className="text-xs text-[#4a5e80]">{resource.type} · {resource.tier}</span>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Region',      value: resource.region },
              { label: 'Uptime',      value: `${resource.uptimePercent}%` },
              { label: 'Cost/month',  value: `$${resource.costPerMonth.toFixed(2)}` },
              { label: 'CPU avg 7d',  value: `${resource.cpuAvg7d}%` },
              { label: 'Mem avg 7d',  value: `${resource.memAvg7d}%` },
              { label: 'Created',     value: resource.createdAt },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#141d2e] rounded-lg p-3">
                <p className="text-[10px] text-[#4a5e80] uppercase tracking-wider">{label}</p>
                <p className="font-metric text-sm text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Live metrics */}
          {metrics && (
            <div>
              <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">Current metrics (last datapoint)</p>
              <div className="space-y-2">
                {[
                  { label: 'CPU', value: metrics.cpu, color: metrics.cpu > 85 ? 'bg-red-400' : metrics.cpu > 65 ? 'bg-amber-400' : 'bg-emerald-400' },
                  { label: 'Memory', value: metrics.memory, color: metrics.memory > 85 ? 'bg-red-400' : metrics.memory > 65 ? 'bg-amber-400' : 'bg-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#6b829e]">{label}</span>
                      <span className="font-metric text-white">{value.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#141d2e] rounded-full">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {Object.keys(resource.tags).length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(resource.tags).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#141d2e] text-xs text-[#8fa3bc] border border-[#1a2540]">
                    <span className="text-[#4a5e80]">{k}:</span>{v}
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

const TYPES: ResourceType[] = ['EC2', 'S3', 'RDS', 'Lambda', 'LoadBalancer'];
const STATUSES: ResourceStatus[] = ['running', 'stopped', 'terminated', 'warning', 'critical'];
const REGIONS: Region[] = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ResourceType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | ''>('');
  const [filterRegion, setFilterRegion] = useState<Region | ''>('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [sortKey, setSortKey] = useState<keyof Resource>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchResources().then(r => { setResources(r); setLoading(false); });
  }, []);

  const summary = getDashboardSummary();
  const currentMonth = MOCK_MONTHLY_SUMMARIES[MOCK_MONTHLY_SUMMARIES.length - 1];
  const budgetPct = currentMonth ? (currentMonth.total / MOCK_BUDGET.monthlyBudget) * 100 : 0;

  const filtered = resources.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterRegion && r.region !== filterRegion) return false;
    return true;
  }).sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = useCallback((key: keyof Resource) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  const hasFilters = search || filterType || filterStatus || filterRegion;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-[#4a5e80] mt-0.5">Cloud infrastructure overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard loading={loading} title="Total Resources" value={summary.totalResources}
          sub={`${summary.running} running`} accent="text-blue-400"
          icon={<Server className="w-5 h-5 text-blue-400" />} />
        <SummaryCard loading={loading} title="Monthly Spend" value={`$${summary.totalMonthlySpend.toLocaleString()}`}
          sub={`${budgetPct.toFixed(0)}% of $${MOCK_BUDGET.monthlyBudget.toLocaleString()} budget`} accent="text-emerald-400"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />} />
        <SummaryCard loading={loading} title="Active Alerts" value={summary.activeAlerts}
          sub={`${summary.warning} resources in warning/critical`} accent="text-amber-400"
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />} />
        <SummaryCard loading={loading} title="Status" value={`${summary.running}/${summary.totalResources}`}
          sub={`${summary.stopped} stopped · ${summary.terminated} terminated`} accent="text-emerald-400"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} />
      </div>

      {/* Budget progress */}
      {!loading && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-[#4a5e80] uppercase tracking-wider">Budget this month</p>
              <p className="text-sm font-medium text-white mt-0.5">
                ${currentMonth?.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} of ${MOCK_BUDGET.monthlyBudget.toLocaleString()}
              </p>
            </div>
            <span className={`text-sm font-metric font-semibold ${budgetPct > 90 ? 'text-red-400' : budgetPct > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {budgetPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-[#141d2e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-400' : budgetPct > 80 ? 'bg-amber-400' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Resource table */}
      <div className="card p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#1a2540]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a5e80]" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#141d2e] border border-[#1a2540] text-sm text-white placeholder-[#4a5e80] focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#4a5e80]" />
            {[
              { value: filterType, set: setFilterType as (v: string) => void, opts: TYPES, placeholder: 'Type' },
              { value: filterStatus, set: setFilterStatus as (v: string) => void, opts: STATUSES, placeholder: 'Status' },
              { value: filterRegion, set: setFilterRegion as (v: string) => void, opts: REGIONS, placeholder: 'Region' },
            ].map(({ value, set, opts, placeholder }) => (
              <select key={placeholder} value={value} onChange={e => set(e.target.value)}
                className="py-1.5 px-2 rounded-lg bg-[#141d2e] border border-[#1a2540] text-xs text-[#8fa3bc] focus:outline-none focus:border-blue-500/50 transition-colors">
                <option value="">{placeholder}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
            {hasFilters && (
              <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterRegion(''); }}
                className="flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs text-[#4a5e80] hover:text-red-400 hover:bg-red-500/5 transition-colors border border-[#1a2540]">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <span className="ml-auto text-xs text-[#4a5e80]">{filtered.length} resources</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-4"><SkeletonTable rows={6} cols={6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a2540]">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'type', label: 'Type' },
                    { key: 'region', label: 'Region' },
                    { key: 'status', label: 'Status' },
                    { key: 'uptimePercent', label: 'Uptime' },
                    { key: 'costPerMonth', label: 'Cost/mo' },
                  ].map(({ key, label }) => (
                    <th key={key}
                      onClick={() => toggleSort(key as keyof Resource)}
                      className="text-left px-4 py-3 text-xs font-medium text-[#4a5e80] uppercase tracking-wider cursor-pointer hover:text-[#8fa3bc] select-none whitespace-nowrap">
                      {label}
                      {sortKey === key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}
                    onClick={() => setSelectedResource(r)}
                    className="border-b border-[#1a2540]/50 hover:bg-[#141d2e] transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{r.name}</span>
                      <span className="block text-[10px] text-[#4a5e80] font-mono">{r.tier}</span>
                    </td>
                    <td className="px-4 py-3 text-[#8fa3bc]">{r.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6b829e]">{r.region}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 font-metric text-[#8fa3bc]">{r.uptimePercent}%</td>
                    <td className="px-4 py-3 font-metric text-[#8fa3bc]">
                      {r.costPerMonth > 0 ? `$${r.costPerMonth.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin
                        ? <ChevronRight className="w-4 h-4 text-[#4a5e80]" />
                        : <ExternalLink className="w-3.5 h-3.5 text-[#4a5e80]" />
                      }
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#4a5e80]">
                    No resources match the current filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resource detail drawer */}
      {selectedResource && (
        <ResourceDrawer resource={selectedResource} onClose={() => setSelectedResource(null)} />
      )}
    </div>
  );
}
