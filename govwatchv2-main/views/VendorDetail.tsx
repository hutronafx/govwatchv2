import React from 'react';
import { formatMoney, getMinistryLabel, formatDateSafe } from '../utils';
import { ArrowLeft, Store, Calendar, CreditCard, FileWarning, Link as LinkIcon, Building2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface VendorDetailProps { vendorName: string; onBack: () => void; onMinistryClick: (name: string) => void; }

const VTooltip = ({ active, payload, language }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gw-card border border-gw-border p-2.5 rounded-md shadow-lg text-sm" style={{ transition: 'background-color 0.2s' }}>
        <p className="font-medium text-gw-text text-xs mb-0.5">{payload[0].name}</p>
        <p className="font-mono font-semibold text-gw-success">{formatMoney(payload[0].value, language)}</p>
      </div>
    );
  }
  return null;
};

export const VendorDetail: React.FC<VendorDetailProps> = ({ vendorName, onBack, onMinistryClick }) => {
  const { t, language } = useLanguage();
  const [stats, setStats] = React.useState<any>(null);
  const [recentRecords, setRecentRecords] = React.useState<any[]>([]);
  const [isFetching, setIsFetching] = React.useState(true);

  React.useEffect(() => {
    setIsFetching(true);
    Promise.all([
      fetch(`/api/vendors/${encodeURIComponent(vendorName)}/stats`).then(r => r.json()),
      fetch(`/api/records?vendor=${encodeURIComponent(vendorName)}&limit=50`).then(r => r.json())
    ]).then(([s, r]) => { setStats(s); setRecentRecords(r.data || []); })
      .catch(console.error).finally(() => setIsFetching(false));
  }, [vendorName]);

  const totalSpend = stats?.totalSpend || 0;
  const totalCount = stats?.contractCount || 0;

  const chartData = (stats?.byMinistry || []).map((m: any) => ({
    name: getMinistryLabel(m.name, language), value: m.totalSpend
  })).sort((a: any, b: any) => b.value - a.value);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isFetching && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-2 border-gw-border border-t-gw-accent rounded-full animate-spin mb-3"></div>
      <p className="text-sm text-gw-muted">Loading...</p>
    </div>
  );

  return (
    <div className="space-y-5 pb-8 fade-in">
      <button onClick={onBack} className="flex items-center text-gw-link hover:underline text-sm group">
        <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" /> {t.det_back}
      </button>

      {/* Header */}
      <div className="bg-gw-card border border-gw-border rounded-lg p-5 md:p-6" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gw-muted uppercase tracking-wide mb-2"><Store className="w-4 h-4" /> {t.det_vendor_profile}</div>
            <h1 className="text-xl md:text-2xl font-bold break-words leading-tight">{vendorName}</h1>
          </div>
          <div className="text-left md:text-right">
            <div className="text-xs text-gw-muted uppercase tracking-wide mb-1">{t.kpi_total_value}</div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-gw-success">{formatMoney(totalSpend, language)}</div>
            <div className="text-xs text-gw-muted mt-1">{totalCount} {t.min_contracts}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="bg-gw-card border border-gw-border rounded-lg p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
          <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> {t.det_ministries_served}
          </h3>
          <div className="min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<VTooltip language={language} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
            {chartData.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 truncate max-w-[65%] text-gw-text">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono text-gw-muted ml-2">{formatMoney(item.value, language)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contract list */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-1">{t.det_contract_history}</h3>
          {recentRecords.map((r: any) => (
            <div key={r.id} className="bg-gw-card border border-gw-border rounded-lg p-4 relative" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
              {(r.contractUrl || r.sourceUrl) && (
                <a href={r.contractUrl || r.sourceUrl} target="_blank" rel="noreferrer" className="absolute top-4 right-4 text-gw-muted hover:text-gw-link"><LinkIcon className="w-3.5 h-3.5" /></a>
              )}
              <div className="flex flex-col md:flex-row justify-between gap-2 mb-2 pr-8">
                <button onClick={() => onMinistryClick(r.ministry)} className="text-gw-link hover:underline font-semibold text-sm text-left">{getMinistryLabel(r.ministry, language)}</button>
                <div className={`text-lg font-bold font-mono whitespace-nowrap ${(r.method?.toLowerCase().includes('direct') || r.method?.toLowerCase().includes('rundingan')) ? 'text-gw-danger' : 'text-gw-success'}`}>
                  {formatMoney(r.amount, language)}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gw-muted">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateSafe(r.date)}</span>
                <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />
                  {(r.method?.toLowerCase().includes('direct') || r.method?.toLowerCase().includes('rundingan')) ? t.val_direct_nego : t.val_open_tender}
                </span>
              </div>
              {r.title && <div className="text-xs text-gw-muted mt-1.5 italic">"{r.title}"</div>}
              {r.reason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2.5 text-xs text-gw-text border border-red-200 dark:border-red-800/30 flex gap-2 mt-2" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                  <FileWarning className="w-3.5 h-3.5 text-gw-danger shrink-0 mt-0.5" />
                  <div><strong className="text-gw-danger text-[10px] uppercase block mb-0.5">{t.det_justification}</strong>{r.reason}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};