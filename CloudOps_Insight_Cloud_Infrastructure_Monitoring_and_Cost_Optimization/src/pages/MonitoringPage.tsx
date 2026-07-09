import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Activity, Cpu, MemoryStick, Wifi, HardDrive, RefreshCw } from 'lucide-react';
import type { Resource, MetricPoint, MetricWindow } from '../types';
import { fetchResources, fetchMetrics, generateLivePoint } from '../data/mockData';
import StatusBadge from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ts: number, window: MetricWindow) {
  const d = new Date(ts);
  if (window === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (window === '7d')  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function healthColor(value: number, high = 85, warn = 65) {
  if (value >= high) return '#f87171';
  if (value >= warn) return '#fbbf24';
  return '#4ade80';
}

interface MetricCardProps {
  label: string; value: number; unit: string;
  icon: React.ReactNode; color: string; loading?: boolean;
}
function MetricCard({ label, value, unit, icon, color, loading }: MetricCardProps) {
  if (loading) return <div className="card h-20"><Skeleton className="h-full w-full" /></div>;
  return (
    <div className="card flex items-center gap-4">
      <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}18` }}>{icon}</div>
      <div>
        <p className="text-[10px] text-[#4a5e80] uppercase tracking-wider">{label}</p>
        <p className="font-metric text-xl font-semibold text-white">
          {value.toFixed(1)}<span className="text-xs text-[#4a5e80] ml-1">{unit}</span>
        </p>
      </div>
      <div className="ml-auto h-8 w-1.5 rounded-full bg-[#141d2e] overflow-hidden flex flex-col-reverse">
        <div className="rounded-full transition-all duration-500" style={{ height: `${Math.min(value,100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Health indicator ──────────────────────────────────────────────────────────

function HealthIndicator({ cpu, memory }: { cpu: number; memory: number }) {
  const isOk = cpu < 65 && memory < 65;
  const isWarn = !isOk && (cpu < 85 && memory < 85);
  const isCrit = !isOk && !isWarn;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
      isCrit ? 'bg-red-400/10 text-red-400 border-red-400/20'
      : isWarn ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
      : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-red-400' : isWarn ? 'bg-amber-400' : 'bg-emerald-400'} ${isCrit || isWarn ? 'animate-pulse' : ''}`} />
      {isCrit ? 'Critical — CPU or Memory above threshold' : isWarn ? 'Warning — Elevated utilization' : 'Healthy'}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, window: win }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[];
  label?: number; window: MetricWindow;
}) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="bg-[#141d2e] border border-[#1a2540] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[#4a5e80] mb-2">{fmt(label, win)}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#8fa3bc]">{p.name}:</span>
          <span className="font-metric text-white font-medium">{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const WINDOWS: MetricWindow[] = ['24h', '7d', '30d'];

export default function MonitoringPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [window, setWindow] = useState<MetricWindow>('24h');
  const [points, setPoints] = useState<MetricPoint[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [live, setLive] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load resources
  useEffect(() => {
    fetchResources().then(r => {
      setResources(r.filter(res => res.status !== 'terminated'));
      setSelectedId(r[0]?.id ?? '');
      setLoadingResources(false);
    });
  }, []);

  // Load metrics when resource or window changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMetrics(true);
    fetchMetrics(selectedId, window).then(pts => {
      setPoints(pts);
      setLoadingMetrics(false);
    });
  }, [selectedId, window]);

  // Live tick: append a new point every 5s when on 24h view
  const tick = useCallback(() => {
    if (!selectedId || window !== '24h') return;
    const pt = generateLivePoint(selectedId);
    setPoints(prev => [...prev.slice(-287), pt]); // keep ~24h at 5m intervals
  }, [selectedId, window]);

  useEffect(() => {
    if (live && window === '24h') {
      tickRef.current = setInterval(tick, 5000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [live, window, tick]);

  const resource = resources.find(r => r.id === selectedId);
  const latest = points[points.length - 1];

  // Downsample for display (max 120 points for performance)
  const displayPoints = points.length > 120
    ? points.filter((_, i) => i % Math.ceil(points.length / 120) === 0)
    : points;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Monitoring</h1>
          <p className="text-sm text-[#4a5e80] mt-0.5">Real-time resource metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(l => !l)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              live ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                   : 'bg-[#141d2e] text-[#4a5e80] border-[#1a2540] hover:border-[#334466]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-[#4a5e80]'}`} />
            {live ? 'Live' : 'Paused'}
          </button>
          <div className="flex items-center bg-[#141d2e] border border-[#1a2540] rounded-lg overflow-hidden">
            {WINDOWS.map(w => (
              <button key={w} onClick={() => setWindow(w)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  window === w ? 'bg-blue-500/20 text-blue-400' : 'text-[#4a5e80] hover:text-[#8fa3bc]'
                }`}>{w}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Resource list sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card p-2 space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-semibold text-[#4a5e80] uppercase tracking-widest">Resources</p>
            {loadingResources
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-1" />)
              : resources.map(r => (
                <button key={r.id} onClick={() => setSelectedId(r.id)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedId === r.id ? 'bg-blue-500/15 text-blue-400' : 'text-[#6b829e] hover:bg-[#141d2e] hover:text-[#b8c9d9]'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    r.status === 'running' ? 'bg-emerald-400' : r.status === 'warning' ? 'bg-amber-400 animate-pulse'
                    : r.status === 'critical' ? 'bg-red-400 animate-pulse' : 'bg-slate-600'
                  }`} />
                  <span className="text-xs truncate">{r.name}</span>
                </button>
              ))
            }
          </div>
        </div>

        {/* Charts area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Resource header */}
          {resource && (
            <div className="card flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-sm font-semibold text-white">{resource.name}</span>
                  <span className="ml-2 text-xs text-[#4a5e80]">{resource.tier} · {resource.region}</span>
                </div>
                <StatusBadge status={resource.status} />
              </div>
              {latest && <HealthIndicator cpu={latest.cpu} memory={latest.memory} />}
              {loadingMetrics && <RefreshCw className="w-4 h-4 text-[#4a5e80] animate-spin" />}
            </div>
          )}

          {/* Metric summary cards */}
          {latest && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="CPU" value={latest.cpu} unit="%" loading={loadingMetrics}
                color={healthColor(latest.cpu)} icon={<Cpu className="w-4 h-4" style={{ color: healthColor(latest.cpu) }} />} />
              <MetricCard label="Memory" value={latest.memory} unit="%" loading={loadingMetrics}
                color={healthColor(latest.memory)} icon={<MemoryStick className="w-4 h-4" style={{ color: healthColor(latest.memory) }} />} />
              <MetricCard label="Net In" value={latest.networkIn} unit="Mbps" loading={loadingMetrics}
                color="#60a5fa" icon={<Wifi className="w-4 h-4 text-blue-400" />} />
              <MetricCard label="Disk Read" value={latest.diskRead} unit="MB/s" loading={loadingMetrics}
                color="#a78bfa" icon={<HardDrive className="w-4 h-4 text-violet-400" />} />
            </div>
          )}

          {/* CPU + Memory area chart */}
          <div className="card">
            <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">CPU & Memory Utilization</p>
            {loadingMetrics ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={displayPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
                  <XAxis dataKey="timestamp" tickFormatter={ts => fmt(ts as number, window)}
                    tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}%`} />
                  <Tooltip content={<ChartTooltip window={window} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#60a5fa" fill="url(#cpuGrad)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="memory" name="Memory %" stroke="#a78bfa" fill="url(#memGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Network I/O line chart */}
          <div className="card">
            <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">Network I/O (Mbps)</p>
            {loadingMetrics ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={displayPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
                  <XAxis dataKey="timestamp" tickFormatter={ts => fmt(ts as number, window)}
                    tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip window={window} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="networkIn" name="In" stroke="#34d399" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="networkOut" name="Out" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Disk I/O line chart */}
          <div className="card">
            <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">Disk I/O (MB/s)</p>
            {loadingMetrics ? <Skeleton className="h-44 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={displayPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
                  <XAxis dataKey="timestamp" tickFormatter={ts => fmt(ts as number, window)}
                    tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip window={window} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="diskRead" name="Read" stroke="#f472b6" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="diskWrite" name="Write" stroke="#fb923c" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
