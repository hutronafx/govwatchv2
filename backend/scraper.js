import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION ---
const URL_DN = 'https://myprocurement.treasury.gov.my/archive/direct-negotiations';
const URL_TENDER = 'https://myprocurement.treasury.gov.my/archive/results-tender';
const OUTPUT_PATH = path.resolve(__dirname, '../public/data.json');
const MAX_PAGES_PER_CATEGORY = 5; // Adjustable limit
const SLEEP_BETWEEN_PAGES_MS = 3000;

// --- UTILS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrape() {
  console.log(`[${new Date().toISOString()}] Starting scraping job (Puppeteer v2)...`);
  
  let browser;
  let allRecords = [];

  try {
    // 1. SETUP BROWSER (Stealth Mode)
    browser = await puppeteer.launch({
      headless: "new", 
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', 
          '--window-size=1920,1080',
          '--disable-features=IsolateOrigins,site-per-process' 
      ]
    });
    
    const page = await browser.newPage();
    
    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 2. SCRAPE DIRECT NEGOTIATIONS
    console.log(`\n--- Starting Direct Negotiations ---`);
    const dnRecords = await scrapeCategory(page, URL_DN, 'Direct Negotiation');
    allRecords = [...allRecords, ...dnRecords];

    // 3. SCRAPE TENDERS
    console.log(`\n--- Starting Open Tenders ---`);
    const tenderRecords = await scrapeCategory(page, URL_TENDER, 'Open Tender');
    allRecords = [...allRecords, ...tenderRecords];

    // 4. SAVE DATA (MERGE WITH EXISTING)
    if (allRecords.length > 0) {
        await saveData(allRecords);
    } else {
        console.warn("[Warning] Scraper finished but found 0 new records.");
    }

  } catch (error) {
    console.error('[Error] Scraping fatal error:', error);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// --- CORE SCRAPING LOGIC ---
async function scrapeCategory(page, startUrl, defaultMethod) {
    const records = [];
    
    try {
        console.log(`Navigating to ${startUrl}...`);
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(3000); // Let JS Framework settle

        let pageNum = 1;
        let hasNext = true;

        while (hasNext && pageNum <= MAX_PAGES_PER_CATEGORY) {
            // A. Check for WAF Block
            const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
            if (bodyText.includes('web page blocked') || bodyText.includes('attack id')) {
                console.error(`[WAF] Blocked on page ${pageNum}. Stopping this category.`);
                break;
            }

            // B. Parse Items (Using robust "Card" logic)
            const newItems = await page.evaluate((methodType, url) => {
                const results = [];
                const now = new Date().toISOString();

                // Helper to clean text
                const clean = (txt) => txt ? txt.replace(/\s+/g, ' ').trim() : "";
                
                // Helper to extract value between labels
                const extract = (text, start, stops) => {
                    const idx = text.indexOf(start);
                    if (idx === -1) return "";
                    let sub = text.substring(idx + start.length);
                    
                    // Find earliest stop word
                    let minIdx = sub.length;
                    stops.forEach(stop => {
                        const sIdx = sub.indexOf(stop);
                        if (sIdx !== -1 && sIdx < minIdx) minIdx = sIdx;
                    });
                    
                    return clean(sub.substring(0, minIdx).replace(/^[:\-\s]+/, ''));
                };

                const parseMoney = (str) => {
                    if (!str) return 0;
                    // Remove currency and format
                    const cleanStr = str.replace(/[^0-9.,]/g, '');
                    // Handle 1,234.50 vs 1.234,50
                    if (cleanStr.includes(',') && cleanStr.includes('.')) {
                        return parseFloat(cleanStr.replace(/,/g, ''));
                    }
                    return parseFloat(cleanStr.replace(/,/g, ''));
                };

                // Strategy: Find all container-like elements (divs, trs)
                const containers = document.querySelectorAll('div, tr');
                const seenSignatures = new Set();

                containers.forEach(el => {
                    const text = el.innerText;
                    if (!text || text.length < 20) return;

                    // IDENTIFYING FIELDS
                    let vendor = "";
                    let amount = 0;
                    let ministry = "Unknown Ministry";
                    let date = new Date().toISOString().split('T')[0];
                    let reason = null;
                    let category = "General";

                    // 1. DIRECT NEGOTIATION PATTERN
                    if (text.includes("Nama Syarikat") && text.includes("Nilai Perolehan")) {
                        vendor = extract(text, "Nama Syarikat", ["Nilai", "Kementerian", "Agensi"]);
                        const amtStr = extract(text, "Nilai Perolehan", ["Kriteria", "Kategori", "Nama"]);
                        amount = parseMoney(amtStr);
                        ministry = extract(text, "Kementerian", ["Agensi", "Tajuk", "Nama"]);
                        reason = extract(text, "Kriteria", ["Kategori", "Nama", "Nilai"]);
                        category = extract(text, "Kategori", ["Nama", "Nilai"]);
                    }
                    // 2. TENDER PATTERN (Card or Table)
                    else if ((text.includes("Petender") || text.includes("Nama Petender")) && (text.includes("Harga") || text.includes("Nilai"))) {
                        vendor = extract(text, "Petender Berjaya", ["Harga", "No.", "Kementerian"]);
                        if (!vendor) vendor = extract(text, "Nama Petender", ["Harga"]);
                        
                        let amtStr = extract(text, "Harga Setuju Terima", ["Tempoh", "Kementerian"]);
                        if (!amtStr) amtStr = extract(text, "Harga", ["Tempoh"]);
                        amount = parseMoney(amtStr);
                        
                        ministry = extract(text, "Kementerian", ["Agensi", "Tajuk"]);
                        const title = extract(text, "Tajuk", ["Kementerian", "Agensi"]);
                        if (title) reason = title;
                    }

                    // Validation
                    if (vendor && amount > 0 && vendor.length < 150) {
                        const sig = `${vendor}-${amount}`;
                        if (!seenSignatures.has(sig)) {
                            seenSignatures.add(sig);
                            results.push({
                                ministry: clean(ministry) || "Unknown Ministry",
                                vendor: clean(vendor),
                                amount: amount,
                                method: methodType,
                                category: clean(category) || "General",
                                date: date,
                                reason: clean(reason),
                                sourceUrl: url,
                                crawledAt: now
                            });
                        }
                    }
                });

                return results;
            }, defaultMethod, page.url());

            if (newItems.length > 0) {
                console.log(`   Page ${pageNum}: Found ${newItems.length} records.`);
                records.push(...newItems);
            } else {
                console.log(`   Page ${pageNum}: No records found.`);
            }

            // C. Pagination (Click Next)
            const nextSelector = `li.next:not(.disabled) a, a[aria-label="Next"], button[aria-label="Next"]`;
            const nextBtn = await page.$(nextSelector);
            
            if (nextBtn && pageNum < MAX_PAGES_PER_CATEGORY) {
                // Get a signature of the current page to ensure it changes
                const preClickContent = await page.evaluate(() => document.body.innerText.substring(0, 500));
                
                try {
                    console.log(`   Clicking Next...`);
                    await page.evaluate(el => el.click(), nextBtn); // DOM click often more reliable than Puppeteer click
                    
                    // Wait for network or body change
                    try {
                        await page.waitForFunction(
                            old => document.body.innerText.substring(0, 500) !== old, 
                            { timeout: 10000 }, 
                            preClickContent
                        );
                    } catch(e) {
                         console.warn("   Wait for content change timed out, but continuing...");
                    }
                    
                    await sleep(2000); // Backoff
                    pageNum++;
                } catch (e) {
                    console.error("   Error clicking next:", e.message);
                    hasNext = false;
                }
            } else {
                console.log("   No next button or limit reached.");
                hasNext = false;
            }
        }
    } catch (err) {
        console.error(`Error scraping category ${defaultMethod}:`, err);
    }
    
    return records;
}

async function saveData(newRecords) {
    let finalData = [];
    
    // 1. Read Existing
    try {
        const existingRaw = await fs.readFile(OUTPUT_PATH, 'utf-8');
        finalData = JSON.parse(existingRaw);
    } catch (e) {
        finalData = []; // File doesn't exist yet
    }

    // 2. Merge (Avoid Duplicates based on Vendor + Amount + Date)
    let addedCount = 0;
    const existingSigs = new Set(finalData.map(r => `${r.vendor}|${r.amount}|${r.ministry}`));

    newRecords.forEach(rec => {
        const sig = `${rec.vendor}|${rec.amount}|${rec.ministry}`;
        if (!existingSigs.has(sig)) {
            // Assign ID based on total count
            rec.id = finalData.length + 1;
            finalData.push(rec);
            existingSigs.add(sig);
            addedCount++;
        }
    });

    // 3. Write
    const publicDir = path.dirname(OUTPUT_PATH);
    try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }
    
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
    console.log(`[Success] Saved. Added ${addedCount} new records. Total Database: ${finalData.length}`);
}

// Allow running directly via node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };