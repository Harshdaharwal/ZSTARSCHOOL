import { DB, seedMockDatabase } from '../../src/services/mockBackend.js';
import { DEMO_ADMIN, DEMO_TEACHER } from '../../src/config/authCredentials.js';
import {
  ACADEMIC_YEAR,
  SCHOOL_EXPORT_META,
  SCHOOL_NAME,
  SCHOOL_TAGLINE,
} from '../../src/config/schoolConfig.js';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCollectionMap(snapshot) {
  return {
    students: snapshot.students,
    teachers: snapshot.teachers,
    classes: snapshot.classes,
    fees: snapshot.fees,
    exams: snapshot.exams,
    marks: snapshot.marks,
    student_attendance: snapshot.att_stu,
    teacher_attendance: snapshot.att_tch,
    schedule: snapshot.schedule,
    timetables: snapshot.timetables,
    announcements: snapshot.announcements,
    homework: snapshot.homework,
    holidays: snapshot.holidays,
    whatsapp_log: snapshot.whatsapp_log,
    notification_dedupe: snapshot.notification_dedupe,
    audit_log: snapshot.audit_log,
    class_fee_settings: snapshot.class_fee_settings,
    salaries: snapshot.salaries,
    class_announcements: snapshot.class_announcements,
  };
}

export function buildSeedPayload() {
  seedMockDatabase();

  const snapshot = deepClone(DB);
  const collections = buildCollectionMap(snapshot);
  const counts = Object.fromEntries(
    Object.entries(collections).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0])
  );

  return {
    exportedAt: new Date().toISOString(),
    school: {
      ...SCHOOL_EXPORT_META,
      schoolName: SCHOOL_NAME,
      tagline: SCHOOL_TAGLINE,
      academicYear: ACADEMIC_YEAR,
    },
    collections,
    counts,
    authSeeds: [
      {
        key: 'admin',
        email: DEMO_ADMIN.email,
        password: DEMO_ADMIN.password,
        profile: {
          email: DEMO_ADMIN.email,
          role: DEMO_ADMIN.role,
          teacherId: '',
          studentIds: [],
        },
      },
      {
        key: 'teacher_demo',
        email: DEMO_TEACHER.email,
        password: DEMO_TEACHER.password,
        profile: {
          email: DEMO_TEACHER.email,
          role: DEMO_TEACHER.role,
          teacherId: DEMO_TEACHER.teacherId,
          studentIds: [],
        },
      },
    ],
  };
}
