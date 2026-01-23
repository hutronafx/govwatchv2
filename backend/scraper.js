import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION ---
const URL_DN = 'https://myprocurement.treasury.gov.my/archive/direct-negotiations';
const URL_TENDER = 'https://myprocurement.treasury.gov.my/archive/results-tender';
const OUTPUT_PATH = path.resolve(__dirname, '../public/data.json');
const MAX_PAGES_PER_CATEGORY = 5; 
const TIMEOUT_MS = 60000;

// --- UTILS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrape() {
  console.log(`\n[${new Date().toISOString()}] === STARTING SCRAPER (DEBUG MODE) ===`);
  
  let browser;
  let allRecords = [];

  try {
    // 1. SETUP BROWSER
    browser = await puppeteer.launch({
      headless: "new", 
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080'
      ]
    });
    
    const page = await browser.newPage();
    
    // 1.1 Enable Console Forwarding (CRITICAL FOR DEBUGGING)
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (!text.includes('ERR_BLOCKED_BY_CLIENT')) { // Filter noise
            console.log(`[BROWSER] ${text}`);
        }
    });

    // 1.2 Stealth & Viewport
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    // 2. RUN JOBS
    const dnRecords = await scrapeCategory(page, URL_DN, 'Direct Negotiation');
    allRecords = [...allRecords, ...dnRecords];

    const tenderRecords = await scrapeCategory(page, URL_TENDER, 'Open Tender');
    allRecords = [...allRecords, ...tenderRecords];

    // 3. SAVE
    if (allRecords.length > 0) {
        await saveData(allRecords);
    } else {
        console.log("[-] No new records found in this run. Check debug_dump.html if created.");
    }

    console.log(`[${new Date().toISOString()}] === SCRAPER FINISHED ===\n`);

  } catch (error) {
    console.error('[CRITICAL SCRAPER ERROR]:', error);
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeCategory(page, startUrl, defaultMethod) {
    console.log(`\n--- Processing: ${defaultMethod} ---`);
    const records = [];
    let pageNum = 1;

    try {
        console.log(`   Navigating to ${startUrl}...`);
        await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: TIMEOUT_MS });
        
        // Explicit Wait for content to actually exist
        console.log("   Waiting for data indicators...");
        try {
            await page.waitForFunction(() => {
                const body = document.body.innerText;
                // Look for Malay keywords common in these headers
                return body.includes('Nama') || body.includes('Syarikat') || body.includes('Petender') || body.includes('No.');
            }, { timeout: 15000 });
        } catch(e) {
            console.warn("   [!] Timeout waiting for specific keywords. Page might be empty or WAF blocked.");
            // Dump HTML for inspection
            const html = await page.content();
            await fs.writeFile(`debug_dump_${defaultMethod.replace(' ', '_')}.html`, html);
            console.log("   [Debug] Saved HTML dump to file.");
        }

        while (pageNum <= MAX_PAGES_PER_CATEGORY) {
            console.log(`   Scraping Page ${pageNum}...`);

            // A. Check WAF / Errors
            const title = await page.title();
            if (title.includes("Blocked") || title.includes("Error") || title.includes("Access Denied")) {
                console.warn(`   [!] Blocked detected. Title: ${title}. Stopping.`);
                break;
            }

            // B. Extract Data
            const pageRecords = await page.evaluate((method) => {
                const results = [];
                const now = new Date().toISOString();
                
                // Strategy: 
                // 1. Try Standard Tables (MyProcurement often uses tables)
                // 2. Try Card Divs (If responsive view)
                
                const rows = Array.from(document.querySelectorAll('tr, div.card, div.row')); 
                console.log(`Found ${rows.length} potential DOM elements to scan.`);

                let scanned = 0;

                rows.forEach(el => {
                    const text = el.innerText;
                    if (!text || text.length < 30) return; // Skip empty rows
                    scanned++;

                    // Helper for robust extraction
                    const getVal = (labels, endLabels) => {
                        for (const label of labels) {
                            // Case insensitive check
                            const regex = new RegExp(label, 'i');
                            const match = text.match(regex);
                            if (match) {
                                const startIdx = match.index + match[0].length;
                                const sub = text.substring(startIdx);
                                
                                let limitIdx = sub.length;
                                for (const stop of endLabels) {
                                     const stopRegex = new RegExp(stop, 'i');
                                     const stopMatch = sub.match(stopRegex);
                                     if (stopMatch && stopMatch.index < limitIdx) {
                                         limitIdx = stopMatch.index;
                                     }
                                }
                                return sub.substring(0, limitIdx).replace(/[:\n]/g, '').trim();
                            }
                        }
                        return null;
                    };

                    const cleanMoney = (str) => {
                        if (!str) return 0;
                        // Remove "RM", spaces, convert 1.000,00 to 1000.00 if needed
                        let s = str.replace(/[^0-9.,]/g, '');
                        if (s.indexOf('.') > -1 && s.indexOf(',') > -1) {
                             if (s.indexOf(',') > s.indexOf('.')) s = s.replace(/\./g, '').replace(',', '.'); // 1.000,00 -> 1000.00
                             else s = s.replace(/,/g, ''); // 1,000.00 -> 1000.00
                        } else if (s.indexOf(',') > -1) {
                            s = s.replace(/,/g, '');
                        }
                        return parseFloat(s);
                    };

                    // KEYWORDS DICTIONARY
                    const vendor = getVal(['Nama Syarikat', 'Petender Berjaya', 'Nama Petender', 'Vendor'], ['Nilai', 'Harga', 'Kementerian', 'No.']);
                    
                    // Note: 'Harga' is very common, so we check longer labels first
                    const amountStr = getVal(['Nilai Perolehan', 'Harga Setuju Terima', 'Harga Tawaran', 'Harga'], ['Kriteria', 'Tempoh', 'Kementerian']);
                    
                    const ministry = getVal(['Kementerian', 'Agensi'], ['Tajuk', 'Nama', 'Petender', 'No.']) || "Unknown Ministry";
                    const reason = getVal(['Tajuk Tender', 'Tajuk', 'Kriteria'], ['Kementerian', 'Agensi', 'Nama', 'Harga']) || method;
                    
                    if (vendor && amountStr) {
                        const amount = cleanMoney(amountStr);
                        if (amount > 0 && vendor.length < 150) {
                            // Check if this looks like a header row
                            if (!vendor.toLowerCase().includes("nama syarikat")) {
                                results.push({
                                    ministry, vendor, amount, method, 
                                    category: "General", 
                                    date: new Date().toISOString().split('T')[0], 
                                    reason,
                                    crawledAt: now, sourceUrl: document.location.href
                                });
                            }
                        } else {
                            // console.log(`Skipping: Valid vendor (${vendor}) but invalid amount (${amountStr})`);
                        }
                    }
                });
                
                console.log(`Scanned ${scanned} items, extracted ${results.length} valid records.`);
                return results;
            }, defaultMethod);

            if (pageRecords.length > 0) {
                console.log(`     + Found ${pageRecords.length} records.`);
                records.push(...pageRecords);
            } else {
                console.log(`     - No records found on this page.`);
            }

            // C. Pagination
            if (pageNum >= MAX_PAGES_PER_CATEGORY) break;

            const nextClicked = await clickNextButton(page);
            if (!nextClicked) {
                console.log("     [End] Pagination stopped.");
                break;
            }
            
            // Wait for content refresh
            console.log("     Waiting for page load...");
            await sleep(5000); 
            pageNum++;
        }
    } catch (err) {
        console.error(`   [!] Error in category loop: ${err.message}`);
    }

    return records;
}

