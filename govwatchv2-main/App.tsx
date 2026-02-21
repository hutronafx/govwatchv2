import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MinistryDetail } from './views/MinistryDetail';
import { MinistryList } from './views/MinistryList';
import { VendorList } from './views/VendorList';
import { VendorDetail } from './views/VendorDetail';
import { Upload } from './views/Upload';
import { About } from './views/About';
import { ViewConfig, Record } from './types';
import { LanguageProvider } from './i18n';
import { AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cleanMinistryName } from './utils';

// --- CONFIGURATION ---
const DATA_SOURCES = [
  {
    name: "GitHub Repository (CSV)",
    url: "https://raw.githubusercontent.com/hutronafx/govwatchv2/main/public/Myprocurementdata%20complete.csv"
  },
  {
    name: "GitHub (Alt Link)",
    url: "https://raw.githubusercontent.com/hutronafx/govwatchv2/refs/heads/main/public/Myprocurementdata%20complete.csv"
  }
];

function AppContent() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ping backend to wake it up / check if alive
  const checkHealth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/health');
      if (!res.ok) throw new Error('Backend unvailable');
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Cannot connect to the backend server. The database might be sleeping.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleNavigate = (view: any) => {
    setViewConfig({ view });
    window.scrollTo(0, 0);
  };

  const handleMinistryClick = (ministryName: string) => {
    setViewConfig({ view: 'ministry_detail', ministryName });
    window.scrollTo(0, 0);
  };

  const handleVendorClick = (vendorName: string) => {
    setViewConfig({ view: 'vendor_detail', vendorName });
    window.scrollTo(0, 0);
  };

  // Handler for manual data upload from Admin view
  const handleDataUpdate = async (newData: any[]) => {
    await fetch('/api/update-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    });
    setViewConfig({ view: 'dashboard' });
  };

  return (
    <Layout activeView={viewConfig.view} onNavigate={handleNavigate} isLoading={isLoading}>
      {/* Data Status Banner */}
      {errorMsg && !isLoading && (
        <div className="bg-gw-danger/10 border-b border-gw-danger/20 px-4 py-4 text-center text-sm text-gw-danger flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span><strong>Connection Failed:</strong> {errorMsg}</span>
          </div>
          <button
            onClick={() => checkHealth()}
            className="px-4 py-1 bg-gw-danger text-gw-bg font-bold rounded hover:bg-gw-danger/80 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn">
          <Loader2 className="w-10 h-10 text-gw-success animate-spin mb-4" />
          <h2 className="text-xl font-bold text-white">Loading Public Procurement Data...</h2>
          <p className="text-gw-muted mt-2 text-sm">Fetching latest records from GitHub...</p>
        </div>
      )}

      {/* Content (Only show if not loading) */}
      {!isLoading && (
        <>
          {viewConfig.view === 'dashboard' && (
            <Dashboard
              onMinistryClick={handleMinistryClick}
              onVendorClick={handleVendorClick}
            />
          )}

          {viewConfig.view === 'ministry_detail' && viewConfig.ministryName && (
            <MinistryDetail
              ministryName={viewConfig.ministryName}
              onBack={() => handleNavigate('ministry_list')}
            />
          )}

          {viewConfig.view === 'vendor_detail' && viewConfig.vendorName && (
            <VendorDetail
              vendorName={viewConfig.vendorName}
              onBack={() => handleNavigate('vendor_list')}
              onMinistryClick={handleMinistryClick}
            />
          )}

          {viewConfig.view === 'ministry_list' && (
            <MinistryList
              onSelectMinistry={handleMinistryClick}
            />
          )}

          {viewConfig.view === 'vendor_list' && (
            <VendorList
              onSelectVendor={handleVendorClick}
            />
          )}

          {viewConfig.view === 'upload' && (
            <Upload
              onDataLoaded={handleDataUpdate}
            />
          )}

          {viewConfig.view === 'about' && (
            <About />
          )}
        </>
      )}
    </Layout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;