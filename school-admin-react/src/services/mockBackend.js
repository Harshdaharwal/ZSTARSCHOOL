import { calcGrade } from '../utils/format.js';
import { SCHOOL_EXPORT_META, ACADEMIC_YEAR, SCHOOL_NAME } from '../config/schoolConfig.js';
import * as PN from './parentNotifications.js';

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const uid = (p) => p + '_' + Date.now().toString().slice(-8);

/** @type {{ students: any[]; teachers: any[]; classes: any[]; fees: any[]; exams: any[]; marks: any[]; att_stu: any[]; att_tch: any[]; schedule: any[]; timetables: any[]; announcements: any[]; homework: any[]; holidays: any[]; whatsapp_log: any[]; notification_dedupe: { key: string; at: string }[]; audit_log: any[]; class_fee_settings: { Class: string; Amount: number; Fee_Type: string; Note?: string; Updated_At?: string }[]; salaries: any[] }} */
export const DB = {
  students: [],
  teachers: [],
  classes: [],
  fees: [],
  exams: [],
  marks: [],
  att_stu: [],
  att_tch: [],
  schedule: [],
  timetables: [],
  announcements: [],
  homework: [],
  holidays: [],
  whatsapp_log: [],
  notification_dedupe: [],
  audit_log: [],
  class_fee_settings: [],
  salaries: [],
  class_announcements: [],
};

