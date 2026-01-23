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
  console.log(`\n[${new Date().toISOString()}] === STARTING SCRAPER ===`);
  
  let browser;
  let allRecords = [];

  try {
    // 1. SETUP BROWSER (Robust Config)
    browser = await puppeteer.launch({
      headless: "new", 
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Stealth
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 2. RUN JOBS
    // We run sequentially to be gentle on the server
    const dnRecords = await scrapeCategory(page, URL_DN, 'Direct Negotiation');
    allRecords = [...allRecords, ...dnRecords];

    const tenderRecords = await scrapeCategory(page, URL_TENDER, 'Open Tender');
    allRecords = [...allRecords, ...tenderRecords];

    // 3. SAVE
    if (allRecords.length > 0) {
        await saveData(allRecords);
    } else {
        console.log("[-] No new records found in this run.");
    }

    console.log(`[${new Date().toISOString()}] === SCRAPER FINISHED ===\n`);

  } catch (error) {
    console.error('[CRITICAL SCRAPER ERROR]:', error);
    // Do not throw; just log so server stays alive
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeCategory(page, startUrl, defaultMethod) {
    console.log(`\n--- Processing: ${defaultMethod} ---`);
    const records = [];
    let pageNum = 1;

    try {
        // Initial Load
        await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        await sleep(2000); // Allow JS to render

        while (pageNum <= MAX_PAGES_PER_CATEGORY) {
            console.log(`   Scraping Page ${pageNum}...`);

            // A. Check WAF / Errors
            const title = await page.title();
            if (title.includes("Blocked") || title.includes("Error")) {
                console.warn(`   [!] Blocked or Error detected. Title: ${title}. Stopping category.`);
                break;
            }

            // B. Extract Data (Robust Function)
            const pageRecords = await page.evaluate((method) => {
                const results = [];
                const now = new Date().toISOString();
                const rows = document.querySelectorAll('div.card, tr'); // Broad selector

                rows.forEach(el => {
                    const text = el.innerText;
                    if (!text || text.length < 20) return;

                    // Helper to pluck text safely
                    const getVal = (labels, endLabels) => {
                        for (const label of labels) {
                            if (text.includes(label)) {
                                const startIdx = text.indexOf(label) + label.length;
                                const sub = text.substring(startIdx);
                                // Find closest stop word
                                let limitIdx = sub.length;
                                for (const stop of endLabels) {
                                    const idx = sub.indexOf(stop);
                                    if (idx > -1 && idx < limitIdx) limitIdx = idx;
                                }
                                return sub.substring(0, limitIdx).replace(/[:\n]/g, '').trim();
                            }
                        }
                        return null;
                    };

                    const cleanMoney = (str) => {
                        if (!str) return 0;
                        return parseFloat(str.replace(/[^0-9.]/g, ''));
                    };

                    // KEYWORDS
                    const vendor = getVal(['Nama Syarikat', 'Petender Berjaya', 'Nama Petender'], ['Nilai', 'Harga', 'Kementerian']);
                    const amountStr = getVal(['Nilai Perolehan', 'Harga Setuju Terima', 'Harga'], ['Kriteria', 'Tempoh', 'Kementerian']);
                    const ministry = getVal(['Kementerian'], ['Agensi', 'Tajuk', 'Nama', 'Petender']) || "Unknown Ministry";
                    const reason = getVal(['Tajuk', 'Kriteria'], ['Kementerian', 'Agensi', 'Nama']) || method;
                    const date = new Date().toISOString().split('T')[0];

                    if (vendor && amountStr) {
                        const amount = cleanMoney(amountStr);
                        if (amount > 0) {
                            results.push({
                                ministry, vendor, amount, method, 
                                category: "General", date, reason,
                                crawledAt: now, sourceUrl: document.location.href
                            });
                        }
                    }
                });
                return results;
            }, defaultMethod);

            if (pageRecords.length > 0) {
                console.log(`     + Found ${pageRecords.length} records.`);
                records.push(...pageRecords);
            } else {
                console.log(`     - No records found on this page.`);
            }

            // C. Pagination Logic (Using XPath for text matching)
            if (pageNum >= MAX_PAGES_PER_CATEGORY) break;

            const nextClicked = await clickNextButton(page);
            if (!nextClicked) {
                console.log("     [End] No 'Next' button found or it is disabled.");
                break;
            }
            
            // Wait for content refresh (simple pause is safest for these sites)
            await sleep(3500);
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
        // 1. Try finding 'Seterusnya' or 'Next' links
        const buttons = await page.$x("//a[contains(text(), 'Seterusnya') or contains(text(), 'Next')]");
        
        for (const btn of buttons) {
            // Check if visible
            const isVisible = await btn.boundingBox();
            if (isVisible) {
                // Check if parent is disabled (Bootstrap style)
                const isDisabled = await page.evaluate(el => {
                    return el.parentElement.classList.contains('disabled') || el.hasAttribute('disabled');
                }, btn);

                if (!isDisabled) {
                    await btn.click();
                    return true;
                }
            }
        }
        
        // 2. Try generic class selectors if text fails
        const iconBtn = await page.$('li.next:not(.disabled) a');
        if (iconBtn) {
            await iconBtn.click();
            return true;
        }

    } catch (e) {
        console.log("     [Debug] Pagination click failed: " + e.message);
    }
    return false;
}

async function saveData(newRecords) {
    let finalData = [];
    try {
        // Create dir if missing
        const publicDir = path.dirname(OUTPUT_PATH);
        try { await fs.access(publicDir); } catch { await fs.mkdir(publicDir, { recursive: true }); }

        // Read existing
        try {
            const raw = await fs.readFile(OUTPUT_PATH, 'utf-8');
            finalData = JSON.parse(raw);
        } catch { /* ignore missing file */ }

        // Deduplicate logic
        const existingSigs = new Set(finalData.map(r => `${r.vendor}-${r.amount}-${r.ministry}`));
        let added = 0;

        newRecords.forEach(r => {
            const sig = `${r.vendor}-${r.amount}-${r.ministry}`;
            if (!existingSigs.has(sig)) {
                r.id = finalData.length + 1; // Simple increment ID
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

// Allow CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scrape();
}

export { scrape };