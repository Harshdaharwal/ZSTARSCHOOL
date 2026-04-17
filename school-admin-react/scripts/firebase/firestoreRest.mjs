import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/datastore'];

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encodePrimitive(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return null;
}

export function toFirestoreValue(value) {
  const primitive = encodePrimitive(value);
  if (primitive) return primitive;

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue === undefined) continue;
      fields[key] = toFirestoreValue(nestedValue);
    }
    return { mapValue: { fields } };
  }

  return { stringValue: String(value) };
}

export function toFirestoreDocument(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

export async function loadServiceAccount(pathOrJson) {
  if (!pathOrJson) {
    throw new Error('Missing service account JSON path.');
  }

  if (pathOrJson.trim().startsWith('{')) {
    return JSON.parse(pathOrJson);
  }

  const raw = await readFile(pathOrJson, 'utf8');
  return JSON.parse(raw);
}

export async function fetchAccessToken(serviceAccount, scopes = DEFAULT_SCOPES) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: Array.isArray(scopes) ? scopes.join(' ') : String(scopes),
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

export async function batchWriteDocuments({
  projectId,
  database = '(default)',
  token,
  writes,
}) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${database}/documents:batchWrite`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ writes }),
    }
  );

  if (!response.ok) {
    throw new Error(`Batch write failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export function buildUpdateWrite(projectId, collectionName, documentId, data) {
  const encodedId = encodeURIComponent(documentId);
  return {
    update: {
      name: `projects/${projectId}/databases/(default)/documents/${collectionName}/${encodedId}`,
      ...toFirestoreDocument(data),
    },
  };
}
