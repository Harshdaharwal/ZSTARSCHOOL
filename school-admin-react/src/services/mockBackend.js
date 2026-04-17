import { calcGrade } from '../utils/format.js';
import { SCHOOL_EXPORT_META, ACADEMIC_YEAR, SCHOOL_NAME } from '../config/schoolConfig.js';
import * as PN from './parentNotifications.js';
import { doc, setDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';
import { getFirebase, getSecondaryAuth, isFirebaseConfigured } from './firebase/client.js';

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const uid = (p) => p + '_' + Date.now().toString().slice(-8);

const LOCAL_DB_KEY = 'edumanage_local_db_v2';

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function loadLocalDbIntoMemory() {
  if (!canUseLocalStorage()) return false;
  try {
    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return false;

    const keys = [
      'students',
      'teachers',
      'classes',
      'fees',
      'exams',
      'marks',
      'att_stu',
      'att_tch',
      'schedule',
      'timetables',
      'announcements',
      'homework',
      'holidays',
      'whatsapp_log',
      'whatsapp_schedule',
      'notification_dedupe',
      'audit_log',
      'class_fee_settings',
      'salaries',
      'class_announcements',
    ];

    let any = false;
    keys.forEach((k) => {
      if (parsed[k] !== undefined) {
        DB[k] = parsed[k];
        any = true;
      }
    });
    return any;
  } catch {
    return false;
  }
}

function saveLocalDbFromMemory() {
  if (!canUseLocalStorage()) return;
  try {
    const snapshot = {
      students: DB.students,
      teachers: DB.teachers,
      classes: DB.classes,
      fees: DB.fees,
      exams: DB.exams,
      marks: DB.marks,
      att_stu: DB.att_stu,
      att_tch: DB.att_tch,
      schedule: DB.schedule,
      timetables: DB.timetables,
      announcements: DB.announcements,
      homework: DB.homework,
      holidays: DB.holidays,
      whatsapp_log: DB.whatsapp_log,
      whatsapp_schedule: DB.whatsapp_schedule,
      notification_dedupe: DB.notification_dedupe,
      audit_log: DB.audit_log,
      class_fee_settings: DB.class_fee_settings,
      salaries: DB.salaries,
      class_announcements: DB.class_announcements,
    };
    window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota/serialization errors */
  }
}

/** @type {{ students: any[]; teachers: any[]; classes: any[]; fees: any[]; exams: any[]; marks: any[]; att_stu: any[]; att_tch: any[]; schedule: any[]; timetables: any[]; announcements: any[]; homework: any[]; holidays: any[]; whatsapp_log: any[]; whatsapp_schedule?: { enabled: boolean; time: string; message: string; to: string; lastSent?: string }; notification_dedupe: { key: string; at: string }[]; audit_log: any[]; class_fee_settings: { Class: string; Amount: number; Fee_Type: string; Note?: string; Updated_At?: string }[]; salaries: any[] }} */
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
  whatsapp_schedule: {
    enabled: false,
    time: '',
    message: '',
    to: '',
    lastSent: '',
  },
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
  const PARENT_DATA = [
    { father: 'Mr. Rajesh Sharma',  mother: 'Mrs. Sunita Sharma',  phone: '9871234501', address: 'Vaishali Nagar, Jaipur', dob: '12/04/2012' },
    { father: 'Mr. Anil Verma',     mother: 'Mrs. Geeta Verma',    phone: '9871234502', address: 'Malviya Nagar, Jaipur', dob: '20/07/2011' },
    { father: 'Mr. Suresh Patel',   mother: 'Mrs. Rekha Patel',    phone: '9871234503', address: 'Mansarovar, Jaipur',    dob: '05/03/2013' },
    { father: 'Mr. Ramesh Singh',   mother: 'Mrs. Anita Singh',    phone: '9871234504', address: 'Tonk Road, Jaipur',     dob: '18/09/2012' },
    { father: 'Mr. Vikas Kumar',    mother: 'Mrs. Savita Kumar',   phone: '9871234505', address: 'Chitrakoot, Jaipur',    dob: '30/01/2013' },
    { father: 'Mr. Ashok Gupta',    mother: 'Mrs. Rani Gupta',     phone: '9871234506', address: 'Shyam Nagar, Jaipur',   dob: '14/06/2012' },
    { father: 'Mr. Dinesh Yadav',   mother: 'Mrs. Shobha Yadav',   phone: '9871234507', address: 'Sanganer, Jaipur',      dob: '22/11/2011' },
    { father: 'Mr. Narendra Joshi', mother: 'Mrs. Kavita Joshi',   phone: '9871234508', address: 'Pratap Nagar, Jaipur',  dob: '08/08/2012' },
    { father: 'Mr. Deepak Nair',    mother: 'Mrs. Usha Nair',      phone: '9871234509', address: 'Jagatpura, Jaipur',     dob: '17/05/2013' },
    { father: 'Mr. Hemant Dixit',   mother: 'Mrs. Meena Dixit',    phone: '9871234510', address: 'Durgapura, Jaipur',     dob: '03/12/2012' },
  ];
  for (let c = 1; c <= 12; c++) {
    DB.classes.push({
      Class: String(c),
      Section: 'A',
      Class_Teacher_ID: c <= 9 ? `TCH_00${c}` : `TCH_00${c}`,
      Room_No: '10' + c,
      Total_Students: '10',
    });
    for (let s = 1; s <= 10; s++) {
      const stuId = `STU_${c}00${s}`;
      const name = `${fNames[(c + s) % fNames.length]} ${lNames[(c * s) % lNames.length]}`;
      const p = PARENT_DATA[(s - 1) % PARENT_DATA.length];
      // Adjust DOB year by class (Class 1 ~ 2019, Class 12 ~ 2008)
      const dobYear = 2020 - c;
      const adjustedDob = p.dob.replace(/\d{4}$/, String(dobYear));
      DB.students.push({
        Student_ID: stuId,
        Name: name,
        Father_Name: p.father,
        Mother_Name: p.mother,
        Class: String(c),
        Section: 'A',
        Roll_No: s,
        DOB: adjustedDob,
        Gender: s % 2 ? 'Male' : 'Female',
        Phone: p.phone,
        Parent_WhatsApp: p.phone,
        Address: p.address,
        Admission_Date: `01/04/${2020 + (c - 1) > 2026 ? 2021 : 2020 + Math.max(0, c - 5)}`,
        Status: 'Active',
        Academic_Year: ACADEMIC_YEAR,
      });
      // 30 days of attendance history
      for (let d = 0; d < 30; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        // skip Sundays (0) and Saturdays (6)
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const rand = Math.random();
        DB.att_stu.push({
          Date: date.toLocaleDateString('en-IN'),
          Student_ID: stuId,
          Name: name,
          Class: String(c),
          Section: 'A',
          Status: rand < 0.80 ? 'Present' : rand < 0.92 ? 'Absent' : 'Late',
          Remarks: '',
        });
      }

      // Helper for DD/MM/YYYY
      const fmtD = (dt) => {
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${dt.getFullYear()}`;
      };

      // Fee amount by class tier
      const monthlyAmt = c <= 3 ? 1200 : c <= 6 ? 1400 : c <= 9 ? 1600 : 2000;

      // Monthly fees: last 6 months (Nov 2025 – Apr 2026)
      const today = new Date(2026, 3, 17); // Apr 17, 2026
      for (let m = 5; m >= 0; m--) {
        const feeMonth = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const dueDate = fmtD(feeMonth); // 1st of the month
        const isCurrent = m === 0;
        const isPaid = isCurrent ? Math.random() > 0.45 : Math.random() > 0.12;
        const paidDate = isPaid ? fmtD(new Date(feeMonth.getFullYear(), feeMonth.getMonth(), 5 + Math.floor(Math.random() * 10))) : '';
        const rcpNum = isPaid ? `RCP${c}${s}${String(6 - m).padStart(2, '0')}` : '';
        DB.fees.push({
          Fee_ID: `FEE_M${c}_${s}_${6 - m}`,
          Student_ID: stuId,
          Student_Name: name,
          Class: String(c),
          Fee_Type: 'Monthly Fee',
          Amount: monthlyAmt,
          Due_Date: dueDate,
          Paid_Date: paidDate,
          Status: isPaid ? 'Paid' : 'Pending',
          Receipt_No: rcpNum,
          Remarks: '',
        });
      }

      // Annual fee (April 2026)
      {
        const annualAmt = c <= 3 ? 3000 : c <= 6 ? 4000 : c <= 9 ? 5000 : 6000;
        const annPaid = Math.random() > 0.35;
        DB.fees.push({
          Fee_ID: `FEE_ANN_${c}_${s}`,
          Student_ID: stuId,
          Student_Name: name,
          Class: String(c),
          Fee_Type: 'Annual Fee',
          Amount: annualAmt,
          Due_Date: '01/04/2026',
          Paid_Date: annPaid ? fmtD(new Date(2026, 3, 3 + Math.floor(Math.random() * 12))) : '',
          Status: annPaid ? 'Paid' : 'Pending',
          Receipt_No: annPaid ? `RCP_ANN_${c}${s}` : '',
          Remarks: 'Academic Year 2026-27',
        });
      }

      // Sports fee (all classes)
      {
        const sportsPaid = Math.random() > 0.3;
        DB.fees.push({
          Fee_ID: `FEE_SPT_${c}_${s}`,
          Student_ID: stuId,
          Student_Name: name,
          Class: String(c),
          Fee_Type: 'Sports Fee',
          Amount: 500,
          Due_Date: '15/04/2026',
          Paid_Date: sportsPaid ? fmtD(new Date(2026, 3, 15 + Math.floor(Math.random() * 5))) : '',
          Status: sportsPaid ? 'Paid' : 'Pending',
          Receipt_No: sportsPaid ? `RCP_SPT_${c}${s}` : '',
          Remarks: '',
        });
      }

      // Lab fee for Class 6 and above
      if (c >= 6) {
        const labPaid = Math.random() > 0.25;
        DB.fees.push({
          Fee_ID: `FEE_LAB_${c}_${s}`,
          Student_ID: stuId,
          Student_Name: name,
          Class: String(c),
          Fee_Type: 'Lab Fee',
          Amount: 800,
          Due_Date: '01/04/2026',
          Paid_Date: labPaid ? fmtD(new Date(2026, 3, 2 + Math.floor(Math.random() * 14))) : '',
          Status: labPaid ? 'Paid' : 'Pending',
          Receipt_No: labPaid ? `RCP_LAB_${c}${s}` : '',
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
  // --------------- TEACHERS ---------------
  const TEACHERS = [
    { Teacher_ID: 'TCH_001', Name: 'Rajesh Kumar Sharma', Subject: 'Science',       Phone: '9876501001', Email: 'rajesh.sharma@springdale.edu.in',   Qualification: 'M.Sc, B.Ed',               Join_Date: '15/06/2018', Class_Assigned: '1',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_002', Name: 'Priya Nair',          Subject: 'English',       Phone: '9876501002', Email: 'priya.nair@springdale.edu.in',       Qualification: 'M.A (English), B.Ed',      Join_Date: '01/07/2019', Class_Assigned: '2',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_003', Name: 'Amit Verma',          Subject: 'Mathematics',   Phone: '9876501003', Email: 'amit.verma@springdale.edu.in',       Qualification: 'M.Sc (Maths), B.Ed',       Join_Date: '10/08/2017', Class_Assigned: '3',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_004', Name: 'Sunita Yadav',        Subject: 'Social Studies',Phone: '9876501004', Email: 'sunita.yadav@springdale.edu.in',     Qualification: 'M.A (History), B.Ed',      Join_Date: '05/01/2020', Class_Assigned: '4',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_005', Name: 'Deepak Mehta',        Subject: 'English',       Phone: '9876501005', Email: 'deepak.mehta@springdale.edu.in',     Qualification: 'M.A (English), B.Ed',      Join_Date: '12/03/2021', Class_Assigned: '5',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_006', Name: 'Kavitha Rajan',       Subject: 'Mathematics',   Phone: '9876501006', Email: 'kavitha.rajan@springdale.edu.in',    Qualification: 'M.Sc (Maths), B.Ed',       Join_Date: '20/06/2016', Class_Assigned: '6',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_007', Name: 'Manish Gupta',        Subject: 'Science',       Phone: '9876501007', Email: 'manish.gupta@springdale.edu.in',     Qualification: 'M.Sc (Physics), B.Ed',     Join_Date: '01/04/2018', Class_Assigned: '7',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_008', Name: 'Anjali Singh',        Subject: 'Hindi',         Phone: '9876501008', Email: 'anjali.singh@springdale.edu.in',     Qualification: 'M.A (Hindi), B.Ed',        Join_Date: '09/09/2019', Class_Assigned: '8',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_009', Name: 'Suresh Patel',        Subject: 'Mathematics',   Phone: '9876501009', Email: 'suresh.patel@springdale.edu.in',     Qualification: 'M.Sc (Maths), B.Ed',       Join_Date: '15/02/2015', Class_Assigned: '9',  Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_0010',Name: 'Rekha Agarwal',       Subject: 'Chemistry',     Phone: '9876501010', Email: 'rekha.agarwal@springdale.edu.in',    Qualification: 'M.Sc (Chemistry), B.Ed',   Join_Date: '22/07/2017', Class_Assigned: '10', Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_0011',Name: 'Vijay Bhatia',        Subject: 'Physics',       Phone: '9876501011', Email: 'vijay.bhatia@springdale.edu.in',     Qualification: 'M.Sc (Physics), B.Ed, M.Ed',Join_Date: '03/01/2014', Class_Assigned: '11', Section_Assigned: 'A' },
    { Teacher_ID: 'TCH_0012',Name: 'Nandini Krishnan',    Subject: 'Biology',       Phone: '9876501012', Email: 'nandini.krishnan@springdale.edu.in', Qualification: 'M.Sc (Botany), B.Ed',      Join_Date: '18/08/2020', Class_Assigned: '12', Section_Assigned: 'A' },
  ];
  TEACHERS.forEach((t) => {
    DB.teachers.push({ ...t, Status: 'Active', Password: '' });
  });

  // Seed 30 days of teacher attendance
  if (!DB.att_tch.length) {
    const inTimes = ['08:45', '08:50', '08:55', '09:00', '09:05', '09:10'];
    const outTimes = ['15:00', '15:05', '15:10', '15:15', '15:20', '15:30'];
    DB.teachers.forEach((t) => {
      for (let d = 0; d < 30; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const rand = Math.random();
        const status = rand < 0.80 ? 'Present' : rand < 0.90 ? 'Absent' : rand < 0.96 ? 'Late' : 'Leave';
        DB.att_tch.push({
          Date: date.toLocaleDateString('en-IN'),
          Teacher_ID: t.Teacher_ID,
          Name: t.Name,
          Status: status,
          In_Time: status === 'Present' ? inTimes[Math.floor(Math.random() * inTimes.length)] : status === 'Late' ? '09:20' : '',
          Out_Time: status === 'Present' || status === 'Late' ? outTimes[Math.floor(Math.random() * outTimes.length)] : '',
          Remarks: status === 'Leave' ? 'Medical leave' : '',
        });
      }
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

  // Seed class fee settings for all classes
  if (!DB.class_fee_settings.length) {
    for (let c = 1; c <= 12; c++) {
      const amt = c <= 3 ? 1200 : c <= 6 ? 1400 : c <= 9 ? 1600 : 2000;
      DB.class_fee_settings.push({
        Class: String(c),
        Amount: amt,
        Fee_Type: 'Monthly Fee',
        Note: `Standard monthly tuition fee for Class ${c}`,
        Updated_At: new Date().toISOString(),
      });
    }
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

  function pickFirst(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of keys) {
      const value = obj[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return undefined;
  }

  function normalizeFeeRow(id, data) {
    const raw = data && typeof data === 'object' ? data : {};
    const row = {
      ...raw,
      Fee_ID: pickFirst(raw, ['Fee_ID', 'FeeId', 'feeId', 'fee_id']) || id,
      Student_ID: pickFirst(raw, ['Student_ID', 'StudentId', 'studentId', 'student_id']) || '',
      Student_Name: pickFirst(raw, ['Student_Name', 'StudentName', 'studentName', 'student_name']) || raw.Name || '',
      Class: pickFirst(raw, ['Class', 'class', 'Cls', 'cls']) || '',
      Fee_Type: pickFirst(raw, ['Fee_Type', 'FeeType', 'feeType', 'fee_type']) || '',
      Amount: pickFirst(raw, ['Amount', 'amount', 'Amt', 'amt']) ?? 0,
      Due_Date: pickFirst(raw, ['Due_Date', 'DueDate', 'dueDate', 'due_date']) || '',
      Paid_Date: pickFirst(raw, ['Paid_Date', 'PaidDate', 'paidDate', 'paid_date']) || '',
      Status: pickFirst(raw, ['Status', 'status']) || 'Pending',
      Receipt_No: pickFirst(raw, ['Receipt_No', 'ReceiptNo', 'receiptNo', 'receipt_no']) || '',
      Remarks: pickFirst(raw, ['Remarks', 'remarks', 'Note', 'note']) || '',
    };
    return row;
  }

  function firebaseReady() {
    if (!isFirebaseConfigured()) return null;
    const fb = getFirebase();
    if (!fb) return null;
    if (!fb.auth?.currentUser) return null;
    return fb;
  }

  async function tryMergeCollectionIntoDb(colName, mergeFn) {
    const fb = firebaseReady();
    if (!fb) return;
    try {
      const snap = await getDocs(collection(fb.db, colName));
      snap.docs.forEach((d) => mergeFn(d.id, d.data()));
    } catch (e) {
      console.error(`[Firestore Fetch Error] ${colName}`, e);
    }
  }

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

  // Load locally persisted DB first (fixes "data disappears after refresh" in demo/static-bypass mode).
  const hadLocalDb = loadLocalDbIntoMemory();

  // If Firebase is configured, the app is in "real login" mode and should not auto-seed demo data.
  // If Firebase is NOT configured and there is no local saved DB, seed demo data once.
  if (!hadLocalDb && !isFirebaseConfigured()) {
    seedMockDatabase();
    saveLocalDbFromMemory();
  }

  let lastDashboardSyncAt = 0;
  async function syncDashboardCollections() {
    const now = Date.now();
    if (now - lastDashboardSyncAt < 20_000) return;
    lastDashboardSyncAt = now;

    await Promise.all([
      tryMergeCollectionIntoDb('students', (id, data) => {
        const row = {
          ...data,
          Student_ID: (data && data.Student_ID) || id,
          Status: (data && data.Status) || 'Active',
        };
        const i = DB.students.findIndex((x) => x.Student_ID === row.Student_ID);
        if (i === -1) DB.students.push(row);
        else Object.assign(DB.students[i], row);
      }),
      tryMergeCollectionIntoDb('teachers', (id, data) => {
        const row = {
          ...data,
          Teacher_ID: (data && data.Teacher_ID) || id,
          Status: (data && data.Status) || 'Active',
        };
        const i = DB.teachers.findIndex((x) => x.Teacher_ID === row.Teacher_ID);
        if (i === -1) DB.teachers.push(row);
        else Object.assign(DB.teachers[i], row);
      }),
      tryMergeCollectionIntoDb('classes', (id, data) => {
        const parts = String(id).split('_');
        const row = {
          Class: data?.Class != null ? String(data.Class) : String(parts[0] || ''),
          Section: data?.Section != null ? String(data.Section) : String(parts[1] || ''),
          Class_Teacher_ID: data?.Class_Teacher_ID || '',
          Room_No: data?.Room_No || '',
          Total_Students: data?.Total_Students != null ? String(data.Total_Students) : (data?.Total_Students ?? '0'),
        };
        if (!row.Class || !row.Section) return;
        const i = DB.classes.findIndex(
          (x) => String(x.Class) === String(row.Class) && String(x.Section) === String(row.Section)
        );
        if (i === -1) DB.classes.push(row);
        else Object.assign(DB.classes[i], row);
      }),
      tryMergeCollectionIntoDb('fees', (id, data) => {
        const row = normalizeFeeRow(id, data);
        const i = DB.fees.findIndex((x) => x.Fee_ID === row.Fee_ID);
        if (i === -1) DB.fees.push(row);
        else Object.assign(DB.fees[i], row);
      }),
      tryMergeCollectionIntoDb('student_attendance', (id, data) => {
        const row = {
          ...data,
          Student_ID: data?.Student_ID || data?.StudentId || '',
          Student_Name: data?.Student_Name || data?.StudentName || data?.studentName || '',
          Class: data?.Class || data?.class || '',
          Section: data?.Section || data?.section || '',
          Date: data?.Date || data?.date || '',
          Status: data?.Status || data?.status || '',
          Remarks: data?.Remarks || data?.remarks || '',
        };
        if (!row.Student_ID || !row.Date) return;
        const key = `${row.Student_ID}__${row.Date}__${row.Status}`;
        const i = DB.att_stu.findIndex((x) => `${x.Student_ID}__${x.Date}__${x.Status}` === key);
        if (i === -1) DB.att_stu.push(row);
        else Object.assign(DB.att_stu[i], row);
      }),
      tryMergeCollectionIntoDb('exams', (id, data) => {
        const row = { ...data, Exam_ID: data?.Exam_ID || id };
        const i = DB.exams.findIndex((x) => x.Exam_ID === row.Exam_ID);
        if (i === -1) DB.exams.push(row);
        else Object.assign(DB.exams[i], row);
      }),
    ]);
  }
  return {
    async getDashboardStats() {
      await delay();
      await syncDashboardCollections();
      return buildDashboardStats();
    },
    async getAllStudents() {
      await delay();
      await tryMergeCollectionIntoDb('students', (id, data) => {
        const row = { ...data, Student_ID: data.Student_ID || id, Status: data.Status || 'Active' };
        const i = DB.students.findIndex((x) => x.Student_ID === row.Student_ID);
        if (i === -1) DB.students.push(row);
        else Object.assign(DB.students[i], row);
      });
      return [...DB.students];
    },
    async getAllTeachers() {
      await delay();
      await tryMergeCollectionIntoDb('teachers', (id, data) => {
        const row = { ...data, Teacher_ID: data.Teacher_ID || id, Status: data.Status || 'Active' };
        const i = DB.teachers.findIndex((x) => x.Teacher_ID === row.Teacher_ID);
        if (i === -1) DB.teachers.push(row);
        else Object.assign(DB.teachers[i], row);
      });
      return [...DB.teachers];
    },
    async getAllClasses() {
      await delay();
      await tryMergeCollectionIntoDb('classes', (id, data) => {
        // Prefer stored fields; fallback to id format "10_A"
        const parts = String(id).split('_');
        const row = {
          Class: data.Class != null ? String(data.Class) : String(parts[0] || ''),
          Section: data.Section != null ? String(data.Section) : String(parts[1] || ''),
          Class_Teacher_ID: data.Class_Teacher_ID || '',
          Room_No: data.Room_No || '',
          Total_Students: data.Total_Students != null ? String(data.Total_Students) : (data.Total_Students ?? '0'),
        };
        if (!row.Class || !row.Section) return;
        const i = DB.classes.findIndex((x) => String(x.Class) === String(row.Class) && String(x.Section) === String(row.Section));
        if (i === -1) DB.classes.push(row);
        else Object.assign(DB.classes[i], row);
      });
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
      await tryMergeCollectionIntoDb('fees', (id, data) => {
        const row = normalizeFeeRow(id, data);
        const i = DB.fees.findIndex((x) => x.Fee_ID === row.Fee_ID);
        if (i === -1) DB.fees.push(row);
        else Object.assign(DB.fees[i], row);
      });
      return [...DB.fees];
    },
    async getPendingFees() {
      await delay();
      await tryMergeCollectionIntoDb('fees', (id, data) => {
        const row = normalizeFeeRow(id, data);
        const i = DB.fees.findIndex((x) => x.Fee_ID === row.Fee_ID);
        if (i === -1) DB.fees.push(row);
        else Object.assign(DB.fees[i], row);
      });
      return DB.fees.filter((f) => f.Status === 'Pending');
    },
    async getPaidFees() {
      await delay();
      await tryMergeCollectionIntoDb('fees', (id, data) => {
        const row = normalizeFeeRow(id, data);
        const i = DB.fees.findIndex((x) => x.Fee_ID === row.Fee_ID);
        if (i === -1) DB.fees.push(row);
        else Object.assign(DB.fees[i], row);
      });
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
    /** Teacher view: giving full access as requested. */
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
      // Return everything so teacher can select any class
      return {
        students: DB.students.map((s) => ({ ...s })),
        marks: [...DB.marks],
        meta: { class: t.Class_Assigned, section: t.Section_Assigned, teacherName: t.Name },
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
      const row = {
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
      };
      DB.students.push(row);
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'students', id), row, { merge: true });
          return { ok: true, msg: `Student registered! ID: ${id}. ✅ Saved to Firestore.` };
        } catch (e) {
          console.error('[Firestore Sync Error] students', e);
          return { ok: true, msg: `Student registered locally (ID: ${id}), but Firestore sync failed: ${e?.message || e}` };
        }
      }

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
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'students', id), { ...s }, { merge: true });
        } catch (e) {
          console.error('[Firestore Update Error] students', e);
        }
      }
      return { ok: true, msg: 'Student updated successfully!' };
    },
    async setStudentStatus(id, status) {
      await delay();
      const s = DB.students.find((x) => x.Student_ID === id);
      if (!s) return { ok: false, msg: 'Student not found' };
      s.Status = status;
      saveLocalDbFromMemory();
      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'students', id), { Status: status }, { merge: true });
        } catch (e) {
          console.error('[Firestore Update Error] students status', e);
        }
      }
      return { ok: true, msg: 'Status updated: ' + status };
    },
    async getStudentById(studentId) {
      await delay();
      const st = DB.students.find((s) => String(s.Student_ID).toLowerCase() === String(studentId).toLowerCase());
      return st || null;
    },
    async getStudentsByClass(cls, section) {
      await delay();
      await tryMergeCollectionIntoDb('students', (id, data) => {
        const row = { ...data, Student_ID: data.Student_ID || id };
        const i = DB.students.findIndex((x) => x.Student_ID === row.Student_ID);
        if (i === -1) DB.students.push(row);
        else Object.assign(DB.students[i], row);
      });
      return DB.students.filter((s) => String(s.Class) === String(cls) && (!section || s.Section === section));
    },
    async addTeacher(d) {
      await delay();
      const phone = String(d.phone || '').trim();
      const dupPhone = DB.teachers.find((t) => String(t.Phone || '').trim() === phone);
      if (dupPhone) return { ok: false, msg: `Phone number ${phone} is already registered to ${dupPhone.Name}. Each teacher must have a unique mobile number.` };
      const id = uid('TCH');
      const email = String(d.email || '').trim();
      const emailLc = email.toLowerCase();
      const teacherObj = {
        Teacher_ID: id,
        Name: d.name,
        Subject: d.subject,
        Phone: d.phone,
        Email: email,
        Email_LC: emailLc,
        Qualification: d.qualification || '',
        Join_Date: d.joinDate || '',
        Class_Assigned: d.classAssigned || '',
        Section_Assigned: d.sectionAssigned || '',
        Status: 'Active',
        Password: d.password || '',
        Photo: d.photo || '',
      };
      DB.teachers.push(teacherObj);
      saveLocalDbFromMemory();

      // Sync to Firestore if available
      let firestoreSynced = false;
      let firestoreError = '';
      let authUid = '';
      if (isFirebaseConfigured()) {
        const fb = getFirebase();
        if (fb) {
          // Check if there's a real Firebase Auth user (needed for Firestore security rules)
          const currentUser = fb.auth.currentUser;
          if (!currentUser) {
            firestoreError = 'Not signed in via Firebase Auth — Firestore sync skipped. Log out and log back in with Firebase credentials to enable sync.';
            console.warn('[Firestore Sync]', firestoreError);
          } else {
            try {
              // 0. Create Firebase Auth account for the teacher (so they can log in with email + password)
              if (teacherObj.Email && teacherObj.Password) {
                try {
                  const secondaryAuth = getSecondaryAuth();
                  const { createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
                  if (!secondaryAuth) throw new Error('Firebase secondary auth not available');
                  const cred = await createUserWithEmailAndPassword(secondaryAuth, teacherObj.Email, teacherObj.Password);
                  authUid = cred.user.uid;
                  await signOut(secondaryAuth);
                } catch (e) {
                  if (e?.code === 'auth/email-already-in-use') {
                    firestoreError =
                      `Auth user already exists for ${teacherObj.Email}. ` +
                      'If the teacher cannot log in, reset their password in Firebase Console â†’ Authentication.';
                  } else if (!firestoreError) {
                    firestoreError = `Failed to create teacher login: ${e?.message || e}`;
                  }
                }
              } else if (teacherObj.Email) {
                firestoreError = 'Teacher email is set, but password is empty â€” cannot create login account.';
              }

              // 1. Save to teachers collection (exclude Password from Firestore)
              if (authUid) teacherObj.Auth_UID = authUid;
              const { Password, ...safeObj } = teacherObj;
              if (authUid) safeObj.Auth_UID = authUid;
              await setDoc(doc(fb.db, 'teachers', id), safeObj);

              // 2. Save canonical profile under docId=authUid (preferred by AuthProvider)
              if (authUid) {
                await setDoc(
                  doc(fb.db, 'users', authUid),
                  {
                    email: teacherObj.Email,
                    email_lc: emailLc,
                    role: 'teacher',
                    teacherId: id,
                    uid: authUid,
                  },
                  { merge: true }
                );
              }
              firestoreSynced = true;
            } catch (e) {
              firestoreError = e?.message || 'Unknown Firestore error';
              console.error('[Firestore Sync Error]', e);
            }
          }
        }
      }

      let msg = `Teacher added! ID: ${id}.`;
      if (firestoreSynced) {
        msg += ' ✅ Saved to Firestore.';
        if (teacherObj.Email && teacherObj.Password && authUid) {
          msg += ' Login created — teacher can sign in with their email + password.';
        } else if (teacherObj.Email && teacherObj.Password && !authUid) {
          msg += ' Teacher record saved, but login was not created. Check Firebase Console → Authentication.';
        }
      } else if (firestoreError) {
        msg += ` ⚠️ Firestore sync failed: ${firestoreError}`;
      }

      return { ok: true, msg };
    },

    async updateTeacher(id, d) {
      await delay();
      const t = DB.teachers.find((x) => x.Teacher_ID === id);
      if (!t) return { ok: false, msg: 'Teacher not found!' };
      const phone = String(d.phone || '').trim();
      const dupPhone = DB.teachers.find((x) => String(x.Phone || '').trim() === phone && x.Teacher_ID !== id);
      if (dupPhone) return { ok: false, msg: `Phone number ${phone} is already registered to ${dupPhone.Name}. Each teacher must have a unique mobile number.` };
      const email = String(d.email || '').trim();
      const emailLc = email.toLowerCase();
      const updates = {
        Name: d.name,
        Subject: d.subject,
        Phone: d.phone,
        Email: email,
        Email_LC: emailLc,
        Qualification: d.qualification,
        Class_Assigned: d.classAssigned,
        Section_Assigned: d.sectionAssigned,
        Join_Date: d.joinDate != null ? d.joinDate : t.Join_Date,
        Photo: d.photo !== undefined ? d.photo : t.Photo,
      };
      if (d.password) updates.Password = d.password;
      
      Object.assign(t, updates);
      saveLocalDbFromMemory();

      // Sync to Firestore if available
      if (isFirebaseConfigured()) {
        const fb = getFirebase();
        if (fb && fb.auth.currentUser) {
          try {
            const { Password, ...safeObj } = t;
            await setDoc(doc(fb.db, 'teachers', id), safeObj, { merge: true });
            if (t.Email) {
              const userDocId = t.Auth_UID || id;
              await setDoc(
                doc(fb.db, 'users', userDocId),
                {
                  email: t.Email,
                  email_lc: String(t.Email || '').trim().toLowerCase(),
                  role: 'teacher',
                  teacherId: id,
                  uid: t.Auth_UID || '',
                },
                { merge: true }
              );
            }
          } catch (e) {
            console.error('[Firestore Update Error]', e);
          }
        }
      }

      return { ok: true, msg: 'Teacher updated!' };
    },
    async deleteTeacher(teacherId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only.' };
      const i = DB.teachers.findIndex((t) => t.Teacher_ID === teacherId);
      if (i === -1) return { ok: false, msg: 'Teacher not found.' };
      const removed = DB.teachers.splice(i, 1)[0];
      audit('teacher_delete', { teacherId, name: removed.Name });
      saveLocalDbFromMemory();

      // Sync deletion to Firestore
      if (isFirebaseConfigured()) {
        const fb = getFirebase();
        if (fb && fb.auth.currentUser) {
          try {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(fb.db, 'teachers', teacherId));
            // Backward-compat: remove shadow profile saved with docId=teacherId
            await deleteDoc(doc(fb.db, 'users', teacherId));
            // Preferred: remove canonical profile saved with docId=authUid (if known)
            if (removed?.Auth_UID) {
              await deleteDoc(doc(fb.db, 'users', removed.Auth_UID));
            }
            // Also remove any migrated profile(s) saved with docId=uid that reference this teacherId
            try {
              const snaps = await getDocs(query(collection(fb.db, 'users'), where('teacherId', '==', teacherId)));
              await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)));
            } catch (inner) {
              console.error('[Firestore Delete Related Users Error]', inner);
            }
          } catch (e) {
            console.error('[Firestore Delete Error]', e);
          }
        }
      }

      return { ok: true, msg: `Teacher "${removed.Name}" deleted.` };
    },
    async addClass(d) {
      await delay();
      const dup = DB.classes.some((c) => String(c.Class) === String(d.cls) && c.Section === d.section);
      if (dup) return { ok: false, msg: 'This Class-Section already exists!' };
      const row = {
        Class: String(d.cls),
        Section: d.section,
        Class_Teacher_ID: d.classTeacherId || '',
        Room_No: d.roomNo || '',
        Total_Students: '0',
      };
      DB.classes.push(row);
      saveLocalDbFromMemory();

      // Sync to Firestore when using Firebase mode (recommended persistence)
      const fb = firebaseReady();
      if (fb) {
        try {
          const docId = `${row.Class}_${row.Section}`;
          await setDoc(doc(fb.db, 'classes', docId), row, { merge: true });
        } catch (e) {
          console.error('[Firestore Sync Error] classes', e);
          return { ok: true, msg: `Class added locally, but Firestore sync failed: ${e?.message || e}` };
        }
      }

      return { ok: true, msg: fb ? 'Class added successfully! ✅ Saved to Firestore.' : 'Class added successfully!' };
    },
    async deleteClass(cls, section) {
      await delay();
      const i = DB.classes.findIndex((c) => String(c.Class) === String(cls) && c.Section === section);
      if (i === -1) return { ok: false, msg: 'Class not found' };
      DB.classes.splice(i, 1);
      audit('class_delete', { cls, section });
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          const docId = `${String(cls)}_${String(section)}`;
          await deleteDoc(doc(fb.db, 'classes', docId));
        } catch (e) {
          console.error('[Firestore Delete Error] classes', e);
        }
      }

      return { ok: true, msg: 'Class deleted!' };
    },
    async addSchedule(d) {
      await delay();
      const row = {
        Class: String(d.cls),
        Section: d.section,
        Class_Section: `${String(d.cls)}_${String(d.section)}`,
        Day: d.day,
        Period: String(d.period),
        Subject: d.subject,
        Teacher_ID: d.teacherId || '',
        Teacher_Name: d.teacherName || '',
        Room: d.room || '',
        Time_Slot: d.timeSlot || '',
      };
      DB.schedule.push(row);
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          const docId = `SCH_${row.Class}_${row.Section}_${String(row.Day).replace(/\s+/g, '')}_${row.Period}`;
          await setDoc(doc(fb.db, 'schedule', docId), row, { merge: true });
          return { ok: true, msg: 'Schedule added! ✅ Saved to Firestore.' };
        } catch (e) {
          console.error('[Firestore Sync Error] schedule', e);
          return { ok: true, msg: `Schedule added locally, but Firestore sync failed: ${e?.message || e}` };
        }
      }

      return { ok: true, msg: 'Schedule added!' };
    },
    async getSchedule(cls, section) {
      await delay();
      const fb = getFirebase();
      if (isFirebaseConfigured() && fb) {
        try {
          const classSection = `${String(cls)}_${String(section)}`;
          const snap = await getDocs(query(collection(fb.db, 'schedule'), where('Class_Section', '==', classSection)));
          snap.docs.forEach((d) => {
            const data = d.data();
            const row = {
              ...data,
              Class: data.Class != null ? String(data.Class) : String(cls),
              Section: data.Section != null ? String(data.Section) : String(section),
              Class_Section: data.Class_Section || classSection,
              Period: data.Period != null ? String(data.Period) : '',
            };
            const i = DB.schedule.findIndex(
              (s) =>
                String(s.Class) === String(row.Class) &&
                String(s.Section) === String(row.Section) &&
                String(s.Day) === String(row.Day) &&
                String(s.Period) === String(row.Period)
            );
            if (i === -1) DB.schedule.push(row);
            else Object.assign(DB.schedule[i], row);
          });
        } catch (e) {
          console.error('[Firestore Fetch Error] schedule', e);
        }
      }
      return DB.schedule.filter((s) => String(s.Class) === String(cls) && s.Section === section);
    },
    async deleteSchedule(cls, section, day, period) {
      await delay();
      const i = DB.schedule.findIndex(
        (s) => String(s.Class) === String(cls) && s.Section === section && s.Day === day && String(s.Period) === String(period)
      );
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.schedule.splice(i, 1);
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          const docId = `SCH_${String(cls)}_${String(section)}_${String(day).replace(/\s+/g, '')}_${String(period)}`;
          await deleteDoc(doc(fb.db, 'schedule', docId));
        } catch (e) {
          console.error('[Firestore Delete Error] schedule', e);
        }
      }

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
      const feeRecord = {
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
      };
      DB.fees.push(feeRecord);
      saveLocalDbFromMemory();

      // Send personalized WhatsApp to parent based on Student_ID data
      const st = DB.students.find((s) => String(s.Student_ID) === String(d.studentId));
      if (st) {
        const phone = PN.parentPhone(st);
        if (phone) {
          const amt = PN.formatRupeeIN(feeRecord.Amount);
          let body;
          if (feeRecord.Status === 'Paid') {
            body =
              `[${SCHOOL_NAME}] Fee Receipt\n` +
              `Student: ${st.Name} (ID: ${st.Student_ID})\n` +
              `Class: ${st.Class}-${st.Section}\n` +
              `Fee Type: ${feeRecord.Fee_Type}\n` +
              `Amount Paid: ${amt}\n` +
              `Receipt No: ${rcpt}\n` +
              `Date: ${feeRecord.Paid_Date || feeRecord.Due_Date}\n` +
              `Thank you for the payment!`;
          } else {
            body =
              `[${SCHOOL_NAME}] Fee Due Notice\n` +
              `Student: ${st.Name} (ID: ${st.Student_ID})\n` +
              `Class: ${st.Class}-${st.Section}\n` +
              `Fee Type: ${feeRecord.Fee_Type}\n` +
              `Amount Due: ${amt}\n` +
              `Due Date: ${feeRecord.Due_Date}\n` +
              `Please pay at the school fee counter.`;
          }
          PN.queueWhatsApp(DB, audit, { to: phone, body, kind: 'fee_record', refId: id });
        }
      }

      // Sync to Firestore if available
      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'fees', id), feeRecord, { merge: true });
          return { ok: true, msg: 'Fee record saved! Saved to Firestore.', id, receipt: rcpt };
        } catch (e) {
          console.error('[Firestore Sync Error] fees', e);
          return { ok: true, msg: `Fee saved locally (ID: ${id}), but Firestore sync failed: ${e?.message || e}`, id, receipt: rcpt };
        }
      }

      return { ok: true, msg: 'Fee record saved!', id, receipt: rcpt };
    },
    async deleteFeeRecord(feeId) {
      await delay();
      const i = DB.fees.findIndex((f) => f.Fee_ID === feeId);
      if (i === -1) return { ok: false, msg: 'Record not found' };
      DB.fees.splice(i, 1);
      saveLocalDbFromMemory();
      audit('fee_delete', { feeId });

      const fb = firebaseReady();
      if (fb) {
        try {
          await deleteDoc(doc(fb.db, 'fees', feeId));
        } catch (e) {
          console.error('[Firestore Delete Error] fees', e);
        }
      }
      return { ok: true, msg: 'Fee record deleted!' };
    },
    async markFeePaid(feeId) {
      await delay();
      const fee = DB.fees.find((f) => f.Fee_ID === feeId);
      if (!fee) return { ok: false, msg: 'Fee record not found.' };
      if (fee.Status === 'Paid') return { ok: false, msg: 'Fee is already marked as paid.' };
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const paidDate = `${dd}/${mm}/${today.getFullYear()}`;
      const rcpt = 'RCP' + Date.now().toString().slice(-7);
      fee.Status = 'Paid';
      fee.Paid_Date = paidDate;
      fee.Receipt_No = rcpt;
      saveLocalDbFromMemory();
      audit('fee_paid', { feeId, studentId: fee.Student_ID, amount: fee.Amount });

      // Send personalized WhatsApp receipt to parent
      const st = DB.students.find((s) => String(s.Student_ID) === String(fee.Student_ID));
      let waMsg = '';
      if (st) {
        const phone = PN.parentPhone(st);
        if (phone) {
          const amt = PN.formatRupeeIN(fee.Amount);
          const body =
            `[${SCHOOL_NAME}] Fee Payment Received ✓\n` +
            `Student: ${st.Name} (ID: ${st.Student_ID})\n` +
            `Class: ${st.Class}-${st.Section}\n` +
            `Father: ${st.Father_Name || '—'}\n` +
            `Fee Type: ${fee.Fee_Type}\n` +
            `Amount Paid: ${amt}\n` +
            `Receipt No: ${rcpt}\n` +
            `Date: ${paidDate}\n` +
            `Thank you! Your payment has been recorded successfully.`;
          PN.queueWhatsApp(DB, audit, { to: phone, body, kind: 'fee_paid', refId: feeId });
          waMsg = ` WhatsApp receipt sent to ${phone}.`;
        }
      }
      return { ok: true, msg: `Fee marked as paid. Receipt: ${rcpt}.${waMsg}`, receipt: rcpt, paidDate };
    },
    async sendFeeReminder(feeId) {
      await delay();
      const fee = DB.fees.find((f) => f.Fee_ID === feeId);
      if (!fee) return { ok: false, msg: 'Fee record not found.' };
      // Look up student by Student_ID to get their real data
      const st = DB.students.find((s) => String(s.Student_ID) === String(fee.Student_ID));
      if (!st) return { ok: false, msg: `Student ${fee.Student_ID} not found in database.` };
      const phone = PN.parentPhone(st);
      if (!phone) return { ok: false, msg: `No phone number on file for ${st.Name}.` };
      const amt = PN.formatRupeeIN(fee.Amount);
      const body =
        `[${SCHOOL_NAME}] Fee Reminder\n` +
        `Student: ${st.Name} (ID: ${st.Student_ID})\n` +
        `Class: ${st.Class}-${st.Section}\n` +
        `Father: ${st.Father_Name || '—'}\n` +
        `Fee Type: ${fee.Fee_Type}\n` +
        `Amount Due: ${amt}\n` +
        `Due Date: ${fee.Due_Date || '—'}\n` +
        `Please clear the dues at the school fee counter. For queries, contact the office.`;
      PN.queueWhatsApp(DB, audit, { to: phone, body, kind: 'fee_reminder', refId: feeId });
      return { ok: true, msg: `Reminder sent to ${phone} for ${st.Name}.` };
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
      if (!actor || (actor.role !== 'admin' && actor.role !== 'teacher')) return [];
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
      await tryMergeCollectionIntoDb('announcements', (id, data) => {
        const row = { ...data, Announcement_ID: data.Announcement_ID || id };
        const i = DB.announcements.findIndex((x) => x.Announcement_ID === row.Announcement_ID);
        if (i === -1) DB.announcements.push(row);
        else Object.assign(DB.announcements[i], row);
      });
      const now = Date.now();
      return [...DB.announcements]
        .map((a) => {
          const postedAt = new Date(a.Posted_At).getTime();
          const diffMin = (now - postedAt) / (1000 * 60);
          return {
            ...a,
            Is_Pending: diffMin < 5,
            Broadcast_Status: diffMin < 5 ? `In ${Math.ceil(5 - diffMin)}m` : 'Sent to WhatsApp',
          };
        })
        .sort((a, b) => String(b.Posted_At).localeCompare(String(a.Posted_At)));
    },
    async addAnnouncement(d) {
      await delay();
      const actor = actorFn();
      if (!actor || (actor.role !== 'admin' && actor.role !== 'teacher')) return { ok: false, msg: 'Access denied' };
      const id = uid('ANN');
      const row = {
        Announcement_ID: id,
        Author_UID: actor.uid || '',
        Author_ID: actor.teacherId || 'admin',
        Title: d.title || '',
        Body: d.body || '',
        Posted_At: new Date().toISOString(),
        Priority: d.priority || 'Normal',
        Attachment: d.attachment || null,
        Attachment_Name: d.attachmentName || '',
      };
      DB.announcements.push(row);
      audit('announcement_add', { id });
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'announcements', id), row, { merge: true });
        } catch (e) {
          console.error('[Firestore Sync Error] announcements', e);
          return { ok: true, msg: `Announcement posted locally, but Firestore sync failed: ${e?.message || e}`, id };
        }
      }
      // PN.notifyAnnouncementBroadcast(DB, audit, SCHOOL_NAME, row); // This would be triggered after 5 mins in a real system
      return { ok: true, msg: fb ? 'Announcement posted! Saved to Firestore.' : 'Announcement posted!', id };
    },
    async updateAnnouncement(id, d) {
      await delay();
      const actor = actorFn();
      if (!actor) return { ok: false, msg: 'Not authenticated' };
      const i = DB.announcements.findIndex((x) => x.Announcement_ID === id);
      if (i === -1) return { ok: false, msg: 'Not found' };
      const ann = DB.announcements[i];

      // Check 5-minute grace period
      const postedAt = new Date(ann.Posted_At).getTime();
      if (Date.now() - postedAt > 5 * 60 * 1000) {
        return { ok: false, msg: 'Edit period (5 minutes) has expired.' };
      }

      // Check permissions
      if (actor.role !== 'admin' && ann.Author_ID !== actor.teacherId) {
        return { ok: false, msg: 'You can only edit your own announcements.' };
      }

      Object.assign(ann, {
        Title: d.title,
        Body: d.body,
        Priority: d.priority,
        Attachment: d.attachment !== undefined ? d.attachment : ann.Attachment,
        Attachment_Name: d.attachmentName !== undefined ? d.attachmentName : ann.Attachment_Name,
      });
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'announcements', id), ann, { merge: true });
        } catch (e) {
          console.error('[Firestore Update Error] announcements', e);
          return { ok: true, msg: `Updated locally, but Firestore sync failed: ${e?.message || e}` };
        }
      }
      return { ok: true, msg: 'Announcement updated!' };
    },
    async deleteAnnouncement(announcementId) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const i = DB.announcements.findIndex((x) => x.Announcement_ID === announcementId);
      if (i === -1) return { ok: false, msg: 'Not found' };
      DB.announcements.splice(i, 1);
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await deleteDoc(doc(fb.db, 'announcements', announcementId));
        } catch (e) {
          console.error('[Firestore Delete Error] announcements', e);
          return { ok: true, msg: `Removed locally, but Firestore delete failed: ${e?.message || e}` };
        }
      }

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
      // Removed strict class check to allow "full access" as requested
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
    async updateHomework(id, d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'teacher') return { ok: false, msg: 'Teachers only' };
      const hw = DB.homework.find((x) => x.Homework_ID === id);
      if (!hw) return { ok: false, msg: 'Homework not found' };
      if (hw.Teacher_ID !== actor.teacherId) return { ok: false, msg: 'Permission denied' };

      Object.assign(hw, {
        Subject: d.subject,
        Title: d.title,
        Description: d.description,
        Due_Date: d.dueDate,
        Class: d.cls || hw.Class,
        Section: d.section || hw.Section,
      });
      return { ok: true, msg: 'Homework updated!' };
    },
    async deleteHomework(id) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'teacher') return { ok: false, msg: 'Teachers only' };
      const i = DB.homework.findIndex((x) => x.Homework_ID === id);
      if (i === -1) return { ok: false, msg: 'Not found' };
      if (DB.homework[i].Teacher_ID !== actor.teacherId) return { ok: false, msg: 'Permission denied' };
      DB.homework.splice(i, 1);
      return { ok: true, msg: 'Homework deleted' };
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
      return [...DB.whatsapp_log]
        .slice(-n)
        .reverse()
        .map((row) => {
          const phone = String(row.to || '').replace(/\D/g, '').slice(-10);
          const student = DB.students.find((s) => PN.parentPhone(s) === phone);
          return {
            ...row,
            Class: student?.Class || row.Class || '',
            Section: student?.Section || row.Section || '',
            Student_Name: student?.Name || row.Student_Name || '',
          };
        });
    },
    async getWhatsAppSchedule() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return null;
      return { ...(DB.whatsapp_schedule || {}) };
    },
    async saveWhatsAppSchedule(d) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const time = String(d?.time || '').trim();
      if (time && !/^\d{2}:\d{2}$/.test(time)) {
        return { ok: false, msg: 'Use HH:MM (24h) time.' };
      }
      const message = String(d?.message || '').trim();
      const to = String(d?.to || '').replace(/\D/g, '').slice(-15);
      DB.whatsapp_schedule = {
        enabled: Boolean(d?.enabled),
        time,
        message,
        to,
        lastSent: DB.whatsapp_schedule?.lastSent || '',
      };
      audit('wa_schedule_save', { time, toMasked: to ? to.replace(/^(\d{2})(.*)(\d{2})$/, '$1***$3') : '' });
      return { ok: true, msg: 'Schedule saved in mock backend.' };
    },
    async toggleWhatsAppSchedule(enabled) {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      DB.whatsapp_schedule = {
        ...(DB.whatsapp_schedule || { time: '', message: '', to: '' }),
        enabled: Boolean(enabled),
      };
      audit('wa_schedule_toggle', { enabled: Boolean(enabled) });
      return { ok: true, msg: enabled ? 'Schedule enabled.' : 'Schedule paused.' };
    },
    async runWhatsAppScheduleOnce() {
      await delay();
      const actor = actorFn();
      if (!actor || actor.role !== 'admin') return { ok: false, msg: 'Admin only' };
      const cfg = DB.whatsapp_schedule || {};
      if (!cfg.enabled) return { ok: false, msg: 'Schedule is turned off.' };
      if (!cfg.time) return { ok: false, msg: 'No time set.' };
      if (!cfg.message || !cfg.to) return { ok: false, msg: 'Add message text and destination number first.' };
      PN.queueWhatsApp(DB, audit, {
        to: cfg.to,
        body: cfg.message,
        kind: 'scheduled_manual',
        refId: 'manual_schedule',
      });
      cfg.lastSent = new Date().toISOString();
      audit('wa_schedule_run', { toMasked: cfg.to.replace(/^(\d{2})(.*)(\d{2})$/, '$1***$3'), at: cfg.lastSent });
      return { ok: true, msg: 'Queued one scheduled WhatsApp (mock).', lastSent: cfg.lastSent };
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
      await tryMergeCollectionIntoDb('class_announcements', (id, data) => {
        const row = { ...data, Announcement_ID: data.Announcement_ID || id };
        if (!DB.class_announcements) DB.class_announcements = [];
        const list = DB.class_announcements;
        const i = list.findIndex((x) => x.Announcement_ID === row.Announcement_ID);
        if (i === -1) list.push(row);
        else Object.assign(list[i], row);
      });
      const list = DB.class_announcements || [];
      // Removed restriction: Teachers can now see all class announcements using filters
      return [...list].sort((a, b) => String(b.Posted_At).localeCompare(String(a.Posted_At)));
    },
    async addClassAnnouncement(d) {
      await delay();
      const actor = actorFn();
      if (!actor || (actor.role !== 'teacher' && actor.role !== 'admin')) return { ok: false, msg: 'Access denied' };
      // Teachers can post for any class now
      const id = uid('CLA');
      const ann = {
        Announcement_ID: id,
        Title: d.title || '',
        Body: d.body || '',
        Class: String(d.cls || ''),
        Section: d.section || '',
        Priority: d.priority || 'Normal',
        Teacher_UID: actor.uid || '',
        Teacher_ID: d.teacherId || '',
        Teacher_Name: d.teacherName || '',
        Posted_At: new Date().toISOString(),
      };
      if (!DB.class_announcements) DB.class_announcements = [];
      DB.class_announcements.push(ann);
      audit('class_announcement_add', { id, cls: d.cls, section: d.section });
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await setDoc(doc(fb.db, 'class_announcements', id), ann, { merge: true });
        } catch (e) {
          console.error('[Firestore Sync Error] class_announcements', e);
          return { ok: true, msg: `Posted locally, but Firestore sync failed: ${e?.message || e}`, id };
        }
      }
      // Notify parents of the class
      PN.notifyClassAnnouncement(DB, audit, SCHOOL_NAME, ann);
      const studentCount = DB.students.filter(
        (s) => s.Status === 'Active' && String(s.Class) === String(d.cls) && s.Section === d.section
      ).length;
      return {
        ok: true,
        msg: fb
          ? `Class announcement posted! Saved to Firestore. ${studentCount} parent(s) notified (mock WhatsApp).`
          : `Class announcement posted! ${studentCount} parent(s) notified (mock WhatsApp).`,
        id,
      };
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
      saveLocalDbFromMemory();

      const fb = firebaseReady();
      if (fb) {
        try {
          await deleteDoc(doc(fb.db, 'class_announcements', id));
        } catch (e) {
          console.error('[Firestore Delete Error] class_announcements', e);
          return { ok: true, msg: `Removed locally, but Firestore delete failed: ${e?.message || e}` };
        }
      }
      return { ok: true, msg: 'Removed.' };
    },
  };
}
