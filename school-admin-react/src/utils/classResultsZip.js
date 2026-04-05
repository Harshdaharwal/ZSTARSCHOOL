import JSZip from 'jszip';
import { createResultPdfBlob, downloadBlob } from './resultPdf.js';

/**
 * One-click ZIP: one PDF per student, filename `{rollNo}.pdf`.
 * @param {Array} reports - from buildStudentMarksReports
 * @param {string} zipBaseName - e.g. Class-12-A-Results
 */
export async function downloadClassResultsZip(reports, zipBaseName = 'Class-Results') {
  const zip = new JSZip();
  for (const report of reports) {
    const pdfBlob = createResultPdfBlob(report);
    const buf = await pdfBlob.arrayBuffer();
    zip.file(`${String(report.rollNo)}.pdf`, buf);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const safe = zipBaseName.replace(/[^a-zA-Z0-9-_]/g, '-');
  downloadBlob(zipBlob, `${safe}.zip`);
}
