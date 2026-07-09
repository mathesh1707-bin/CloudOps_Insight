import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Download, ArrowLeft, DollarSign, Activity, Shield, Zap, Loader2 } from 'lucide-react';
import type { ReportDefinition, ReportRow, ReportCategory } from '../types';
import { fetchReportDefinitions, fetchReportData, exportToCSV } from '../data/mockData';
import { Skeleton } from '../components/ui/Skeleton';
import { useTheme } from '../context/ThemeContext';

const CATEGORY_ICON: Record<ReportCategory, React.ReactNode> = {
  cost:        <DollarSign className="w-5 h-5" />,
  utilization: <Activity className="w-5 h-5" />,
  governance:  <Shield className="w-5 h-5" />,
};

const CATEGORY_TOKEN: Record<ReportCategory, { color: string; bg: string; border: string }> = {
  cost:        { color: 'var(--series-a)',       bg: 'color-mix(in srgb, var(--series-a) 12%, transparent)',       border: 'color-mix(in srgb, var(--series-a) 30%, transparent)' },
  utilization: { color: 'var(--status-success)', bg: 'var(--status-success-bg)', border: 'var(--status-success-border)' },
  governance:  { color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)' },
};

export default function ReportsPage() {
  const { theme } = useTheme();
  const [reports, setReports]           = useState<ReportDefinition[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<ReportDefinition | null>(null);
  const [rows, setRows]                 = useState<ReportRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting]       = useState(false);

  // Chart colors per theme
  const c = theme === 'dark'
    ? { grid: '#262B31', axis: '#5C636B', tooltipBg: '#1B1F24', tooltipBorder: '#262B31', tooltipText: '#EDEBE6', tooltipLabel: '#8A9199',
        cells: ['#60A5FA','#A78BFA','#34D399','#F59E0B','#F472B6','#FB923C','#38BDF8','#4ADE80','#E879F9','#FACC15'] }
    : { grid: '#D6D4D1', axis: '#9A9A9A', tooltipBg: '#FFFFFF', tooltipBorder: '#D6D4D1', tooltipText: '#262626', tooltipLabel: '#6B6B6B',
        cells: ['#1565C0','#5B6FD6','#1B7A4A','#B45309','#C2185B','#E65100','#00838F','#2E7D32','#6A1B9A','#F57F17'] };

  useEffect(() => { fetchReportDefinitions().then(r => { setReports(r); setLoading(false); }); }, []);

  async function openReport(rpt: ReportDefinition) {
    setSelected(rpt); setLoadingDetail(true);
    const data = await fetchReportData(rpt.id);
    setRows(data); setLoadingDetail(false);
  }

  async function handleExport() {
    if (!selected || rows.length === 0) return;
    setExporting(true);
    await new Promise(r => setTimeout(r, 400));
    exportToCSV(rows, `${selected.id}-${new Date().toISOString().slice(0,10)}.csv`);
    setExporting(false);
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    const headers    = rows.length > 0 ? Object.keys(rows[0]) : [];
    const numericKey = headers.find(h => typeof rows[0]?.[h] === 'number' && !h.toLowerCase().includes('%'));
    const barData    = rows.slice(0, 10).map(r => ({
      name: String(r[headers[0]] ?? '').slice(0, 12),
      value: numericKey ? Number(r[numericKey]) : 0,
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelected(null); setRows([]); }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-panel-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.title}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{selected.description}</p>
            </div>
          </div>
          <button
            onClick={handleExport} disabled={exporting || loadingDetail || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent-red)' }}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating…' : 'Export CSV'}
          </button>
        </div>

        {loadingDetail ? (
          <div className="space-y-3"><Skeleton className="h-52 w-full rounded-lg" /><Skeleton className="h-64 w-full rounded-lg" /></div>
        ) : (
          <>
            {numericKey && barData.some(d => d.value > 0) && (
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {numericKey} (top {barData.length})
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: c.tooltipText }}
                      labelStyle={{ color: c.tooltipLabel }} itemStyle={{ color: c.tooltipText }} />
                    <Bar dataKey="value" name={numericKey} radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => <Cell key={i} fill={c.cells[i % c.cells.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Data — {rows.length} rows</p>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Generated {selected.lastGeneratedAt.slice(0, 10)}</span>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: 'var(--bg-panel)' }}>
                    <tr className="border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                      {headers.map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b transition-colors"
                        style={{ borderColor: 'var(--border-hairline)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-panel-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                        {headers.map(h => (
                          <td key={h} className="px-4 py-2.5 text-xs whitespace-nowrap"
                            style={{ color: typeof row[h] === 'number' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                     fontFamily: typeof row[h] === 'number' ? 'var(--font-mono, monospace)' : undefined }}>
                            {typeof row[h] === 'number' ? Number(row[h]).toFixed(2) : String(row[h])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Report list ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reports & Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Pre-built reports with CSV export</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map(rpt => {
            const tok = CATEGORY_TOKEN[rpt.category];
            return (
              <button
                key={rpt.id} onClick={() => openReport(rpt)}
                className="card text-left transition-colors group"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = tok.border; (e.currentTarget as HTMLElement).style.background = 'var(--bg-panel-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hairline)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-panel)'; }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg border" style={{ color: tok.color, background: tok.bg, borderColor: tok.border }}>
                    {CATEGORY_ICON[rpt.category]}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize" style={{ color: tok.color, background: tok.bg, borderColor: tok.border }}>
                    {rpt.category === 'cost' ? <Zap className="w-3 h-3" /> : null}
                    {rpt.category}
                  </div>
                </div>
                <h3 className="text-sm font-semibold mb-1.5 transition-colors" style={{ color: 'var(--text-primary)' }}>{rpt.title}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-tertiary)' }}>{rpt.description}</p>
                <div className="flex items-center justify-between text-[10px] border-t pt-3 mt-auto" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-hairline)' }}>
                  <div className="flex items-center gap-1"><FileText className="w-3 h-3" /><span>~{rpt.estimatedRows} rows</span></div>
                  <span>Updated {rpt.lastGeneratedAt.slice(0, 10)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
