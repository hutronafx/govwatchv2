import React, { useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  rawAmount?: number;
  usdValue?: string;
  fullValue?: string;
  isAlert?: boolean;
}

export const StatCard: React.FC<StatCardProps> = React.memo(({ label, value, rawAmount, usdValue, fullValue, isAlert }) => {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="bg-gw-card border border-gw-border rounded-lg p-5" style={{ transition: 'background-color 0.2s, border-color 0.2s' }}>
      <div className="text-xs font-medium text-gw-muted uppercase tracking-wide mb-2">
        {label}
      </div>
      <div
        className={`text-2xl md:text-3xl font-bold font-mono tabular-nums ${isAlert ? 'text-gw-danger' : 'text-gw-success'} cursor-help relative group`}
        title={fullValue || ''}
        onMouseEnter={() => setShowFull(true)}
        onMouseLeave={() => setShowFull(false)}
      >
        {value}
        {/* Tooltip showing full amount */}
        {showFull && fullValue && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-gw-card border border-gw-border rounded-md shadow-lg px-3 py-2 text-sm font-mono whitespace-nowrap" style={{ transition: 'background-color 0.2s' }}>
            <div className="text-gw-text">{fullValue}</div>
            {usdValue && <div className="text-gw-muted text-xs mt-0.5">≈ {usdValue}</div>}
          </div>
        )}
      </div>
      {usdValue && <div className="text-xs text-gw-muted font-mono mt-1.5">≈ {usdValue}</div>}
    </div>
  );
});