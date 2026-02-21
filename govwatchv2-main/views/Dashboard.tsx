import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Record as ProcurementRecord } from '../types';
import { StatCard } from '../components/StatCard';
import { formatMoney, formatMoneyCompact, formatMoneyFull, formatMoneyUSD, formatMoneyUSDFull, translateMinistry, downloadCSV, getMinistryLabel, formatDateSafe, formatDateTimeSafe } from '../utils';
import { Search, FileText, Download, Clock, ChevronLeft, ChevronRight, Info, ExternalLink, ChevronsLeft, ChevronsRight, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useLanguage } from '../i18n';

interface DashboardProps {
  onMinistryClick: (name: string) => void;
  onVendorClick: (name: string) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  const { language } = useLanguage();
  if (active && payload && payload.length) {
    return (
      <div className="bg-gw-card border border-gw-border p-3 rounded-md shadow-lg text-sm" style={{ transition: 'background-color 0.2s' }}>
        <p className="font-medium text-gw-text mb-0.5">{payload[0].name || label}</p>
        <p className="font-mono font-semibold text-gw-success">{formatMoney(payload[0].value as number, language)}</p>
        <p className="font-mono text-gw-muted text-xs">≈ {formatMoneyUSD(payload[0].value as number)}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = React.memo(({ onMinistryClick, onVendorClick }) => {
  const { t, language } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterMethod, setFilterMethod] = useState<string>('All');
  const [showUSD, setShowUSD] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [records, setRecords] = useState<ProcurementRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, filterMethod, sortBy]);

  useEffect(() => {
    fetch('/api/stats/dashboard').then(r => r.json()).then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    setIsFetching(true);
    const query = new URLSearchParams({
      page: currentPage.toString(), limit: itemsPerPage.toString(),
      search: searchTerm, category: filterCategory, method: filterMethod, sortBy
    });
    fetch(`/api/records?${query.toString()}`)
      .then(r => r.json())
      .then(data => { setRecords(data.data || []); setTotalRecords(data.totalCount || 0); })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [currentPage, searchTerm, filterCategory, filterMethod, sortBy]);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const handleExport = useCallback(() => downloadCSV(records, `govwatch_export_${formatDateSafe(new Date())}.csv`), [records]);

  if ((isFetching || !stats) && records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-8 h-8 border-2 border-gw-border border-t-gw-accent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-gw-muted">{t.loading_dashboard}</p>
      </div>
    );
  }

  if (records.length === 0 && !isFetching && !searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileText className="w-10 h-10 text-gw-muted mb-4" />
        <h2 className="text-xl font-semibold mb-1">{t.no_records}</h2>
        <p className="text-gw-muted text-sm">{t.no_records_desc}</p>
      </div>
    );
  }

  const totalSpend = stats?.totalSpend || 0;
  const worksSpend = stats?.worksSpend || 0;
  const suppliesSpend = stats?.suppliesSpend || 0;
  const servicesSpend = stats?.servicesSpend || 0;
  const suppliesAndServicesSpend = stats?.suppliesAndServicesSpend || (totalSpend - worksSpend);

  let displayDateStr = "Recent";
  const lastCrawlDate = records.length > 0 ? records[0].crawledAt : null;
  if (lastCrawlDate) displayDateStr = formatDateTimeSafe(lastCrawlDate, language);
  else if (records.length > 0) displayDateStr = formatDateTimeSafe(new Date(), language);

