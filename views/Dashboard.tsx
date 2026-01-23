import React, { useState } from 'react';
import { Record as ProcurementRecord } from '../types';
import { StatCard } from '../components/StatCard';
import { formatMoney } from '../utils';
import { ArrowUpRight, Search, FileText, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  records: ProcurementRecord[];
  isLoading?: boolean;
  onMinistryClick: (name: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gw-card border border-gw-border p-3 rounded shadow-xl">
        <p className="text-gw-text font-bold text-sm">{label}</p>
        <p className="text-gw-success text-sm">{formatMoney(payload[0].value as number)}</p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ records, isLoading, onMinistryClick }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // LOADING STATE
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn">
            <RefreshCw className="w-10 h-10 text-gw-success animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Connecting to Database...</h2>
        </div>
    );
  }

  // EMPTY STATE HANDLER
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn p-4">
        <div className="bg-gw-card border border-gw-border rounded-full p-6 mb-6">
          <FileText className="w-12 h-12 text-gw-muted" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Records Available</h2>
        <p className="text-gw-muted max-w-md mb-8">
          The public procurement database is currently being updated. Please check back later.
        </p>
      </div>
    );
  }
  
  const filteredRecords = records.filter(r => 
    r.ministry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeB - timeA;
  });

  const totalSpend = records.reduce((acc, r) => acc + r.amount, 0);
  const directSpend = records
    .filter(r => r.method.toLowerCase().includes('direct'))
    .reduce((acc, r) => acc + r.amount, 0);
  const share = totalSpend ? (directSpend / totalSpend * 100) : 0;

  // Aggregate data for chart
  const ministryTotals = records.reduce((acc: { [key: string]: number }, curr) => {
    let shortName = curr.ministry.split('(')[1]?.replace(')', '') || curr.ministry.substring(0, 10);
    const currentTotal = acc[shortName] || 0;
    acc[shortName] = currentTotal + curr.amount;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.entries(ministryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); 

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Tracked Value" value={formatMoney(totalSpend)} />
        <StatCard label="Direct Negotiation" value={formatMoney(directSpend)} isAlert />
        <StatCard 
          label="Risk Share" 
          value={
            <div className="flex items-center gap-2">
              {share.toFixed(1)}%
              <span className="text-xs font-normal text-gw-muted bg-gw-bg px-2 py-1 rounded-full border border-gw-border">
                of total spend
              </span>
            </div>
          } 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* All Records Table */}
        <div className="lg:col-span-2 bg-gw-card border border-gw-border rounded-lg overflow-hidden flex flex-col max-h-[800px]">
          <div className="p-6 border-b border-gw-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Procurement Records
                </h2>
                <span className="text-xs text-gw-success flex items-center gap-1 mt-1">
                    <RefreshCw className="w-3 h-3" /> Live Data
                </span>
            </div>
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
                <input 
                    type="text" 
                    placeholder="Search ministry or vendor..." 
                    className="bg-gw-bg border border-gw-border text-sm rounded-full pl-10 pr-4 py-2 text-gw-text focus:outline-none focus:border-gw-success w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-gw-bg/95 sticky top-0 z-10 backdrop-blur">
                <tr>
                  <th className="px-6 py-4 font-medium text-gw-muted uppercase text-xs tracking-wider">Date</th>
                  <th className="px-6 py-4 font-medium text-gw-muted uppercase text-xs tracking-wider">Ministry</th>
                  <th className="px-6 py-4 font-medium text-gw-muted uppercase text-xs tracking-wider">Vendor</th>
                  <th className="px-6 py-4 font-medium text-gw-muted uppercase text-xs tracking-wider text-right">Value</th>
                  <th className="px-6 py-4 font-medium text-gw-muted uppercase text-xs tracking-wider text-right">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gw-border">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gw-bg/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gw-muted font-mono text-xs">{r.date}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onMinistryClick(r.ministry)}
                        className="text-gw-text hover:text-gw-success font-medium flex items-center gap-1 transition-colors text-left"
                      >
                        <span className="line-clamp-1" title={r.ministry}>{r.ministry}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gw-muted truncate max-w-[150px]" title={r.vendor}>{r.vendor}</td>
                    <td className="px-6 py-4 text-right font-medium text-gw-text font-mono">{formatMoney(r.amount)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.method.toLowerCase().includes('direct')
                          ? 'bg-gw-danger/10 text-gw-danger border border-gw-danger/20'
                          : 'bg-gw-success/10 text-gw-success border border-gw-success/20'
                      }`}>
                        {r.method === "Direct Negotiation" ? "Direct Neg." : "Open Tender"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini Chart */}
        <div className="bg-gw-card border border-gw-border rounded-lg p-6 flex flex-col">
          <h3 className="text-lg font-bold mb-6 text-white">Top 10 Spenders</h3>
          <div className="flex-1 min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={60} 
                  tick={{ fill: '#8da2ce', fontSize: 10 }}
                  interval={0}
                />
                <Tooltip cursor={{fill: '#223055'}} content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#ffadad' : '#36d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};