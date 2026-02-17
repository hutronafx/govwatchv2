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
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [records, setRecords] = useState<Record[]>(INITIAL_RECORDS);
  const [isLoading, setIsLoading] = useState(true);
  const [dataMode, setDataMode] = useState<'live' | 'demo' | 'local'>('demo');

  // Auto-fetch data on startup
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. EXACT User Provided URL (with token)
      const USER_URL = 'https://raw.githubusercontent.com/hutronafx/govwatchv2/refs/heads/main/localization.json?token=GHSAT0AAAAAADVXI5UU3J63OXEGJ7HZ7URW2MUUBEA';
      
      // 2. Base paths for fallback
      // Note: If the user provided token is expired, we try the public raw link (no token)
      // We also check for 'govwatch_data.json' which is the standard output file.
      const REPO_BASE = 'https://raw.githubusercontent.com/hutronafx/govwatchv2/refs/heads/main';
      const TOKEN_SUFFIX = '?token=GHSAT0AAAAAADVXI5UU3J63OXEGJ7HZ7URW2MUUBEA';

      const URLS_TO_TRY = [
        USER_URL,                                             // 1. Explicit Link (User Provided)
        `${REPO_BASE}/localization.json`,                     // 2. Explicit Link (Public/No Token)
        `${REPO_BASE}/govwatch_data.json${TOKEN_SUFFIX}`,     // 3. Standard Data Name (With Token)
        `${REPO_BASE}/govwatch_data.json`,                    // 4. Standard Data Name (Public/No Token)
        '/data.json'                                          // 5. Local file
      ];
      
      let rawData = null;
      let successUrl = '';

      for (const url of URLS_TO_TRY) {
        try {
            console.log(`[GovWatch] Attempting fetch: ${url}`);
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                // Robust Validation:
                // 1. Must start with '[' (Array)
                // 2. OR contain 'ministry' or 'kementerian' (Data content)
                if (text.trim().startsWith('[') || text.toLowerCase().includes('"ministry"') || text.toLowerCase().includes('"kementerian"')) {
                    // Safety check against the translation file which is an Object
                    if (text.trim().startsWith('{') && !text.includes('"data":') && !text.includes('"records":')) {
                        // Likely a translation file (localization.json usually is), skip unless it looks like data
                         console.warn(`[GovWatch] Skipped ${url} - appears to be translation file, not data array.`);
                         continue;
                    }

                    rawData = JSON.parse(text);
                    // Handle wrapped JSON e.g. { data: [...] }
                    if (!Array.isArray(rawData) && rawData.data && Array.isArray(rawData.data)) {
                        rawData = rawData.data;
                    }
                    
                    if (Array.isArray(rawData)) {
                        successUrl = url;
                        console.log(`[GovWatch] Success fetching valid data from ${url}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.warn(`[GovWatch] Fetch error for ${url}`, e);
        }
      }
      
      if (rawData && Array.isArray(rawData)) {
        // NORMALIZE DATA
        const cleanData: Record[] = [];
        rawData.forEach((item: any, index: number) => {
            // 1. Skip Header Rows or non-data files
            if (item['__EMPTY'] === 'TAJUK SEBUT HARGA' || item['__EMPTY_3'] === 'KEMENTERIAN') return;
            
            // 2. Map fields
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
            
            // Handle Excel serial dates
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

            // Validation: Must have at least a known Amount or Ministry
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

        if (cleanData.length > 0) {
          console.log(`[GovWatch] Loaded ${cleanData.length} valid records.`);
          setRecords(cleanData);
          setDataMode(successUrl.includes('raw.github') ? 'live' : 'local');
        } else {
            console.warn("[GovWatch] Data loaded but 0 valid records found. Using Demo Data.");
        }
      } else {
          console.warn("[GovWatch] Could not load external data. Using Demo Data.");
      }
    } catch (error) {
      console.error('[GovWatch] Critical error during data fetch:', error);
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
    setDataMode('local');
  };

  return (
    <Layout activeView={viewConfig.view} onNavigate={handleNavigate}>
      {/* Data Status Banner */}
      {dataMode === 'demo' && !isLoading && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 text-center text-xs text-blue-300 flex items-center justify-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              <span>Viewing <strong>Demo Data</strong>. Unable to connect to live database or database is empty.</span>
              <button onClick={() => window.location.reload()} className="underline hover:text-white">Retry</button>
          </div>
      )}

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