// Robust 'Next' Clicker
async function clickNextButton(page) {
    try {
        // Try multiple selector strategies
        // 1. XPath for text "Next" or "Seterusnya"
        const buttons = await page.$x("//a[contains(text(), 'Seterusnya') or contains(text(), 'Next')]");
        if (buttons.length > 0) {
            const btn = buttons[0];
            const isVisible = await btn.boundingBox();
            if (isVisible) {
                console.log("     [Nav] Clicking text link...");
                await btn.click();
                return true;
            }
        }

        // 2. CSS for standard pagination classes
        const cssSelectors = [
            'li.next:not(.disabled) a',
            'a[aria-label="Next"]',
            'button[aria-label="Next"]',
            '.pagination .next a'
        ];

        for (const sel of cssSelectors) {
            const el = await page.$(sel);
            if (el) {
                console.log(`     [Nav] Clicking selector: ${sel}`);
                await el.click();
                return true;
            }
        }

    } catch (e) {
        console.log("     [Debug] Pagination click failed: " + e.message);
    }
    return false;
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
        let added = 0;

        newRecords.forEach(r => {
            const sig = `${r.vendor}-${r.amount}-${r.ministry}`;
            if (!existingSigs.has(sig)) {
                r.id = finalData.length + 1;
                finalData.push(r);
                existingSigs.add(sig);
                added++;
            }
        });

        await fs.writeFile(OUTPUT_PATH, JSON.stringify(finalData, null, 2));
        console.log(`[Save] Database updated. Added: ${added}, Total: ${finalData.length}`);
    } catch (e) {
        console.error("[Save Error]", e);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };