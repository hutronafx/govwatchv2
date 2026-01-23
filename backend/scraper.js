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
        await fs.writeFile(path.join(LOG_DIR, 'debug_log.txt'), logBuffer);
    } catch (e) {
        console.error("Failed to write logs to disk:", e);
    }
}

// --- UTILS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function autoScroll(page) {
    log("   -> Auto-scrolling to trigger lazy loading cards...");
    try {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 200;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    // Scroll deeper for cards
                    if(totalHeight >= scrollHeight || totalHeight > 10000){ 
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    } catch (e) {
        log("   -> Scroll warning: " + e.message);
    }
}

async function scrape() {
  logBuffer = ""; 
  log(`=== STARTING SCRAPER V4 (Card Support) ===`);
  
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
          '--window-size=1920,1080', // Larger window for cards
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          // Note: Re-enabled images in case they are needed for layout, 
          // but if bandwidth is issue, might need to disable again.
          // Keeping disabled for speed.
          '--blink-settings=imagesEnabled=false' 
      ]
    });
    
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Block fonts/images/media
        if (['image', 'font', 'media'].includes(resourceType)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Console & API Sniffing
    page.on('console', msg => {
        if(!msg.text().includes('ERR_')) log(`[BROWSER] ${msg.text().substring(0, 100)}...`);
    });

    page.on('response', async (response) => {
        try {
            const url = response.url();
            const type = response.headers()['content-type'];
            if (type && (type.includes('json') || type.includes('plain')) && !url.includes('google')) {
                const text = await response.text();
                if (text.includes('amount') || text.includes('nilai')) {
                    // log(`[API] Captured potential JSON data from: ${url}`);
                    try {
                        const json = JSON.parse(text);
                        const extracted = normalizeApiData(json, url);
                        if (extracted.length > 0) allRecords.push(...extracted);
                    } catch(e) {}
                }
            }
        } catch (e) { }
    });

    // --- NAVIGATION ---
    const navigate = async (url, label) => {
        log(`Navigating to ${label} (Card Mode)...`);
        try {
            // Using load instead of networkidle to be faster
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            
            // Wait for cards to likely appear
            await sleep(5000); 
            await autoScroll(page);
            await sleep(2000); // Wait after scroll
            
            await page.screenshot({ path: path.join(LOG_DIR, `${label}.png`) });
        } catch (e) {
            log(`[WARN] ${label} navigation issue: ${e.message}`);
            // Even if it timed out, we try to scrape what loaded
            try { await page.screenshot({ path: path.join(LOG_DIR, `${label}_timeout.png`) }); } catch {}
        }
    };

    await navigate(URL_DN, 'direct_nego');
    await navigate(URL_TENDER, 'tenders');

    // --- CARD-BASED VISUAL SCRAPE ---
    if (allRecords.length === 0) {
        log("No API data found. Attempting CARD-BASED DOM scrape...");
        const visualRecords = await scrapeVisual(page);
        log(`Visual scrape found ${visualRecords.length} items.`);
        allRecords.push(...visualRecords);
    }

    if (allRecords.length === 0) {
        log("!!! FAILURE: 0 RECORDS FOUND !!!");
        log("Tip: Use the Browser Script in the Upload tab.");
        const html = await page.content();
        await fs.writeFile(path.join(LOG_DIR, 'final_dom_dump.html'), html);
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

// UPDATED: Looks for CARDS (Divs) instead of Tables
async function scrapeVisual(page) {
    return await page.evaluate(() => {
        const results = [];
        
        // Find all DIVs that might be cards
        const allDivs = Array.from(document.querySelectorAll('div, article, section'));
        
        // Heuristic: A card usually contains a price (RM) and a Ministry/Vendor label
        const potentialCards = allDivs.filter(div => {
            const txt = div.innerText || "";
            // Too short = likely just a label or button
            if (txt.length < 30) return false;
            // Too long = likely the whole body container
            if (txt.length > 2000) return false;
            
            // Must have currency
            if (!txt.includes("RM")) return false;
            
            // Must have some entity keyword
            const keywords = ["Kementerian", "Ministry", "Jabatan", "Syarikat", "Vendor", "Petender"];
            return keywords.some(kw => txt.includes(kw));
        });

        // Parse each potential card
        potentialCards.forEach(card => {
            const text = card.innerText;
            
            // 1. Extract Amount
            const moneyMatch = text.match(/RM\s?([0-9,.]+)/i);
            if (!moneyMatch) return; // Skip if no price found in this specific div
            const amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
            if (isNaN(amount) || amount === 0) return;

            // 2. Extract Ministry
            let ministry = "Unknown Ministry";
            // Look for "Kementerian ..." up to newline
            const minMatch = text.match(/(?:Kementerian|Ministry|Jabatan|Agency)(.*?)(?:\n|$)/i);
            if (minMatch) ministry = minMatch[0].trim();

            // 3. Extract Vendor
            let vendor = "Unknown Vendor";
            const venMatch = text.match(/(?:Syarikat|Vendor|Petender|Oleh)(.*?)(?:\n|$)/i);
            if (venMatch) vendor = venMatch[0].replace(/(?:Syarikat|Vendor|Petender|Oleh)[:\s]*/i, '').trim();

            // 4. Extract Date
            let date = new Date().toISOString().split('T')[0];
            const dateMatch = text.match(/(\d{2}[-/.]\d{2}[-/.]\d{4})/);
            if (dateMatch) {
                // simple normalization if needed, mostly just take the string
                date = dateMatch[0];
            }

            // Deduplicate: If we already have a record with this exact amount and vendor (approx), skip
            // (Because nested divs might triggers this multiple times for the same card)
            const isDuplicate = results.some(r => r.amount === amount && r.vendor === vendor);
            
            if (!isDuplicate && ministry.length < 150 && vendor.length < 150) {
                 results.push({
                    ministry: ministry.replace(/[:]/g, '').trim(),
                    vendor: vendor.replace(/[:]/g, '').trim(),
                    amount,
                    method: document.location.href.includes('direct') ? "Direct Negotiation" : "Open Tender",
                    category: "General",
                    date,
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