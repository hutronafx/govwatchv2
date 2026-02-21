import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

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
                    if (totalHeight >= scrollHeight || totalHeight > 10000) {
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
        await fs.rm(LOG_DIR, { recursive: true, force: true }).catch(() => { });
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
            if (!msg.text().includes('ERR_')) log(`[BROWSER] ${msg.text().substring(0, 100)}...`);
        });

        page.on('response', async (response) => {
            try {
                const url = response.url();
                const type = response.headers()['content-type'];
                if (type && (type.includes('json') || type.includes('plain')) && !url.includes('google')) {
                    const text = await response.text();
                    if (text.includes('amount') || text.includes('nilai')) {
                        try {
                            const json = JSON.parse(text);
                            const extracted = normalizeApiData(json, url);
                            if (extracted.length > 0) allRecords.push(...extracted);
                        } catch (e) { }
                    }
                }
            } catch (e) { }
        });

        // --- NAVIGATION ---
        const navigate = async (url, label) => {
            log(`Navigating to ${label} (Card Mode)...`);
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

                // Wait for cards to likely appear
                await sleep(5000);
                await autoScroll(page);
                await sleep(2000); // Wait after scroll

                await page.screenshot({ path: path.join(LOG_DIR, `${label}.png`) });
            } catch (e) {
                log(`[WARN] ${label} navigation issue: ${e.message}`);
                try { await page.screenshot({ path: path.join(LOG_DIR, `${label}_timeout.png`) }); } catch { }
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

                        // Construct Link ID
                        const id = item._id || item.id || null;
                        let contractUrl = null;
                        if (id) {
                            if (sourceUrl.includes('direct')) {
                                contractUrl = `https://myprocurement.treasury.gov.my/archive/direct-negotiations/${id}`;
                            } else {
                                contractUrl = `https://myprocurement.treasury.gov.my/archive/results-tender/${id}`;
                            }
                        }

                        if (amount > 0) {
                            results.push({
                                ministry, vendor, amount,
                                method: sourceUrl.includes('direct') ? "Direct Negotiation" : "Open Tender",
                                category: "General",
                                date: String(date).split('T')[0],
                                reason: item.reason || null,
                                sourceUrl,
                                contractUrl,
                                crawledAt: now
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
            if (txt.length < 30) return false;
            if (txt.length > 2000) return false;
            if (!txt.includes("RM")) return false;
            const keywords = ["Kementerian", "Ministry", "Jabatan", "Syarikat", "Vendor", "Petender"];
            return keywords.some(kw => txt.includes(kw));
        });

        potentialCards.forEach(card => {
            const text = card.innerText;
            const moneyMatch = text.match(/RM\s?([0-9,.]+)/i);
            if (!moneyMatch) return;
            const amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
            if (isNaN(amount) || amount === 0) return;

            let ministry = "Unknown Ministry";
            const minMatch = text.match(/(?:Kementerian|Ministry|Jabatan|Agency)(.*?)(?:\n|$)/i);
            if (minMatch) ministry = minMatch[0].trim();

            let vendor = "Unknown Vendor";
            const venMatch = text.match(/(?:Syarikat|Vendor|Petender|Oleh)(.*?)(?:\n|$)/i);
            if (venMatch) vendor = venMatch[0].replace(/(?:Syarikat|Vendor|Petender|Oleh)[:\s]*/i, '').trim();

            let date = new Date().toISOString().split('T')[0];
            const dateMatch = text.match(/(\d{2}[-/.]\d{2}[-/.]\d{4})/);
            if (dateMatch) date = dateMatch[0];

            // Look for link in card
            let contractUrl = null;
            const link = card.querySelector('a');
            if (link && link.href) contractUrl = link.href;

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
                    contractUrl: contractUrl,
                    crawledAt: new Date().toISOString()
                });
            }
        });

        return results;
    });
}

async function saveData(newRecords) {
    try {
        let addedCount = 0;
        for (const r of newRecords) {
            // Check for duplicate signature (vendor-amount-ministry combination)
            const existing = await prisma.procurementRecord.findFirst({
                where: {
                    vendor: r.vendor,
                    amount: r.amount,
                    ministry: r.ministry
                }
            });

            if (!existing) {
                // Ensure date string is compatible
                let parsedDate = new Date();
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    parsedDate = d;
                }

                await prisma.procurementRecord.create({
                    data: {
                        ministry: r.ministry,
                        vendor: r.vendor,
                        amount: r.amount,
                        method: r.method || "Unknown",
                        category: r.category || "General",
                        date: parsedDate,
                        title: r.title || "No Title Provided",
                        sourceUrl: r.sourceUrl || "Admin Tool",
                        contractUrl: r.contractUrl || null
                    }
                });
                addedCount++;
            }
        }
        log(`Database Sync Complete: Inserted ${addedCount} new records.`);
    } catch (e) { log(`DB Save Error: ${e.message}`); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { scrape(); }

export { scrape };