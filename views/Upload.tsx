import React, { useState } from 'react';
import { Upload as UploadIcon, FileJson, AlertTriangle, Lock, CheckCircle, Copy, Terminal, Server, Play, Loader2, FileSpreadsheet, Code } from 'lucide-react';
import { Record } from '../types';
import { useLanguage } from '../i18n';
import * as XLSX from 'xlsx';

interface UploadProps {
  onDataLoaded: (data: Record[]) => void;
}

// UPDATED CLIENT-SIDE SCRIPT FOR CARDS
const BROWSER_SCRIPT = `
(function() {
  console.log("GovWatch Card Scraper Started...");
  const data = [];
  const now = new Date().toISOString();
  
  // Find all divs that might be cards (contain "RM")
  const allDivs = Array.from(document.querySelectorAll('div, article, section'));
  const potentialCards = allDivs.filter(div => {
     const txt = div.innerText || "";
     return txt.includes("RM") && txt.length < 2000 && txt.length > 30;
  });
  
  potentialCards.forEach((card, index) => {
    const text = card.innerText;

    // 1. Price
    const moneyMatch = text.match(/RM\\s?([0-9,.]+)/i);
    if (!moneyMatch) return;
    const amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount === 0) return;

    // 2. Vendor
    let vendor = "Unknown Vendor";
    const vMatch = text.match(/(?:Syarikat|Petender|Oleh)[:\\s]*([^\\n]+)/i);
    if (vMatch) vendor = vMatch[1];
    else if (text.includes("Sdn Bhd")) {
        const lines = text.split('\\n');
        const vLine = lines.find(l => l.includes("Sdn Bhd"));
        if(vLine) vendor = vLine;
    }
    
    // 3. Ministry
    let ministry = "Unknown Ministry";
    const mMatch = text.match(/(?:Kementerian|Jabatan)[:\\s]*([^\\n]+)/i);
    if (mMatch) ministry = "Kementerian " + mMatch[1];

    // Dedupe
    const isDup = data.some(d => d.amount === amount && d.vendor === vendor);
    if(!isDup) {
        data.push({
            id: data.length + 1,
            date: new Date().toISOString().split('T')[0],
            ministry: ministry.replace(/[:]/g, '').trim(),
            vendor: vendor.replace(/[:]/g, '').trim(),
            amount: amount, 
            method: window.location.href.includes('direct') ? "Direct Negotiation" : "Open Tender",
            category: "General",
            sourceUrl: window.location.href,
            crawledAt: now
        });
    }
  });

  console.log("Extracted " + data.length + " records from cards.");
  if(data.length > 0) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    a.download = 'govwatch_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    alert("No card records found. Ensure you are on the results page.");
  }
})();
`.trim();

