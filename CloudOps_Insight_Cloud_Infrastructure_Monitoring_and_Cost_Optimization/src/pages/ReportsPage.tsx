import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { FileText, Download, ArrowLeft, DollarSign, Activity, Shield, Zap, Loader2 } from 'lucide-react';
import type { ReportDefinition, ReportRow, ReportCategory } from '../types';
import { fetchReportDefinitions, fetchReportData, exportToCSV } from '../data/mockData';
import { Skeleton } from '../components/ui/Skeleton';

const CATEGORY_ICON: Record<ReportCategory, React.ReactNode> = {
  cost:        <DollarSign className="w-5 h-5 text-blue-400" />,
  utilization: <Activity className="w-5 h-5 text-emerald-400" />,
  governance:  <Shield className="w-5 h-5 text-amber-400" />,
};
const CATEGORY_COLOR: Record<ReportCategory, string> = {
  cost:        'bg-blue-400/10 border-blue-400/20 text-blue-400',
  utilization: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
  governance:  'bg-amber-400/10 border-amber-400/20 text-amber-400',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReportDefinitions().then(r => { setReports(r); setLoading(false); });
  }, []);

  async function openReport(rpt: ReportDefinition) {
    setSelected(rpt);
    setLoadingDetail(true);
    const data = await fetchReportData(rpt.id);
    setRows(data);
    setLoadingDetail(false);
  }

  async function handleExport() {
    if (!selected || rows.length === 0) return;
    setExporting(true);
    await new Promise(r => setTimeout(r, 400)); // simulate generation
    exportToCSV(rows, `${selected.id}-${new Date().toISOString().slice(0,10)}.csv`);
    setExporting(false);
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const numericKey = headers.find(h => typeof rows[0]?.[h] === 'number' && !h.toLowerCase().includes('%'));
    const barData = rows.slice(0, 10).map(r => ({
      name: String(r[headers[0]] ?? '').slice(0, 12),
      value: numericKey ? Number(r[numericKey]) : 0,
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelected(null); setRows([]); }}
              className="p-1.5 rounded-lg hover:bg-[#141d2e] text-[#4a5e80] hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">{selected.title}</h1>
              <p className="text-sm text-[#4a5e80] mt-0.5">{selected.description}</p>
            </div>
          </div>
          <button onClick={handleExport} disabled={exporting || loadingDetail || rows.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating…' : 'Export CSV'}
          </button>
        </div>

        {loadingDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Bar chart summary */}
            {numericKey && barData.some(d => d.value > 0) && (
              <div className="card">
                <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider mb-4">
                  {numericKey} (top {barData.length})
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#4a5e80' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#141d2e', border: '1px solid #1a2540', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#4a5e80' }} itemStyle={{ color: '#b8c9d9' }} />
                    <Bar dataKey="value" name={numericKey} radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={['#60a5fa','#a78bfa','#34d399','#fbbf24','#f472b6','#fb923c','#38bdf8','#4ade80','#e879f9','#facc15'][i % 10]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Data table */}
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2540]">
                <p className="text-xs font-semibold text-[#8fa3bc] uppercase tracking-wider">Data — {rows.length} rows</p>
                <span className="text-xs text-[#4a5e80]">Generated {selected.lastGeneratedAt.slice(0, 10)}</span>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0f1626]">
                    <tr className="border-b border-[#1a2540]">
                      {headers.map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#4a5e80] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-[#1a2540]/50 hover:bg-[#141d2e] transition-colors">
                        {headers.map(h => (
                          <td key={h} className={`px-4 py-2.5 text-xs whitespace-nowrap ${typeof row[h] === 'number' ? 'font-metric text-[#b8c9d9]' : 'text-[#8fa3bc]'}`}>
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
        <h1 className="text-xl font-semibold text-white">Reports & Analytics</h1>
        <p className="text-sm text-[#4a5e80] mt-0.5">Pre-built reports with CSV export</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map(rpt => (
            <button key={rpt.id} onClick={() => openReport(rpt)}
              className="card text-left hover:border-blue-500/30 hover:bg-[#141d2e] transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border ${CATEGORY_COLOR[rpt.category]}`}>
                  {CATEGORY_ICON[rpt.category]}
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${CATEGORY_COLOR[rpt.category]}`}>
                  {rpt.category === 'cost' ? <Zap className="w-3 h-3" /> : null}
                  {rpt.category}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-blue-300 transition-colors">{rpt.title}</h3>
              <p className="text-xs text-[#4a5e80] leading-relaxed mb-4">{rpt.description}</p>
              <div className="flex items-center justify-between text-[10px] text-[#334466] border-t border-[#1a2540] pt-3 mt-auto">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>~{rpt.estimatedRows} rows</span>
                </div>
                <span>Updated {rpt.lastGeneratedAt.slice(0, 10)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
