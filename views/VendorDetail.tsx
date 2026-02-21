import React from 'react';
import { Record } from '../types';
import { formatMoney, getMinistryLabel } from '../utils';
import { ArrowLeft, Store, Calendar, CreditCard, FileWarning, Link as LinkIcon, Building2 } from 'lucide-react';
import { useLanguage } from '../i18n';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface VendorDetailProps {
  vendorName: string;
  records: Record[];
  onBack: () => void;
  onMinistryClick: (name: string) => void;
}

const CustomTooltip = ({ active, payload, label, language }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gw-card border border-gw-border p-3 rounded shadow-xl z-50">
        <p className="text-gw-text font-bold text-sm mb-1">{payload[0].name}</p>
        <p className="text-gw-success text-sm font-mono">{formatMoney(payload[0].value as number, language)}</p>
      </div>
    );
  }
  return null;
};

export const VendorDetail: React.FC<VendorDetailProps> = ({ vendorName, records, onBack, onMinistryClick }) => {
  const { t, language } = useLanguage();
  const filteredRecords = records.filter(r => r.vendor === vendorName).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalSpend = filteredRecords.reduce((acc, r) => acc + r.amount, 0);

  // Analysis: Ministries Served
  const ministryStats = filteredRecords.reduce((acc, r) => {
    const label = getMinistryLabel(r.ministry, language);
    acc[label] = (acc[label] || 0) + r.amount;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = (Object.entries(ministryStats) as [string, number][])
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#36d399', '#ffadad', '#8da2ce', '#fcd34d', '#a78bfa'];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <button 
        onClick={onBack}
        className="flex items-center text-gw-muted hover:text-gw-text transition-colors mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        {t.det_back}
      </button>

      {/* HEADER CARD */}
      <div className="bg-gw-card border border-gw-border rounded-lg p-5 md:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gw-bg rounded border border-gw-border">
                        <Store className="w-6 h-6 text-gw-muted" />
                    </div>
                    <span className="text-gw-muted uppercase tracking-wider text-sm font-semibold">{t.det_vendor_profile}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white break-words leading-tight">{vendorName}</h1>
            </div>
            <div className="text-left md:text-right">
                <div className="text-sm text-gw-muted mb-1">{t.kpi_total_value}</div>
                <div className="text-3xl font-bold text-gw-success">{formatMoney(totalSpend, language)}</div>
                <div className="text-xs text-gw-muted mt-1">{filteredRecords.length} {t.min_contracts}</div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CHART */}
          <div className="bg-gw-card border border-gw-border rounded-lg p-5 md:p-6 flex flex-col min-h-[300px]">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <Building2 className="w-5 h-5 text-gw-muted" /> {t.det_ministries_served}
             </h3>
             <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip language={language} />} />
                    </PieChart>
                 </ResponsiveContainer>
             </div>
             <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                 {chartData.map((item, index) => (
                     <div key={index} className="flex justify-between items-center text-xs">
                         <span className="flex items-center gap-2 text-gw-text truncate max-w-[70%]">
                             <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                             <span className="truncate">{item.name}</span>
                         </span>
                         <span className="font-mono text-gw-muted whitespace-nowrap ml-2">{formatMoney(item.value, language)}</span>
                     </div>
                 ))}
             </div>
          </div>

          {/* LIST */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-white">{t.det_contract_history}</h3>
            {filteredRecords.map((r) => (
                <div key={r.id} className="bg-gw-card border border-gw-border rounded-lg p-4 md:p-5 hover:border-gw-muted/50 transition-colors relative">
                    {(r.contractUrl || r.sourceUrl) && (
                        <a 
                            href={r.contractUrl || r.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            title={r.contractUrl ? "View Contract Details" : "Verify Source"}
                            className="absolute top-4 right-4 text-gw-muted hover:text-gw-success transition-colors"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </a>
                    )}
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-2 pr-8">
                         <button 
                            onClick={() => onMinistryClick(r.ministry)}
                            className="text-white font-bold hover:text-blue-400 transition-colors text-left text-base md:text-lg block"
                         >
                            {getMinistryLabel(r.ministry, language)}
                         </button>
                         <div className={`text-lg font-bold whitespace-nowrap ${r.method.toLowerCase().includes('rundingan') || r.method.toLowerCase().includes('direct') ? 'text-gw-danger' : 'text-gw-success'}`}>
                            {formatMoney(r.amount, language)}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gw-muted mb-3">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {r.date}
                        </span>
                        <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> {(r.method.toLowerCase().includes('direct') || r.method.toLowerCase().includes('rundingan')) ? t.val_direct_nego : t.val_open_tender}
                        </span>
                    </div>

                    {r.title && <div className="text-xs md:text-sm text-gw-text mb-2 italic">"{r.title}"</div>}
                    
                    {r.reason && (
                        <div className="bg-gw-danger/5 rounded p-3 text-sm text-gw-text border border-gw-danger/20 flex gap-2 items-start mt-2">
                             <FileWarning className="w-4 h-4 text-gw-danger shrink-0 mt-0.5" />
                             <div>
                                <span className="text-gw-danger font-semibold uppercase text-xs tracking-wide block mb-1">{t.det_justification}</span>
                                {r.reason}
                             </div>
                        </div>
                    )}
                </div>
            ))}
          </div>
      </div>
    </div>
  );
};