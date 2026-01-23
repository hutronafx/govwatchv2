import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION ---
const URL_DN = 'https://myprocurement.treasury.gov.my/archive/direct-negotiations';
const URL_TENDER = 'https://myprocurement.treasury.gov.my/archive/results-tender';
const OUTPUT_PATH = path.resolve(__dirname, '../public/data.json');
const LOG_DIR = path.resolve(__dirname, '../public/debug_logs');
const TIMEOUT_MS = 60000;

// --- LOGGING SYSTEM ---
let logBuffer = "";

function log(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    console.log(line);
    logBuffer += line + "\n";
}

async function writeLogs() {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
        await fs.writeFile(path.join(LOG_DIR, 'latest.log'), logBuffer);
    } catch (e) {
        console.error("Failed to write logs to disk:", e);
    }
}

// --- UTILS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrape() {
  logBuffer = ""; // Reset log
  log(`=== STARTING SCRAPER (Debug Enabled) ===`);
  
  let browser;
  let allRecords = [];

  try {
    // Clean old debug files
    await fs.rm(LOG_DIR, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(LOG_DIR, { recursive: true });

    log("Launching Browser...");
    browser = await puppeteer.launch({
      headless: "new", 
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--window-size=1920,1080',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process' 
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Console Forwarding
    page.on('console', msg => log(`[BROWSER CONSOLE] ${msg.text()}`));
    page.on('pageerror', err => log(`[BROWSER ERROR] ${err.toString()}`));
    
    // Response Interception
    page.on('response', async (response) => {
        try {
            const url = response.url();
            const type = response.headers()['content-type'];
            if (type && (type.includes('json') || type.includes('plain')) && !url.includes('google')) {
                const text = await response.text();
                if (text.includes('ministry') || text.includes('Kementerian')) {
                    log(`[API MATCH] Found potential data in: ${url}`);
                    // Try parsing
                    try {
                        const json = JSON.parse(text);
                        const extracted = normalizeApiData(json, url);
                        if (extracted.length > 0) {
                            log(`   -> Extracted ${extracted.length} records from API.`);
                            allRecords.push(...extracted);
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        } catch (e) { /* ignore buffer errors */ }
    });

    // 1. DIRECT NEGOTIATIONS
    log(`Navigating to: ${URL_DN}`);
    await page.goto(URL_DN, { waitUntil: 'networkidle2', timeout: TIMEOUT_MS });
    await sleep(5000);
    
    // Save snapshot of what we see
    await page.screenshot({ path: path.join(LOG_DIR, 'step1_dn_loaded.png') });
    log("Saved screenshot: step1_dn_loaded.png");

    // 2. OPEN TENDERS
    log(`Navigating to: ${URL_TENDER}`);
    await page.goto(URL_TENDER, { waitUntil: 'networkidle2', timeout: TIMEOUT_MS });
    await sleep(5000);
    
    await page.screenshot({ path: path.join(LOG_DIR, 'step2_tender_loaded.png') });
    log("Saved screenshot: step2_tender_loaded.png");

    // 3. Fallback Visual Scrape if API failed
    if (allRecords.length === 0) {
        log("API interception yielded 0 records. Attempting DOM scrape...");
        const visualRecords = await scrapeVisual(page);
        log(`DOM Scrape found: ${visualRecords.length} records`);
        allRecords.push(...visualRecords);
    }

    // 4. Final Diagnostics
    if (allRecords.length === 0) {
        log("!!! FAILURE: 0 RECORDS FOUND !!!");
        const html = await page.content();
        await fs.writeFile(path.join(LOG_DIR, 'final_dom_dump.html'), html);
        log("Saved HTML dump to final_dom_dump.html");
        await page.screenshot({ path: path.join(LOG_DIR, 'final_error_state.png'), fullPage: true });
        log("Saved fullpage screenshot to final_error_state.png");
    } else {
        await saveData(allRecords);
    }

    log(`=== FINISHED. Total Records: ${allRecords.length} ===`);

  } catch (error) {
    log(`[CRITICAL ERROR] ${error.message}`);
    log(error.stack);
  } finally {
    await writeLogs();
    if (browser) await browser.close();
  }
}

// ... existing helper functions ...
function normalizeApiData(json, sourceUrl) {
    const results = [];
    const now = new Date().toISOString();
    const findArrays = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    const str = JSON.stringify(item).toLowerCase();
                    if (str.includes('nilai') || str.includes('harga') || str.includes('amount')) {
                        const ministry = item.kementerian || item.ministry || item.agency || "Unknown Ministry";
                        const vendor = item.nama_syarikat || item.vendor_name || item.petender || "Unknown Vendor";
                        const amountRaw = item.nilai_perolehan || item.harga_setuju_terima || item.amount || item.price || 0;
                        const reason = item.tajuk || item.project_title || item.reason || null;
                        const date = item.tarikh_surat || item.date || new Date().toISOString().split('T')[0];
                        
                        let amount = 0;
                        if (typeof amountRaw === 'number') amount = amountRaw;
                        else if (typeof amountRaw === 'string') amount = parseFloat(amountRaw.replace(/[^0-9.]/g, ''));

                        if (amount > 0) {
                            results.push({
                                ministry, vendor, amount,
                                method: sourceUrl.includes('direct') ? "Direct Negotiation" : "Open Tender",
                                category: "General",
                                date, reason, sourceUrl, crawledAt: now
                            });
                        }
                    }
                }
            });
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(val => findArrays(val));
        }
    };
    findArrays(json);
    return results;
}

async function scrapeVisual(page) {
    return await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll('tr, div.card');
        rows.forEach(el => {
            const text = el.innerText;
            if (text.length < 20) return;
            
            const moneyMatch = text.match(/RM\s?([0-9,.]+)/i);
            if (!moneyMatch) return;
            const amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
            
            let vendor = "Unknown Vendor";
            if (text.includes("Syarikat")) vendor = text.split("Syarikat")[1].split('\n')[0];
            else if (text.includes("Petender")) vendor = text.split("Petender")[1].split('\n')[0];
            
            let ministry = "Unknown Ministry";
            if (text.includes("Kementerian")) ministry = text.split("Kementerian")[1].split('\n')[0];
            
            if (amount > 0) {
                results.push({
                    ministry: ministry.replace(/[:\n]/g, '').trim(),
                    vendor: vendor.replace(/[:\n]/g, '').trim(),
                    amount,
                    method: document.location.href.includes('direct') ? "Direct Negotiation" : "Open Tender",
                    category: "General",
                    date: new Date().toISOString().split('T')[0],
                    sourceUrl: document.location.href,
                    crawledAt: new Date().toISOString()
                });
            }
        });
        return results;
    });
}

async function saveData(newRecords) {
    let finalData = [];
    try {
        const publicDir = path.dirname(OUTPUT_PATH);
        try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }
        
        try {
            const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
            finalData = JSON.parse(raw);
        } catch { /* ignore */ }

        const existingSigs = new Set(finalData.map(r => `${r.vendor}-${r.amount}-${r.ministry}`));
        newRecords.forEach(r => {
            const sig = `${r.vendor}-${r.amount}-${r.ministry}`;
            if (!existingSigs.has(sig)) {
                r.id = finalData.length + 1;
                finalData.push(r);
                existingSigs.add(sig);
            }
        });

        await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
        log(`Database updated. Total records: ${finalData.length}`);
    } catch (e) {
        log(`Save Error: ${e.message}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };