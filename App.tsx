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
import { AlertTriangle, Database, Loader2 } from 'lucide-react';
import { INITIAL_RECORDS } from './data';

// --- CONFIGURATION ---
// The app will try these URLs in order. 
// If one fails, it moves to the next.
const DATA_SOURCES = [
    { name: "GitHub Database", url: "https://raw.githubusercontent.com/hutronafx/govwatchv2/refs/heads/main/public/data.json" },
    { name: "Local File", url: "/data.json" },
    { name: "Demo Data", url: "DEMO" }
];

function AppContent() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');

  // Helper to process raw JSON into our Record type
  const processData = (jsonData: any[], sourceName: string) => {
    if (!Array.isArray(jsonData)) throw new Error("Data is not an array");
    
    const cleanData: Record[] = [];
    jsonData.forEach((row: any, index: number) => {
        // Flexible Column Mapping: Checks for Capitalized (Excel) or Lowercase (JSON) keys
        const ministry = row['Ministry'] || row['ministry'] || row['Kementerian'] || row['Agency'] || row['Agensi'] || "Unknown Ministry";
        const vendor = row['Vendor'] || row['vendor'] || row['Petender'] || row['Tenderer'] || row['Nama Syarikat'] || row['Company'] || "Unknown Vendor";
        const title = row['Title'] || row['title'] || row['Tajuk'] || row['Description'] || row['Tajuk Projek'] || row['Project Title'] || "";
        const method = row['Method'] || row['method'] || row['Kaedah'] || row['Procurement Method'] || row['Mode'] || "Open Tender";
        
        // Amount Cleaning (Remove RM, commas, etc)
        let amount = 0;
        const rawAmount = row['Price'] || row['amount'] || row['price'] || row['Nilai'] || row['Harga'] || row['Amount'] || row['Contract Value'] || row['Cost'];
        if (typeof rawAmount === 'number') amount = rawAmount;
        else if (typeof rawAmount === 'string') {
            amount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
        }

        // Date Cleaning
        let dateStr = row['Date'] || row['date'] || row['Tarikh'] || row['Award Date'] || row['Contract Date'] || new Date().toISOString().split('T')[0];
        if (typeof dateStr === 'number') {
            // Handle Excel serial date
            const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
            if (!isNaN(dateObj.getTime())) {
                dateStr = dateObj.toISOString().split('T')[0];
            } else {
                dateStr = new Date().toISOString().split('T')[0];
            }
        } else if (typeof dateStr === 'string') {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
            }
        }

        // Category Inference
        let category = row['Category'] || row['category'] || row['Kategori'] || "General";
        if (category === "General" || !category) {
             const t = (title || "").toLowerCase();
             if (t.includes('bina') || t.includes('road') || t.includes('bangunan') || t.includes('kerja') || t.includes('upgrad') || t.includes('construction') || t.includes('renovation')) category = 'Kerja';
             else if (t.includes('supply') || t.includes('bekal') || t.includes('ubat') || t.includes('equipment') || t.includes('peralatan') || t.includes('drug')) category = 'Bekalan';
             else if (t.includes('service') || t.includes('khidmat') || t.includes('sewa') || t.includes('lanti') || t.includes('security') || t.includes('clean') || t.includes('consult')) category = 'Perkhidmatan';
        }

        if (amount > 0 || (ministry !== "Unknown Ministry" && vendor !== "Unknown Vendor")) {
            cleanData.push({
                id: row.id || index + 1,
                ministry: String(ministry).trim(),
                vendor: String(vendor).trim(),
                amount: amount || 0,
                method: String(method).trim(),
                category: String(category).trim(),
                date: String(dateStr).trim(),
                title: String(title).trim(),
                sourceUrl: sourceName,
                crawledAt: row['crawledAt'] || new Date().toISOString()
            });
        }
    });
    return cleanData;
  };

  const tryFetch = async (url: string, sourceName: string) => {
      console.log(`[GovWatch] Attempting to fetch from: ${sourceName} (${url})`);
      
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + `t=${new Date().getTime()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const textData = await res.text();
      let jsonData;

      try {
          jsonData = JSON.parse(textData);
      } catch (parseError: any) {
          console.warn(`[GovWatch] JSON Parse Error on ${sourceName}. Attempting sanitization...`);
          // ROBUST SANITIZATION: Find the outer [ ] brackets
          const firstBracket = textData.indexOf('[');
          const lastBracket = textData.lastIndexOf(']');
          
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
              const cleanText = textData.substring(firstBracket, lastBracket + 1);
              try {
                  jsonData = JSON.parse(cleanText);
                  console.log(`[GovWatch] Sanitization successful for ${sourceName}.`);
              } catch (e) {
                  throw new Error(`Sanitization failed: ${e}`);
              }
          } else {
               throw new Error(`Invalid JSON structure: ${parseError.message}`);
          }
      }
      
      return processData(jsonData, sourceName);
  };

  // Auto-fetch data on startup
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsConnected(false);
    
    let loadedData: Record[] = [];
    let loadedSource = "";

    for (const source of DATA_SOURCES) {
        try {
            if (source.url === "DEMO") {
                console.log("[GovWatch] Loading Demo Data as fallback.");
                loadedData = INITIAL_RECORDS;
                loadedSource = "Demo Data (Offline)";
                break;
            }

            loadedData = await tryFetch(source.url, source.name);
            loadedSource = source.name;
            if (loadedData.length > 0) break; // Success!

        } catch (e: any) {
            console.warn(`[GovWatch] Failed to load from ${source.name}: ${e.message}`);
            // Continue to next source
        }
    }

    if (loadedData.length > 0) {
        setRecords(loadedData);
        setDataSource(loadedSource);
        setIsConnected(true);
    } else {
        setErrorMsg("All data sources failed. Please check your internet connection.");
    }
    
    setIsLoading(false);
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
    setIsConnected(true);
    setDataSource("Manual Upload");
    setErrorMsg(null);
  };

  return (
    <Layout activeView={viewConfig.view} onNavigate={handleNavigate}>
      {/* Data Status Banner */}
      {errorMsg && !isLoading && (
          <div className="bg-gw-danger/10 border-b border-gw-danger/20 px-4 py-4 text-center text-sm text-gw-danger flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span><strong>Connection Failed:</strong> {errorMsg}</span>
              </div>
              <button 
                onClick={() => fetchData()} 
                className="px-4 py-1 bg-gw-danger text-gw-bg font-bold rounded hover:bg-gw-danger/80 transition-colors"
              >
                Retry
              </button>
          </div>
      )}

      {isConnected && !isLoading && (
          <div className="bg-gw-success/10 border-b border-gw-success/20 px-4 py-1 text-center text-[10px] text-gw-success flex items-center justify-center gap-2">
              <Database className="w-3 h-3" />
              <span>Source: <strong>{dataSource}</strong></span>
          </div>
      )}

      {/* Loading State */}
      {isLoading && (
         <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fadeIn">
            <Loader2 className="w-10 h-10 text-gw-success animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white">Loading GovWatch...</h2>
            <p className="text-gw-muted mt-2 text-sm">Connecting to data sources</p>
         </div>
      )}

      {/* Content (Only show if not loading) */}
      {!isLoading && (
        <>
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