import { calcGrade } from '../utils/format.js';

/**
 * Parse DD/MM/YYYY → Date object. Returns null on failure.
 */
function parseIndianDate(str) {
  if (!str) return null;
  const p = String(str).split('/');
  if (p.length === 3) {
    const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    if (!isNaN(d)) return d;
  }
  // fallback: yyyy-mm-dd
  const d2 = new Date(str);
  return isNaN(d2) ? null : d2;
}

/**
 * Returns the cutoff Date for a period string.
 * period: '1m' | '3m' | '6m' | '1y' | '' (all)
 */
function cutoffDate(period) {
  if (!period) return null;
  const now = new Date();
  const map = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 };
  const months = map[period];
  if (!months) return null;
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
}

/**
 * Builds per-student report objects from raw students + marks rows.
 *
 * @param {Array} students
 * @param {Array} marks  — each mark may have Exam_Type, Exam_Date (joined from exams)
 * @param {{ class?: string, section?: string, period?: string, examType?: string, search?: string }} filter
 */
export function buildStudentMarksReports(students, marks, filter = {}) {
  const cls = filter.class;
  const sec = filter.section;
  const period = filter.period || '';
  const examType = filter.examType || '';
  const search = String(filter.search || '').trim().toLowerCase();

  // Time cutoff
  const cutoff = cutoffDate(period);

  // Pre-filter marks by period + exam type
  let filteredMarks = marks || [];
  if (cutoff) {
    filteredMarks = filteredMarks.filter((m) => {
      const d = parseIndianDate(m.Exam_Date);
      return d && d >= cutoff;
    });
  }
  if (examType) {
    filteredMarks = filteredMarks.filter(
      (m) => String(m.Exam_Type || '').toLowerCase() === examType.toLowerCase()
    );
  }

  // Filter students
  let studs = (students || []).filter((s) => s.Status === 'Active');
  if (cls) studs = studs.filter((s) => String(s.Class) === String(cls));
  if (sec) studs = studs.filter((s) => s.Section === sec);

  // Student search — by name, roll no, student ID
  if (search) {
    studs = studs.filter(
      (s) =>
        String(s.Name || '').toLowerCase().includes(search) ||
        String(s.Roll_No ?? '').toLowerCase().includes(search) ||
        String(s.Student_ID || '').toLowerCase().includes(search)
    );
  }

  return studs
    .map((student) => {
      const subjRows = filteredMarks.filter((m) => m.Student_ID === student.Student_ID);
      const totalObt = subjRows.reduce((a, m) => a + (Number(m.Marks_Obtained) || 0), 0);
      const totalMax = subjRows.reduce((a, m) => a + (Number(m.Max_Marks) || 0), 0);
      const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
      return {
        studentId: student.Student_ID,
        name: student.Name,
        rollNo: student.Roll_No,
        fatherName: student.Father_Name || '',
        classLabel: `${student.Class}${student.Section}`,
        classNum: String(student.Class),
        section: student.Section,
        subjects: subjRows.map((m) => ({
          subject: m.Subject,
          examName: m.Exam_Name || '',
          examType: m.Exam_Type || '',
          examDate: m.Exam_Date || '',
          obtained: Number(m.Marks_Obtained) || 0,
          max: Number(m.Max_Marks) || 0,
          grade: m.Grade || '',
          result: m.Result || '',
        })),
        totalObtained: totalObt,
        totalMax,
        percentage: pct.toFixed(1),
        overallGrade: calcGrade(pct),
        overallResult: totalMax > 0 ? (pct >= 33 ? 'PASS' : 'FAIL') : '—',
      };
    })
    .sort((a, b) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
}
