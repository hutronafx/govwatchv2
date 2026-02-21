import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ministries = [
    "Kementerian Pendidikan Malaysia",
    "Kementerian Kesihatan Malaysia",
    "Kementerian Pertahanan",
    "Kementerian Kewangan",
    "Kementerian Dalam Negeri",
    "Kementerian Kerja Raya"
];

const vendors = [
    "Syarikat Pembinaan Maju Jaya Sdn Bhd",
    "Tech Solutions Provider PLT",
    "Global Medical Supplies Bhd",
    "Bina Nusantara Bina",
    "Konsortium Sistem Maklumat",
    "Mega Security Services",
    "Cekap Services Sdn Bhd"
];

const categories = ["Kerja", "Bekalan", "Perkhidmatan"];
const methods = ["Open Tender", "Direct Negotiation"];

async function main() {
    console.log('Seeding dummy data...');
    const records = [];

    for (let i = 0; i < 150; i++) {
        const min = ministries[Math.floor(Math.random() * ministries.length)];
        const ven = vendors[Math.floor(Math.random() * vendors.length)];
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const meth = methods[Math.floor(Math.random() * methods.length)];

        // Random date within the last 30 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        // Amount between 10k and 10m
        const amount = Math.floor(Math.random() * 9990000) + 10000;

        records.push({
            ministry: min,
            vendor: ven,
            category: cat,
            method: meth,
            amount: amount,
            date: date,
            title: `Pembekalan / Perkhidmatan / Kerja untuk ${cat} tahun ${date.getFullYear()}`,
            sourceUrl: "https://myprocurement.treasury.gov.my/"
        });
    }

    await prisma.procurementRecord.createMany({
        data: records
    });

    console.log(`Seeded ${records.length} records successfully.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
