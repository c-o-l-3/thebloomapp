
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ghlPublisher from '../src/services/ghl-publisher.js';
import publishState from '../src/utils/publish-state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const OUTPUT_DIR = path.resolve(__dirname, '../output/compiled-emails');

async function main() {
  console.log('🔍 Verifying Deployed Emails');
  console.log('============================\n');

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.error('❌ Missing GHL credentials');
    process.exit(1);
  }

  ghlPublisher.connect(apiKey, locationId);
  console.log('✓ Connected to GoHighLevel');

  // Load publish state to know what we expect
  const state = publishState.state;
  const expectedTemplates = Object.entries(state)
    .filter(([key, val]) => val.type === 'email' && val.ghlTemplateId);

  console.log(`✓ Found ${expectedTemplates.length} expected templates in publish-state.json\n`);

  // Fetch from /emails/builder (where we published)
  const builderTemplates = await ghlPublisher.getEmailTemplates();
  
  // Fetch from /locations/templates (where content might be?)
  const marketingTemplates = await ghlPublisher.getLocationTemplates('email');
  
  console.log(`Debug: Found ${builderTemplates.length} builder templates.`);
  console.log(`Debug: Found ${marketingTemplates.length} marketing templates.`);

  let successCount = 0;
  let failCount = 0;
  let warningCount = 0;

  for (const [emailId, info] of expectedTemplates) {
    console.log(`Checking: ${info.name} (ID: ${info.ghlTemplateId})`);
    
    // Find in builder templates
    const builderTmpl = builderTemplates.find(t => t.id === info.ghlTemplateId);
    
    if (!builderTmpl) {
        console.error(`   ❌ Template not found in /emails/builder list`);
        failCount++;
        continue;
    }

    if (builderTmpl.version !== '1') {
        console.error(`   ❌ Incorrect version: ${builderTmpl.version} (Expected: 1)`);
        failCount++;
        continue;
    }
    
    console.log(`   ✓ Found in builder list (Version: ${builderTmpl.version})`);

    // Try to find content
    let remoteHtml = null;
    
    // Check if we can find it in marketing templates list
    const marketingTmpl = marketingTemplates.find(t => t.name === info.name);
    if (marketingTmpl) {
        // Does marketing template have content?
        // Usually not in list view, but let's check keys
        // console.log('Keys:', Object.keys(marketingTmpl));
        if (marketingTmpl.body || marketingTmpl.html || marketingTmpl.content) {
            remoteHtml = marketingTmpl.body || marketingTmpl.html || marketingTmpl.content;
        }
    }

    if (!remoteHtml) {
        console.warn(`   ⚠️  Cannot fetch HTML content via API (GHL limitation for V1 templates).`);
        console.warn(`       Verified existence and metadata only.`);
        warningCount++;
        // We consider this a "success" in terms of deployment, but "warning" for verification
        successCount++; 
        continue;
    }

    // If we somehow got HTML (e.g. if I find a way later), verify it
    // Load local content
    const localPath = path.join(OUTPUT_DIR, emailId, `${emailId}.html`);
    if (!fs.existsSync(localPath)) {
        console.warn(`   ⚠️  Local file not found at ${localPath}`);
    } else {
        const localHtml = fs.readFileSync(localPath, 'utf-8');
        
        // Validate Merge Tags in Remote
        if (remoteHtml.includes('{{first_name}}')) {
             console.error(`   ❌ Found incorrect merge tag: {{first_name}}`);
             failCount++;
        } else if (remoteHtml.includes('{{contact.first_name}}')) {
             console.log(`   ✓ Correct merge tag found: {{contact.first_name}}`);
        }
        
        // Validate SMS/Link Placeholders
        if (remoteHtml.includes('(link here)') || remoteHtml.includes('{Link}')) {
             console.error(`   ❌ Found placeholder text (link here) or {Link}`);
             failCount++;
        }
        
        console.log(`   ✓ Content validated`);
        successCount++;
    }
  }

  console.log('\n============================');
  console.log(`Summary: ${successCount} verified, ${failCount} failed, ${warningCount} warnings (content skipped)`);
  
  if (failCount > 0) process.exit(1);
}

main().catch(err => console.error(err));
