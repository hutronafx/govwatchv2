import React, { useState } from 'react';
import { Record as ProcurementRecord } from '../types';
import { formatMoney } from '../utils';
import { Building2, ChevronRight, Search } from 'lucide-react';

interface MinistryListProps {
  records: ProcurementRecord[];
  onSelectMinistry: (name: string) => void;
}

export const MinistryList: React.FC<MinistryListProps> = ({ records, onSelectMinistry }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Aggregate Data
  const ministryStats = records.reduce((acc, curr) => {
    const name = curr.ministry;
    if (!acc[name]) {
      acc[name] = { count: 0, value: 0 };
    }
    acc[name].count += 1;
    acc[name].value += curr.amount;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const sortedMinistries = Object.entries(ministryStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.value - a.value)
    .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-8 h-8 text-gw-success" />
            Ministries & Agencies
          </h1>
          <p className="text-gw-muted mt-1">Breakdown of spending by government body.</p>
        </div>
        <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
             <input 
                type="text" 
                placeholder="Find a ministry..." 
                className="bg-gw-card border border-gw-border rounded-full pl-10 pr-4 py-2 text-sm text-gw-text focus:border-gw-success focus:outline-none w-64 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMinistries.map((m) => (
          <div 
            key={m.name}
            onClick={() => onSelectMinistry(m.name)}
            className="bg-gw-card border border-gw-border rounded-lg p-5 hover:border-gw-success/50 hover:bg-gw-card/80 transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <h3 className="font-bold text-white line-clamp-2 mb-2 group-hover:text-gw-success transition-colors">{m.name}</h3>
              <div className="flex items-center gap-2 text-xs text-gw-muted">
                 <span className="px-2 py-1 bg-gw-bg rounded border border-gw-border">{m.count} Contracts</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gw-border flex justify-between items-end">
                <div>
                    <span className="text-xs text-gw-muted uppercase tracking-wider">Total Spend</span>
                    <div className="text-lg font-bold text-white">{formatMoney(m.value)}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gw-muted group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};