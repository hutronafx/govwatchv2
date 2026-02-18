import React, { useState, useMemo, useEffect } from 'react';
import { Record as ProcurementRecord } from '../types';
import { StatCard } from '../components/StatCard';
import { formatMoney, translateMinistry, downloadCSV, getMinistryLabel } from '../utils';
import { ArrowUpRight, Search, FileText, Filter, ArrowUpDown, Download, Clock, Briefcase, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useLanguage } from '../i18n';

interface DashboardProps {
  records: ProcurementRecord[];
  isLoading?: boolean;
  onMinistryClick: (name: string) => void;
  onVendorClick: (name: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const { language } = useLanguage();
  if (active && payload && payload.length) {
    return (
      <div className="bg-gw-card border border-gw-border p-3 rounded shadow-xl z-50">
        <p className="text-gw-text font-bold text-sm mb-1">{payload[0].name || label}</p>
        <p className="text-gw-success text-sm font-mono">{formatMoney(payload[0].value as number, language)}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ records, isLoading, onMinistryClick, onVendorClick }) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterMethod, setFilterMethod] = useState<string>('All');
  const [isMobile, setIsMobile] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Responsive Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterMethod, sortBy]);

  // --- HOOKS MUST BE AT THE TOP (Before any conditional returns) ---
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const ministryRaw = (r.ministry || '').toLowerCase();
      const ministryEn = translateMinistry(r.ministry).toLowerCase();
      const vendor = (r.vendor || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      // Search matches either raw Malay name, Translated English name, Vendor, or Title
      const matchesSearch = ministryRaw.includes(search) || ministryEn.includes(search) || vendor.includes(search) || title.includes(search);
      
      // Category Filter
      const matchesCategory = filterCategory === 'All' || (r.category || '').includes(filterCategory);

      // Method Filter
      let matchesMethod = false;
      const methodRaw = (r.method || '').toLowerCase();
      if (filterMethod === 'All') {
          matchesMethod = true;
      } else if (filterMethod === 'Direct Negotiation') {
          // Robust check for English or Malay terms
          matchesMethod = methodRaw.includes('direct') || methodRaw.includes('rundingan');
      } else if (filterMethod === 'Open Tender') {
          matchesMethod = methodRaw.includes('open') || methodRaw.includes('tender') || methodRaw.includes('terbuka');
      } else {
          matchesMethod = methodRaw.includes(filterMethod.toLowerCase());
      }

      return matchesSearch && matchesCategory && matchesMethod;
    }).sort((a,b) => {
      // Fix: Ensure numeric arithmetic for sorting
      if (sortBy === 'value') return (b.amount || 0) - (a.amount || 0);
      
      // Default date sort (Handle invalid dates gracefully)
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [records, searchTerm, filterCategory, filterMethod, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- CONDITIONAL RETURNS (AFTER ALL HOOKS) ---
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn">
            <h2 className="text-xl font-bold text-white">{t.loading_dashboard}</h2>
        </div>
    );
  }

  // EMPTY STATE (Only if really 0 records)
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn p-4">
        <div className="bg-gw-card border border-gw-border rounded-full p-6 mb-6">
          <FileText className="w-12 h-12 text-gw-muted" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t.no_records}</h2>
        <p className="text-gw-muted max-w-md mb-8">
            {t.no_records_desc}
        </p>
      </div>
    );
  }

  // --- KPI LOGIC ---
  const totalSpend = records.reduce((acc, r) => acc + (r.amount || 0), 0);
  
  // Use Category for stats since "Method" is often vague in raw data
  const suppliesSpend = records
    .filter(r => (r.category || '').toLowerCase().includes('bekalan'))
    .reduce((acc, r) => acc + (r.amount || 0), 0);
  
  const worksSpend = records
    .filter(r => (r.category || '').toLowerCase().includes('kerja'))
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  const servicesSpend = records
    .filter(r => (r.category || '').toLowerCase().includes('perkhidmatan'))
    .reduce((acc, r) => acc + (r.amount || 0), 0);
  
  // Last Updated Logic (Recent Crawl)
  let displayDateStr = "Recent";
  const lastCrawlDate = records
    .map(r => r.crawledAt || '')
    .filter(d => d)
    .sort()
    .pop();
  
  if (lastCrawlDate) {
      try {
          const d = new Date(lastCrawlDate);
          if (!isNaN(d.getTime())) {
              displayDateStr = d.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric'
              });
          }
      } catch (e) {
          // Fallback if date parsing fails
      }
  } else if (records.length > 0) {
      // Fallback to today if we have data but no crawl date
      displayDateStr = new Date().toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', {
          day: 'numeric', month: 'long', year: 'numeric'
      });
  }

  // --- CHART DATA ---
  
  // 1. Pie Chart (Category Distribution)
  const categoryData = [
    { name: t.cat_works, value: worksSpend, color: '#ffadad' }, 
    { name: t.cat_supplies, value: suppliesSpend, color: '#36d399' }, 
    { name: t.cat_services, value: servicesSpend, color: '#8da2ce' }, 
  ].filter(d => d.value > 0);

  // 2. Bar Chart (Top Ministries)
  const ministryTotals = records.reduce((acc: { [key: string]: number }, curr) => {
    if (!curr.ministry) return acc;
    // Translate the key for the chart based on language preference
    const label = getMinistryLabel(curr.ministry, language);
    const currentVal = acc[label] || 0;
    acc[label] = currentVal + (curr.amount || 0);
    return acc;
  }, {});

  const barChartData = (Object.entries(ministryTotals) as [string, number][])
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 only

  const handleExport = () => {
    downloadCSV(filteredRecords, `govwatch_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12">
      
      {/* Header with Refresh & Last Updated */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Data Note */}
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-lg w-full md:w-auto">
             <Info className="w-4 h-4 text-blue-400 shrink-0" />
             <span className="text-xs md:text-sm text-blue-200 font-medium leading-tight">
                {t.lbl_data_period}
             </span>
        </div>

        <div className="flex flex-col md:flex-row items-end md:items-center gap-4 w-full md:w-auto">
            {/* Last Updated Badge */}
             <div className="flex items-center gap-2 text-xs text-gw-muted bg-gw-card px-3 py-2 rounded-lg border border-gw-border w-full md:w-auto justify-center md:justify-start">
                <Clock className="w-3 h-3" />
                {t.lbl_updated}: {displayDateStr}
             </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard label={t.kpi_total_value} value={formatMoney(totalSpend, language)} />
        <StatCard label={t.kpi_works} value={formatMoney(worksSpend, language)} isAlert />
        <StatCard label={t.kpi_supplies} value={formatMoney(suppliesSpend + servicesSpend, language)} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
         {/* Bar Chart (Horizontal) */}
         <div className="lg:col-span-2 bg-gw-card border border-gw-border rounded-lg p-4 md:p-6 flex flex-col h-[400px] md:h-auto">
            <h3 className="text-lg font-bold mb-4 text-white">{t.chart_top_ministries}</h3>
            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={isMobile ? 100 : 180} 
                            tick={{ fill: '#e5e7ef', fontSize: isMobile ? 9 : 10, width: isMobile ? 90 : 170 }}
                            interval={0}
                        />
                        <Tooltip cursor={{fill: '#223055'}} content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {barChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#ffadad' : '#36d399'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* Pie Chart */}
         <div className="bg-gw-card border border-gw-border rounded-lg p-4 md:p-6 flex flex-col h-[350px] md:h-auto">
            <h3 className="text-lg font-bold mb-4 text-white">{t.chart_categories}</h3>
            <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={isMobile ? 40 : 60}
                            outerRadius={isMobile ? 60 : 80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Table Section */}
      <div className="flex flex-col gap-2">
          {/* Source Disclaimer */}
          <div className="flex justify-end px-2">
            <p className="text-xs text-gw-muted italic">
                {language === 'ms' ? 'Data diambil dan diurai daripada laman web ' : 'Data is taken and parsed from the '}
                <a href="https://myprocurement.treasury.gov.my/" target="_blank" rel="noreferrer" className="text-gw-success hover:underline">MyProcurement</a>
                {language === 'ms' ? '.' : ' website.'}
            </p>
          </div>
          
          <div className="bg-gw-card border border-gw-border rounded-lg overflow-hidden flex flex-col">
              {/* Table Controls */}
              <div className="p-4 border-b border-gw-border flex flex-col xl:flex-row justify-between items-center gap-4 bg-gw-bg/30">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mr-2 shrink-0">
                        <FileText className="w-5 h-5" /> {t.table_recent_awards}
                    </h2>
                    <div className="grid grid-cols-2 md:flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Sort Dropdown */}
                        <div className="flex items-center bg-gw-bg border border-gw-border rounded px-2 py-1 col-span-1">
                            <ArrowUpDown className="w-4 h-4 text-gw-muted mr-1 md:mr-2" />
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-transparent text-xs md:text-sm text-gw-text focus:outline-none w-full"
                            >
                                <option value="date">{t.val_newest}</option>
                                <option value="value">{t.val_highest}</option>
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center bg-gw-bg border border-gw-border rounded px-2 py-1 col-span-1">
                            <Filter className="w-4 h-4 text-gw-muted mr-1 md:mr-2" />
                            <select 
                                value={filterCategory} 
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="bg-transparent text-xs md:text-sm text-gw-text focus:outline-none w-full"
                            >
                                <option value="All">{t.opt_all_cat}</option>
                                <option value="Kerja">{t.opt_works}</option>
                                <option value="Bekalan">{t.opt_supplies}</option>
                                <option value="Perkhidmatan">{t.opt_services}</option>
                            </select>
                        </div>

                        {/* Method Filter */}
                        <div className="flex items-center bg-gw-bg border border-gw-border rounded px-2 py-1 col-span-2 md:col-auto">
                            <Briefcase className="w-4 h-4 text-gw-muted mr-1 md:mr-2" />
                            <select 
                                value={filterMethod} 
                                onChange={(e) => setFilterMethod(e.target.value)}
                                className="bg-transparent text-xs md:text-sm text-gw-text focus:outline-none w-full"
                            >
                                <option value="All">{t.opt_all_methods}</option>
                                <option value="Open Tender">{t.val_open_tender}</option>
                                <option value="Direct Negotiation">{t.val_direct_nego}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
                        <input 
                            type="text" 
                            placeholder={t.search_placeholder}
                            className="w-full bg-gw-bg border border-gw-border text-sm rounded-full pl-10 pr-4 py-2 text-gw-text focus:outline-none focus:border-gw-success"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button 
                      onClick={handleExport}
                      title="Download CSV"
                      className="p-2 bg-gw-bg border border-gw-border rounded-full text-gw-success hover:bg-gw-success/10 transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gw-bg/95">
                    <tr>
                      <th className="px-4 md:px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider">{t.th_date}</th>
                      <th className="px-4 md:px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider max-w-[150px]">{t.th_ministry}</th>
                      <th className="px-4 md:px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider max-w-[150px]">{t.th_vendor}</th>
                      <th className="px-4 md:px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider text-right">{t.th_value}</th>
                      <th className="px-4 md:px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider text-right hidden sm:table-cell">{t.th_details}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gw-border">
                    {paginatedRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-gw-bg/50 transition-colors group">
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gw-muted font-mono text-xs">{r.date}</td>
                        <td className="px-4 md:px-6 py-4">
                          <button 
                            onClick={() => onMinistryClick(r.ministry)}
                            className="text-white hover:text-gw-success font-medium flex flex-col items-start transition-colors text-left"
                          >
                            <span className="line-clamp-2 md:line-clamp-1 max-w-[120px] md:max-w-[250px] font-bold text-xs md:text-sm" title={r.ministry}>
                                {getMinistryLabel(r.ministry, language)}
                            </span>
                            {r.title && <span className="text-[10px] text-gw-muted/70 mt-1 line-clamp-1 max-w-[120px] md:max-w-[250px] italic hidden sm:inline">{r.title}</span>}
                          </button>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <button
                            onClick={() => onVendorClick(r.vendor)}
                            className="text-gw-muted hover:text-white transition-colors text-left truncate max-w-[100px] md:max-w-[200px] flex items-center gap-1 group-vendor text-xs md:text-sm"
                            title={r.vendor}
                          >
                            <span className="truncate">{r.vendor}</span>
                          </button>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right font-bold text-gw-text font-mono text-xs md:text-sm">{formatMoney(r.amount, language)}</td>
                        <td className="px-4 md:px-6 py-4 text-right whitespace-nowrap flex-col gap-1 items-end justify-center h-full hidden sm:flex">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                             (r.method || '').toLowerCase().includes('direct') || (r.method || '').toLowerCase().includes('rundingan')
                             ? 'bg-gw-danger/10 text-gw-danger border-gw-danger/20'
                             : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                          }`}>
                             {(r.method || '').toLowerCase().includes('direct') || (r.method || '').toLowerCase().includes('rundingan') ? t.val_direct_nego : t.val_open_tender}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] text-gw-muted border border-gw-border`}>
                            {r.category || 'General'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gw-muted italic">{t.tbl_no_results}</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="p-4 border-t border-gw-border bg-gw-bg/30 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="text-xs text-gw-muted text-center md:text-left">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredRecords.length)} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} results
                 </div>
                 
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 md:p-1 rounded bg-gw-bg border border-gw-border text-gw-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                    <span className="text-xs text-gw-text font-mono px-2">
                        Page {currentPage} of {Math.max(1, totalPages)}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 md:p-1 rounded bg-gw-bg border border-gw-border text-gw-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                 </div>
              </div>
          </div>
      </div>
    </div>
  );
};