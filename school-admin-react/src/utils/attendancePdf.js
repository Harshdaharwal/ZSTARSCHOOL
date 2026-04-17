import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPdfHeaderTitle } from '../config/schoolConfig.js';
import { downloadBlob } from './resultPdf.js';

export function downloadAttendancePdf({
  title,
  subtitle = '',
  head = [],
  body = [],
  summaryLines = [],
  filename = 'attendance-report.pdf',
}) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(getPdfHeaderTitle(), 14, 16);
  doc.setFontSize(12);
  doc.text(title || 'Attendance Report', 14, 24);
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 14, 30);
  }

  autoTable(doc, {
    startY: subtitle ? 36 : 30,
    head: head.length ? [head] : [],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  let y = (doc.lastAutoTable?.finalY || (subtitle ? 36 : 30)) + 8;
  if (summaryLines.length) {
    doc.setFontSize(9);
    summaryLines.forEach((line) => {
      doc.text(String(line), 14, y);
      y += 5;
    });
  }

  downloadBlob(doc.output('blob'), filename);
}