export function seedMockDatabase() {
  if (DB.students.length) return;
  const fNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Diya', 'Ananya', 'Kavya'];
  const lNames = ['Sharma', 'Verma', 'Singh', 'Patel', 'Kumar'];
  for (let c = 1; c <= 12; c++) {
    DB.classes.push({
      Class: String(c),
      Section: 'A',
      Class_Teacher_ID: 'TCH_00' + c,
      Room_No: '10' + c,
      Total_Students: '10',
    });
    for (let s = 1; s <= 10; s++) {
      const stuId = `STU_${c}00${s}`;
      const name = `${fNames[(c + s) % fNames.length]} ${lNames[(c * s) % lNames.length]}`;
      DB.students.push({
        Student_ID: stuId,
        Name: name,
        Father_Name: 'Mr. Kumar',
        Mother_Name: 'Mrs. Verma',
        Class: String(c),
        Section: 'A',
        Roll_No: s,
        DOB: '15/05/2010',
        Gender: s % 2 ? 'Male' : 'Female',
        Phone: '9876543210',
        Parent_WhatsApp: '',
        Address: 'Bhopal',
        Admission_Date: '01/01/2020',
        Status: 'Active',
        Academic_Year: ACADEMIC_YEAR,
      });
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        DB.att_stu.push({
          Date: date.toLocaleDateString('en-IN'),
          Student_ID: stuId,
          Name: name,
          Class: String(c),
          Section: 'A',
          Status: Math.random() < 0.85 ? 'Present' : 'Absent',
          Remarks: '',
        });
      }
      if (Math.random() > 0.4) {
        const paid = Math.random() > 0.3;
        DB.fees.push({
          Fee_ID: `FEE_${c}${s}`,
          Student_ID: stuId,
          Student_Name: name,
          Class: String(c),
          Fee_Type: 'Monthly Fee',
          Amount: 1500,
          Due_Date: '01/10/2023',
          Paid_Date: paid ? '05/10/2023' : '',
          Status: paid ? 'Paid' : 'Pending',
          Receipt_No: paid ? 'RCP123' : '',
          Remarks: '',
        });
      }
      ['Maths', 'Science', 'English'].forEach((sub) => {
        const obt = Math.floor(Math.random() * 60) + 35;
        DB.marks.push({
          Mark_ID: `MRK_${c}_${s}_${sub}`,
          Exam_ID: 'EXM_101',
          Student_ID: stuId,
          Student_Name: name,
          Class: String(c),
          Subject: sub,
          Marks_Obtained: obt,
          Max_Marks: 100,
          Grade: obt > 80 ? 'A' : obt > 60 ? 'B' : 'C',
          Result: obt >= 33 ? 'Pass' : 'Fail',
        });
      });
    }
  }
  for (let t = 1; t <= 12; t++) {
    DB.teachers.push({
      Teacher_ID: `TCH_00${t}`,
      Name: `Teacher ${t}`,
      Subject: ['Math', 'Science', 'English'][t % 3],
      Phone: '9988776655',
      Email: 't@school.com',
      Qualification: 'B.Ed',
      Join_Date: '01/01/2020',
      Class_Assigned: String(t),
      Section_Assigned: 'A',
      Status: 'Active',
      Password: '',
    });
  }
  DB.exams.push(
    { Exam_ID: 'EXM_101', Exam_Name: 'Mid Term', Class: '10', Subject: 'Math', Exam_Date: '15/10/2023', Max_Marks: 100, Pass_Marks: 33 },
    { Exam_ID: 'EXM_102', Exam_Name: 'Mid Term', Class: '10', Subject: 'Science', Exam_Date: '16/10/2023', Max_Marks: 100, Pass_Marks: 33 }
  );
  DB.schedule.push({
    Class: '10',
    Section: 'A',
    Day: 'Monday',
    Period: '1',
    Subject: 'Maths',
    Teacher_ID: '',
    Teacher_Name: 'Mr. Sharma',
    Room: '101',
    Time_Slot: '09:00-09:45',
  });
  DB.schedule.push(
    {
      Class: '1',
      Section: 'A',
      Day: 'Monday',
      Period: '1',
      Subject: 'Maths',
      Teacher_ID: 'TCH_001',
      Teacher_Name: 'Teacher 1',
      Room: 'A1',
      Time_Slot: '09:00-09:45',
    },
    {
      Class: '1',
      Section: 'A',
      Day: 'Monday',
      Period: '2',
      Subject: 'Science',
      Teacher_ID: 'TCH_001',
      Teacher_Name: 'Teacher 1',
      Room: 'A1',
      Time_Slot: '09:45-10:30',
    },
    {
      Class: '1',
      Section: 'A',
      Day: 'Tuesday',
      Period: '1',
      Subject: 'English',
      Teacher_ID: 'TCH_001',
      Teacher_Name: 'Teacher 1',
      Room: 'A1',
      Time_Slot: '09:00-09:45',
    }
  );

  if (!DB.timetables.length) {
    DB.timetables.push(
      {
        Entry_ID: 'TT_CLASS_1',
        Type: 'Class',
        Title: 'Weekly — Class 10-A',
        Class: '10',
        Section: 'A',
        Day: 'Monday',
        Event_Date: '',
        Time_Slot: '09:00–15:00',
        Room: 'Block A',
        Subject: 'All subjects',
        Notes: 'Regular school day',
      },
      {
        Entry_ID: 'TT_EXAM_1',
        Type: 'Exam',
        Title: 'Mid-term — Mathematics',
        Class: '10',
        Section: 'A',
        Day: '',
        Event_Date: '15/10/2023',
        Time_Slot: '09:00–12:00',
        Room: 'Hall 1',
        Subject: 'Math',
        Notes: 'Bring geometry box',
      }
    );
  }
  if (!DB.announcements.length) {
    DB.announcements.push({
      Announcement_ID: 'ANN_1',
      Title: 'Welcome to the new term',
      Body: 'Parents–teacher meeting is scheduled for next Friday at 4 PM.',
      Posted_At: new Date().toISOString(),
      Priority: 'Normal',
    });
  }

  // Seed salary records
  if (!DB.salaries.length) {
    const staffMembers = [
      { id: 'STF_001', name: 'Ramesh Gupta', role: 'staff', designation: 'Peon', salary: 8000 },
      { id: 'STF_002', name: 'Sunita Devi', role: 'staff', designation: 'Clerk', salary: 12000 },
      { id: 'STF_003', name: 'Manoj Tiwari', role: 'staff', designation: 'Security', salary: 10000 },
      { id: 'STF_004', name: 'Priya Singh', role: 'staff', designation: 'Librarian', salary: 15000 },
      { id: 'STF_005', name: 'Deepak Yadav', role: 'staff', designation: 'Lab Assistant', salary: 11000 },
    ];
    const now = new Date();
    // Generate 6 months of salary records for teachers
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const month = d.toLocaleString('en-IN', { month: 'long' });
      const year = d.getFullYear();
      const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}/${year}`;
      DB.teachers.forEach((t, idx) => {
        const baseSalary = 18000 + idx * 1500;
        const isPaid = m > 0 || Math.random() > 0.4;
        DB.salaries.push({
          Salary_ID: `SAL_TCH_${t.Teacher_ID}_${monthKey.replace('/', '_')}`,
          Staff_ID: t.Teacher_ID,
          Name: t.Name,
          Role: 'teacher',
          Designation: `${t.Subject} Teacher`,
          Month: month,
          Year: String(year),
          Month_Key: monthKey,
          Amount: baseSalary,
          Status: isPaid ? 'Paid' : 'Pending',
          Paid_Date: isPaid ? d.toLocaleDateString('en-IN') : '',
          Remarks: '',
        });
      });
      // Generate for staff
      staffMembers.forEach((st) => {
        const isPaid = m > 0 || Math.random() > 0.5;
        DB.salaries.push({
          Salary_ID: `SAL_STF_${st.id}_${monthKey.replace('/', '_')}`,
          Staff_ID: st.id,
          Name: st.name,
          Role: st.role,
          Designation: st.designation,
          Month: month,
          Year: String(year),
          Month_Key: monthKey,
          Amount: st.salary,
          Status: isPaid ? 'Paid' : 'Pending',
          Paid_Date: isPaid ? d.toLocaleDateString('en-IN') : '',
          Remarks: '',
        });
      });
    }
  }

}

function buildAttendanceTrendByClass() {
  const byClass = {};
  DB.att_stu.forEach((a) => {
    const c = String(a.Class);
    const d = a.Date;
    if (!byClass[c]) byClass[c] = {};
    if (!byClass[c][d]) byClass[c][d] = { p: 0, a: 0 };
    if (a.Status === 'Present') byClass[c][d].p++;
    else byClass[c][d].a++;
  });
  const out = {};
  Object.keys(byClass).forEach((c) => {
    const dates = Object.keys(byClass[c]).sort();
    const last7 = dates.slice(-7);
    out[c] = last7.map((date) => ({
      date,
      present: byClass[c][date].p,
      absent: byClass[c][date].a,
    }));
  });
  return out;
}

function uniqueClassesFromDb() {
  const s = new Set(DB.classes.map((c) => String(c.Class)));
  if (s.size === 0) {
    DB.students.forEach((st) => {
      if (st.Class != null && String(st.Class) !== '') s.add(String(st.Class));
    });
  }
  return [...s].sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)));
}

/** Sync admin class fee to each active student’s pending row (one row per student for this fee type). */
function syncAdminClassFeeToStudents(clsStr, amount, feeType) {
  const type = feeType || PN.ADMIN_CLASS_FEE_TYPE;
  const amt = Number(amount) || 0;
  const cls = String(clsStr);
  let updated = 0;
  let created = 0;
  for (const st of DB.students) {
    if (String(st.Class) !== cls || st.Status !== 'Active') continue;
    const idx = DB.fees.findIndex(
      (f) => f.Student_ID === st.Student_ID && f.Fee_Type === type && f.Status === 'Pending'
    );
    if (idx !== -1) {
      DB.fees[idx].Amount = amt;
      DB.fees[idx].Class = cls;
      updated++;
    } else {
      DB.fees.push({
        Fee_ID: uid('FEE'),
        Student_ID: st.Student_ID,
        Student_Name: st.Name,
        Class: cls,
        Fee_Type: type,
        Amount: amt,
        Due_Date: '',
        Paid_Date: '',
        Status: 'Pending',
        Receipt_No: '',
        Remarks: 'Synced from class fee settings',
      });
      created++;
    }
  }
  return { updated, created };
}

function buildDashboardStats() {
  const dateMap = {};
  DB.att_stu.forEach((a) => {
    if (!dateMap[a.Date]) dateMap[a.Date] = { p: 0, a: 0, t: 0 };
    dateMap[a.Date].t++;
    if (a.Status === 'Present') dateMap[a.Date].p++;
    else dateMap[a.Date].a++;
  });
  const trendData = Object.keys(dateMap)
    .sort()
    .slice(-7)
    .map((d) => ({ date: d, present: dateMap[d].p, absent: dateMap[d].a }));
  const classMap = {};
  DB.students.forEach((s) => {
    if (s.Status === 'Active') classMap[s.Class] = (classMap[s.Class] || 0) + 1;
  });
  const attCount = {};
  DB.att_stu.forEach((a) => {
    if (!attCount[a.Student_ID]) attCount[a.Student_ID] = { p: 0, a: 0, t: 0 };
    attCount[a.Student_ID].t++;
    if (a.Status === 'Present') attCount[a.Student_ID].p++;
    else attCount[a.Student_ID].a++;
  });
  const sidePanelStudents = [];
  const classCountTracker = {};
  DB.students
    .filter((s) => s.Status === 'Active')
    .forEach((s) => {
      if (!classCountTracker[s.Class]) classCountTracker[s.Class] = 0;
      if (classCountTracker[s.Class] < 10) {
        const ac = attCount[s.Student_ID] || { p: 0, a: 0, t: 0 };
        sidePanelStudents.push({
          id: s.Student_ID,
          name: s.Name,
          cls: s.Class,
          sec: s.Section,
          present: ac.p,
          absent: ac.a,
          pct: ac.t > 0 ? Math.round((ac.p / ac.t) * 100) : 0,
        });
        classCountTracker[s.Class]++;
      }
    });
  return {
    activeStudents: DB.students.filter((s) => s.Status === 'Active').length,
    activeTeachers: DB.teachers.filter((t) => t.Status === 'Active').length,
    presentToday: trendData.length ? trendData[trendData.length - 1].present : 0,
    pendingFees: DB.fees.filter((f) => f.Status === 'Pending').length,
    monthCollection: DB.fees.filter((f) => f.Status === 'Paid').reduce((sum, f) => sum + (Number(f.Amount) || 0), 0),
    totalExams: DB.exams.length,
    chartData: {
      classDistribution: classMap,
      attendanceTrend: trendData,
      attendanceTrendByClass: buildAttendanceTrendByClass(),
    },
    sidePanelStudents,
  };
}

function buildReportCardPayload(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { ok: false, msg: 'Please enter Student Name or ID!' };
  let student = DB.students.find((s) => String(s.Student_ID).toLowerCase() === q || String(s.Name).toLowerCase() === q);
  let marks = DB.marks.filter((m) => String(m.Student_ID).toLowerCase() === q);
  if (!student && marks.length) {
    student = {
      Name: marks[0].Student_Name,
      Student_ID: marks[0].Student_ID,
      Father_Name: 'N/A',
      Mother_Name: '-',
      Class: marks[0].Class || '-',
      Section: '-',
      Roll_No: '-',
      DOB: '-',
    };
  }
  if (!student) return { ok: false, msg: 'No results found!' };
  const sid = String(student.Student_ID).toLowerCase();
  marks = DB.marks.filter((m) => String(m.Student_ID).toLowerCase() === sid);
  const recs = DB.att_stu.filter((a) => String(a.Student_ID).toLowerCase() === sid);
  const attSum = {
    total: recs.length,
    present: recs.filter((r) => r.Status === 'Present').length,
    absent: recs.filter((r) => r.Status === 'Absent').length,
    late: recs.filter((r) => r.Status === 'Late').length,
    pct: recs.length ? ((recs.filter((r) => r.Status === 'Present').length / recs.length) * 100).toFixed(1) : '0.0',
  };
  const pendingFees = DB.fees.filter((f) => String(f.Student_ID).toLowerCase() === sid && f.Status === 'Pending').length;
  const totalObt = marks.reduce((s, m) => s + (Number(m.Marks_Obtained) || 0), 0);
  const totalMax = marks.reduce((s, m) => s + (Number(m.Max_Marks) || 0), 0);
  const overall = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : '0.0';
  return {
    ok: true,
    student,
    marks,
    attendance: attSum,
    pendingFees,
    totalObtained: totalObt,
    totalMax,
    overallPct: overall,
    overallGrade: calcGrade(Number(overall)),
  };
}

export function createMockApi(getActor) {
  const actorFn = typeof getActor === 'function' ? getActor : () => null;

  function audit(action, detail) {
    const a = actorFn();
    if (!a?.email) return;
    DB.audit_log.push({
      at: new Date().toISOString(),
      actorEmail: a.email,
      actorRole: a.role,
      action,
      detail: typeof detail === 'object' ? JSON.stringify(detail) : String(detail),
    });
  }

  seedMockDatabase();
  return {
    async getDashboardStats() {
      await delay();
      return buildDashboardStats();
    },
    async getAllStudents() {
      await delay();
      return [...DB.students];
    },
    async getAllTeachers() {
      await delay();
      return [...DB.teachers];
    },
    async getAllClasses() {
      await delay();
      return [...DB.classes];
    },

    async getClassFeeSettings() {
      await delay();
      const classes = uniqueClassesFromDb();
      const map = new Map((DB.class_fee_settings || []).map((x) => [String(x.Class), x]));
      return classes.map((c) => {
        const row = map.get(String(c));
        return {
          Class: String(c),
          Amount: row != null ? Number(row.Amount) : '',
          Fee_Type: row?.Fee_Type || PN.ADMIN_CLASS_FEE_TYPE,
          Note: row?.Note || '',
          Updated_At: row?.Updated_At || '',
        };
      });
    },
    async saveClassFeeSetting(d) {
      await delay();
      const cls = String(d?.cls ?? '').trim();
      const amount = Number(d?.amount);
      if (!cls) return { ok: false, msg: 'Class is required.' };
      if (!Number.isFinite(amount) || amount < 0) return { ok: false, msg: 'Enter a valid amount (0 or more).' };
      const feeType = String(d?.feeType || PN.ADMIN_CLASS_FEE_TYPE).trim() || PN.ADMIN_CLASS_FEE_TYPE;
      const note = d?.note != null ? String(d.note) : '';
      if (!DB.class_fee_settings) DB.class_fee_settings = [];
      const list = DB.class_fee_settings;
      const i = list.findIndex((x) => String(x.Class) === cls);
      const row = {
        Class: cls,
        Amount: amount,
        Fee_Type: feeType,
        Note: note,
        Updated_At: new Date().toISOString(),
      };
      if (i === -1) list.push(row);
      else Object.assign(list[i], row);
      const sync = syncAdminClassFeeToStudents(cls, amount, feeType);
      audit('class_fee_setting_save', { class: cls, amount, feeType, ...sync });
      return {
        ok: true,
        msg: `Saved Class ${cls}: ₹${amount.toLocaleString('en-IN')}. Updated ${sync.updated} student fee row(s), created ${sync.created}. Parent messages use this amount.`,
        sync,
      };
    },
    async getAllFees() {
      await delay();
      return [...DB.fees];
    },
    async getPendingFees() {
      await delay();
      return DB.fees.filter((f) => f.Status === 'Pending');
    },
    async getPaidFees() {
      await delay();
      return DB.fees.filter((f) => f.Status === 'Paid');
    },
    async getAllExams() {
      await delay();
      return [...DB.exams];
    },
    async getAllMarks() {
      await delay();
      return [...DB.marks];
    },
    /** Admin marks matrix + future Firebase: return same shape { students, marks } */
    async getMarksAdminData() {
      await delay();
      return {
        students: DB.students.map((s) => ({ ...s })),
        marks: [...DB.marks],
      };
    },
    /** Teacher view: students + marks only for the signed-in teacher’s assigned class/section. */
    async getMarksTeacherData() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'teacher') {
        return { students: [], marks: [], meta: { noAccess: true } };
      }
      const tid = String(actor.teacherId || '');
      const t = DB.teachers.find((x) => String(x.Teacher_ID) === tid);
      if (!t) {
        return { students: [], marks: [], meta: { noProfile: true } };
      }
      const cls = String(t.Class_Assigned ?? '');
      const sec = String(t.Section_Assigned ?? '');
      const students = DB.students.filter(
        (s) => String(s.Class) === cls && String(s.Section) === sec && s.Status === 'Active'
      );
      const ids = new Set(students.map((s) => s.Student_ID));
      const marks = DB.marks.filter((m) => ids.has(m.Student_ID));
      return {
        students: students.map((s) => ({ ...s })),
        marks: [...marks],
        meta: { class: cls, section: sec, teacherName: t.Name },
      };
    },
    async getStudentStats(classFilter) {
      await delay();
      const cf =
        classFilter != null && String(classFilter).trim() !== '' ? String(classFilter).trim() : null;
      const pool = cf ? DB.students.filter((s) => String(s.Class) === cf) : DB.students;
      const byG = { Male: 0, Female: 0, Other: 0 };
      const byC = {};
      pool.forEach((s) => {
        byG[s.Gender] = (byG[s.Gender] || 0) + 1;
        const k = `${s.Class}-${s.Section}`;
        byC[k] = (byC[k] || 0) + 1;
      });
      const allClasses = [
        ...new Set(DB.students.map((s) => String(s.Class)).filter(Boolean)),
      ].sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)));
      return {
        total: pool.length,
        active: pool.filter((s) => s.Status === 'Active').length,
        inactive: pool.filter((s) => s.Status !== 'Active').length,
        byGender: byG,
        byClass: byC,
        allClasses,
        classFilter: cf,
      };
    },
    async addStudent(d) {
      await delay();
      const id = uid('STU');
      DB.students.push({
        Student_ID: id,
        Name: d.name,
        Father_Name: d.fatherName,
        Mother_Name: d.motherName || '',
        Class: String(d.cls),
        Section: d.section,
        Roll_No: DB.students.length + 1,
        DOB: d.dob || '',
        Gender: d.gender || 'Male',
        Phone: d.phone || '',
        Address: d.address || '',
        Admission_Date: '',
        Status: 'Active',
        Academic_Year: d.academicYear || ACADEMIC_YEAR,
        Parent_WhatsApp: d.parentWhatsApp != null ? String(d.parentWhatsApp).replace(/\D/g, '').slice(-10) : '',
        Photo: d.photo || '',
      });
      return { ok: true, msg: 'Student registered! ID: ' + id };
    },
    async updateStudent(id, d) {
      await delay();
      const s = DB.students.find((x) => x.Student_ID === id);
      if (!s) return { ok: false, msg: 'Student not found!' };
      Object.assign(s, {
        Name: d.name,
        Father_Name: d.fatherName,
        Mother_Name: d.motherName,
        Class: String(d.cls),
        Section: d.section,
        DOB: d.dob,
        Gender: d.gender,
        Phone: d.phone,
        Address: d.address,
        Academic_Year: d.academicYear != null ? String(d.academicYear) : s.Academic_Year,
        Parent_WhatsApp:
          d.parentWhatsApp !== undefined
            ? String(d.parentWhatsApp || '')
              .replace(/\D/g, '')
              .slice(-10)
            : s.Parent_WhatsApp,
        Photo: d.photo !== undefined ? d.photo : s.Photo,
      });
      return { ok: true, msg: 'Student updated successfully!' };
    },
    async setStudentStatus(id, status) {
      await delay();
      const s = DB.students.find((x) => x.Student_ID === id);
      if (!s) return { ok: false, msg: 'Student not found' };
      s.Status = status;
      return { ok: true, msg: 'Status updated: ' + status };
    },
    async getStudentsByClass(cls, section) {
      await delay();
      return DB.students.filter((s) => String(s.Class) === String(cls) && (!section || s.Section === section));
    },
    async addTeacher(d) {
      await delay();
      const id = uid('TCH');
      DB.teachers.push({
        Teacher_ID: id,
        Name: d.name,
        Subject: d.subject,
        Phone: d.phone,
        Email: d.email || '',
        Qualification: d.qualification || '',
        Join_Date: d.joinDate || '',
        Class_Assigned: d.classAssigned || '',
        Section_Assigned: d.sectionAssigned || '',
        Status: 'Active',
        Password: d.password || '',
        Photo: d.photo || '',
      });
      return { ok: true, msg: 'Teacher added! ID: ' + id };
    },
    async updateTeacher(id, d) {
      await delay();
      const t = DB.teachers.find((x) => x.Teacher_ID === id);
      if (!t) return { ok: false, msg: 'Teacher not found!' };
      Object.assign(t, {
        Name: d.name,
        Subject: d.subject,
        Phone: d.phone,
        Email: d.email,
        Qualification: d.qualification,
        Class_Assigned: d.classAssigned,
        Section_Assigned: d.sectionAssigned,
        Join_Date: d.joinDate != null ? d.joinDate : t.Join_Date,
        Photo: d.photo !== undefined ? d.photo : t.Photo,
      });
      if (d.password) t.Password = d.password;
      return { ok: true, msg: 'Teacher updated!' };
    },
    async addClass(d) {
      await delay();
      const dup = DB.classes.some((c) => String(c.Class) === String(d.cls) && c.Section === d.section);
      if (dup) return { ok: false, msg: 'This Class-Section already exists!' };
      DB.classes.push({
        Class: String(d.cls),
        Section: d.section,
        Class_Teacher_ID: d.classTeacherId || '',
        Room_No: d.roomNo || '',
        Total_Students: '0',
      });
      return { ok: true, msg: 'Class added successfully!' };
    },
    async deleteClass(cls, section) {
      await delay();
      const i = DB.classes.findIndex((c) => String(c.Class) === String(cls) && c.Section === section);
      if (i === -1) return { ok: false, msg: 'Class not found' };
      DB.classes.splice(i, 1);
      audit('class_delete', { cls, section });
      return { ok: true, msg: 'Class deleted!' };
    },
    async addSchedule(d) {
      await delay();
      DB.schedule.push({
        Class: String(d.cls),
        Section: d.section,
        Day: d.day,
        Period: String(d.period),
        Subject: d.subject,
        Teacher_ID: d.teacherId || '',
        Teacher_Name: d.teacherName || '',
        Room: d.room || '',
        Time_Slot: d.timeSlot || '',
      });
      return { ok: true, msg: 'Schedule added!' };
    },
    async getSchedule(cls, section) {
      await delay();
      return DB.schedule.filter((s) => String(s.Class) === String(cls) && s.Section === section);
    },
    async deleteSchedule(cls, section, day, period) {
      await delay();
      const i = DB.schedule.findIndex(
        (s) => String(s.Class) === String(cls) && s.Section === section && s.Day === day && String(s.Period) === String(period)
      );
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.schedule.splice(i, 1);
      return { ok: true, msg: 'Schedule deleted!' };
    },
    async markStudentAttendance(records, dateStr) {
      await delay();
      const cls = records.length ? String(records[0].cls) : '';
      const sec = records.length ? String(records[0].section ?? '') : '';
      DB.att_stu = DB.att_stu.filter(
        (a) => !(a.Date === dateStr && String(a.Class) === cls && String(a.Section ?? '') === sec)
      );
      records.forEach((rec) => {
        DB.att_stu.push({
          Date: dateStr,
          Student_ID: rec.studentId,
          Name: rec.name,
          Class: String(rec.cls),
          Section: rec.section,
          Status: rec.status,
          Remarks: rec.remarks || '',
        });
      });
      audit('student_attendance', { dateStr, class: cls, section: sec, count: records.length });
      PN.notifyAbsentForAttendance(DB, audit, SCHOOL_NAME, records, dateStr);
      return { ok: true, msg: records.length + ' students attendance saved!' };
    },
    /** Returns { [Student_ID]: 'P'|'A'|'L' } for one class/section/day — for edit / reload UI */
    async getStudentAttendanceForDay(cls, section, dateStr) {
      await delay();
      const sec = String(section ?? '');
      const recs = DB.att_stu.filter(
        (a) =>
          a.Date === dateStr && String(a.Class) === String(cls) && String(a.Section ?? '') === sec
      );
      const toCode = (s) => {
        if (s === 'Present') return 'P';
        if (s === 'Absent') return 'A';
        if (s === 'Late') return 'L';
        return 'P';
      };
      const map = {};
      recs.forEach((r) => {
        map[r.Student_ID] = toCode(r.Status);
      });
      return map;
    },
    async getStudentAttendanceSummary(studentId) {
      await delay();
      const recs = DB.att_stu.filter((a) => String(a.Student_ID).toLowerCase() === String(studentId).trim().toLowerCase());
      const present = recs.filter((r) => r.Status === 'Present').length;
      const absent = recs.filter((r) => r.Status === 'Absent').length;
      const late = recs.filter((r) => r.Status === 'Late').length;
      const total = recs.length;
      return { total, present, absent, late, pct: total ? ((present / total) * 100).toFixed(1) : '0.0' };
    },
    async markTeacherAttendance(records, dateStr) {
      await delay();
      DB.att_tch = DB.att_tch.filter((a) => a.Date !== dateStr);
      records.forEach((rec) => {
        DB.att_tch.push({
          Date: dateStr,
          Teacher_ID: rec.teacherId,
          Name: rec.name,
          Status: rec.status,
          In_Time: rec.inTime || '',
          Out_Time: rec.outTime || '',
          Remarks: rec.remarks || '',
        });
      });
      audit('teacher_attendance', { dateStr, count: records.length });
      return { ok: true, msg: 'Teacher attendance saved!' };
    },
    /** { [Teacher_ID]: 'P'|'A'|'L' } for a calendar day (dd/mm/yyyy) */
    async getTeacherAttendanceForDay(dateStr) {
      await delay();
      const recs = DB.att_tch.filter((a) => a.Date === dateStr);
      const toCode = (s) => {
        if (s === 'Present') return 'P';
        if (s === 'Absent') return 'A';
        if (s === 'Leave' || s === 'Late') return 'L';
        return 'P';
      };
      const map = {};
      recs.forEach((r) => {
        map[r.Teacher_ID] = toCode(r.Status);
      });
      return map;
    },
    async getTeacherAttSummary(teacherId) {
      await delay();
      const recs = DB.att_tch.filter((a) => a.Teacher_ID === teacherId);
      const total = recs.length;
      const present = recs.filter((r) => r.Status === 'Present').length;
      return {
        total,
        present,
        absent: recs.filter((r) => r.Status === 'Absent').length,
        leave: recs.filter((r) => r.Status === 'Leave').length,
        pct: total ? ((present / total) * 100).toFixed(1) : '0.0',
      };
    },
    async addFeeRecord(d) {
      await delay();
      const id = uid('FEE');
      const rcpt = d.status === 'Paid' ? 'RCP' + Date.now().toString().slice(-7) : '';
      DB.fees.push({
        Fee_ID: id,
        Student_ID: d.studentId,
        Student_Name: d.studentName,
        Class: String(d.cls || ''),
        Fee_Type: d.feeType,
        Amount: Number(d.amount) || 0,
        Due_Date: d.dueDate || '',
        Paid_Date: d.paidDate || '',
        Status: d.status || 'Pending',
        Receipt_No: rcpt,
        Remarks: d.remarks || '',
      });
      return { ok: true, msg: 'Fee record saved!', id, receipt: rcpt };
    },
    async deleteFeeRecord(feeId) {
      await delay();
      const i = DB.fees.findIndex((f) => f.Fee_ID === feeId);
      if (i === -1) return { ok: false, msg: 'Record not found' };
      DB.fees.splice(i, 1);
      audit('fee_delete', { feeId });
      return { ok: true, msg: 'Fee record deleted!' };
    },
    async addExam(d) {
      await delay();
      const id = uid('EXM');
      const exam = {
        Exam_ID: id,
        Exam_Name: d.examName,
        Class: String(d.cls),
        Subject: d.subject,
        Exam_Date: d.date || '',
        Max_Marks: Number(d.maxMarks) || 100,
        Pass_Marks: Number(d.passMarks) || 33,
      };
      DB.exams.push(exam);
      PN.notifyExamForClass(DB, audit, SCHOOL_NAME, exam);
      return { ok: true, msg: 'Exam added successfully!', examId: id };
    },
    async deleteExam(examId) {
      await delay();
      const i = DB.exams.findIndex((e) => e.Exam_ID === examId);
      if (i === -1) return { ok: false, msg: 'Exam not found' };
      DB.exams.splice(i, 1);
      return { ok: true, msg: 'Exam deleted!' };
    },
    async addMarks(d) {
      await delay();
      const id = uid('MRK');
      const max = Number(d.maxMarks) || 100;
      const obt = Number(d.marksObtained) || 0;
      const pct = (obt / max) * 100;
      const grade = calcGrade(pct);
      const result = pct >= 33 ? 'Pass' : 'Fail';
      DB.marks.push({
        Mark_ID: id,
        Exam_ID: d.examId,
        Student_ID: d.studentId,
        Student_Name: d.studentName || '',
        Class: String(d.cls || ''),
        Subject: d.subject,
        Marks_Obtained: obt,
        Max_Marks: max,
        Grade: grade,
        Result: result,
      });
      audit('marks_add', { studentId: d.studentId, subject: d.subject });
      return { ok: true, msg: 'Marks saved!', grade, result, pct: pct.toFixed(1) };
    },
    async deleteMark(markId) {
      await delay();
      const i = DB.marks.findIndex((m) => m.Mark_ID === markId);
      if (i === -1) return { ok: false, msg: 'Entry not found' };
      DB.marks.splice(i, 1);
      audit('marks_delete', { markId });
      return { ok: true, msg: 'Mark entry deleted!' };
    },
    async getReportCard(query) {
      await delay();
      return buildReportCardPayload(query);
    },
    async getAuditLog(limit = 100) {
      await delay();
      const n = Math.min(500, Math.max(1, Number(limit) || 100));
      return [...DB.audit_log].slice(-n).reverse();
    },
    async exportSchoolSnapshot() {
      await delay();
      return {
        ...SCHOOL_EXPORT_META,
        exportedAt: new Date().toISOString(),
        students: DB.students.map((r) => ({ ...r })),
        teachers: DB.teachers.map((r) => ({ ...r })),
        classes: DB.classes.map((r) => ({ ...r })),
        fees: DB.fees.map((r) => ({ ...r })),
        exams: DB.exams.map((r) => ({ ...r })),
        marks: DB.marks.map((r) => ({ ...r })),
        att_stu: DB.att_stu.map((r) => ({ ...r })),
        att_tch: DB.att_tch.map((r) => ({ ...r })),
        schedule: DB.schedule.map((r) => ({ ...r })),
        timetables: DB.timetables.map((r) => ({ ...r })),
        announcements: DB.announcements.map((r) => ({ ...r })),
        homework: DB.homework.map((r) => ({ ...r })),
        holidays: DB.holidays.map((r) => ({ ...r })),
        class_fee_settings: (DB.class_fee_settings || []).map((r) => ({ ...r })),
        whatsapp_log_tail: DB.whatsapp_log.slice(-200),
        audit_tail: DB.audit_log.slice(-200),
      };
    },
    async getScheduleForTeacherDay(teacherId, dayName) {
      await delay();
      const t = DB.teachers.find((x) => x.Teacher_ID === teacherId);
      if (!t) return [];
      return DB.schedule
        .filter(
          (s) =>
            String(s.Class) === String(t.Class_Assigned) &&
            s.Section === t.Section_Assigned &&
            s.Day === dayName
        )
        .sort((a, b) => Number(a.Period) - Number(b.Period));
    },
    async getTimetables() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return [];
      return [...DB.timetables].sort((a, b) => String(a.Entry_ID).localeCompare(String(b.Entry_ID)));
    },
    async addTimetable(d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const id = uid('TT');
      DB.timetables.push({
        Entry_ID: id,
        Type: d.type || 'Class',
        Title: d.title || '',
        Class: String(d.cls || ''),
        Section: d.section || '',
        Day: d.day || '',
        Event_Date: d.eventDate || '',
        Time_Slot: d.timeSlot || '',
        Room: d.room || '',
        Subject: d.subject || '',
        Notes: d.notes || '',
      });
      audit('timetable_add', { id });
      return { ok: true, msg: 'Timetable entry added!', id };
    },
    async deleteTimetable(entryId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const i = DB.timetables.findIndex((x) => x.Entry_ID === entryId);
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.timetables.splice(i, 1);
      audit('timetable_delete', { entryId });
      return { ok: true, msg: 'Removed' };
    },
    async getAnnouncements() {
      await delay();
      return [...DB.announcements].sort((a, b) => String(b.Posted_At).localeCompare(String(a.Posted_At)));
    },
    async addAnnouncement(d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const id = uid('ANN');
      const row = {
        Announcement_ID: id,
        Title: d.title || '',
        Body: d.body || '',
        Posted_At: new Date().toISOString(),
        Priority: d.priority || 'Normal',
      };
      DB.announcements.push(row);
      audit('announcement_add', { id });
      PN.notifyAnnouncementBroadcast(DB, audit, SCHOOL_NAME, row);
      return { ok: true, msg: 'Announcement posted!', id };
    },
    async deleteAnnouncement(announcementId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const i = DB.announcements.findIndex((x) => x.Announcement_ID === announcementId);
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.announcements.splice(i, 1);
      return { ok: true, msg: 'Removed' };
    },
    async getHomeworkForTeacher() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'teacher') return [];
      const tid = String(actor.teacherId || '');
      const t = DB.teachers.find((x) => String(x.Teacher_ID) === tid);
      if (!t) return [];
      const cls = String(t.Class_Assigned ?? '');
      const sec = String(t.Section_Assigned ?? '');
      return DB.homework
        .filter((h) => String(h.Class) === cls && String(h.Section) === sec)
        .map((h) => ({ ...h }))
        .sort((a, b) => String(b.Created_At).localeCompare(String(a.Created_At)));
    },
    async addHomework(d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'teacher') return { ok: false, msg: 'Teachers only' };
      const tid = String(actor.teacherId || '');
      const t = DB.teachers.find((x) => String(x.Teacher_ID) === tid);
      if (!t) return { ok: false, msg: 'Teacher profile not found' };
      const cls = String(d.cls ?? t.Class_Assigned ?? '');
      const sec = String(d.section ?? t.Section_Assigned ?? '');
      if (String(t.Class_Assigned) !== cls || String(t.Section_Assigned) !== sec) {
        return { ok: false, msg: 'You can only assign homework to your class.' };
      }
      const id = uid('HW');
      DB.homework.push({
        Homework_ID: id,
        Teacher_ID: tid,
        Teacher_Name: t.Name,
        Class: cls,
        Section: sec,
        Subject: d.subject || '',
        Title: d.title || '',
        Description: d.description || '',
        Due_Date: d.dueDate || '',
        Created_At: new Date().toISOString(),
      });
      audit('homework_add', { id, cls, sec });
      return { ok: true, msg: 'Homework posted!', id };
    },
    async getHolidays() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return [];
      return [...DB.holidays].sort((a, b) => String(a.Start_Date).localeCompare(String(b.Start_Date)));
    },
    async addHoliday(d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const sd = String(d.startDate || '').trim();
      const ed = String(d.endDate || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sd) || !/^\d{4}-\d{2}-\d{2}$/.test(ed)) {
        return { ok: false, msg: 'Use yyyy-mm-dd for start and end dates.' };
      }
      if (sd > ed) return { ok: false, msg: 'End date must be on or after start date.' };
      const id = uid('HOL');
      const row = {
        Holiday_ID: id,
        Title: d.title || 'School holiday',
        Start_Date: sd,
        End_Date: ed,
      };
      DB.holidays.push(row);
      PN.broadcastHolidayDates(DB, audit, SCHOOL_NAME, row);
      audit('holiday_add', { id, sd, ed });
      return { ok: true, msg: 'Holiday saved. Parents notified (mock WhatsApp queue).', id };
    },
    async deleteHoliday(holidayId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const i = DB.holidays.findIndex((h) => h.Holiday_ID === holidayId);
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.holidays.splice(i, 1);
      audit('holiday_delete', { holidayId });
      return { ok: true, msg: 'Holiday removed.' };
    },
    async getWhatsAppLog(limit = 150) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return [];
      const n = Math.min(300, Math.max(1, Number(limit) || 150));
      return [...DB.whatsapp_log].slice(-n).reverse();
    },
    async getWhatsAppIntegrationInfo() {
      await delay();
      return {
        mode: 'mock',
        message:
          'No WhatsApp Business API key is configured. Outgoing messages are stored in a local queue for review. Plug in your provider in parentNotifications.js / backend when ready.',
      };
    },
    async runScheduledParentNotifications() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const { messages } = PN.processHolidayEndReminders(DB, audit, SCHOOL_NAME, new Date());
      return {
        ok: true,
        msg:
          messages > 0
            ? `Queued ${messages} “reopening soon” reminder(s) (mock WhatsApp).`
            : 'No holiday end reminders due today (or already sent for this holiday).',
        remindersQueued: messages,
      };
    },
    async simulateWeeklyWhatsAppDigests() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      return PN.sendWeeklyDigests(DB, audit, SCHOOL_NAME, new Date());
    },
    async simulateMonthlyWhatsAppReports() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      return PN.sendMonthlyDigests(DB, audit, SCHOOL_NAME, new Date());
    },
    async getBulkReportCards(cls, section) {
      await delay();
      const studs = DB.students.filter((s) => String(s.Class) === String(cls) && s.Section === section && s.Status === 'Active');
      studs.sort((a, b) => a.Name.localeCompare(b.Name));
      const reports = studs.map((student) => {
        const marks = DB.marks.filter((m) => m.Student_ID === student.Student_ID);
        const attRecords = DB.att_stu.filter((a) => a.Student_ID === student.Student_ID);
        const total = attRecords.length;
        const present = attRecords.filter((r) => r.Status === 'Present').length;
        const attendance = {
          total,
          present,
          absent: total - present,
          pct: total ? ((present / total) * 100).toFixed(1) : '0.0',
        };
        const pendingFees = DB.fees.filter((f) => f.Student_ID === student.Student_ID && f.Status === 'Pending').length;
        const totalObt = marks.reduce((s, m) => s + (Number(m.Marks_Obtained) || 0), 0);
        const totalMax = marks.reduce((s, m) => s + (Number(m.Max_Marks) || 0), 0);
        const overall = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : '0.0';
        return {
          student,
          marks,
          attendance,
          pendingFees,
          totalObtained: totalObt,
          totalMax,
          overallPct: overall,
          overallGrade: calcGrade(Number(overall)),
        };
      });
      return { ok: true, reports, count: reports.length };
    },

    // ── Salary APIs (admin only) ──────────────────────────────────────
    async getAllSalaries() {
      await delay();
      return [...DB.salaries];
    },
    async markSalaryPaid(salaryId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const rec = DB.salaries.find((s) => s.Salary_ID === salaryId);
      if (!rec) return { ok: false, msg: 'Record not found' };
      rec.Status = 'Paid';
      rec.Paid_Date = new Date().toLocaleDateString('en-IN');
      audit('salary_paid', { salaryId });
      return { ok: true, msg: `Salary marked as Paid for ${rec.Name} (${rec.Month} ${rec.Year})` };
    },
    async addSalaryRecord(d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const id = uid('SAL');
      const monthKey = `${String(d.monthNum || '01').padStart(2, '0')}/${d.year || new Date().getFullYear()}`;
      DB.salaries.push({
        Salary_ID: id,
        Staff_ID: d.staffId || '',
        Name: d.name || '',
        Role: d.role || 'staff',
        Designation: d.designation || '',
        Month: d.month || '',
        Year: String(d.year || new Date().getFullYear()),
        Month_Key: monthKey,
        Amount: Number(d.amount) || 0,
        Status: d.status || 'Pending',
        Paid_Date: d.status === 'Paid' ? new Date().toLocaleDateString('en-IN') : '',
        Remarks: d.remarks || '',
      });
      audit('salary_add', { id });
      return { ok: true, msg: 'Salary record added!', id };
    },
    async deleteSalaryRecord(salaryId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const i = DB.salaries.findIndex((s) => s.Salary_ID === salaryId);
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.salaries.splice(i, 1);
      audit('salary_delete', { salaryId });
      return { ok: true, msg: 'Deleted.' };
    },

    // ── Class Announcement APIs (teacher + admin) ─────────────────────
    async getClassAnnouncements() {
      await delay();
      const actor = actorFn();
      if (!actor) return [];
      const list = DB.class_announcements || [];
      // Admin sees all; teacher sees only their class
      if (actor.role === 'admin') return [...list].sort((a, b) => String(b.Posted_At).localeCompare(String(a.Posted_At)));
      const tid = String(actor.teacherId || '');
      const t = DB.teachers.find((x) => String(x.Teacher_ID) === tid);
      if (!t) return [];
      return list
        .filter((a) => String(a.Class) === String(t.Class_Assigned) && a.Section === t.Section_Assigned)
        .sort((a, b) => String(b.Posted_At).localeCompare(String(a.Posted_At)));
    },
    async addClassAnnouncement(d) {
      await delay();
      const actor = actorFn();
      if (!actor || (actor.role !== 'teacher' && actor.role !== 'admin')) return { ok: false, msg: 'Access denied' };
      // Validate teacher can only post for their own class
      if (actor.role === 'teacher') {
        const tid = String(actor.teacherId || '');
        const t = DB.teachers.find((x) => String(x.Teacher_ID) === tid);
        if (!t) return { ok: false, msg: 'Teacher profile not found.' };
        if (String(d.cls) !== String(t.Class_Assigned) || d.section !== t.Section_Assigned) {
          return { ok: false, msg: 'You can only post announcements for your assigned class.' };
        }
      }
      const id = uid('CLA');
      const ann = {
        Announcement_ID: id,
        Title: d.title || '',
        Body: d.body || '',
        Class: String(d.cls || ''),
        Section: d.section || '',
        Priority: d.priority || 'Normal',
        Teacher_ID: d.teacherId || '',
        Teacher_Name: d.teacherName || '',
        Posted_At: new Date().toISOString(),
      };
      if (!DB.class_announcements) DB.class_announcements = [];
      DB.class_announcements.push(ann);
      audit('class_announcement_add', { id, cls: d.cls, section: d.section });
      // Notify parents of the class
      PN.notifyClassAnnouncement(DB, audit, SCHOOL_NAME, ann);
      const studentCount = DB.students.filter(
        (s) => s.Status === 'Active' && String(s.Class) === String(d.cls) && s.Section === d.section
      ).length;
      return { ok: true, msg: `Class announcement posted! ${studentCount} parent(s) notified (mock WhatsApp).`, id };
    },
    async deleteClassAnnouncement(id) {
      await delay();
      const actor = actorFn();
      if (!actor) return { ok: false, msg: 'Not authenticated' };
      const list = DB.class_announcements || [];
      const i = list.findIndex((a) => a.Announcement_ID === id);
      if (i === -1) return { ok: false, msg: 'Not found' };
      const ann = list[i];
      // Teacher can only delete their own class announcements
      if (actor.role === 'teacher' && ann.Teacher_ID !== actor.teacherId) {
        return { ok: false, msg: 'You can only remove your own announcements.' };
      }
      list.splice(i, 1);
      audit('class_announcement_delete', { id });
      return { ok: true, msg: 'Removed.' };
    },
  };
}
