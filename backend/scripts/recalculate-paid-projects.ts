import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateAllProjectsWithPaidInvoices() {
  console.log('Finding projects with paid invoices...');

  // Find all projects that have at least one PAID invoice
  const projectsWithPaidInvoices = await prisma.project.findMany({
    where: {
      invoices: {
        some: {
          status: 'PAID'
        }
      }
    },
    select: {
      id: true,
      number: true,
      description: true,
      totalPaidAmount: true,
      invoices: {
        where: { status: 'PAID' },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true
        }
      }
    }
  });

  console.log(`Found ${projectsWithPaidInvoices.length} projects with paid invoices\n`);

  for (const project of projectsWithPaidInvoices) {
    // Calculate total paid from invoices
    const totalPaidFromInvoices = project.invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0
    );

    console.log(`Project: ${project.number} - ${project.description}`);
    console.log(`  Current totalPaidAmount: ${Number(project.totalPaidAmount || 0)}`);
    console.log(`  Calculated from invoices: ${totalPaidFromInvoices}`);
    console.log(`  Paid invoices: ${project.invoices.map(i => i.invoiceNumber).join(', ')}`);

    // Update the project with recalculated values
    await prisma.project.update({
      where: { id: project.id },
      data: {
        totalPaidAmount: totalPaidFromInvoices,
        totalInvoicedAmount: totalPaidFromInvoices, // For paid invoices, invoiced = paid
        profitCalculatedAt: new Date(),
        profitCalculatedBy: 'MIGRATION_SCRIPT'
      }
    });

    console.log(`  ✅ Updated totalPaidAmount to ${totalPaidFromInvoices}\n`);
  }

  console.log('Done! All projects with paid invoices have been updated.');
}

recalculateAllProjectsWithPaidInvoices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
