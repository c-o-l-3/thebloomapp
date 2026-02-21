
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

  console.log('Connecting to GHL...');
  ghlPublisher.connect(apiKey, locationId);

  try {
    console.log('Fetching email templates (Endpoint: /emails/builder)...');
            try {
                const response1 = await ghlPublisher.client.request('GET', `/emails/builder?locationId=${locationId}&limit=100`);
                if (response1.builders) {
                    console.log(`Found ${response1.builders.length} builders.`);
                    const v1Builders = response1.builders.filter(b => b.version === '1');
                    console.log(`Found ${v1Builders.length} V1 builders:`);
                    if (v1Builders.length > 0) {
                        console.log('--- INSPECTION OF FIRST V1 BUILDER ---');
                        console.log(JSON.stringify(v1Builders[0], null, 2));
                        console.log('--------------------------------------');
                    }
                    v1Builders.forEach(b => {
                        console.log(`ID: ${b.id} | Name: ${b.name}`);
                    });
                    
                    const otherBuilders = response1.builders.filter(b => b.version !== '1');
                    if (otherBuilders.length > 0) {
                        console.log(`Found ${otherBuilders.length} other version builders:`);
                        otherBuilders.forEach(b => {
                            console.log(`ID: ${b.id} | Name: ${b.name} | Version: ${b.version}`);
                        });
                    }
                }
            } catch (e) {
        console.log('Error fetching /emails/builder:', e.message);
    }

    console.log('Fetching email templates (Endpoint: /locations/{id}/templates?type=email)...');
    try {
        const response2 = await ghlPublisher.client.request('GET', `/locations/${locationId}/templates?type=email`);
        console.log('Response keys:', Object.keys(response2));
        const templates = response2.templates || [];
        console.log(`Found ${templates.length} templates.`);
        
        // List first 5
        templates.slice(0, 5).forEach(t => {
            console.log('--------------------------------');
            console.log(`ID: ${t.id}`);
            console.log(`Name: ${t.name}`);
            console.log(`Type: ${t.type}`);
        });
    } catch (e) {
        console.log('Error fetching /locations/...:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
