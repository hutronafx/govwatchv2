import React, { useState, useMemo } from 'react';
import { Record as ProcurementRecord } from '../types';
import { StatCard } from '../components/StatCard';
import { formatMoney, translateMinistry, downloadCSV } from '../utils';
import { ArrowUpRight, Search, FileText, RefreshCw, Filter, ArrowUpDown, Download, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface DashboardProps {
  records: ProcurementRecord[];
  isLoading?: boolean;
  onMinistryClick: (name: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gw-card border border-gw-border p-3 rounded shadow-xl z-50">
        <p className="text-gw-text font-bold text-sm mb-1">{payload[0].name || label}</p>
        <p className="text-gw-success text-sm font-mono">{formatMoney(payload[0].value as number)}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ records, isLoading, onMinistryClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // LOADING
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn">
            <RefreshCw className="w-10 h-10 text-gw-success animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Loading Dashboard...</h2>
        </div>
    );
  }

  // EMPTY
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn p-4">
        <div className="bg-gw-card border border-gw-border rounded-full p-6 mb-6">
          <FileText className="w-12 h-12 text-gw-muted" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Records Available</h2>
        <p className="text-gw-muted max-w-md mb-8">
          The database is currently empty. Please update data via the Admin Panel.
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
  const lastCrawlDate = records
    .map(r => r.crawledAt || '')
    .filter(d => d)
    .sort()
    .pop();

  // --- CHART DATA ---
  
  // 1. Pie Chart (Category Distribution)
  const categoryData = [
    { name: 'Works (Kerja)', value: worksSpend, color: '#ffadad' }, 
    { name: 'Supplies (Bekalan)', value: suppliesSpend, color: '#36d399' }, 
    { name: 'Services (Perkhidmatan)', value: servicesSpend, color: '#8da2ce' }, 
  ].filter(d => d.value > 0);

  // 2. Bar Chart (Top Ministries)
  const ministryTotals = records.reduce((acc: { [key: string]: number }, curr) => {
    if (!curr.ministry) return acc;
    // Translate the key for the chart
    const englishName = translateMinistry(curr.ministry);
    const currentVal = acc[englishName] || 0;
    acc[englishName] = currentVal + (curr.amount || 0);
    return acc;
  }, {});

  const barChartData = (Object.entries(ministryTotals) as [string, number][])
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 only

  // --- TABLE FILTERING ---
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const ministryRaw = (r.ministry || '').toLowerCase();
      const ministryEn = translateMinistry(r.ministry).toLowerCase();
      const vendor = (r.vendor || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      // Search matches either raw Malay name, Translated English name, or Vendor
      const matchesSearch = ministryRaw.includes(search) || ministryEn.includes(search) || vendor.includes(search);
      
      const matchesCategory = filterCategory === 'All' || (r.category || '').includes(filterCategory);

      return matchesSearch && matchesCategory;
    }).sort((a,b) => {
      // Fix: Ensure numeric arithmetic for sorting
      if (sortBy === 'value') return (b.amount || 0) - (a.amount || 0);
      // Default date sort
      return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
    });
  }, [records, searchTerm, filterCategory, sortBy]);

  const handleExport = () => {
    downloadCSV(filteredRecords, `govwatch_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header with Last Updated */}
      <div className="flex justify-end">
        {lastCrawlDate && (
             <div className="flex items-center gap-2 text-xs text-gw-muted bg-gw-card px-3 py-1 rounded-full border border-gw-border">
                <Clock className="w-3 h-3" />
                Data Last Updated: {new Date(lastCrawlDate).toLocaleDateString()}
             </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Contract Value" value={formatMoney(totalSpend)} />
        <StatCard label="Works & Construction" value={formatMoney(worksSpend)} isAlert />
        <StatCard label="Supplies & Services" value={formatMoney(suppliesSpend + servicesSpend)} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
         {/* Bar Chart (Horizontal) */}
         <div className="lg:col-span-2 bg-gw-card border border-gw-border rounded-lg p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-white">Top Spending Ministries</h3>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={180} 
                            tick={{ fill: '#e5e7ef', fontSize: 10, width: 170 }}
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
         <div className="bg-gw-card border border-gw-border rounded-lg p-6 flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-white">Category Breakdown</h3>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
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
      <div className="bg-gw-card border border-gw-border rounded-lg overflow-hidden flex flex-col">
          {/* Table Controls */}
          <div className="p-4 border-b border-gw-border flex flex-col md:flex-row justify-between items-center gap-4 bg-gw-bg/30">
            <div className="flex items-center gap-2 w-full md:w-auto">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2 mr-4">
                    <FileText className="w-5 h-5" /> Recent Awards
                 </h2>
                 {/* Sort Dropdown */}
                 <div className="flex items-center bg-gw-bg border border-gw-border rounded px-2 py-1">
                    <ArrowUpDown className="w-4 h-4 text-gw-muted mr-2" />
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-sm text-gw-text focus:outline-none"
                    >
                        <option value="date">Newest First</option>
                        <option value="value">Highest Value</option>
                    </select>
                 </div>
                 {/* Filter Dropdown */}
                 <div className="flex items-center bg-gw-bg border border-gw-border rounded px-2 py-1 ml-2">
                    <Filter className="w-4 h-4 text-gw-muted mr-2" />
                    <select 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-transparent text-sm text-gw-text focus:outline-none"
                    >
                        <option value="All">All Categories</option>
                        <option value="Kerja">Works (Kerja)</option>
                        <option value="Bekalan">Supplies (Bekalan)</option>
                        <option value="Perkhidmatan">Services (Perkhidmatan)</option>
                    </select>
                 </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
                    <input 
                        type="text" 
                        placeholder="Search records..." 
                        className="w-full bg-gw-bg border border-gw-border text-sm rounded-full pl-10 pr-4 py-2 text-gw-text focus:outline-none focus:border-gw-success"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <button 
                  onClick={handleExport}
                  title="Download CSV"
                  className="p-2 bg-gw-bg border border-gw-border rounded-full text-gw-success hover:bg-gw-success/10 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gw-bg/95">
                <tr>
                  <th className="px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider">Date</th>
                  <th className="px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider">Ministry</th>
                  <th className="px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider">Vendor</th>
                  <th className="px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider text-right">Value</th>
                  <th className="px-6 py-4 font-bold text-gw-muted uppercase text-xs tracking-wider text-right">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gw-border">
                {filteredRecords.slice(0, 50).map((r) => (
                  <tr key={r.id} className="hover:bg-gw-bg/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gw-muted font-mono text-xs">{r.date}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onMinistryClick(r.ministry)}
                        className="text-white hover:text-gw-success font-medium flex flex-col items-start transition-colors text-left"
                      >
                        <span className="line-clamp-1 max-w-[250px] font-bold" title={r.ministry}>
                            {translateMinistry(r.ministry)}
                        </span>
                        <span className="text-[10px] text-gw-muted flex items-center gap-1">
                            {r.ministry} 
                            <ArrowUpRight className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gw-muted truncate max-w-[200px]" title={r.vendor}>{r.vendor}</td>
                    <td className="px-6 py-4 text-right font-bold text-gw-text font-mono">{formatMoney(r.amount)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (r.category || '').toLowerCase().includes('kerja')
                          ? 'bg-gw-danger/10 text-gw-danger border border-gw-danger/20'
                          : 'bg-gw-success/10 text-gw-success border border-gw-success/20'
                      }`}>
                        {r.category || 'General'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-8 text-gw-muted italic">No records found matching your filters.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gw-border bg-gw-bg/30 text-center text-xs text-gw-muted">
            Showing top {Math.min(filteredRecords.length, 50)} recent results
          </div>
      </div>
    </div>
  );
};