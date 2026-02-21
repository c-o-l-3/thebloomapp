
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ghlPublisher from '../src/services/ghl-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('Missing env vars');
    process.exit(1);
  }

  ghlPublisher.connect(apiKey, locationId);

  // ID from the log: 6989de20d42895d667273b3d (Day 3)
  const idToDelete = '6989de20d42895d667273b3d'; 

  console.log(`Deleting template: ${idToDelete}`);

  try {
    // Try /locations/{locationId}/templates/{id}
    console.log(`Trying DELETE /locations/${locationId}/templates/${idToDelete}`);
    const result = await ghlPublisher.client.request('DELETE', `/locations/${locationId}/templates/${idToDelete}`);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
        console.error('Response:', error.response.data);
    }
  }
}

main();