  const categoryData = [
    { name: t.cat_services, value: servicesSpend, color: '#3b82f6' },
    { name: t.cat_supplies, value: suppliesSpend, color: '#10b981' },
    { name: t.cat_works, value: worksSpend, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const barChartData = (stats?.topMinistries || []).map((m: any) => ({
    name: getMinistryLabel(m.name, language), value: m.totalSpend
  }));

  // Proper color gradient for bar chart
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
  const barColors = isDark
    ? ['#60a5fa', '#4b9cf5', '#3b8eeb', '#2d80e0', '#2272d4', '#1a65c7', '#1558b8', '#104ba8']
    : ['#2563eb', '#3573ed', '#4583ef', '#5593f1', '#65a3f3', '#75b3f5', '#85c3f7', '#95d0f9'];
  const axisColor = isDark ? '#6b7085' : '#7c8497';

  return (
    <div className="space-y-6 md:space-y-8 pb-8 fade-in">

      {/* Info bar + currency toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-gw-muted">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          <span>{t.lbl_data_period}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUSD(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border ${showUSD ? 'bg-gw-accent/10 text-gw-accent border-gw-accent/30' : 'text-gw-muted border-gw-border hover:text-gw-text'}`}
            title="Toggle USD conversion (approximate)"
          >
            <DollarSign className="w-3 h-3" /> {showUSD ? 'USD' : 'MYR'}
          </button>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.lbl_updated}: {displayDateStr}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={t.kpi_total_value}
          value={showUSD ? formatMoneyUSD(totalSpend) : formatMoneyCompact(totalSpend, language)}
          fullValue={showUSD ? formatMoneyUSDFull(totalSpend) : formatMoneyFull(totalSpend, language)}
          usdValue={!showUSD ? formatMoneyUSD(totalSpend) : undefined}
          rawAmount={totalSpend}
        />
        <StatCard
          label={t.kpi_works}
          value={showUSD ? formatMoneyUSD(worksSpend) : formatMoneyCompact(worksSpend, language)}
          fullValue={showUSD ? formatMoneyUSDFull(worksSpend) : formatMoneyFull(worksSpend, language)}
          usdValue={!showUSD ? formatMoneyUSD(worksSpend) : undefined}
          rawAmount={worksSpend}
          isAlert
        />
        <StatCard
          label={t.kpi_supplies}
          value={showUSD ? formatMoneyUSD(suppliesAndServicesSpend) : formatMoneyCompact(suppliesAndServicesSpend, language)}
          fullValue={showUSD ? formatMoneyUSDFull(suppliesAndServicesSpend) : formatMoneyFull(suppliesAndServicesSpend, language)}
          usdValue={!showUSD ? formatMoneyUSD(suppliesAndServicesSpend) : undefined}
          rawAmount={suppliesAndServicesSpend}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart — proper color gradient */}
        <div className="lg:col-span-2 bg-gw-card border border-gw-border rounded-lg p-4 md:p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
          <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-4">{t.chart_top_ministries}</h3>
          <div className="min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={isMobile ? 100 : 170}
                  tick={{ fill: axisColor, fontSize: isMobile ? 10 : 11, fontFamily: 'IBM Plex Sans' }}
                  interval={0} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={isMobile ? 14 : 18}>
                  {barChartData.map((_: any, i: number) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-gw-card border border-gw-border rounded-lg p-4 md:p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
          <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-4">{t.chart_categories}</h3>
          <div className="min-h-[240px]">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="45%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}
                  formatter={(v: string) => <span style={{ color: axisColor, fontSize: '12px', fontFamily: 'IBM Plex Sans' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-gw-card border border-gw-border rounded-lg overflow-hidden" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
        {/* Controls */}
        <div className="p-4 border-b border-gw-border flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto">
            <h2 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide shrink-0">{t.table_recent_awards}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gw-bg border border-gw-border rounded-md px-2.5 py-1.5 text-xs text-gw-text focus:outline-none focus:border-gw-accent" style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}>
                <option value="date">{t.val_newest}</option>
                <option value="value">{t.val_highest}</option>
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-gw-bg border border-gw-border rounded-md px-2.5 py-1.5 text-xs text-gw-text focus:outline-none focus:border-gw-accent" style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}>
                <option value="All">{t.opt_all_cat}</option>
                <option value="Kerja">{t.opt_works}</option>
                <option value="Bekalan">{t.opt_supplies}</option>
                <option value="Perkhidmatan">{t.opt_services}</option>
              </select>
              <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
                className="bg-gw-bg border border-gw-border rounded-md px-2.5 py-1.5 text-xs text-gw-text focus:outline-none focus:border-gw-accent" style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}>
                <option value="All">{t.opt_all_methods}</option>
                <option value="Open Tender">{t.val_open_tender}</option>
                <option value="Direct Negotiation">{t.val_direct_nego}</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
              <input type="text" placeholder={t.search_placeholder}
                className="w-full bg-gw-bg border border-gw-border rounded-md pl-9 pr-3 py-1.5 text-xs text-gw-text focus:outline-none focus:border-gw-accent" style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <button onClick={handleExport} title="Export CSV" className="p-2 border border-gw-border rounded-md text-gw-muted hover:text-gw-text hover:bg-gw-bg-alt transition-colors shrink-0" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-gw-bg sticky top-0 z-10" style={{ transition: 'background-color 0.2s' }}>
              <tr className="border-b border-gw-border">
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide">{t.th_date}</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide">{t.th_ministry}</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide">{t.th_vendor}</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide text-right">{t.th_value}</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide text-right hidden sm:table-cell">{t.th_details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gw-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gw-bg-alt transition-colors">
                  <td className="px-4 md:px-5 py-3 whitespace-nowrap text-gw-muted text-xs font-mono">{formatDateSafe(r.date)}</td>
                  <td className="px-4 md:px-5 py-3">
                    <button onClick={() => onMinistryClick(r.ministry)} className="text-gw-link hover:underline text-left text-sm leading-snug">
                      <span className="line-clamp-1 max-w-[120px] md:max-w-[250px]">{getMinistryLabel(r.ministry, language)}</span>
                    </button>
                    {r.title && <span className="block text-[11px] text-gw-muted mt-0.5 line-clamp-1 max-w-[120px] md:max-w-[250px] hidden sm:block">{r.title}</span>}
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <button onClick={() => onVendorClick(r.vendor)} className="text-gw-text-secondary hover:text-gw-link text-left text-sm truncate max-w-[100px] md:max-w-[200px] block">
                      {r.vendor}
                    </button>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right font-mono font-semibold text-gw-text text-sm whitespace-nowrap" title={formatMoneyFull(r.amount, language)}>
                    {formatMoney(r.amount, language)}
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right hidden sm:table-cell">
                    <div className="flex items-center gap-2 justify-end">
                      {r.contractUrl && (
                        <a href={r.contractUrl} target="_blank" rel="noreferrer" className="text-gw-muted hover:text-gw-link">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium uppercase ${(r.method || '').toLowerCase().includes('direct') || (r.method || '').toLowerCase().includes('rundingan')
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        }`} style={{ transition: 'background-color 0.2s, color 0.2s' }}>
                        {(r.method || '').toLowerCase().includes('direct') || (r.method || '').toLowerCase().includes('rundingan') ? t.val_direct_nego : t.val_open_tender}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gw-muted text-sm">No results found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination with first/last and page input */}
        <div className="p-3 border-t border-gw-border flex items-center justify-between text-xs text-gw-muted">
          <span>
            {Math.min((currentPage - 1) * itemsPerPage + 1, totalRecords)}–{Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="First page"
              className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= totalPages) setCurrentPage(v);
              }}
              min={1} max={totalPages}
              className="w-12 text-center font-mono bg-gw-bg border border-gw-border rounded px-1 py-1 text-xs text-gw-text focus:outline-none focus:border-gw-accent"
              style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}
            />
            <span className="text-gw-muted">/ {Math.max(1, totalPages)}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} title="Last page"
              className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Source credit */}
      <p className="text-[11px] text-gw-muted text-right">
        {language === 'ms' ? 'Sumber: ' : 'Source: '}
        <a href="https://myprocurement.treasury.gov.my/" target="_blank" rel="noreferrer" className="text-gw-link hover:underline">MyProcurement</a>
        {showUSD && <span className="ml-2">· USD rate ≈ 0.22 (approximate)</span>}
      </p>
    </div>
  );
});