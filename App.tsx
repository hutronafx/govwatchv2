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
import { AlertTriangle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

function AppContent() {
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ view: 'dashboard' });
  const [records, setRecords] = useState<Record[]>(INITIAL_RECORDS);
  const [isLoading, setIsLoading] = useState(true);
  const [dataMode, setDataMode] = useState<'live' | 'demo' | 'local'>('demo');

  // Auto-fetch data on startup
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Direct link to the raw Excel file on GitHub
      const EXCEL_URL = 'https://raw.githubusercontent.com/hutronafx/govwatchv2/main/Myprocurementdata%20complete.xlsx';
      
      console.log(`[GovWatch] Fetching Database: ${EXCEL_URL}`);
      
      const response = await fetch(EXCEL_URL);
      
      if (response.ok) {
        // Parse Excel File
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const cleanData: Record[] = [];
        
        jsonData.forEach((row: any, index: number) => {
            // Flexible Column Mapping (Handles different Excel header names)
            const ministry = row['Ministry'] || row['Kementerian'] || row['Agency'] || row['Agensi'] || "Unknown Ministry";
            const vendor = row['Vendor'] || row['Petender'] || row['Tenderer'] || row['Nama Syarikat'] || row['Company'] || "Unknown Vendor";
            const title = row['Title'] || row['Tajuk'] || row['Description'] || row['Tajuk Projek'] || "";
            const method = row['Method'] || row['Kaedah'] || row['Procurement Method'] || "Open Tender";
            
            // Amount Cleaning (Remove RM, commas, etc)
            let amount = 0;
            const rawAmount = row['Price'] || row['Nilai'] || row['Harga'] || row['Amount'] || row['Contract Value'];
            if (typeof rawAmount === 'number') amount = rawAmount;
            else if (typeof rawAmount === 'string') {
                amount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ""));
            }

            // Date Cleaning
            let dateStr = row['Date'] || row['Tarikh'] || row['Award Date'] || new Date().toISOString().split('T')[0];
            if (typeof dateStr === 'number') {
                // Handle Excel serial date
                const dateObj = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
                dateStr = dateObj.toISOString().split('T')[0];
            } else if (typeof dateStr === 'string') {
                // Try parsing standard date strings
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString().split('T')[0];
                }
            }

            // Category Inference (if missing)
            let category = row['Category'] || row['Kategori'] || "General";
            if (category === "General" || !category) {
                 const t = (title || "").toLowerCase();
                 if (t.includes('bina') || t.includes('road') || t.includes('bangunan') || t.includes('kerja') || t.includes('upgrad')) category = 'Kerja';
                 else if (t.includes('supply') || t.includes('bekal') || t.includes('ubat') || t.includes('equipment')) category = 'Bekalan';
                 else if (t.includes('service') || t.includes('khidmat') || t.includes('sewa') || t.includes('lanti')) category = 'Perkhidmatan';
            }

            // Only add valid rows (Must have a value or valid entities)
            if (amount > 0 || (ministry !== "Unknown Ministry" && vendor !== "Unknown Vendor")) {
                cleanData.push({
                    id: index + 1,
                    ministry: String(ministry).trim(),
                    vendor: String(vendor).trim(),
                    amount: amount || 0,
                    method: String(method).trim(),
                    category: String(category).trim(),
                    date: String(dateStr).trim(),
                    title: String(title).trim(),
                    sourceUrl: EXCEL_URL,
                    crawledAt: new Date().toISOString()
                });
            }
        });

        if (cleanData.length > 0) {
          console.log(`[GovWatch] Loaded ${cleanData.length} valid records from Excel.`);
          setRecords(cleanData);
          setDataMode('live');
        } else {
            console.warn("[GovWatch] Excel parsed but 0 valid records found. Using Demo Data.");
        }
      } else {
          console.error(`[GovWatch] Failed to fetch GitHub Excel file: ${response.status} ${response.statusText}`);
          // Fallback to local data.json if available
          const fallbackRes = await fetch('/data.json');
          if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                  setRecords(fallbackData);
                  setDataMode('local');
              }
          }
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
              <span>Viewing <strong>Demo Data</strong>. Unable to connect to GitHub database.</span>
              <button onClick={() => window.location.reload()} className="underline hover:text-white">Retry</button>
          </div>
      )}
      
      {dataMode === 'live' && !isLoading && (
          <div className="bg-gw-success/10 border-b border-gw-success/20 px-4 py-1 text-center text-[10px] text-gw-success flex items-center justify-center gap-2">
              <Database className="w-3 h-3" />
              <span>Connected to Live GitHub Database</span>
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