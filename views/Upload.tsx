import React, { useState } from 'react';
import { Upload as UploadIcon, FileJson, AlertTriangle, Lock, CheckCircle, Copy, Terminal, Server, Play, Loader2, Download, FileText, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { Record } from '../types';

interface UploadProps {
  onDataLoaded: (data: Record[]) => void;
}

export const Upload: React.FC<UploadProps> = ({ onDataLoaded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'success'>('idle');
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'warning'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [scrapeMsg, setScrapeMsg] = useState('');
  
  // Debug Log State
  const [logContent, setLogContent] = useState<string>('');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  const ADMIN_PIN = "admin2024";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
        setIsAuthenticated(true);
    } else {
        alert("Incorrect Access Code");
        setPin('');
    }
  };

  const handleAutoScrape = async () => {
    setScrapeStatus('running');
    setScrapeMsg('Initializing browser & running diagnostics...');
    setLogContent('');
    setIsLogOpen(false);
    
    try {
        const response = await fetch('/api/trigger-scrape', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            // Fresh fetch
            const dataRes = await fetch('/data.json');
            const dataJson = await dataRes.json();
            
            if (result.count === 0) {
                setScrapeStatus('warning');
                setScrapeMsg("Scraper ran but found 0 records. Debug info generated.");
            } else {
                setScrapeStatus('success');
                setScrapeMsg(`Success! Total records: ${result.count}`);
                setTimeout(() => {
                    if(confirm(`Scrape complete. ${result.count} records. Load dashboard?`)) onDataLoaded(dataJson);
                }, 500);
            }
        } else {
            throw new Error(result.message || 'Scrape failed');
        }

    } catch (err: any) {
        setScrapeStatus('error');
        setScrapeMsg(err.message || "Connection failed");
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
    } catch (e) {
        alert("Could not load log file. It may not exist yet.");
    } finally {
        setIsLoadingLog(false);
    }
  };

  const copyLogToClipboard = () => {
    navigator.clipboard.writeText(logContent);
    alert("Log copied to clipboard! You can now paste it into the chat.");
  };

  // ... manual upload handlers ...
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
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
    if (!file.name.endsWith('.json')) { setStatus('error'); setErrorMessage('Invalid JSON'); return; }
    setStatus('processing');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rawData = JSON.parse(text);
        if (!Array.isArray(rawData)) throw new Error("Not an array");
        await fetch('/api/update-data', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(rawData) });
        setStatus('success');
        setTimeout(() => { onDataLoaded(rawData); }, 1500);
      } catch (err) { setStatus('error'); setErrorMessage('Failed to process file.'); }
    };
    reader.readAsText(file);
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
                <h2 className="text-xl font-bold text-white text-center mb-6">Restricted Access</h2>
                <form onSubmit={handleLogin}>
                    <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter Admin PIN" className="w-full bg-gw-bg border border-gw-border text-center text-white p-3 rounded mb-4 focus:border-gw-success focus:outline-none tracking-widest" autoFocus />
                    <button type="submit" className="w-full bg-gw-success text-gw-bg font-bold py-3 rounded hover:bg-gw-success/90 transition-colors">Unlock</button>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-gw-success/10 text-gw-success text-xs font-bold mb-4 border border-gw-success/20">ADMIN MODE ACTIVE</div>
        <h1 className="text-3xl font-bold text-white mb-2">Update Database</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* AUTO UPDATE */}
        <div className="bg-gw-card border border-gw-border rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gw-success to-blue-500"></div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-gw-success" /> Auto-Update
            </h3>
            
            <div className="mt-auto space-y-3">
                {scrapeStatus === 'idle' && (
                    <button onClick={handleAutoScrape} className="w-full py-4 bg-gw-success hover:bg-gw-success/90 text-gw-bg font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                        <Play className="w-5 h-5" /> Start Scraper
                    </button>
                )}
                
                {scrapeStatus === 'running' && (
                    <div className="w-full py-4 bg-gw-card border border-gw-border rounded-lg flex flex-col items-center justify-center gap-2 text-gw-success">
                        <div className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>Scraping...</span></div>
                        <span className="text-xs text-gw-muted">{scrapeMsg}</span>
                    </div>
                )}

                {scrapeStatus === 'success' && (
                    <div className="w-full py-4 bg-gw-success/10 border border-gw-success/20 rounded-lg flex flex-col items-center justify-center gap-1 text-gw-success font-bold">
                        <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /><span>Complete!</span></div>
                        <span className="text-xs font-normal opacity-80">{scrapeMsg}</span>
                    </div>
                )}
            </div>

            {/* DEBUG PANEL */}
            {(scrapeStatus === 'error' || scrapeStatus === 'warning') && (
                <div className="mt-4 p-4 bg-gw-danger/10 border border-gw-danger/30 rounded-lg animate-fadeIn">
                    <div className="flex items-center justify-between gap-2 text-gw-danger font-bold mb-2">
                        <div className="flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4" />
                             <span>Scraper Issues Detected</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button 
                            onClick={fetchLog} 
                            className="flex items-center justify-center gap-2 p-2 bg-gw-bg rounded border border-gw-border hover:border-gw-text transition-colors text-xs text-gw-text"
                            disabled={isLoadingLog}
                        >
                            {isLoadingLog ? <Loader2 className="w-3 h-3 animate-spin" /> : <Terminal className="w-3 h-3" />}
                            {isLogOpen ? 'Refresh Log' : 'View Log'}
                        </button>
                        
                        <div className="flex gap-1">
                             <a href="/debug_logs/final_error_state.png" target="_blank" className="flex-1 flex items-center justify-center p-2 bg-gw-bg rounded border border-gw-border hover:border-gw-text transition-colors" title="View Screenshot">
                                <Image className="w-3 h-3 text-blue-400" />
                            </a>
                            <a href="/debug_logs/final_dom_dump.html" target="_blank" className="flex-1 flex items-center justify-center p-2 bg-gw-bg rounded border border-gw-border hover:border-gw-text transition-colors" title="View HTML">
                                <FileJson className="w-3 h-3 text-orange-400" />
                            </a>
                        </div>
                    </div>

                    {isLogOpen && (
                        <div className="animate-fadeIn">
                            <textarea 
                                readOnly 
                                value={logContent} 
                                className="w-full h-32 bg-black text-green-400 font-mono text-[10px] p-2 rounded border border-gw-border focus:outline-none mb-2 resize-none"
                            />
                            <button 
                                onClick={copyLogToClipboard}
                                className="w-full py-1 bg-gw-card hover:bg-gw-border text-xs text-white rounded border border-gw-border flex items-center justify-center gap-2 transition-colors"
                            >
                                <Copy className="w-3 h-3" /> Copy Log to Clipboard
                            </button>
                            <p className="text-[10px] text-gw-muted mt-2 text-center">
                                Paste this log into the chat for instant debugging.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* MANUAL UPLOAD */}
        <div className="lg:col-span-2 bg-gw-bg/50 p-6 rounded-xl border border-gw-border">
             <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <FileJson className="w-5 h-5 text-gw-muted" /> Manual Upload
             </h3>
             <div className={`bg-gw-card border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 h-64 flex flex-col justify-center ${isDragging ? 'border-gw-success bg-gw-success/5' : status === 'error' ? 'border-gw-danger' : 'border-gw-border'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                {status === 'idle' && (
                <>
                    <UploadIcon className="w-8 h-8 text-gw-muted mx-auto mb-4" />
                    <p className="text-gw-muted text-sm mb-4">Drag & drop <code>govwatch_data.json</code></p>
                    <input type="file" id="file-upload" className="hidden" accept=".json" onChange={handleFileSelect} />
                    <label htmlFor="file-upload" className="inline-flex items-center justify-center px-4 py-2 border border-gw-border text-sm font-medium rounded shadow-sm text-gw-text bg-gw-bg hover:bg-gw-card cursor-pointer transition-colors">Browse Files</label>
                </>
                )}
                {status === 'processing' && (<div><Loader2 className="w-8 h-8 text-gw-success animate-spin mx-auto mb-4" /><p>Processing...</p></div>)}
                {status === 'success' && (<div><CheckCircle className="w-10 h-10 text-gw-success mx-auto mb-4" /><p className="font-bold">Success</p></div>)}
                {status === 'error' && (<div><AlertTriangle className="w-10 h-10 text-gw-danger mx-auto mb-4" /><p className="text-gw-danger text-xs">{errorMessage}</p><button onClick={() => setStatus('idle')} className="underline text-xs mt-2">Try Again</button></div>)}
            </div>
        </div>
      </div>
    </div>
  );
};