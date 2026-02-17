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
      // 1. EXACT User Provided URL (with token)
      const USER_URL = 'https://raw.githubusercontent.com/hutronafx/govwatchv2/refs/heads/main/localization.json?token=GHSAT0AAAAAADVXI5UU3J63OXEGJ7HZ7URW2MUUBEA';
      
      // 2. Fallbacks (Data file in same repo base, local file)
      // We reconstruct the base URL from the user link to try finding the standard data file too
      const REPO_BASE = 'https://raw.githubusercontent.com/hutronafx/govwatchv2/refs/heads/main';
      const TOKEN_SUFFIX = '?token=GHSAT0AAAAAADVXI5UU3J63OXEGJ7HZ7URW2MUUBEA';

      const URLS_TO_TRY = [
        USER_URL,                                             // Exact link provided
        `${REPO_BASE}/govwatch_data.json${TOKEN_SUFFIX}`,     // Standard data name + token
        '/data.json'                                          // Local fallback
      ];
      
      let rawData = null;
      let successUrl = '';

      for (const url of URLS_TO_TRY) {
        try {
            console.log(`[GovWatch] Attempting fetch: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                // Basic validation: Is it a JSON array?
                if (text.trim().startsWith('[') || text.includes('__EMPTY')) {
                    rawData = JSON.parse(text);
                    successUrl = url;
                    console.log(`[GovWatch] Success fetching from ${url}`);
                    break;
                } else {
                   console.warn(`[GovWatch] Fetched ${url} but it does not look like array data.`);
                }
            } else {
                console.warn(`[GovWatch] Failed fetch ${url}: ${res.status} ${res.statusText}`);
            }
        } catch (e) {
            console.warn(`[GovWatch] Network error fetching ${url}`, e);
        }
      }
      
      if (rawData) {
        // NORMALIZE DATA
        const cleanData: Record[] = [];
        if (Array.isArray(rawData)) {
             rawData.forEach((item: any, index: number) => {
                // 1. Skip Header Rows or non-data files
                if (item['__EMPTY'] === 'TAJUK SEBUT HARGA' || item['__EMPTY_3'] === 'KEMENTERIAN') return;
                
                // 2. Map fields
                // Support both standard keys (ministry, amount) and Excel keys (__EMPTY_3, etc)
                const ministry = item.ministry || item['__EMPTY_3'] || item.Ministry || "Unknown Ministry";
                const vendor = item.vendor || item['__EMPTY_4'] || item.Vendor || item.Tenderer || "Unknown Vendor";
                const title = item.title || item.Title || item['__EMPTY'] || "";
                
                // Parse Amount
                let amount = 0;
                const rawAmount = item.amount || item['__EMPTY_8'] || item.Price || item.price;
                if (typeof rawAmount === 'number') amount = rawAmount;
                else if (typeof rawAmount === 'string') {
                    amount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
                }

                // Parse Date
                let date = item.date || item['__EMPTY_6'] || item.Date;
                if (!date || date === 'TIADA MAKLUMAT') date = item['__EMPTY_7'];
                if (!date || date === 'TIADA MAKLUMAT') date = new Date().toISOString().split('T')[0];
                
                // Handle Excel serial dates if any
                if (typeof date === 'number') {
                     const dateObj = new Date(Math.round((date - 25569) * 86400 * 1000));
                     date = dateObj.toISOString().split('T')[0];
                }
                if (date && typeof date === 'string' && date.includes(' ')) {
                    date = date.split(' ')[0];
                }

                // Map Category & Method
                const category = item.category || item['__EMPTY_2'] || item.Category || "General";
                const method = item.method || item.Method || "Open Tender";

                // Validation: Must have at least a known Amount or Ministry to be a valid record
                // Also skip if it looks like a translation file (contains keys like 'nav_dashboard')
                if (!item.nav_dashboard && (ministry !== "Unknown Ministry" || amount > 0) && ministry !== "Ministry") {
                    cleanData.push({
                        id: index + 1,
                        ministry: String(ministry).trim(),
                        vendor: String(vendor).trim(),
                        amount: amount || 0,
                        method: String(method).trim(),
                        category: String(category).trim(),
                        date: String(date).trim(),
                        title: title,
                        reason: item.reason || null,
                        sourceUrl: item.sourceUrl,
                        crawledAt: item.crawledAt
                    });
                }
             });
        }

        if (cleanData.length > 0) {
          console.log(`[GovWatch] Loaded ${cleanData.length} valid records.`);
          setRecords(cleanData);
        } else {
            console.warn("[GovWatch] Data file loaded but contained 0 valid records. Check file format.");
            // If the user provided file was actually the translation file, we might end up here.
        }
      } else {
          setFetchError("Could not load data. Please check your internet connection or the GitHub link.");
      }
    } catch (error) {
      console.error('[GovWatch] Critical error during data fetch:', error);
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