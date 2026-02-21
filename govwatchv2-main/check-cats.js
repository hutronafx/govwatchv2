import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const groups = await p.procurementRecord.groupBy({
        by: ['category'],
        _sum: { amount: true },
        _count: { id: true }
    });
    console.log("Categories in DB:");
    groups.forEach(g => {
        console.log(`- "${g.category}": Sum=${g._sum.amount}, Count=${g._count.id}`);
    });
}

main().finally(() => p.$disconnect());
