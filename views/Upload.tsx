import React, { useState } from 'react';
import { Upload as UploadIcon, FileJson, AlertTriangle, Lock, CheckCircle, Copy, Terminal, Server, Play, Loader2 } from 'lucide-react';
import { Record } from '../types';

interface UploadProps {
  onDataLoaded: (data: Record[]) => void;
}

export const Upload: React.FC<UploadProps> = ({ onDataLoaded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'success'>('idle');
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // HARDCODED PIN FOR MANUAL ADMIN ACCESS
  const ADMIN_PIN = "admin2024";

  const SCRAPER_SCRIPT = `(function() {
  const rows = document.querySelectorAll('table tbody tr');
  const data = [];
  
  const parseAmount = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/[^0-9.-]+/g, ""));
  };

  console.log('Processing ' + rows.length + ' rows...');

  rows.forEach((row, index) => {
    const cols = row.querySelectorAll('td');
    if (cols.length < 4) return;
    
    // Attempt to safely extract text
    const getText = (i) => cols[i]?.innerText?.trim() || "";

    const record = {
      id: index + 1,
      date: getText(0) || new Date().toISOString().split('T')[0],
      ministry: getText(1) || "Unknown Ministry",
      vendor: getText(2) || "Unknown Vendor",
      amount: parseAmount(getText(3)), 
      method: getText(4) || "Open Tender",
      reason: null
    };

    data.push(record);
  });

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'govwatch_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert('Successfully extracted ' + data.length + ' records! Upload the govwatch_data.json file to the dashboard.');
})();`;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
        setIsAuthenticated(true);
    } else {
        alert("Incorrect Access Code");
        setPin('');
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(SCRAPER_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- MANUAL UPLOAD HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setStatus('error');
      setErrorMessage('Please upload the govwatch_data.json file (JSON format).');
      return;
    }

    setStatus('processing');
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!Array.isArray(data)) {
          throw new Error("File content is not an array");
        }

        const response = await fetch('/api/update-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Server failed to save data');

        setStatus('success');
        setTimeout(() => { onDataLoaded(data as Record[]); }, 1500);
        
      } catch (err) {
        setStatus('error');
        setErrorMessage('Failed to process or save file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // --- AUTO SCRAPE HANDLER ---
  const handleAutoScrape = async () => {
    setScrapeStatus('running');
    try {
        const response = await fetch('/api/trigger-scrape', { method: 'POST' });
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Scrape failed');

        setScrapeStatus('success');
        
        // Reload data after a short delay
        setTimeout(() => {
             window.location.reload(); 
        }, 2000);

    } catch (err) {
        setScrapeStatus('error');
        console.error(err);
    }
  };

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn">
            <div className="bg-gw-card p-8 rounded-lg border border-gw-border shadow-2xl max-w-sm w-full">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gw-bg rounded-full border border-gw-border">
                        <Lock className="w-8 h-8 text-gw-muted" />
                    </div>
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-6">Restricted Access</h2>
                <form onSubmit={handleLogin}>
                    <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter Admin PIN"
                        className="w-full bg-gw-bg border border-gw-border text-center text-white p-3 rounded mb-4 focus:border-gw-success focus:outline-none tracking-widest"
                        autoFocus
                    />
                    <button 
                        type="submit"
                        className="w-full bg-gw-success text-gw-bg font-bold py-3 rounded hover:bg-gw-success/90 transition-colors"
                    >
                        Unlock
                    </button>
                </form>
            </div>
        </div>
    );
  }

  // 2. UPLOAD SCREEN (Authenticated)
  return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-gw-success/10 text-gw-success text-xs font-bold mb-4 border border-gw-success/20">
            ADMIN MODE ACTIVE
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Update Database</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* OPTION A: AUTO UPDATE (NEW) */}
        <div className="bg-gw-card border border-gw-border rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gw-success to-blue-500"></div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-gw-success" /> 
                Auto-Update
            </h3>
            <p className="text-sm text-gw-muted mb-6">
                Instruct the server to visit the government website, scrape the latest data, and update the database automatically.
            </p>

            <div className="mt-auto">
                {scrapeStatus === 'idle' && (
                    <button 
                        onClick={handleAutoScrape}
                        className="w-full py-4 bg-gw-success hover:bg-gw-success/90 text-gw-bg font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        <Play className="w-5 h-5" /> Start Scraper
                    </button>
                )}
                
                {scrapeStatus === 'running' && (
                    <div className="w-full py-4 bg-gw-card border border-gw-border rounded-lg flex items-center justify-center gap-3 text-gw-success">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Scraping in progress...</span>
                    </div>
                )}

                {scrapeStatus === 'success' && (
                    <div className="w-full py-4 bg-gw-success/10 border border-gw-success/20 rounded-lg flex items-center justify-center gap-2 text-gw-success font-bold">
                        <CheckCircle className="w-5 h-5" />
                        <span>Update Complete!</span>
                    </div>
                )}

                {scrapeStatus === 'error' && (
                    <div className="w-full py-4 bg-gw-danger/10 border border-gw-danger/20 rounded-lg flex items-center justify-center gap-2 text-gw-danger font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Server Error</span>
                    </div>
                )}
            </div>
            <p className="text-xs text-gw-muted mt-3 text-center opacity-70">
                Note: This process may take up to 60 seconds. Do not close this tab.
            </p>
        </div>

        {/* OPTION B: MANUAL UPLOAD */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gw-bg/50 p-6 rounded-xl border border-gw-border">
             {/* Left Col: Upload Box */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-gw-muted" /> 
                    Manual Upload
                </h3>
                <div 
                    className={`bg-gw-card border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 h-64 flex flex-col justify-center ${
                    isDragging 
                        ? 'border-gw-success bg-gw-success/5' 
                        : status === 'error' ? 'border-gw-danger'
                        : status === 'success' ? 'border-gw-success'
                        : 'border-gw-border'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {status === 'idle' && (
                    <>
                        <UploadIcon className="w-8 h-8 text-gw-muted mx-auto mb-4" />
                        <p className="text-gw-muted text-sm mb-4">Drag & drop <code>govwatch_data.json</code></p>
                        
                        <input type="file" id="file-upload" className="hidden" accept=".json" onChange={handleFileSelect} />
                        <label 
                        htmlFor="file-upload"
                        className="inline-flex items-center justify-center px-4 py-2 border border-gw-border text-sm font-medium rounded shadow-sm text-gw-text bg-gw-bg hover:bg-gw-card cursor-pointer transition-colors"
                        >
                        Browse Files
                        </label>
                    </>
                    )}

                    {status === 'processing' && (
                    <div>
                        <Loader2 className="w-8 h-8 text-gw-success animate-spin mx-auto mb-4" />
                        <p className="text-gw-text text-sm">Uploading...</p>
                    </div>
                    )}

                    {status === 'success' && (
                    <div>
                        <CheckCircle className="w-10 h-10 text-gw-success mx-auto mb-4" />
                        <p className="text-gw-text font-bold">Done</p>
                    </div>
                    )}

                    {status === 'error' && (
                    <div>
                        <AlertTriangle className="w-10 h-10 text-gw-danger mx-auto mb-4" />
                        <p className="text-gw-danger text-xs">{errorMessage}</p>
                        <button onClick={() => setStatus('idle')} className="text-gw-text underline text-xs mt-2">Reset</button>
                    </div>
                    )}
                </div>
            </div>

            {/* Right Col: Instructions */}
            <div className="bg-gw-card border border-gw-border rounded-xl p-4 flex flex-col">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gw-muted" /> 
                    Manual Extraction Guide
                </h3>
                
                <div className="space-y-3 text-xs text-gw-muted flex-1">
                    <p>1. Go to <a href="https://myprocurement.treasury.gov.my/results/tender" target="_blank" className="text-gw-success hover:underline">MyProcurement</a></p>
                    <p>2. Open Console (F12)</p>
                    <p>3. Run this script:</p>
                </div>

                <div className="mt-2 relative group">
                    <button 
                        onClick={handleCopyScript}
                        className="absolute top-2 right-2 bg-gw-success text-gw-bg p-1 rounded hover:bg-gw-success/90 transition-colors flex items-center gap-1 text-[10px] font-bold"
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <pre className="bg-gw-bg p-3 rounded text-[10px] font-mono text-gw-muted overflow-x-auto border border-gw-border h-24">
                        {SCRAPER_SCRIPT}
                    </pre>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};