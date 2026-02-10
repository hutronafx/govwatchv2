import React from 'react';
import { Record } from '../types';
import { formatMoney, translateMinistry } from '../utils';
import { ArrowLeft, Building2, Calendar, CreditCard, FileWarning, AlertTriangle, PieChart as PieChartIcon, Link as LinkIcon } from 'lucide-react';

interface MinistryDetailProps {
  ministryName: string;
  records: Record[];
  onBack: () => void;
}

export const MinistryDetail: React.FC<MinistryDetailProps> = ({ ministryName, records, onBack }) => {
  const filteredRecords = records.filter(r => r.ministry === ministryName).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalSpend = filteredRecords.reduce((acc, r) => acc + r.amount, 0);

  // --- ANALYSIS LOGIC ---

  // 1. Procurement Method Analysis (Integrity Indicator)
  const methodStats = filteredRecords.reduce((acc, r) => {
    // Basic heuristic: check string for "Rundingan Terus" (Direct Negotiation)
    const isDirect = r.method.toLowerCase().includes('rundingan') || r.method.toLowerCase().includes('direct');
    if (isDirect) {
        acc.directCount += 1;
        acc.directValue += r.amount;
    } else {
        acc.openCount += 1;
        acc.openValue += r.amount;
    }
    return acc;
  }, { directCount: 0, directValue: 0, openCount: 0, openValue: 0 });

  const totalCount = methodStats.directCount + methodStats.openCount;
  const directPercent = totalCount > 0 ? (methodStats.directCount / totalCount) * 100 : 0;
  
  // 2. Vendor Concentration (Market Dominance)
  const vendorStats = filteredRecords.reduce((acc, r) => {
    acc[r.vendor] = (acc[r.vendor] || 0) + r.amount;
    return acc;
  }, {} as { [key: string]: number });

  // Fix: Cast Object.entries to ensure values are numbers, avoiding arithmetic on 'unknown'
  const topVendors = (Object.entries(vendorStats) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({
        name,
        value,
        percent: (value / totalSpend) * 100
    }));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <button 
        onClick={onBack}
        className="flex items-center text-gw-muted hover:text-gw-text transition-colors mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      {/* HEADER CARD */}
      <div className="bg-gw-card border border-gw-border rounded-lg p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gw-bg rounded border border-gw-border">
                        <Building2 className="w-6 h-6 text-gw-muted" />
                    </div>
                    <span className="text-gw-muted uppercase tracking-wider text-sm font-semibold">Ministry Profile</span>
                </div>
                <h1 className="text-3xl font-bold text-white">{translateMinistry(ministryName)}</h1>
                <p className="text-gw-muted text-sm mt-1">{ministryName}</p>
            </div>
            <div className="text-left md:text-right">
                <div className="text-sm text-gw-muted mb-1">Total Contract Value</div>
                <div className="text-3xl font-bold text-gw-success">{formatMoney(totalSpend)}</div>
                <div className="text-xs text-gw-muted mt-1">{filteredRecords.length} Total Contracts</div>
            </div>
        </div>
      </div>

      {/* ANALYTICS ROW (OpenTender Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. INTEGRITY / RISK PROFILE */}
          <div className="bg-gw-card border border-gw-border rounded-lg p-6">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gw-danger" />
                    Procurement Integrity
                </h3>
             </div>
             
             <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gw-muted">Method Breakdown (by count)</span>
                        <span className={`font-bold ${directPercent > 20 ? 'text-gw-danger' : 'text-gw-success'}`}>
                            {directPercent.toFixed(1)}% Direct Negotiation
                        </span>
                    </div>
                    {/* Visual Bar */}
                    <div className="h-4 w-full bg-gw-bg rounded-full overflow-hidden flex border border-gw-border">
                        <div 
                            className="h-full bg-gw-danger transition-all duration-500" 
                            style={{ width: `${directPercent}%` }}
                            title="Direct Negotiation"
                        ></div>
                        <div 
                            className="h-full bg-gw-success transition-all duration-500" 
                            style={{ width: `${100 - directPercent}%` }}
                            title="Open Tender / Quotation"
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gw-muted mt-2">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gw-danger"></div> Direct ({methodStats.directCount})</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gw-success"></div> Open/Quote ({methodStats.openCount})</span>
                    </div>
                </div>

                <div className="bg-gw-bg/50 p-4 rounded border border-gw-border">
                    <h4 className="text-xs font-bold text-gw-muted uppercase mb-2">Risk Analysis</h4>
                    <p className="text-sm text-gw-text">
                        {directPercent > 30 
                            ? "High risk of limited competition. A significant portion of contracts are awarded via Direct Negotiation."
                            : "Healthy procurement mix. Most contracts appear to be competitive."}
                    </p>
                </div>
             </div>
          </div>

          {/* 2. MARKET CONCENTRATION (TOP VENDORS) */}
          <div className="bg-gw-card border border-gw-border rounded-lg p-6">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-blue-400" />
                    Vendor Dominance
                </h3>
             </div>

             <div className="space-y-4">
                 {topVendors.map((v, i) => (
                     <div key={i} className="group">
                         <div className="flex justify-between items-center text-sm mb-1">
                             <span className="truncate max-w-[200px] text-white group-hover:text-blue-400 transition-colors" title={v.name}>
                                 {i+1}. {v.name}
                             </span>
                             <span className="font-mono text-gw-muted">{formatMoney(v.value)}</span>
                         </div>
                         <div className="w-full bg-gw-bg rounded-full h-1.5">
                             <div 
                                className="bg-blue-500 h-1.5 rounded-full" 
                                style={{ width: `${v.percent}%` }}
                             ></div>
                         </div>
                         <div className="text-[10px] text-right text-gw-muted mt-0.5">
                             {v.percent.toFixed(1)}% of total spend
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      </div>

      {/* DETAILED LIST */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Contract History</h3>
        <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((r) => (
                <div key={r.id} className="bg-gw-card border border-gw-border rounded-lg p-5 hover:border-gw-muted/50 transition-colors relative">
                    {r.sourceUrl && (
                        <a 
                            href={r.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            title="Verify Source"
                            className="absolute top-4 right-4 text-gw-muted hover:text-gw-success transition-colors"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </a>
                    )}
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4 pr-8">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{r.vendor}</h3>
                            <div className="flex items-center gap-4 text-sm text-gw-muted">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {r.date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> {r.method}
                                </span>
                            </div>
                        </div>
                        <div className={`text-xl font-bold ${r.method.toLowerCase().includes('rundingan') || r.method.toLowerCase().includes('direct') ? 'text-gw-danger' : 'text-gw-success'}`}>
                            {formatMoney(r.amount)}
                        </div>
                    </div>
                    
                    {r.reason ? (
                        <div className="bg-gw-danger/5 rounded p-3 text-sm text-gw-text border border-gw-danger/20 flex gap-2 items-start">
                             <FileWarning className="w-4 h-4 text-gw-danger shrink-0 mt-0.5" />
                             <div>
                                <span className="text-gw-danger font-semibold uppercase text-xs tracking-wide block mb-1">Direct Negotiation Justification</span>
                                {r.reason}
                             </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gw-muted italic opacity-50">Standard procurement via open tender process.</div>
                    )}
                    
                    {r.crawledAt && (
                        <div className="mt-2 pt-2 border-t border-gw-border/50 text-[10px] text-gw-muted/50">
                            Verified on: {new Date(r.crawledAt).toLocaleString()}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};