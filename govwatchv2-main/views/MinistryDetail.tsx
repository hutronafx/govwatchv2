import React from 'react';
import { formatMoney, getMinistryLabel, formatDateSafe, formatDateTimeSafe } from '../utils';
import { ArrowLeft, Building2, Calendar, CreditCard, FileWarning, AlertTriangle, PieChart as PieChartIcon, Link as LinkIcon, Activity } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MinistryDetailProps { ministryName: string; onBack: () => void; }

export const MinistryDetail: React.FC<MinistryDetailProps> = ({ ministryName, onBack }) => {
    const { t, language } = useLanguage();
    const [stats, setStats] = React.useState<any>(null);
    const [recentRecords, setRecentRecords] = React.useState<any[]>([]);
    const [isFetching, setIsFetching] = React.useState(true);

    React.useEffect(() => {
        setIsFetching(true);
        Promise.all([
            fetch(`/api/ministries/${encodeURIComponent(ministryName)}/stats`).then(r => r.json()),
            fetch(`/api/records?ministry=${encodeURIComponent(ministryName)}&limit=50`).then(r => r.json())
        ]).then(([s, r]) => { setStats(s); setRecentRecords(r.data || []); })
            .catch(console.error).finally(() => setIsFetching(false));
    }, [ministryName]);

    const totalSpend = stats?.totalSpend || 0;
    const totalCount = stats?.contractCount || 0;

    let directCount = 0, openCount = 0;
    if (stats?.byMethod) {
        stats.byMethod.forEach((m: any) => {
            const isDirect = (m.name || '').toLowerCase().includes('rundingan') || (m.name || '').toLowerCase().includes('direct');
            if (isDirect) directCount += m.contractCount; else openCount += m.contractCount;
        });
    }
    const directPercent = totalCount > 0 ? (directCount / totalCount) * 100 : 0;

    const topVendors = (stats?.topVendors || []).map((v: any) => ({
        name: v.name, value: v.totalSpend,
        percent: totalSpend > 0 ? (v.totalSpend / totalSpend) * 100 : 0
    }));

    const top5Concentration = topVendors.reduce((a: number, v: any) => a + v.percent, 0);
    const riskScore = Math.min(Math.round(((directPercent * 0.6) + (top5Concentration * 0.4)) / 10), 10);
    let riskColor = 'text-gw-success', riskLabel = t.risk_lvl_low;
    if (riskScore >= 7) { riskColor = 'text-gw-danger'; riskLabel = t.risk_lvl_high; }
    else if (riskScore >= 4) { riskColor = 'text-yellow-600 dark:text-yellow-400'; riskLabel = t.risk_lvl_med; }

    if (isFetching && !stats) return (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 border-2 border-gw-border border-t-gw-accent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gw-muted">Loading...</p>
        </div>
    );

    return (
        <div className="space-y-5 pb-8 fade-in">
            <button onClick={onBack} className="flex items-center text-gw-link hover:underline text-sm group">
                <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" /> {t.det_back}
            </button>

            {/* Header */}
            <div className="bg-gw-card border border-gw-border rounded-lg p-5 md:p-6" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-gw-muted uppercase tracking-wide mb-2">
                            <Building2 className="w-4 h-4" /> {t.det_profile}
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold leading-tight">{getMinistryLabel(ministryName, language)}</h1>
                        <p className="text-xs text-gw-muted mt-1">{ministryName}</p>
                    </div>
                    <div className="text-left md:text-right">
                        <div className="text-xs text-gw-muted uppercase tracking-wide mb-1">{t.kpi_total_value}</div>
                        <div className="text-2xl md:text-3xl font-bold font-mono text-gw-success">{formatMoney(totalSpend, language)}</div>
                        <div className="text-xs text-gw-muted mt-1">{totalCount} {t.min_contracts}</div>
                    </div>
                </div>
            </div>

            {/* Analysis row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Integrity */}
                <div className="bg-gw-card border border-gw-border rounded-lg p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                    <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-4 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-gw-danger" /> {t.det_integrity}
                    </h3>

                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <div className="text-xs text-gw-muted mb-1">{t.det_risk_score}</div>
                            <div className={`text-3xl font-bold font-mono ${riskColor}`}>{riskScore}<span className="text-base text-gw-muted font-normal">/10</span></div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded ${riskScore >= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : riskScore >= 4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {riskLabel}
                        </span>
                    </div>

                    <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gw-muted">{t.lbl_method_breakdown}</span>
                            <span className={`font-medium ${directPercent > 20 ? 'text-gw-danger' : 'text-gw-success'}`}>{directPercent.toFixed(1)}% {t.val_direct_nego}</span>
                        </div>
                        <div className="h-2.5 w-full bg-gw-bg rounded-full overflow-hidden flex">
                            <div className="h-full bg-red-500 dark:bg-red-400" style={{ width: `${directPercent}%`, transition: 'width 0.5s' }}></div>
                            <div className="h-full bg-green-500 dark:bg-green-400" style={{ width: `${100 - directPercent}%`, transition: 'width 0.5s' }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-gw-muted mt-1">
                            <span>{t.lbl_direct_short} ({directCount})</span>
                            <span>{t.lbl_open_short} ({openCount})</span>
                        </div>
                    </div>

                    <p className="text-xs text-gw-muted border-t border-gw-border pt-3 mt-3">{directPercent > 30 ? t.det_risk_high : t.det_risk_low}</p>
                </div>

                {/* Vendors */}
                <div className="bg-gw-card border border-gw-border rounded-lg p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                    <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-4 flex items-center gap-1.5">
                        <PieChartIcon className="w-4 h-4 text-gw-link" /> {t.det_vendor_dom}
                    </h3>
                    <div className="space-y-3">
                        {topVendors.map((v: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="truncate max-w-[200px] text-gw-text">{i + 1}. {v.name}</span>
                                    <span className="font-mono text-gw-success font-medium ml-2 whitespace-nowrap">{formatMoney(v.value, language)}</span>
                                </div>
                                <div className="w-full bg-gw-bg rounded-full h-1.5">
                                    <div className="bg-gw-link h-full rounded-full" style={{ width: `${v.percent}%`, transition: 'width 0.5s' }}></div>
                                </div>
                                <div className="text-[10px] text-right text-gw-muted mt-0.5">{v.percent.toFixed(1)}% {t.lbl_percent_spend}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contract history */}
            <div>
                <h3 className="text-sm font-semibold text-gw-text-secondary uppercase tracking-wide mb-3">{t.det_contract_history}</h3>
                <div className="space-y-2">
                    {recentRecords.map((r: any) => (
                        <div key={r.id} className="bg-gw-card border border-gw-border rounded-lg p-4 relative" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                            {(r.contractUrl || r.sourceUrl) && (
                                <a href={r.contractUrl || r.sourceUrl} target="_blank" rel="noreferrer" className="absolute top-4 right-4 text-gw-muted hover:text-gw-link">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                </a>
                            )}
                            <div className="flex flex-col md:flex-row justify-between gap-2 mb-2 pr-8">
                                <div>
                                    <h4 className="font-semibold text-sm">{r.vendor}</h4>
                                    <div className="flex items-center gap-3 text-xs text-gw-muted mt-1">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateSafe(r.date)}</span>
                                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />
                                            {(r.method?.toLowerCase().includes('direct') || r.method?.toLowerCase().includes('rundingan')) ? t.val_direct_nego : t.val_open_tender}
                                        </span>
                                    </div>
                                </div>
                                <div className={`text-lg font-bold font-mono whitespace-nowrap ${(r.method?.toLowerCase().includes('direct') || r.method?.toLowerCase().includes('rundingan')) ? 'text-gw-danger' : 'text-gw-success'}`}>
                                    {formatMoney(r.amount, language)}
                                </div>
                            </div>
                            {r.reason && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 text-xs text-gw-text border border-red-200 dark:border-red-800/30 flex gap-2 mt-2" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
                                    <FileWarning className="w-3.5 h-3.5 text-gw-danger shrink-0 mt-0.5" />
                                    <div><strong className="text-gw-danger text-[10px] uppercase block mb-0.5">{t.det_justification}</strong>{r.reason}</div>
                                </div>
                            )}
                            {r.crawledAt && <div className="text-[10px] text-gw-muted mt-2 pt-2 border-t border-gw-border">{t.lbl_verified_on}: {formatDateTimeSafe(r.crawledAt, language)}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};