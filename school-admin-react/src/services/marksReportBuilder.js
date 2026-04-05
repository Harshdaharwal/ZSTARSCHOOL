import { calcGrade } from '../utils/format.js';

/**
 * Builds per-student report objects from raw students + marks rows.
 * Replace the caller’s data source with Firebase later; keep this pure function.
 *
 * @param {Array} students
 * @param {Array} marks
 * @param {{ class?: string, section?: string }} filter - omit or empty string for "all"
 */
export function buildStudentMarksReports(students, marks, filter = {}) {
  const cls = filter.class;
  const sec = filter.section;
  let studs = (students || []).filter((s) => s.Status === 'Active');
  if (cls !== undefined && cls !== null && cls !== '') {
    studs = studs.filter((s) => String(s.Class) === String(cls));
  }
  if (sec !== undefined && sec !== null && sec !== '') {
    studs = studs.filter((s) => s.Section === sec);
  }

  return studs
    .map((student) => {
      const subjRows = (marks || []).filter((m) => m.Student_ID === student.Student_ID);
      const totalObt = subjRows.reduce((a, m) => a + (Number(m.Marks_Obtained) || 0), 0);
      const totalMax = subjRows.reduce((a, m) => a + (Number(m.Max_Marks) || 0), 0);
      const pct = totalMax > 0 ? (totalObt / totalMax) * 100 : 0;
      return {
        studentId: student.Student_ID,
        name: student.Name,
        rollNo: student.Roll_No,
        classLabel: `${student.Class}${student.Section}`,
        classNum: String(student.Class),
        section: student.Section,
        subjects: subjRows.map((m) => ({
          subject: m.Subject,
          obtained: Number(m.Marks_Obtained) || 0,
          max: Number(m.Max_Marks) || 0,
          grade: m.Grade || '',
          result: m.Result || '',
        })),
        totalObtained: totalObt,
        totalMax,
        percentage: pct.toFixed(1),
        overallGrade: calcGrade(pct),
      };
    })
    .sort((a, b) => (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0));
}
