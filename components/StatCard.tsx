import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  isAlert?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, isAlert }) => {
  return (
    <div className="bg-gw-card border border-gw-border rounded-lg p-6 shadow-sm">
      <div className="text-sm font-medium text-gw-muted uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-3xl font-bold truncate ${isAlert ? 'text-gw-danger' : 'text-gw-success'}`}>
        {value}
      </div>
    </div>
  );
};