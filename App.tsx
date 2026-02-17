import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MinistryDetail } from './views/MinistryDetail';
import { MinistryList } from './views/MinistryList';
import { VendorList } from './views/VendorList';
import { VendorDetail } from './views/VendorDetail';
import { Upload } from './views/Upload';
import { About } from './views/About';
import { INITIAL_RECORDS } from './data';
import { ViewConfig, Record } from './types';
import { LanguageProvider } from './i18n';

function AppContent() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [records, setRecords] = useState<Record[]>(INITIAL_RECORDS);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auto-fetch data on startup
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // We try multiple potential URLs because the user might have named the file differently
      // or provided a link to the wrong file type (localization vs data).
      const REPO_BASE = 'https://raw.githubusercontent.com/hutronafx/govwatchv2/main';
      const URLS_TO_TRY = [
        `${REPO_BASE}/localization.json`,    // User provided link
        `${REPO_BASE}/govwatch_data.json`,   // Standard scraper output name
        `${REPO_BASE}/data.json`,            // Generic name
        '/data.json'                         // Local fallback
      ];
      
      let rawData = null;
      let successUrl = '';

      for (const url of URLS_TO_TRY) {
        try {
            console.log(`Attempting to fetch data from: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                // Basic validation to check if it looks like our data (array) and not HTML/404
                if (text.trim().startsWith('[') || text.includes('__EMPTY')) {
                    rawData = JSON.parse(text);
                    successUrl = url;
                    console.log(`Success fetching from ${url}`);
                    break;
                }
            }
        } catch (e) {
            console.warn(`Failed to fetch ${url}`, e);
        }
      }
      
      if (rawData) {
        // NORMALIZE DATA
        const cleanData: Record[] = [];
        if (Array.isArray(rawData)) {
             rawData.forEach((item: any, index: number) => {
                // 1. Skip Header Rows or non-data files (like translation files)
                if (item['__EMPTY'] === 'TAJUK SEBUT HARGA' || item['__EMPTY_3'] === 'KEMENTERIAN') return;
                
                // If it's a localization file (key/value pairs), it won't have the fields we need. Skip it.
                if (item.nav_dashboard || item.kpi_total_value) return; 

                // 2. Map fields
                const ministry = item.ministry || item['__EMPTY_3'] || "Unknown Ministry";
                const vendor = item.vendor || item['__EMPTY_4'] || "Unknown Vendor";
                
                // Parse Amount
                let amount = 0;
                if (typeof item.amount === 'number') amount = item.amount;
                else if (item['__EMPTY_8']) {
                    amount = parseFloat(String(item['__EMPTY_8']).replace(/[^0-9.-]+/g, ""));
                } else if (typeof item.amount === 'string') {
                    amount = parseFloat(item.amount.replace(/[^0-9.-]+/g, ""));
                }

                // Parse Date
                let date = item.date || item['__EMPTY_6'];
                if (!date || date === 'TIADA MAKLUMAT') date = item['__EMPTY_7'];
                if (!date || date === 'TIADA MAKLUMAT') date = new Date().toISOString().split('T')[0];
                if (date && typeof date === 'string' && date.includes(' ')) {
                    date = date.split(' ')[0];
                }

                // Map Category & Method
                const category = item.category || item['__EMPTY_2'] || "General";
                const method = item.method || "Open Tender";

                // Validation: Must have at least a Ministry or an Amount to be valid
                if ((ministry !== "Unknown Ministry" || amount > 0) && ministry !== "Ministry") {
                    cleanData.push({
                        id: index + 1,
                        ministry: String(ministry).trim(),
                        vendor: String(vendor).trim(),
                        amount: amount || 0,
                        method: String(method).trim(),
                        category: String(category).trim(),
                        date: String(date).trim(),
                        reason: item.reason || null,
                        sourceUrl: item.sourceUrl,
                        crawledAt: item.crawledAt
                    });
                }
             });
        }

        if (cleanData.length > 0) {
          setRecords(cleanData);
        } else {
            console.warn("Data file loaded but contained 0 valid records.");
        }
      } else {
          setFetchError("Could not load data from any source.");
      }
    } catch (error) {
      console.warn('Critical error during data fetch:', error);
      setFetchError("Critical application error.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const checkHash = () => {
      if (window.location.hash === '#secret-admin-panel') {
        setViewConfig({ view: 'upload' });
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleNavigate = (view: any) => {
    setViewConfig({ view });
    window.scrollTo(0, 0);
    if (view === 'dashboard' && window.location.hash === '#secret-admin-panel') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
  };

  const handleMinistryClick = (ministryName: string) => {
    setViewConfig({ view: 'ministry_detail', ministryName });
    window.scrollTo(0, 0);
  };

  const handleVendorClick = (vendorName: string) => {
    setViewConfig({ view: 'vendor_detail', vendorName });
    window.scrollTo(0, 0);
  };

  const handleDataLoaded = (newRecords: Record[]) => {
    setRecords(newRecords);
    handleNavigate('dashboard');
  };

  return (
    <Layout activeView={viewConfig.view} onNavigate={handleNavigate}>
      {viewConfig.view === 'dashboard' && (
        <Dashboard 
          records={records} 
          isLoading={isLoading}
          onMinistryClick={handleMinistryClick} 
          onVendorClick={handleVendorClick}
        />
      )}
      
      {viewConfig.view === 'ministry_detail' && viewConfig.ministryName && (
        <MinistryDetail 
          ministryName={viewConfig.ministryName} 
          records={records}
          onBack={() => handleNavigate('ministry_list')}
        />
      )}

      {viewConfig.view === 'vendor_detail' && viewConfig.vendorName && (
        <VendorDetail 
          vendorName={viewConfig.vendorName} 
          records={records}
          onBack={() => handleNavigate('vendor_list')}
          onMinistryClick={handleMinistryClick}
        />
      )}

      {viewConfig.view === 'ministry_list' && (
        <MinistryList 
            records={records} 
            onSelectMinistry={handleMinistryClick} 
        />
      )}

      {viewConfig.view === 'vendor_list' && (
        <VendorList 
            records={records} 
            onSelectVendor={handleVendorClick}
        />
      )}

      {viewConfig.view === 'upload' && (
        <Upload onDataLoaded={handleDataLoaded} />
      )}
      
      {viewConfig.view === 'about' && (
        <About />
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