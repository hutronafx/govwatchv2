import React, { useState } from 'react';
import { Record as ProcurementRecord } from '../types';
import { formatMoney } from '../utils';
import { Store, Search, Filter, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n';

interface VendorListProps {
  records: ProcurementRecord[];
  onSelectVendor?: (name: string) => void;
}

export const VendorList: React.FC<VendorListProps> = ({ records, onSelectVendor }) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  // Aggregate Data
  const vendorStats = records.reduce((acc, curr) => {
    const name = curr.vendor;
    if (!acc[name]) {
      acc[name] = { count: 0, value: 0, ministries: new Set<string>() };
    }
    acc[name].count += 1;
    acc[name].value += curr.amount;
    acc[name].ministries.add(curr.ministry);
    return acc;
  }, {} as Record<string, { count: number; value: number; ministries: Set<string> }>);

  const sortedVendors = (Object.entries(vendorStats) as [string, typeof vendorStats[string]][])
    .map(([name, stats]) => ({ 
        name, 
        count: stats.count, 
        value: stats.value, 
        ministryCount: stats.ministries.size 
    }))
    .sort((a, b) => b.value - a.value)
    .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Store className="w-8 h-8 text-gw-success" />
            {t.ven_title}
          </h1>
          <p className="text-gw-muted mt-1">{t.ven_subtitle}</p>
        </div>
        <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
             <input 
                type="text" 
                placeholder={t.ven_search}
                className="bg-gw-card border border-gw-border rounded-full pl-10 pr-4 py-2 text-sm text-gw-text focus:border-gw-success focus:outline-none w-64 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
        </div>
      </div>

      <div className="bg-gw-card border border-gw-border rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gw-bg/50 border-b border-gw-border">
                    <tr>
                        <th className="px-6 py-4 font-bold text-gw-text uppercase text-xs tracking-wider">{t.th_company_name}</th>
                        <th className="px-6 py-4 font-bold text-gw-text uppercase text-xs tracking-wider text-center">{t.ven_contracts_won}</th>
                        <th className="px-6 py-4 font-bold text-gw-text uppercase text-xs tracking-wider text-center">{t.ven_ministries_served}</th>
                        <th className="px-6 py-4 font-bold text-gw-text uppercase text-xs tracking-wider text-right">{t.ven_total_value}</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gw-border">
                    {sortedVendors.map((v, i) => (
                        <tr 
                            key={v.name} 
                            onClick={() => onSelectVendor && onSelectVendor(v.name)}
                            className="hover:bg-gw-bg/30 transition-colors cursor-pointer group"
                        >
                            <td className="px-6 py-4">
                                <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{v.name}</div>
                                <div className="text-xs text-gw-muted hidden sm:block">{t.ven_rank} #{i + 1}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 rounded bg-gw-bg border border-gw-border text-gw-text text-xs font-mono">
                                    {v.count}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center text-gw-muted">{v.ministryCount}</td>
                            <td className="px-6 py-4 text-right font-bold text-gw-success font-mono">{formatMoney(v.value, language)}</td>
                            <td className="px-6 py-4 text-center">
                                <ChevronRight className="w-4 h-4 text-gw-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </td>
                        </tr>
                    ))}
                    {sortedVendors.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gw-muted italic">
                                {t.msg_no_vendors}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};