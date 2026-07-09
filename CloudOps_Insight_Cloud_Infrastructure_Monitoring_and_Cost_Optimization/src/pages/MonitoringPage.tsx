import { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Cpu, MemoryStick, Wifi, HardDrive, RefreshCw } from 'lucide-react';
import type { Resource, MetricPoint, MetricWindow } from '../types';
import { fetchResources, fetchMetrics, generateLivePoint } from '../data/mockData';
import StatusBadge from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { useTheme } from '../context/ThemeContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(ts: number, window: MetricWindow) {
  const d = new Date(ts);
  if (window === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (window === '7d')  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function healthColor(value: number, high = 85, warn = 65): string {
  if (value >= high) return 'var(--status-critical)';
  if (value >= warn) return 'var(--status-warning)';
  return 'var(--status-success)';
}

// ── Metric card ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string; value: number; unit: string;
  icon: React.ReactNode; color: string; loading?: boolean;
}
function MetricCard({ label, value, unit, icon, color, loading }: MetricCardProps) {
  if (loading) return <div className="card h-20"><Skeleton className="h-full w-full" /></div>;
  return (
    <div className="card flex items-center gap-4">
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="font-metric text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {value.toFixed(1)}<span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>
        </p>
      </div>
      <div className="ml-auto h-8 w-1.5 rounded-full overflow-hidden flex flex-col-reverse" style={{ background: 'var(--bg-panel-hover)' }}>
        <div className="rounded-full transition-all duration-500" style={{ height: `${Math.min(value,100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Health indicator ──────────────────────────────────────────────────────────
function HealthIndicator({ cpu, memory }: { cpu: number; memory: number }) {
  const isOk   = cpu < 65 && memory < 65;
  const isWarn = !isOk && (cpu < 85 && memory < 85);
  const isCrit = !isOk && !isWarn;
  const statusColor  = isCrit ? 'var(--status-critical)' : isWarn ? 'var(--status-warning)' : 'var(--status-success)';
  const statusBg     = isCrit ? 'var(--status-critical-bg)' : isWarn ? 'var(--status-warning-bg)' : 'var(--status-success-bg)';
  const statusBorder = isCrit ? 'var(--status-critical-border)' : isWarn ? 'var(--status-warning-border)' : 'var(--status-success-border)';
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ color: statusColor, background: statusBg, borderColor: statusBorder }}>
      <span className={`w-1.5 h-1.5 rounded-full ${isCrit || isWarn ? 'animate-pulse' : ''}`} style={{ backgroundColor: statusColor }} />
      {isCrit ? 'Critical — CPU or Memory above threshold' : isWarn ? 'Warning — Elevated utilization' : 'Healthy'}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, window: win, chartColors }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[];
  label?: number; window: MetricWindow; chartColors: Record<string, string>;
}) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-lg p-3 shadow-xl text-xs border" style={{ background: chartColors.tooltipBg, borderColor: chartColors.tooltipBorder }}>
      <p className="mb-2" style={{ color: chartColors.tooltipLabel }}>{fmt(label, win)}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: chartColors.tooltipLabel }}>{p.name}:</span>
          <span className="font-metric font-medium" style={{ color: chartColors.tooltipText }}>{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const WINDOWS: MetricWindow[] = ['24h', '7d', '30d'];

export default function MonitoringPage() {
  const { theme } = useTheme();
  const [resources, setResources]   = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [window, setWindow]         = useState<MetricWindow>('24h');
  const [points, setPoints]         = useState<MetricPoint[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingMetrics, setLoadingMetrics]     = useState(false);
  const [live, setLive]             = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchResources().then(r => {
      setResources(r.filter(res => res.status !== 'terminated'));
      setSelectedId(r[0]?.id ?? '');
      setLoadingResources(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingMetrics(true);
    fetchMetrics(selectedId, window).then(pts => { setPoints(pts); setLoadingMetrics(false); });
  }, [selectedId, window]);

  const tick = useCallback(() => {
    if (!selectedId || window !== '24h') return;
    const pt = generateLivePoint(selectedId);
    setPoints(prev => [...prev.slice(-287), pt]);
  }, [selectedId, window]);

  useEffect(() => {
    if (live && window === '24h') tickRef.current = setInterval(tick, 5000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [live, window, tick]);

  const resource = resources.find(r => r.id === selectedId);
  const latest   = points[points.length - 1];
  const displayPoints = points.length > 120 ? points.filter((_, i) => i % Math.ceil(points.length / 120) === 0) : points;

  // Chart colors: literal hex per theme (SVG doesn't resolve CSS vars reliably)
  const chartColors = theme === 'dark'
    ? { grid: '#262B31', axis: '#8A9199', primary: '#60A5FA', secondary: '#A78BFA', tertiary: '#34D399', quaternary: '#F59E0B',
        primaryFill: 'rgba(96, 165, 250, 0.3)', secondaryFill: 'rgba(167, 139, 250, 0.3)',
        tooltipBg: '#1B1F24', tooltipBorder: '#262B31', tooltipText: '#EDEBE6', tooltipLabel: '#5C636B' }
    : { grid: '#D6D4D1', axis: '#6B6B6B', primary: '#1565C0', secondary: '#5B6FD6', tertiary: '#1B7A4A', quaternary: '#B45309',
        primaryFill: 'rgba(21, 101, 192, 0.3)', secondaryFill: 'rgba(91, 111, 214, 0.3)',
        tooltipBg: '#FFFFFF', tooltipBorder: '#D6D4D1', tooltipText: '#262626', tooltipLabel: '#6B6B6B' };

  const liveColor  = live ? 'var(--status-success)'     : 'var(--text-tertiary)';
  const liveBg     = live ? 'var(--status-success-bg)'  : 'var(--bg-panel-hover)';
  const liveBorder = live ? 'var(--status-success-border)' : 'var(--border-hairline)';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Monitoring</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Real-time resource metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(l => !l)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ color: liveColor, background: liveBg, borderColor: liveBorder }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'animate-pulse' : ''}`} style={{ backgroundColor: liveColor }} />
            {live ? 'Live' : 'Paused'}
          </button>
          <div className="flex items-center rounded-lg overflow-hidden border" style={{ background: 'var(--bg-panel-hover)', borderColor: 'var(--border-hairline)' }}>
            {WINDOWS.map(w => (
              <button key={w} onClick={() => setWindow(w)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={window === w
                  ? { background: 'var(--accent-red-tint)', color: 'var(--accent-red)' }
                  : { background: 'transparent', color: 'var(--text-tertiary)' }
                }>{w}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Resource list sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card p-2 space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Resources</p>
            {loadingResources
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-1" />)
              : resources.map(r => {
                const dotColor =
                  r.status === 'running' ? 'var(--status-success)' :
                  r.status === 'warning' ? 'var(--status-warning)' :
                  r.status === 'critical' ? 'var(--status-critical)' : 'var(--text-tertiary)';
                const isActive = selectedId === r.id;
                return (
                  <button key={r.id} onClick={() => setSelectedId(r.id)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors"
                    style={isActive
                      ? { background: 'var(--accent-red-tint)', color: 'var(--accent-red)' }
                      : { background: 'transparent', color: 'var(--text-secondary)' }
                    }
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-panel-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${(r.status === 'warning' || r.status === 'critical') ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="text-xs truncate">{r.name}</span>
                  </button>
                );
              })
            }
          </div>
        </div>

        {/* Charts area */}
        <div className="flex-1 min-w-0 space-y-4">
          {resource && (
            <div className="card flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{resource.name}</span>
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{resource.tier} · {resource.region}</span>
                </div>
                <StatusBadge status={resource.status} />
              </div>
              {latest && <HealthIndicator cpu={latest.cpu} memory={latest.memory} />}
              {loadingMetrics && <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
            </div>
          )}

          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="CPU"       value={latest.cpu}       unit="%" loading={loadingMetrics} color={healthColor(latest.cpu)}       icon={<Cpu className="w-4 h-4" style={{ color: healthColor(latest.cpu) }} />} />
              <MetricCard label="Memory"    value={latest.memory}    unit="%" loading={loadingMetrics} color={healthColor(latest.memory)}    icon={<MemoryStick className="w-4 h-4" style={{ color: healthColor(latest.memory) }} />} />
              <MetricCard label="Net In"    value={latest.networkIn} unit="Mbps" loading={loadingMetrics} color="var(--series-a)" icon={<Wifi className="w-4 h-4" style={{ color: 'var(--series-a)' }} />} />
              <MetricCard label="Disk Read" value={latest.diskRead}  unit="MB/s" loading={loadingMetrics} color="var(--series-b)" icon={<HardDrive className="w-4 h-4" style={{ color: 'var(--series-b)' }} />} />
            </div>
          )}

          {/* CPU + Memory area chart */}
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>CPU & Memory Utilization</p>
            {loadingMetrics ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={displayPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColors.primary}   stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors.primary}   stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColors.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="timestamp" tickFormatter={ts => fmt(ts as number, window)}
                    tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<ChartTooltip window={window} chartColors={chartColors} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="cpu"    name="CPU %"    stroke={chartColors.primary}   fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="memory" name="Memory %" stroke={chartColors.secondary} fill="url(#memGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Network I/O line chart */}
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Network I/O (Mbps)</p>
            {loadingMetrics ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={displayPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="timestamp" tickFormatter={ts => fmt(ts as number, window)}
                    tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip window={window} chartColors={chartColors} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="networkIn"  name="In"  stroke={chartColors.tertiary}    strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="networkOut" name="Out" stroke={chartColors.quaternary} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Disk I/O line chart */}
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Disk I/O (MB/s)</p>
            {loadingMetrics ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={displayPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="timestamp" tickFormatter={ts => fmt(ts as number, window)}
                    tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.axis }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip window={window} chartColors={chartColors} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="diskRead"  name="Read"  stroke={chartColors.secondary}  strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="diskWrite" name="Write" stroke={chartColors.quaternary} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
