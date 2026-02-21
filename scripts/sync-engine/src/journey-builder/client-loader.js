import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

export function getClientDir(clientSlug) {
  return path.join(repoRoot, 'clients', clientSlug);
}

export async function loadClientLocationConfig(clientSlug) {
  const clientDir = getClientDir(clientSlug);
  const locationConfigPath = path.join(clientDir, 'location-config.json');
  const raw = await fs.readFile(locationConfigPath, 'utf8');
  return { clientDir, locationConfigPath, locationConfig: JSON.parse(raw) };
}

export async function ensureJourneyBuilderDir(clientSlug) {
  const clientDir = getClientDir(clientSlug);
  const outputDir = path.join(clientDir, 'journey-builder');
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

