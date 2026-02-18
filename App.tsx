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
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to process raw JSON/CSV objects into our Record type
  const processData = (jsonData: any[], sourceName: string) => {
    if (!Array.isArray(jsonData)) throw new Error("Data is not an array");
    
    const cleanData: Record[] = [];
    jsonData.forEach((row: any, index: number) => {
        // Flexible Column Mapping for CSV headers
        // Try exact matches, then case-insensitive, then fallback mappings
        const getVal = (keys: string[]) => {
            for (const k of keys) {
                if (row[k] !== undefined) return row[k];
            }
            // Case insensitive search
            const lowerKeys = keys.map(k => k.toLowerCase());
            for (const rowKey of Object.keys(row)) {
                if (lowerKeys.includes(rowKey.toLowerCase())) return row[rowKey];
            }
            return undefined;
        };

        const rawMinistry = getVal(['Ministry', 'Kementerian', 'Agency', 'Agensi']) || "Unknown Ministry";
        // Normalize ministry name immediately to ensure consistency (merges duplicates like 'Kementerian Pendidikan Malaysia' and 'Kementerian Pendidikan')
        const ministry = cleanMinistryName(String(rawMinistry));
        
        const vendor = getVal(['Vendor', 'Petender', 'Tenderer', 'Nama Syarikat', 'Company', 'Syarikat']) || "Unknown Vendor";
        const title = getVal(['Title', 'Tajuk', 'Description', 'Tajuk Projek', 'Project Title']) || "";
        const method = getVal(['Method', 'Kaedah', 'Procurement Method', 'Mode']) || "Open Tender";
        
        // Specific Link Support
        const contractUrl = getVal(['Link', 'Url', 'Permalink', 'Pautan', 'contractUrl']);

        // Amount Cleaning (Remove RM, commas, etc)
        let amount = 0;
        const rawAmount = getVal(['Price', 'Amount', 'Nilai', 'Harga', 'Contract Value', 'Cost']);
        
        if (typeof rawAmount === 'number') amount = rawAmount;
        else if (typeof rawAmount === 'string') {
            // Remove 'RM', commas, and spaces to get raw number
            amount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
        }

        // Date Cleaning
        let dateStr = getVal(['Date', 'Tarikh', 'Award Date', 'Contract Date']) || new Date().toISOString().split('T')[0];
        
        // Excel serial date handling
        if (typeof dateStr === 'number') {
            const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
            if (!isNaN(dateObj.getTime())) {
                dateStr = dateObj.toISOString().split('T')[0];
            }
        } else if (typeof dateStr === 'string') {
            // Try parsing various date formats
            // If it's DD/MM/YYYY
            if (dateStr.includes('/')) {
                 const parts = dateStr.split('/');
                 if (parts.length === 3) {
                     // Assume DD/MM/YYYY if first part > 12 or generally preferred in MY
                     // But let's try standard constructor first
                     const d = new Date(dateStr);
                     if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
                 }
            } else {
                 const d = new Date(dateStr);
                 if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
            }
        }

        // Category Inference
        let category = getVal(['Category', 'Kategori']) || "General";
        if (category === "General" || !category) {
             const t = (title || "").toLowerCase();
             if (t.includes('bina') || t.includes('road') || t.includes('bangunan') || t.includes('kerja') || t.includes('upgrad') || t.includes('construction') || t.includes('renovation') || t.includes('turap')) category = 'Kerja';
             else if (t.includes('supply') || t.includes('bekal') || t.includes('ubat') || t.includes('equipment') || t.includes('peralatan') || t.includes('drug') || t.includes('hardware')) category = 'Bekalan';
             else if (t.includes('service') || t.includes('khidmat') || t.includes('sewa') || t.includes('lanti') || t.includes('security') || t.includes('clean') || t.includes('consult') || t.includes('kawalan')) category = 'Perkhidmatan';
        }

        // Only add if it looks like real data (has money or valid vendor/ministry)
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
                contractUrl: contractUrl ? String(contractUrl).trim() : undefined,
                crawledAt: new Date().toISOString()
            });
        }
    });
    return cleanData;
  };

  const tryFetch = async (url: string, sourceName: string) => {
      console.log(`[GovWatch] Attempting to fetch from: ${sourceName} (${url})`);
      
      const fetchUrl = url; 
      
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const textData = await res.text();
      let jsonData;

      // PARSING LOGIC: Check if it's CSV or JSON
      const isCsv = url.toLowerCase().endsWith('.csv') || textData.trim().startsWith('Date,') || textData.trim().startsWith('No,') || textData.includes(',');

      if (isCsv) {
          try {
             const workbook = XLSX.read(textData, { type: 'string' });
             const sheetName = workbook.SheetNames[0];
             const sheet = workbook.Sheets[sheetName];
             jsonData = XLSX.utils.sheet_to_json(sheet);
             console.log(`[GovWatch] Parsed CSV from ${sourceName}. Rows: ${jsonData.length}`);
          } catch (e) {
             throw new Error("Failed to parse CSV data");
          }
      } else {
          // Try JSON
          try {
              jsonData = JSON.parse(textData);
          } catch (parseError: any) {
              console.warn(`[GovWatch] JSON Parse Error on ${sourceName}. Trying aggressive repair...`);
              const firstBracket = textData.indexOf('[');
              const lastBracket = textData.lastIndexOf(']');
              
              if (firstBracket !== -1 && lastBracket !== -1) {
                  const cleanText = textData.substring(firstBracket, lastBracket + 1);
                  jsonData = JSON.parse(cleanText);
              } else {
                   try {
                       const workbook = XLSX.read(textData, { type: 'string' });
                       jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                   } catch {
                       throw new Error(`Invalid format: ${parseError.message}`);
                   }
              }
          }
      }
      
      return processData(jsonData, sourceName);
  };

  // Auto-fetch data on startup
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    
    let loadedData: Record[] = [];

    for (const source of DATA_SOURCES) {
        try {
            loadedData = await tryFetch(source.url, source.name);
            if (loadedData.length > 0) break; // Success!

        } catch (e: any) {
            console.warn(`[GovWatch] Failed to load from ${source.name}: ${e.message}`);
        }
    }

    if (loadedData.length > 0) {
        setRecords(loadedData);
    } else {
        setErrorMsg("Could not load data from GitHub or local server.");
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
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
  const handleDataUpdate = (newData: Record[]) => {
      // Normalize imported data just in case
      const normalized = newData.map(r => ({
          ...r,
          ministry: cleanMinistryName(r.ministry)
      }));
      setRecords(normalized);
      setViewConfig({ view: 'dashboard' });
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