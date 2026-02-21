import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function cleanCurrency(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let str = val.toString().replace(/RM|\s|,/g, '').trim();
    if (str.includes('(')) {
        str = '-' + str.replace(/\(|\)/g, '');
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

// Custom Date Parser: Excel stores dates as number of days since 1900-01-01
function parseExcelDate(excelDate) {
    // If it's a string, try standard parsing first
    if (typeof excelDate === 'string') {
        const parts = excelDate.split(/[-/]/);
        if (parts.length === 3) {
            // Assume DD/MM/YYYY or similar if possible, but fallback to Date
            return new Date(excelDate);
        }
        return new Date(excelDate);
    }

    // If it's a number (Excel serial date)
    if (typeof excelDate === 'number') {
        // Excel epoch is 1899-12-30
        return new Date((excelDate - 25569) * 86400 * 1000);
    }

    return new Date();
}

async function run() {
    console.log('[Import] Loading CSV...');
    const csvPath = path.join(__dirname, 'dist', 'Myprocurementdata complete.csv');
    const workbook = xlsx.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false }); // Try keeping formatted dates if possible

    console.log(`[Import] Found ${data.length} records in CSV. Preparing for DB insertion...`);

    // First delete all mock data
    console.log('[Import] Clearing existing mock data from database...');
    await prisma.procurementRecord.deleteMany({});

    const BATCH_SIZE = 500;
    let successCount = 0;
    let formattedRecords = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Extract fields exactly as they are in the CSV
        // Typical columns based on previous code: 
        // ["Kementerian/Jabatan/Agensi", "Tajuk", "Tarikh Setuju Terima", "Syarikat Berjaya", "Kaedah Perolehan", "Kategori Perolehan", "Nilai Tawaran"]
        const ministry = row['Ministry'] || row['Kementerian/Jabatan/Agensi'] || 'Unknown';
        const title = row['Title'] || row['Tajuk'] || 'No Title';
        const vendor = row['Tenderer'] || row['Syarikat Berjaya'] || 'Unknown';
        const amount = cleanCurrency(row['Price'] || row['Nilai Tawaran'] || 0);

        // Try inferring method from Source Name or default to Open Tender
        const sourceName = (row['Source Name'] || '').toLowerCase();
        const method = (sourceName.includes('direct') || sourceName.includes('rundingan')) ? 'Direct Negotiation' : 'Open Tender';

        const category = row['Category'] || row['Kategori Perolehan'] || 'General';

        // Raw date from xlsx utils is usually a string if formatted, else a serial number
        let rawDate = row['Date'] || row['Tarikh Setuju Terima'] || new Date().toISOString();
        let parsedDate = parseExcelDate(rawDate);

        // Safety check
        if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(); // fallback
        }

        formattedRecords.push({
            ministry: ministry,
            title: title,
            vendor: vendor,
            amount: amount,
            method: method,
            category: category,
            date: parsedDate,
            sourceUrl: 'https://myprocurement.treasury.gov.my/',
            crawledAt: new Date()
        });

        // Insert in batches
        if (formattedRecords.length === BATCH_SIZE || i === data.length - 1) {
            await prisma.procurementRecord.createMany({
                data: formattedRecords
            });
            successCount += formattedRecords.length;
            process.stdout.write(`\rInserted ${successCount} / ${data.length} records...`);
            formattedRecords = []; // Reset batch array
        }
    }

    console.log('\n[Import] Complete! Reseeding successful.');
}

run()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
