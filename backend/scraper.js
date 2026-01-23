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
const TIMEOUT_MS = 90000; // Increased to 90s

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
    log("   -> Auto-scrolling to trigger lazy loads...");
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Stop scrolling if we've reached the bottom or it's been too long (e.g., infinite scroll safeguard)
                if(totalHeight >= scrollHeight || totalHeight > 15000){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
    log("   -> Scroll complete.");
}

async function scrape() {
  logBuffer = ""; // Reset log
  log(`=== STARTING SCRAPER V2 (Stealth Mode) ===`);
  log(`Node: ${process.version}, Platform: ${process.platform}`);
  
  let browser;
  let allRecords = [];

  try {
    // Clean old debug files
    await fs.rm(LOG_DIR, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(LOG_DIR, { recursive: true });

    log("Launching Browser with Stealth settings...");
    browser = await puppeteer.launch({
      headless: "new", 
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--window-size=1920,1080',
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled' // HIDDEN FLAG
      ]
    });
    
    const page = await browser.newPage();
    
    // ANTI-DETECTION MEASURES
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluateOnNewDocument(() => {
        // Overwrite the `navigator.webdriver` property to pass basic bot detection
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Console & Error Forwarding
    page.on('console', msg => {
        const text = msg.text();
        if (!text.includes('ERR_BLOCKED_BY_CLIENT')) { // Ignore ad-blocker noise
             log(`[BROWSER CONSOLE] ${text}`);
        }
    });
    page.on('pageerror', err => log(`[BROWSER ERROR] ${err.toString()}`));
    
    // Response Interception (JSON API Sniffing)
    page.on('response', async (response) => {
        try {
            const url = response.url();
            const type = response.headers()['content-type'];
            
            if (type && (type.includes('json') || type.includes('plain')) && !url.includes('google')) {
                const text = await response.text();
                // Heuristic: Does it look like procurement data?
                if (text.includes('kementerian') || text.includes('amount') || text.includes('nilai')) {
                    log(`[API SNIFFER] Captured potential data from: ${url}`);
                    try {
                        const json = JSON.parse(text);
                        const extracted = normalizeApiData(json, url);
                        if (extracted.length > 0) {
                            log(`   -> Extracted ${extracted.length} records via API.`);
                            allRecords.push(...extracted);
                        }
                    } catch (e) { /* ignore parse errors */ }
                }
            }
        } catch (e) { /* ignore buffer errors */ }
    });

    // --- PHASE 1: DIRECT NEGOTIATIONS ---
    log(`1. Navigating to Direct Negotiations: ${URL_DN}`);
    try {
        await page.goto(URL_DN, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await sleep(5000); // Wait for hydration
        await autoScroll(page);
        await sleep(2000);
        await page.screenshot({ path: path.join(LOG_DIR, 'step1_dn.png') });
    } catch (e) {
        log(`[WARN] Failed to load DN page fully: ${e.message}`);
    }

    // --- PHASE 2: OPEN TENDERS ---
    log(`2. Navigating to Open Tenders: ${URL_TENDER}`);
    try {
        await page.goto(URL_TENDER, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await sleep(5000);
        await autoScroll(page);
        await sleep(2000);
        await page.screenshot({ path: path.join(LOG_DIR, 'step2_tender.png') });
    } catch (e) {
        log(`[WARN] Failed to load Tender page fully: ${e.message}`);
    }

    // --- PHASE 3: FALLBACK VISUAL SCRAPE ---
    // If API sniffing missed data (likely due to SSR or obfuscation), scrape the DOM directly.
    if (allRecords.length === 0) {
        log("API interception yielded 0 records. Running Aggressive DOM Scrape...");
        const visualRecords = await scrapeVisual(page);
        log(`DOM Scrape found: ${visualRecords.length} records`);
        allRecords.push(...visualRecords);
    }

    // --- PHASE 4: DIAGNOSTICS & SAVE ---
    if (allRecords.length === 0) {
        log("!!! FAILURE: 0 RECORDS FOUND !!!");
        
        // Detailed Diagnostics
        const pageTitle = await page.title();
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        log(`Page Title: ${pageTitle}`);
        log(`Body Text Preview: ${bodyText.replace(/\n/g, ' ')}...`);
        
        const html = await page.content();
        await fs.writeFile(path.join(LOG_DIR, 'final_dom_dump.html'), html);
        await page.screenshot({ path: path.join(LOG_DIR, 'final_error_state.png'), fullPage: true });
    } else {
        await saveData(allRecords);
    }

    log(`=== FINISHED. Total Unique Records: ${allRecords.length} ===`);

  } catch (error) {
    log(`[CRITICAL ERROR] ${error.message}`);
    log(error.stack);
  } finally {
    await writeLogs();
    if (browser) await browser.close();
  }
}

// --- HELPER FUNCTIONS ---

function normalizeApiData(json, sourceUrl) {
    const results = [];
    const now = new Date().toISOString();
    
    // Recursive search for arrays containing money-like objects
    const findArrays = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    const str = JSON.stringify(item).toLowerCase();
                    // Heuristic: Must contain price/value keywords
                    if (str.includes('nilai') || str.includes('harga') || str.includes('amount') || str.includes('price')) {
                        const ministry = item.kementerian || item.ministry || item.agency || item.jabatan || "Unknown Ministry";
                        const vendor = item.nama_syarikat || item.vendor_name || item.petender || item.nama || "Unknown Vendor";
                        const amountRaw = item.nilai_perolehan || item.harga_setuju_terima || item.amount || item.price || 0;
                        const reason = item.tajuk || item.project_title || item.reason || null;
                        const date = item.tarikh_surat || item.date || item.created_at || new Date().toISOString().split('T')[0];
                        
                        let amount = 0;
                        if (typeof amountRaw === 'number') amount = amountRaw;
                        else if (typeof amountRaw === 'string') amount = parseFloat(amountRaw.replace(/[^0-9.]/g, ''));

                        // Filter out noise (0 amounts or missing vendors)
                        if (amount > 0 && vendor !== "Unknown Vendor") {
                            results.push({
                                ministry, vendor, amount,
                                method: sourceUrl.includes('direct') ? "Direct Negotiation" : "Open Tender",
                                category: "General",
                                date: String(date).split('T')[0], 
                                reason, sourceUrl, crawledAt: now
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
        // Aggressive Strategy: Find ANY element that looks like a row or card
        const potentialRows = document.querySelectorAll('tr, div.card, div[role="row"], li');
        
        potentialRows.forEach(el => {
            const text = el.innerText;
            if (text.length < 20) return;
            
            // Regex to find "RM" followed by digits (e.g. RM 1,000.00 or RM1000)
            const moneyMatch = text.match(/RM\s?([0-9,.]+)/i);
            if (!moneyMatch) return;
            
            const amountStr = moneyMatch[1].replace(/,/g, '');
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount === 0) return;
            
            // Heuristic Parsing based on typical keyword positions
            let vendor = "Unknown Vendor";
            const vendorKeywords = ["Syarikat", "Petender", "Vendor", "Oleh"];
            for (const kw of vendorKeywords) {
                if (text.includes(kw)) {
                    // Grab the line with the keyword, or the text after it
                    const parts = text.split(kw);
                    if (parts[1]) vendor = parts[1].split(/[\n,]/)[0].trim();
                    break;
                }
            }
            
            let ministry = "Unknown Ministry";
            if (text.includes("Kementerian")) {
                ministry = "Kementerian" + text.split("Kementerian")[1].split(/[\n,]/)[0];
            }

            // Cleanup
            vendor = vendor.replace(/[:]/g, '').trim();
            ministry = ministry.replace(/[:]/g, '').trim();

            results.push({
                ministry,
                vendor,
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
        
        try {
            const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
            finalData = JSON.parse(raw);
        } catch { /* ignore */ }

        // De-duplication using a composite key
        const existingSigs = new Set(finalData.map(r => `${r.vendor}-${r.amount}-${r.ministry}`));
        let addedCount = 0;
        
        newRecords.forEach(r => {
            const sig = `${r.vendor}-${r.amount}-${r.ministry}`;
            if (!existingSigs.has(sig)) {
                r.id = finalData.length + 1;
                finalData.push(r);
                existingSigs.add(sig);
                addedCount++;
            }
        });

        await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
        log(`Database saved. Added ${addedCount} new records. Total: ${finalData.length}`);
    } catch (e) {
        log(`Save Error: ${e.message}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };