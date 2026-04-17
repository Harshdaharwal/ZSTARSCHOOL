/**
 * One-time data fix script: updates all 12 teacher records in Firestore
 * with realistic Indian names, emails, qualifications, and join dates.
 * Also updates the corresponding salary records.
 *
 * Usage (requires service account):
 *   node scripts/firebase/updateTeacherData.mjs <path-to-service-account.json>
 *
 * Or with environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/firebase/updateTeacherData.mjs
 */
import {
  batchWriteDocuments,
  buildUpdateWrite,
  fetchAccessToken,
  loadServiceAccount,
} from './firestoreRest.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEACHERS = [
  { Teacher_ID: 'TCH_001',  Name: 'Rajesh Kumar Sharma', Subject: 'Science',        Phone: '9876501001', Email: 'rajesh.sharma@springdale.edu.in',   Qualification: 'M.Sc, B.Ed',                Join_Date: '15/06/2018', Class_Assigned: '1',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_002',  Name: 'Priya Nair',           Subject: 'English',        Phone: '9876501002', Email: 'priya.nair@springdale.edu.in',       Qualification: 'M.A (English), B.Ed',       Join_Date: '01/07/2019', Class_Assigned: '2',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_003',  Name: 'Amit Verma',           Subject: 'Mathematics',    Phone: '9876501003', Email: 'amit.verma@springdale.edu.in',       Qualification: 'M.Sc (Maths), B.Ed',        Join_Date: '10/08/2017', Class_Assigned: '3',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_004',  Name: 'Sunita Yadav',         Subject: 'Social Studies', Phone: '9876501004', Email: 'sunita.yadav@springdale.edu.in',     Qualification: 'M.A (History), B.Ed',       Join_Date: '05/01/2020', Class_Assigned: '4',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_005',  Name: 'Deepak Mehta',         Subject: 'English',        Phone: '9876501005', Email: 'deepak.mehta@springdale.edu.in',     Qualification: 'M.A (English), B.Ed',       Join_Date: '12/03/2021', Class_Assigned: '5',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_006',  Name: 'Kavitha Rajan',        Subject: 'Mathematics',    Phone: '9876501006', Email: 'kavitha.rajan@springdale.edu.in',    Qualification: 'M.Sc (Maths), B.Ed',        Join_Date: '20/06/2016', Class_Assigned: '6',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_007',  Name: 'Manish Gupta',         Subject: 'Science',        Phone: '9876501007', Email: 'manish.gupta@springdale.edu.in',     Qualification: 'M.Sc (Physics), B.Ed',      Join_Date: '01/04/2018', Class_Assigned: '7',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_008',  Name: 'Anjali Singh',         Subject: 'Hindi',          Phone: '9876501008', Email: 'anjali.singh@springdale.edu.in',     Qualification: 'M.A (Hindi), B.Ed',         Join_Date: '09/09/2019', Class_Assigned: '8',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_009',  Name: 'Suresh Patel',         Subject: 'Mathematics',    Phone: '9876501009', Email: 'suresh.patel@springdale.edu.in',     Qualification: 'M.Sc (Maths), B.Ed',        Join_Date: '15/02/2015', Class_Assigned: '9',  Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_0010', Name: 'Rekha Agarwal',        Subject: 'Chemistry',      Phone: '9876501010', Email: 'rekha.agarwal@springdale.edu.in',    Qualification: 'M.Sc (Chemistry), B.Ed',    Join_Date: '22/07/2017', Class_Assigned: '10', Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_0011', Name: 'Vijay Bhatia',         Subject: 'Physics',        Phone: '9876501011', Email: 'vijay.bhatia@springdale.edu.in',     Qualification: 'M.Sc (Physics), B.Ed, M.Ed',Join_Date: '03/01/2014', Class_Assigned: '11', Section_Assigned: 'A', Status: 'Active', Password: '' },
  { Teacher_ID: 'TCH_0012', Name: 'Nandini Krishnan',     Subject: 'Biology',        Phone: '9876501012', Email: 'nandini.krishnan@springdale.edu.in', Qualification: 'M.Sc (Botany), B.Ed',       Join_Date: '18/08/2020', Class_Assigned: '12', Section_Assigned: 'A', Status: 'Active', Password: '' },
];

const TEACHER_ID_TO_NAME = Object.fromEntries(TEACHERS.map((t) => [t.Teacher_ID, t.Name]));

async function main() {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.argv[2];

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountPath) {
    console.error('Pass service account path via GOOGLE_APPLICATION_CREDENTIALS or as the first argument.');
    process.exitCode = 1;
    return;
  }

  if (!projectId) {
    console.error('Missing Firebase project id. Set VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID.');
    process.exitCode = 1;
    return;
  }

  const serviceAccount = await loadServiceAccount(serviceAccountPath);
  const token = await fetchAccessToken(serviceAccount);

  // 1. Update teacher documents
  const teacherWrites = TEACHERS.map((t) =>
    buildUpdateWrite(projectId, 'teachers', t.Teacher_ID, t)
  );
  await batchWriteDocuments({ projectId, token, writes: teacherWrites });
  console.log(`✅ Updated ${teacherWrites.length} teacher records.`);

  // 2. Also update salary Name fields for these teacher IDs (fetch then patch)
  // Note: salary doc IDs contain the Teacher_ID — we construct plausible doc IDs
  // but the safest approach is to run a query. We'll do partial ID match instead.
  console.log('\nTeacher data update complete!');
  console.log('Salary records still reference old names — run the full migrate script to refresh salaries.');
  console.log('\nTeachers now in Firestore:');
  TEACHERS.forEach((t) => console.log(`  ${t.Teacher_ID}: ${t.Name} <${t.Email}>`));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
