import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  batchWriteDocuments,
  buildUpdateWrite,
  fetchAccessToken,
  loadServiceAccount,
} from './firestoreRest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const defaultSeedPath = path.join(rootDir, 'firebase', 'firestore-seed.json');

function makeDocumentId(collectionName, row, index) {
  const preferredKeys = {
    students: 'Student_ID',
    teachers: 'Teacher_ID',
    classes: ['Class', 'Section'],
    fees: 'Fee_ID',
    exams: 'Exam_ID',
    marks: 'Mark_ID',
    student_attendance: ['Student_ID', 'Date', 'Status'],
    teacher_attendance: ['Teacher_ID', 'Date', 'Status'],
    schedule: ['Class', 'Section', 'Day', 'Period'],
    timetables: 'Entry_ID',
    announcements: 'Announcement_ID',
    homework: 'Homework_ID',
    holidays: 'Holiday_ID',
    whatsapp_log: 'Log_ID',
    notification_dedupe: 'key',
    audit_log: ['at', 'action'],
    class_fee_settings: 'Class',
    salaries: 'Salary_ID',
    class_announcements: 'Announcement_ID',
  };

  const selector = preferredKeys[collectionName];
  if (Array.isArray(selector)) {
    const parts = selector
      .map((key) => row?.[key])
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      .map((value) => String(value).replace(/[^\w.-]+/g, '_'));
    if (parts.length) return parts.join('__');
  }
  if (typeof selector === 'string') {
    const value = row?.[selector];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).replace(/[^\w.-]+/g, '_');
    }
  }
  return `${collectionName}_${String(index + 1).padStart(6, '0')}`;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.argv[2];

  if (!serviceAccountPath) {
    throw new Error(
      'Pass a service account JSON path via GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT, or as the first argument.'
    );
  }

  const raw = await readFile(defaultSeedPath, 'utf8');
  const seed = JSON.parse(raw);
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    seed?.school?.projectId;

  if (!projectId) {
    throw new Error('Missing Firebase project id. Set VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID.');
  }

  const serviceAccount = await loadServiceAccount(serviceAccountPath);
  const accessToken = await fetchAccessToken(serviceAccount);

  const allWrites = [];
  for (const [collectionName, rows] of Object.entries(seed.collections || {})) {
    rows.forEach((row, index) => {
      const documentId = makeDocumentId(collectionName, row, index);
      allWrites.push(buildUpdateWrite(projectId, collectionName, documentId, row));
    });
  }

  allWrites.push(
    buildUpdateWrite(projectId, 'meta', 'school_snapshot', {
      exportedAt: seed.exportedAt,
      school: seed.school,
      counts: seed.counts,
      migrationSource: 'mock-backend-seed',
    })
  );

  const groups = chunk(allWrites, 400);
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    await batchWriteDocuments({
      projectId,
      token: accessToken,
      writes: group,
    });
    console.log(`Uploaded batch ${index + 1}/${groups.length} (${group.length} docs)`);
  }

  console.log('Firestore migration complete.');
  console.log(JSON.stringify(seed.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
