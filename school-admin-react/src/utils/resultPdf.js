import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPdfHeaderTitle } from '../config/schoolConfig.js';

/** @param {object} report - from buildStudentMarksReports */
export function createResultPdfBlob(report) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(getPdfHeaderTitle(), 14, 18);
  doc.setFontSize(10);
  doc.text(`Name: ${report.name}`, 14, 28);
  doc.text(`Roll No: ${String(report.rollNo)}`, 14, 34);
  doc.text(`Class: ${report.classLabel}`, 14, 40);
  doc.text(`Student ID: ${report.studentId}`, 14, 46);

  const body = report.subjects.map((s) => [
    s.subject,
    String(s.obtained),
    String(s.max),
    s.grade,
    s.result,
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Subject', 'Obtained', 'Max', 'Grade', 'Result']],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  const finalY = doc.lastAutoTable?.finalY ?? 70;
  doc.setFontSize(10);
  doc.text(`Total marks: ${report.totalObtained} / ${report.totalMax}`, 14, finalY + 10);
  doc.text(`Percentage: ${report.percentage}%  |  Overall grade: ${report.overallGrade}`, 14, finalY + 16);

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
