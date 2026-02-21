import React, { useState } from 'react';
import { Record as ProcurementRecord } from '../types';
import { formatMoney, getMinistryLabel } from '../utils';
import { Building2, ChevronRight, Search } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MinistryListProps {
  records: ProcurementRecord[];
  onSelectMinistry: (name: string) => void;
}

export const MinistryList: React.FC<MinistryListProps> = ({ records, onSelectMinistry }) => {
  const { t, language } = useLanguage();
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

  const sortedMinistries = (Object.entries(ministryStats) as [string, typeof ministryStats[string]][])
    .map(([name, stats]) => ({ 
        name, // The raw malay name (for ID)
        displayName: getMinistryLabel(name, language), // For display
        ...stats 
    }))
    .sort((a, b) => b.value - a.value)
    .filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
            <Building2 className="w-8 h-8 text-gw-success" />
            {t.min_title}
          </h1>
          <p className="text-gw-muted mt-1">{t.min_subtitle}</p>
        </div>
        <div className="relative w-full md:w-auto">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
             <input 
                type="text" 
                placeholder={t.min_search}
                className="bg-gw-card border border-gw-border rounded-full pl-10 pr-4 py-2 text-sm text-gw-text focus:border-gw-success focus:outline-none w-full md:w-64 shadow-sm"
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
              <h3 className="font-bold text-white line-clamp-2 mb-1 group-hover:text-gw-success transition-colors">
                {m.displayName}
              </h3>
              <p className="text-xs text-gw-muted/70 uppercase tracking-wider mb-2 line-clamp-1">{m.name}</p>
              
              <div className="flex items-center gap-2 text-xs text-gw-muted">
                 <span className="px-2 py-1 bg-gw-bg rounded border border-gw-border">{m.count} {t.min_contracts}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gw-border flex justify-between items-end">
                <div>
                    <span className="text-xs text-gw-muted uppercase tracking-wider">{t.min_total_spend}</span>
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