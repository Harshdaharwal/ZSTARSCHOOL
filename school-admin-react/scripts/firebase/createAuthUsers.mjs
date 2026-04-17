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

async function identityToolkitRequest(apiKey, endpoint, body) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const payload = await response.json();
  return { ok: response.ok, payload, status: response.status };
}

async function lookupUserByEmail(accessToken, projectId, email) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: [email],
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Failed to look up auth user for ${email}: ${message}`);
  }

  return payload?.users?.[0]?.localId || null;
}

async function resolveEmailPasswordUser(apiKey, accessToken, projectId, email, password) {
  const createResult = await identityToolkitRequest(apiKey, 'accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });

  if (createResult.ok) {
    return createResult.payload.localId;
  }

  const createMessage = createResult.payload?.error?.message || `HTTP ${createResult.status}`;
  if (createMessage !== 'EMAIL_EXISTS') {
    throw new Error(`Failed to create auth user for ${email}: ${createMessage}`);
  }

  const signInResult = await identityToolkitRequest(apiKey, 'accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });

  if (!signInResult.ok) {
    const existingUserId = await lookupUserByEmail(accessToken, projectId, email);
    if (existingUserId) {
      console.log(`Auth user already exists for ${email}`);
      return existingUserId;
    }
    const signInMessage = signInResult.payload?.error?.message || `HTTP ${signInResult.status}`;
    throw new Error(`Account exists for ${email}, but sign-in failed: ${signInMessage}`);
  }

  console.log(`Auth user already exists for ${email}`);
  return signInResult.payload.localId;
}

async function main() {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.argv[2];
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountPath) {
    throw new Error(
      'Pass a service account JSON path via GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT, or as the first argument.'
    );
  }
  if (!apiKey) {
    throw new Error('Missing Firebase Web API key. Set VITE_FIREBASE_API_KEY or FIREBASE_API_KEY.');
  }
  if (!projectId) {
    throw new Error('Missing Firebase project id. Set VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID.');
  }

  const raw = await readFile(defaultSeedPath, 'utf8');
  const seed = JSON.parse(raw);
  const serviceAccount = await loadServiceAccount(serviceAccountPath);
  const accessToken = await fetchAccessToken(serviceAccount, [
    'https://www.googleapis.com/auth/datastore',
    'https://www.googleapis.com/auth/identitytoolkit',
  ]);
  const writes = [];

  for (const authSeed of seed.authSeeds || []) {
    const localId = await resolveEmailPasswordUser(
      apiKey,
      accessToken,
      projectId,
      authSeed.email,
      authSeed.password
    );
    writes.push(
      buildUpdateWrite(projectId, 'users', localId, {
        uid: localId,
        ...authSeed.profile,
      })
    );
  }

  if (writes.length) {
    await batchWriteDocuments({
      projectId,
      token: accessToken,
      writes,
    });
  }

  console.log(`Created ${writes.length} auth profile document(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
