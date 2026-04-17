import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPdfHeaderTitle } from '../config/schoolConfig.js';

/** @param {object} report - from buildStudentMarksReports */
export function createResultPdfBlob(report) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header banner ──────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(getPdfHeaderTitle(), pageW / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('STUDENT RESULT CARD', pageW / 2, 17, { align: 'center' });

  // ── Student info block ─────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(String(report.name), 14, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const infoLeft = [
    `Roll No : ${report.rollNo ?? '—'}`,
    `Class   : ${report.classLabel}`,
    `Student ID : ${report.studentId}`,
  ];
  const infoRight = [
    `Father : ${report.fatherName || '—'}`,
    `Academic Year : 2026-27`,
    `Generated : ${new Date().toLocaleDateString('en-IN')}`,
  ];
  infoLeft.forEach((line, i) => doc.text(line, 14, 39 + i * 6));
  infoRight.forEach((line, i) => doc.text(line, pageW / 2 + 4, 39 + i * 6));

  // ── Marks table ────────────────────────────────────────────────────────
  const body = report.subjects.map((s) => [
    s.subject,
    s.examName || '—',
    s.examType || '—',
    String(s.obtained),
    String(s.max),
    `${s.max > 0 ? ((s.obtained / s.max) * 100).toFixed(0) : 0}%`,
    s.grade,
    { content: s.result, styles: { textColor: s.result === 'Pass' ? [22, 163, 74] : [220, 38, 38], fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Subject', 'Exam Name', 'Type', 'Obtained', 'Max', '%', 'Grade', 'Result']],
    body,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 32 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const finalY = doc.lastAutoTable?.finalY ?? 70;

  // ── Summary bar ────────────────────────────────────────────────────────
  const isPass = report.overallResult === 'PASS';
  doc.setFillColor(isPass ? 220 : 254, isPass ? 252 : 226, isPass ? 231 : 226);
  doc.roundedRect(14, finalY + 6, pageW - 28, 18, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPass ? 21 : 185, isPass ? 128 : 28, isPass ? 61 : 26);
  doc.text(
    `Total: ${report.totalObtained}/${report.totalMax}   |   ${report.percentage}%   |   Grade: ${report.overallGrade}   |   Result: ${report.overallResult}`,
    pageW / 2,
    finalY + 17,
    { align: 'center' }
  );

  // ── Footer ─────────────────────────────────────────────────────────────
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer generated document. No signature required.', pageW / 2, finalY + 32, { align: 'center' });

  return doc.output('blob');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