export const Upload: React.FC<UploadProps> = ({ onDataLoaded }) => {
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'success'>('idle');
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'warning'>('idle');
  const [scrapeMsg, setScrapeMsg] = useState('');
  
  // Debug Log State
  const [logContent, setLogContent] = useState<string>('');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  const ADMIN_PIN = "admin2024";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) setIsAuthenticated(true);
    else { alert("Incorrect Access Code"); setPin(''); }
  };

  const handleAutoScrape = async () => {
    setScrapeStatus('running');
    setScrapeMsg(t.loading_scraper);
    setLogContent('');
    setIsLogOpen(false);
    
    try {
        const response = await fetch('/api/trigger-scrape', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            const dataRes = await fetch('/data.json');
            const dataJson = await dataRes.json();
            
            if (result.count === 0) {
                setScrapeStatus('warning');
                setScrapeMsg(t.admin_scrape_fail_blocked);
            } else {
                setScrapeStatus('success');
                setScrapeMsg(`${t.admin_scrape_success} ${result.count}`);
                setTimeout(() => {
                    if(confirm(`${t.admin_scrape_success} ${result.count}. ${t.admin_load_dashboard}`)) onDataLoaded(dataJson);
                }, 500);
            }
        } else {
            throw new Error(result.message || 'Scrape failed');
        }

    } catch (err: any) {
        setScrapeStatus('error');
        setScrapeMsg(err.message || t.scraper_network_error);
    }
  };

  const fetchLog = async () => {
    setIsLoadingLog(true);
    try {
        const res = await fetch('/debug_logs/debug_log.txt');
        if (!res.ok) throw new Error("Log file not found");
        const text = await res.text();
        setLogContent(text);
        setIsLogOpen(true);
    } catch (e) { alert("Could not load log file."); } 
    finally { setIsLoadingLog(false); }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(BROWSER_SCRIPT);
    alert("Script copied!");
  };

  // Manual Upload Handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); };
  
  const processFile = (file: File) => {
    setStatus('processing');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isJson = file.name.endsWith('.json');

    if (!isExcel && !isJson) { 
        setStatus('error'); 
        alert("Please upload an Excel (.xlsx) or JSON file.");
        return; 
    }

    const reader = new FileReader();
    
    if (isExcel) {
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                
                // Map Excel Columns to Application Schema
                const mappedData: Record[] = jsonData.map((row: any, index: number) => {
                    // Excel Date Parsing
                    let dateStr = new Date().toISOString().split('T')[0];
                    if (row['Date']) {
                        if (typeof row['Date'] === 'number') {
                            // Handle Excel Serial Date
                            const dateObj = new Date(Math.round((row['Date'] - 25569) * 86400 * 1000));
                            dateStr = dateObj.toISOString().split('T')[0];
                        } else {
                            dateStr = String(row['Date']);
                        }
                    }

                    // Price Parsing
                    let amount = 0;
                    if (row['Price']) {
                        if (typeof row['Price'] === 'number') amount = row['Price'];
                        else {
                            const clean = String(row['Price']).replace(/[^0-9.]/g, '');
                            amount = parseFloat(clean) || 0;
                        }
                    }

                    return {
                        id: index + 1,
                        title: row['Title'] || row['Tajuk'] || '',
                        tenderNo: row['Tender No.'] || row['No. Tender'] || '',
                        category: row['Category'] || row['Kategori'] || 'General',
                        ministry: row['Ministry'] || row['Kementerian'] || 'Unknown Ministry',
                        vendor: row['Tenderer'] || row['Petender'] || 'Unknown Vendor',
                        address: row['Address'] || '',
                        date: dateStr,
                        amount: amount,
                        method: (row['Method'] || 'Open Tender'), // Default if not in excel
                        crawledAt: new Date().toISOString()
                    };
                });

                if (mappedData.length === 0) throw new Error("No valid rows found");

                await fetch('/api/update-data', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(mappedData) });
                setStatus('success');
                setTimeout(() => { onDataLoaded(mappedData); }, 1500);

            } catch (err) {
                console.error(err);
                setStatus('error');
                alert("Failed to parse Excel file. Ensure columns match: Title, Tender No., Ministry, Tenderer, Price, Date");
            }
        };
        reader.readAsBinaryString(file);
    } else {
        // JSON Handling
        reader.onload = async (e) => {
            try {
                const rawData = JSON.parse(e.target?.result as string);
                if (!Array.isArray(rawData)) throw new Error("Not an array");
                await fetch('/api/update-data', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(rawData) });
                setStatus('success');
                setTimeout(() => { onDataLoaded(rawData); }, 1500);
            } catch (err) { setStatus('error'); }
        };
        reader.readAsText(file);
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn">
            <div className="bg-gw-card p-8 rounded-lg border border-gw-border shadow-2xl max-w-sm w-full">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gw-bg rounded-full border border-gw-border">
                        <Lock className="w-8 h-8 text-gw-muted" />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-6">{t.admin_restricted}</h2>
                <form onSubmit={handleLogin}>
                    <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={t.admin_enter_pin} className="w-full bg-gw-bg border border-gw-border text-center text-white p-3 rounded mb-4 focus:border-gw-success focus:outline-none tracking-widest" autoFocus />
                    <button type="submit" className="w-full bg-gw-success text-gw-bg font-bold py-3 rounded hover:bg-gw-success/90 transition-colors">{t.admin_unlock}</button>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-gw-success/10 text-gw-success text-xs font-bold mb-4 border border-gw-success/20">{t.admin_mode_active}</div>
        <h1 className="text-3xl font-bold text-white mb-2">{t.admin_update_db}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* EXCEL UPLOAD (Main) */}
        <div className="bg-gw-card border border-gw-border rounded-xl p-6 flex flex-col relative overflow-hidden lg:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-400" /> Excel Data Upload
            </h3>
            
            <div className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-gw-border hover:border-gw-success transition-all rounded-lg p-8 bg-gw-bg/50"
                 onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                
                {status === 'idle' && (
                    <>
                        <UploadIcon className="w-12 h-12 text-gw-muted mb-4" />
                        <h4 className="text-white font-bold mb-2">Drag & Drop your Excel file here</h4>
                        <p className="text-gw-muted text-sm mb-6 text-center max-w-md">
                            Supports .xlsx files with columns: No, Title, Tender No, Category, Ministry, Tenderer, Address, Date, Price.
                        </p>
                        <label className="px-6 py-3 bg-gw-success text-gw-bg font-bold rounded-lg cursor-pointer hover:bg-gw-success/90 transition-colors">
                            Select Spreadsheet
                            <input type="file" className="hidden" accept=".xlsx,.xls,.json" onChange={handleFileSelect} />
                        </label>
                    </>
                )}
                {status === 'processing' && (
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-gw-success animate-spin mx-auto mb-4" />
                        <p className="text-white">Processing Data...</p>
                        <p className="text-gw-muted text-xs">Parsing spreadsheet and standardizing fields.</p>
                    </div>
                )}
                {status === 'success' && (
                    <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-gw-success mx-auto mb-4" />
                        <p className="text-white font-bold">Upload Complete</p>
                        <p className="text-gw-muted text-sm">Redirecting to dashboard...</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="text-center">
                        <AlertTriangle className="w-12 h-12 text-gw-danger mx-auto mb-4" />
                        <p className="text-gw-danger font-bold">Upload Failed</p>
                        <p className="text-gw-muted text-sm mb-4">Please ensure the file format is correct.</p>
                        <button onClick={() => setStatus('idle')} className="text-blue-400 text-sm hover:underline">Try Again</button>
                    </div>
                )}
            </div>
        </div>

        {/* SIDEBAR TOOLS */}
        <div className="space-y-6">
            {/* AUTO UPDATE */}
            <div className="bg-gw-card border border-gw-border rounded-xl p-6 flex flex-col relative overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-gw-success" /> {t.admin_server_scraper}
                </h3>
                
                <div className="space-y-3">
                    <p className="text-xs text-gw-muted">{t.admin_server_desc}</p>
                    {scrapeStatus === 'idle' && (
                        <button onClick={handleAutoScrape} className="w-full py-4 bg-gw-success hover:bg-gw-success/90 text-gw-bg font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                            <Play className="w-5 h-5" /> {t.admin_start_scrape}
                        </button>
                    )}
                    {scrapeStatus === 'running' && (
                        <div className="w-full py-4 bg-gw-card border border-gw-border rounded-lg flex flex-col items-center justify-center gap-2 text-gw-success">
                            <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>{t.admin_running}</span></div>
                            <span className="text-xs text-gw-muted">{scrapeMsg}</span>
                        </div>
                    )}
                    {(scrapeStatus === 'error' || scrapeStatus === 'warning') && (
                        <div className="mt-2 p-3 bg-gw-danger/10 border border-gw-danger/30 rounded text-center">
                            <div className="text-gw-danger font-bold text-sm mb-2 flex items-center justify-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> {t.admin_issue}
                            </div>
                            <button onClick={fetchLog} className="text-xs underline text-gw-text hover:text-white flex items-center justify-center gap-1 mx-auto">
                            {isLoadingLog ? <Loader2 className="w-3 h-3 animate-spin"/> : <Terminal className="w-3 h-3" />}
                            {isLogOpen ? t.admin_refresh_log : t.admin_view_log}
                            </button>
                        </div>
                    )}
                    {isLogOpen && (
                        <textarea readOnly value={logContent} className="w-full h-32 bg-black text-green-400 font-mono text-[10px] p-2 rounded border border-gw-border resize-none" />
                    )}
                </div>
            </div>

            {/* JSON FALLBACK */}
            <div className="bg-gw-card border border-gw-border rounded-xl p-6">
                 <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                    <FileJson className="w-4 h-4 text-orange-400" /> Legacy JSON
                 </h3>
                 <p className="text-xs text-gw-muted mb-2">For developers or backup restoration.</p>
                 <label className="block w-full text-center py-2 border border-gw-border rounded text-xs text-gw-text cursor-pointer hover:bg-gw-bg">
                    Upload .json
                    <input type="file" className="hidden" accept=".json" onChange={handleFileSelect} />
                 </label>
            </div>
        </div>

      </div>
    </div>
  );
};