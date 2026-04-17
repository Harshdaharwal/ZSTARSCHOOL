import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeedPayload } from './seedSource.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const outputDir = path.join(rootDir, 'firebase');
const outputFile = path.join(outputDir, 'firestore-seed.json');

async function main() {
  const payload = buildSeedPayload();
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Seed exported to ${outputFile}`);
  console.log(JSON.stringify(payload.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
