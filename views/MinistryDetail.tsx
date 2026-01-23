import React from 'react';
import { Record } from '../types';
import { formatMoney } from '../utils';
import { ArrowLeft, Building2, Calendar, CreditCard, FileWarning } from 'lucide-react';

interface MinistryDetailProps {
  ministryName: string;
  records: Record[];
  onBack: () => void;
}

export const MinistryDetail: React.FC<MinistryDetailProps> = ({ ministryName, records, onBack }) => {
  const filteredRecords = records.filter(r => r.ministry === ministryName).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalSpend = filteredRecords.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <button 
        onClick={onBack}
        className="flex items-center text-gw-muted hover:text-gw-text transition-colors mb-4 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <div className="bg-gw-card border border-gw-border rounded-lg p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gw-border pb-6 mb-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gw-bg rounded border border-gw-border">
                        <Building2 className="w-6 h-6 text-gw-muted" />
                    </div>
                    <span className="text-gw-muted uppercase tracking-wider text-sm font-semibold">Ministry Report</span>
                </div>
                <h1 className="text-3xl font-bold text-white">{ministryName}</h1>
            </div>
            <div className="text-left md:text-right">
                <div className="text-sm text-gw-muted mb-1">Total Contract Value</div>
                <div className="text-3xl font-bold text-gw-success">{formatMoney(totalSpend)}</div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((r) => (
                <div key={r.id} className="bg-gw-bg border border-gw-border rounded-lg p-5 hover:border-gw-muted/50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
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
                        <div className={`text-xl font-bold ${r.method.includes('Direct') ? 'text-gw-danger' : 'text-gw-success'}`}>
                            {formatMoney(r.amount)}
                        </div>
                    </div>
                    
                    {r.reason ? (
                        <div className="bg-gw-card/50 rounded p-3 text-sm text-gw-text border border-gw-border/50 flex gap-2 items-start">
                             <FileWarning className="w-4 h-4 text-gw-danger shrink-0 mt-0.5" />
                             <div>
                                <span className="text-gw-danger font-semibold uppercase text-xs tracking-wide block mb-1">Direct Negotiation Justification</span>
                                {r.reason}
                             </div>
                        </div>
                    ) : (
                        <div className="text-xs text-gw-muted italic opacity-50">Standard procurement via open tender process.</div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};