import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ContentCalendarItem } from '../services/content-calendar';

export const exportContentToPDF = (
  data: ContentCalendarItem[],
  title: string = 'Content Calendar'
) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`, 14, 28);
  doc.text(`Total Items: ${data.length}`, 14, 34);

  // Table
  autoTable(doc, {
    head: [['Date', 'Caption', 'Platform', 'Status']],
    body: data.map((item) => [
      item.scheduledAt
        ? new Date(item.scheduledAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Not scheduled',
      item.caption?.substring(0, 100) + (item.caption && item.caption.length > 100 ? '...' : '') || '-',
      item.platforms.join(', '),
      item.status,
    ]),
    startY: 40,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [24, 144, 255],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 50 },
    },
    margin: { top: 40 },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save
  const filename = `content-calendar-${new Date().getTime()}.pdf`;
  doc.save(filename);

  return filename;
};
