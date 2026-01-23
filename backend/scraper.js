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
const TIMEOUT_MS = 60000; // Reduced to 60s since we are blocking assets

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
        await fs.writeFile(path.join(LOG_DIR, 'debug_log.txt'), logBuffer);
    } catch (e) {
        console.error("Failed to write logs to disk:", e);
    }
}

// --- UTILS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function autoScroll(page) {
    log("   -> Auto-scrolling...");
    try {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if(totalHeight >= scrollHeight || totalHeight > 5000){ // Limit scroll
                        clearInterval(timer);
                        resolve();
                    }
                }, 50);
            });
        });
    } catch (e) {
        log("   -> Scroll warning: " + e.message);
    }
}

async function scrape() {
  logBuffer = ""; 
  log(`=== STARTING SCRAPER V3 (Optimized) ===`);
  
  let browser;
  let allRecords = [];

  try {
    await fs.rm(LOG_DIR, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(LOG_DIR, { recursive: true });

    log("Launching Browser...");
    browser = await puppeteer.launch({
      headless: "new", 
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--window-size=1366,768',
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--blink-settings=imagesEnabled=false' // Disable images at launch
      ]
    });
    
    const page = await browser.newPage();
    
    // 1. OPTIMIZATION: Block heavy resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Console Forwarding
    page.on('console', msg => {
        if(!msg.text().includes('ERR_')) log(`[BROWSER] ${msg.text().substring(0, 100)}...`);
    });

    // API Sniffing
    page.on('response', async (response) => {
        try {
            const url = response.url();
            const type = response.headers()['content-type'];
            if (type && (type.includes('json') || type.includes('plain')) && !url.includes('google')) {
                const text = await response.text();
                if (text.includes('amount') || text.includes('nilai')) {
                    log(`[API] Captured data from: ${url}`);
                    const json = JSON.parse(text);
                    const extracted = normalizeApiData(json, url);
                    if (extracted.length > 0) allRecords.push(...extracted);
                }
            }
        } catch (e) { }
    });

    // --- NAVIGATION ---
    const navigate = async (url, label) => {
        log(`Navigating to ${label}...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            
            // Fail-fast check
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes("site can’t be reached") || bodyText.includes("ERR_CONNECTION_TIMED_OUT")) {
                throw new Error("Target site is unreachable from this server (IP Blocked/Timeout).");
            }

            await sleep(3000);
            await autoScroll(page);
            await page.screenshot({ path: path.join(LOG_DIR, `${label}.png`) });
        } catch (e) {
            log(`[WARN] ${label} navigation failed: ${e.message}`);
        }
    };

    await navigate(URL_DN, 'direct_nego');
    await navigate(URL_TENDER, 'tenders');

    // --- FALLBACK SCRAPE ---
    if (allRecords.length === 0) {
        log("No API data found. Attempting DOM scrape...");
        const visualRecords = await scrapeVisual(page);
        allRecords.push(...visualRecords);
    }

    if (allRecords.length === 0) {
        log("!!! FAILURE: 0 RECORDS FOUND !!!");
        log("SUGGESTION: The server IP might be blocked. Use the Client-Side Script in the 'Upload' tab.");
        const html = await page.content();
        await fs.writeFile(path.join(LOG_DIR, 'final_dom_dump.html'), html);
        await page.screenshot({ path: path.join(LOG_DIR, 'final_error_state.png'), fullPage: true });
    } else {
        await saveData(allRecords);
    }

    log(`=== FINISHED. Records: ${allRecords.length} ===`);

  } catch (error) {
    log(`[CRITICAL] ${error.message}`);
  } finally {
    await writeLogs();
    if (browser) await browser.close();
  }
}

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
                        const date = item.tarikh_surat || item.date || new Date().toISOString().split('T')[0];
                        
                        let amount = 0;
                        if (typeof amountRaw === 'number') amount = amountRaw;
                        else if (typeof amountRaw === 'string') amount = parseFloat(amountRaw.replace(/[^0-9.]/g, ''));

                        if (amount > 0) {
                            results.push({
                                ministry, vendor, amount,
                                method: sourceUrl.includes('direct') ? "Direct Negotiation" : "Open Tender",
                                category: "General",
                                date: String(date).split('T')[0], 
                                reason: item.reason || null, 
                                sourceUrl, crawledAt: now
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
        const rows = document.querySelectorAll('tr, div.card, div[role="row"]');
        rows.forEach(el => {
            const text = el.innerText;
            const moneyMatch = text.match(/RM\s?([0-9,.]+)/i);
            if (!moneyMatch) return;
            
            const amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
            if(amount === 0) return;

            let vendor = "Unknown Vendor";
            if (text.includes("Syarikat")) vendor = text.split("Syarikat")[1].split('\n')[0];
            else if (text.includes("Petender")) vendor = text.split("Petender")[1].split('\n')[0];
            
            let ministry = "Unknown Ministry";
            if (text.includes("Kementerian")) ministry = "Kementerian" + text.split("Kementerian")[1].split('\n')[0];
            
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
        });
        return results;
    });
}

async function saveData(newRecords) {
    let finalData = [];
    try {
        const publicDir = path.dirname(OUTPUT_PATH);
        try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }
        try { finalData = JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf-8')); } catch { }

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
    } catch (e) { log(`Save Error: ${e.message}`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { scrape(); }

export { scrape };