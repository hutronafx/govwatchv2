import React from 'react';
import { Record } from '../types';
import { formatMoney, getMinistryLabel } from '../utils';
import { ArrowLeft, Building2, Calendar, CreditCard, FileWarning, AlertTriangle, PieChart as PieChartIcon, Link as LinkIcon, Activity } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MinistryDetailProps {
  ministryName: string;
  records: Record[];
  onBack: () => void;
}

export const MinistryDetail: React.FC<MinistryDetailProps> = ({ ministryName, records, onBack }) => {
  const { t, language } = useLanguage();
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
        percent: totalSpend > 0 ? (value / totalSpend) * 100 : 0
    }));

  // 3. Procurement Risk Score Calculation
  // Formula: (Direct Nego % * 0.6) + (Top 5 Vendor Concentration % * 0.4)
  // Scale: 0 to 10
  const top5Concentration = topVendors.reduce((acc, v) => acc + v.percent, 0);
  const rawRiskScore = (directPercent * 0.6) + (top5Concentration * 0.4);
  const riskScore = Math.min(Math.round(rawRiskScore / 10), 10); // Scale 0-100 to 0-10
  
  // Determine Risk Color and Label
  let riskColor = 'text-gw-success';
  let riskBg = 'bg-gw-success';
  let riskLabel = t.risk_lvl_low;

  if (riskScore >= 7) {
    riskColor = 'text-gw-danger';
    riskBg = 'bg-gw-danger';
    riskLabel = t.risk_lvl_high;
  } else if (riskScore >= 4) {
    riskColor = 'text-orange-400';
    riskBg = 'bg-orange-400';
    riskLabel = t.risk_lvl_med;
  }

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
                        <Building2 className="w-6 h-6 text-gw-muted" />
                    </div>
                    <span className="text-gw-muted uppercase tracking-wider text-sm font-semibold">{t.det_profile}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{getMinistryLabel(ministryName, language)}</h1>
                <p className="text-gw-muted text-sm mt-1">{ministryName}</p>
            </div>
            <div className="text-left md:text-right">
                <div className="text-sm text-gw-muted mb-1">{t.kpi_total_value}</div>
                <div className="text-3xl font-bold text-gw-success">{formatMoney(totalSpend, language)}</div>
                <div className="text-xs text-gw-muted mt-1">{filteredRecords.length} {t.min_contracts}</div>
            </div>
        </div>
      </div>

      {/* ANALYTICS ROW (OpenTender Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          {/* 1. INTEGRITY / RISK PROFILE */}
          <div className="bg-gw-card border border-gw-border rounded-lg p-5 md:p-6 flex flex-col h-full">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gw-danger" />
                    {t.det_integrity}
                </h3>
             </div>

             {/* RISK SCORE DISPLAY */}
             <div className="mb-6 p-4 rounded-lg bg-gw-bg border border-gw-border relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <div className="text-xs text-gw-muted uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> {t.det_risk_score}
                        </div>
                        <div className={`text-4xl font-black ${riskColor}`}>
                            {riskScore}<span className="text-lg text-gw-muted/50 font-normal">/10</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-1 ${riskBg} bg-opacity-80`}>
                            {riskLabel}
                        </div>
                        <div className="text-[10px] text-gw-muted max-w-[120px] leading-tight">
                           {t.det_risk_level}
                        </div>
                    </div>
                </div>
                {/* Background Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-gw-border w-full">
                    <div className={`h-full ${riskBg} transition-all duration-1000`} style={{ width: `${riskScore * 10}%` }}></div>
                </div>
                <div className="mt-3 text-[10px] text-gw-muted italic border-t border-gw-border/50 pt-2">
                    {t.risk_explanation}
                </div>
             </div>
             
             <div className="space-y-6 flex-grow">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gw-muted">{t.lbl_method_breakdown}</span>
                        <span className={`font-bold ${directPercent > 20 ? 'text-gw-danger' : 'text-gw-success'}`}>
                            {directPercent.toFixed(1)}% {t.val_direct_nego}
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
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gw-danger"></div> {t.lbl_direct_short} ({methodStats.directCount})</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gw-success"></div> {t.lbl_open_short} ({methodStats.openCount})</span>
                    </div>
                </div>

                <div className="bg-gw-bg/50 p-4 rounded border border-gw-border">
                    <h4 className="text-xs font-bold text-gw-muted uppercase mb-2">{t.det_risk_analysis}</h4>
                    <p className="text-sm text-gw-text">
                        {directPercent > 30 
                            ? t.det_risk_high
                            : t.det_risk_low}
                    </p>
                </div>
             </div>
          </div>

          {/* 2. MARKET CONCENTRATION (TOP VENDORS) */}
          <div className="bg-gw-card border border-gw-border rounded-lg p-5 md:p-6 flex flex-col h-full">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-blue-400" />
                    {t.det_vendor_dom}
                </h3>
             </div>

             <div className="space-y-4">
                 {topVendors.map((v, i) => (
                     <div key={i} className="group">
                         <div className="flex justify-between items-center text-sm mb-1">
                             <span className="truncate max-w-[200px] text-white group-hover:text-blue-400 transition-colors" title={v.name}>
                                 {i+1}. {v.name}
                             </span>
                             <span className="font-mono text-gw-muted">{formatMoney(v.value, language)}</span>
                         </div>
                         <div className="w-full bg-gw-bg rounded-full h-1.5">
                             <div 
                                className="bg-blue-500 h-1.5 rounded-full" 
                                style={{ width: `${v.percent}%` }}
                             ></div>
                         </div>
                         <div className="text-[10px] text-right text-gw-muted mt-0.5">
                             {v.percent.toFixed(1)}% {t.lbl_percent_spend}
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      </div>

      {/* DETAILED LIST */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">{t.det_contract_history}</h3>
        <div className="grid grid-cols-1 gap-4">
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
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4 pr-8">
                        <div className="flex-1">
                            <h3 className="text-base md:text-lg font-bold text-white mb-1 line-clamp-2">{r.vendor}</h3>
                            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gw-muted">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {r.date}
                                </span>
                                <span className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" /> {(r.method.toLowerCase().includes('direct') || r.method.toLowerCase().includes('rundingan')) ? t.val_direct_nego : t.val_open_tender}
                                </span>
                            </div>
                        </div>
                        <div className={`text-lg md:text-xl font-bold ${r.method.toLowerCase().includes('rundingan') || r.method.toLowerCase().includes('direct') ? 'text-gw-danger' : 'text-gw-success'}`}>
                            {formatMoney(r.amount, language)}
                        </div>
                    </div>
                    
                    {r.reason ? (
                        <div className="bg-gw-danger/5 rounded p-3 text-sm text-gw-text border border-gw-danger/20 flex gap-2 items-start">
                             <FileWarning className="w-4 h-4 text-gw-danger shrink-0 mt-0.5" />
                             <div>
                                <span className="text-gw-danger font-semibold uppercase text-xs tracking-wide block mb-1">{t.det_justification}</span>
                                {r.reason}
                             </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gw-muted italic opacity-50">{t.lbl_standard_procurement}</div>
                    )}
                    
                    {r.crawledAt && (
                        <div className="mt-2 pt-2 border-t border-gw-border/50 text-[10px] text-gw-muted/50">
                            {t.lbl_verified_on}: {new Date(r.crawledAt).toLocaleString(language === 'ms' ? 'ms-MY' : 'en-US')}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};