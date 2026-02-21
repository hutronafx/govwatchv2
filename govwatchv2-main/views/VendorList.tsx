import React, { useState, useEffect } from 'react';
import { formatMoney } from '../utils';
import { Store, Search, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../i18n';

interface VendorListProps { onSelectVendor?: (name: string) => void; }

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

export const VendorList: React.FC<VendorListProps> = React.memo(({ onSelectVendor }) => {
  const { t, language } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [vendors, setVendors] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  useEffect(() => {
    setIsFetching(true);
    const query = new URLSearchParams({ page: currentPage.toString(), limit: itemsPerPage.toString(), search: searchTerm });
    fetch(`/api/vendors?${query.toString()}`)
      .then(res => res.json())
      .then(data => {
        setVendors((data.data || []).map((v: any) => ({ name: v.name, count: v.contractCount, value: v.totalSpend })));
        setTotalCount(data.totalCount || 0);
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [currentPage, searchTerm]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Store className="w-5 h-5 text-gw-accent" /> {t.ven_title}</h1>
          <p className="text-sm text-gw-muted mt-1">{t.ven_subtitle}</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
          <input type="text" placeholder={t.ven_search}
            className="bg-gw-card border border-gw-border rounded-md pl-9 pr-4 py-2 text-sm text-gw-text focus:border-gw-accent focus:outline-none w-full sm:w-56"
            style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="bg-gw-card border border-gw-border rounded-lg overflow-hidden" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-gw-bg sticky top-0 z-10" style={{ transition: 'background-color 0.2s' }}>
              <tr className="border-b border-gw-border">
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide w-12">#</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide">{t.th_company_name}</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide text-center">{t.ven_contracts_won}</th>
                <th className="px-4 md:px-5 py-3 text-xs font-semibold text-gw-muted uppercase tracking-wide text-right">{t.ven_total_value}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gw-border">
              {vendors.map((v, i) => (
                <tr key={v.name} onClick={() => onSelectVendor && onSelectVendor(v.name)} className="hover:bg-gw-bg-alt transition-colors cursor-pointer group">
                  <td className="px-4 md:px-5 py-3 text-gw-muted font-mono text-xs">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="px-4 md:px-5 py-3"><span className="font-medium text-gw-text group-hover:text-gw-link transition-colors">{v.name}</span></td>
                  <td className="px-4 md:px-5 py-3 text-center text-gw-muted font-mono">{v.count}</td>
                  <td className="px-4 md:px-5 py-3 text-right font-mono font-semibold text-gw-success whitespace-nowrap">{formatMoney(v.value, language)}</td>
                </tr>
              ))}
              {vendors.length === 0 && !isFetching && (
                <tr><td colSpan={4} className="text-center py-12 text-gw-muted text-sm">No results found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {vendors.length > 0 && (
          <div className="p-3 border-t border-gw-border flex items-center justify-between text-xs text-gw-muted">
            <span>{Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="First"
                className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input type="number" value={currentPage} min={1} max={totalPages}
                onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setCurrentPage(v); }}
                className="w-12 text-center font-mono bg-gw-bg border border-gw-border rounded px-1 py-1 text-xs text-gw-text focus:outline-none focus:border-gw-accent"
                style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }} />
              <span>/ {Math.max(1, totalPages)}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} title="Last"
                className="p-1.5 rounded border border-gw-border text-gw-muted hover:text-gw-text disabled:opacity-30 transition-colors" style={{ transition: 'border-color 0.2s' }}>
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});