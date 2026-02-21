import React, { useState, useEffect, useCallback } from 'react';
import { formatMoney, getMinistryLabel } from '../utils';
import { Building2, ChevronRight, Search, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../i18n';

interface MinistryListProps { onSelectMinistry: (name: string) => void; }

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

export const MinistryList: React.FC<MinistryListProps> = React.memo(({ onSelectMinistry }) => {
  const { t, language } = useLanguage();
  const [searchInput, setSearchInput] = useState('');
  const searchTerm = useDebounce(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [allMinistries, setAllMinistries] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch all ministries once (they're a small list)
  useEffect(() => {
    setIsFetching(true);
    fetch(`/api/ministries?limit=500`)
      .then(res => res.json())
      .then(data => {
        setAllMinistries((data.data || []).map((m: any) => ({
          name: m.name,
          displayName: getMinistryLabel(m.name, language),
          count: m.contractCount,
          value: m.totalSpend
        })));
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [language]);

  // Client-side search: match both raw Malay name AND display name (English)
  const filtered = React.useMemo(() => {
    if (!searchTerm) return allMinistries;
    const q = searchTerm.toLowerCase();
    return allMinistries.filter(m =>
      m.name.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q)
    );
  }, [allMinistries, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-gw-accent" /> {t.min_title}</h1>
          <p className="text-sm text-gw-muted mt-1">{t.min_subtitle}</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gw-muted" />
          <input type="text" placeholder={t.min_search}
            className="bg-gw-card border border-gw-border rounded-md pl-9 pr-4 py-2 text-sm text-gw-text focus:border-gw-accent focus:outline-none w-full sm:w-56"
            style={{ transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginated.map((m) => (
          <div key={m.name} onClick={() => onSelectMinistry(m.name)}
            className="bg-gw-card border border-gw-border rounded-lg p-4 hover:border-gw-accent/40 transition-colors cursor-pointer group"
            style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
            <h3 className="font-semibold text-sm text-gw-text line-clamp-2 mb-1 group-hover:text-gw-link transition-colors">{m.displayName}</h3>
            <p className="text-[11px] text-gw-muted mb-3">{m.name}</p>
            <div className="flex justify-between items-end">
              <span className="text-[11px] text-gw-muted">{m.count} {t.min_contracts}</span>
              <span className="font-mono font-semibold text-sm text-gw-success">{formatMoney(m.value, language)}</span>
            </div>
          </div>
        ))}
      </div>

      {paginated.length === 0 && !isFetching && (
        <div className="text-center py-12 text-gw-muted"><Search className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No ministries found</p></div>
      )}

      {totalCount > 0 && (
        <div className="flex items-center justify-between text-xs text-gw-muted pt-2">
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
  );
});