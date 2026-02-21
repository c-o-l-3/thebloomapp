#!/usr/bin/env node

/**
 * Airtable Email Preview Sync
 * 
 * Uploads email previews to Airtable for centralized review
 * 
 * Usage:
 *   node scripts/sync-airtable.js           # Sync all previews
 *   node scripts/sync-airtable.js --dry-run # Preview without syncing
 */

import dotenv from 'dotenv';
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app66pKRuzhlUzy3j';
const AIRTABLE_TABLE_NAME = 'Email Previews';

// Cameron Estate record ID (will need to be created/updated)
const CAMERON_ESTATE_RECORD_ID = process.env.AIRTABLE_CAMERON_RECORD_ID;

// Email configurations (same as build.js)
const emailConfigs = {
  day1: {
    name: 'Day 1 - Welcome',
    subject: 'Inside your Cameron Estate wedding, {{first_name}}',
    previewText: 'Your fairy tale has a home at Cameron Estate.',
    day: 1,
    type: 'Email'
  },
  day3: {
    name: 'Day 3 - Decision',
    subject: '"We knew within minutes"',
    previewText: 'Three couples share what made they choose Cameron Estate.',
    day: 3,
    type: 'Email'
  },
  day5: {
    name: 'Day 5 - Vision',
    subject: '{{first_name}}, can you see it?',
    previewText: 'Close your eyes. Picture your wedding day.',
    day: 5,
    type: 'Email'
  },
  day10: {
    name: 'Day 10 - Inclusions',
    subject: 'What "all-inclusive" really means at Cameron Estate',
    previewText: 'Not all all-inclusive packages are created equal.',
    day: 10,
    type: 'Email'
  }
};

/**
 * Airtable client for the Email Previews table
 */
class AirtableClient {
  constructor(apiKey, baseId) {
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.baseUrl = `https://api.airtable.com/v0/${baseId}`;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * List records in the table
   */
  async listRecords(tableName) {
    try {
      const response = await axios.get(`${this.baseUrl}/${tableName}`, {
        headers: this.headers,
        params: {
          maxRecords: 100,
          view: 'Grid view'
        }
      });
      return response.data.records;
    } catch (error) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async createRecord(tableName, fields) {
    const response = await axios.post(
      `${this.baseUrl}/${tableName}`,
      { fields },
      { headers: this.headers }
    );
    return response.data;
  }

  /**
   * Update an existing record
   */
  async updateRecord(tableName, recordId, fields) {
    const response = await axios.patch(
      `${this.baseUrl}/${tableName}/${recordId}`,
      { fields },
      { headers: this.headers }
    );
    return response.data;
  }

  /**
   * Upload an attachment to a record
   */
  async uploadAttachment(tableName, recordId, fieldName, filePath) {
    try {
      // First, get the record to check existing attachments
      const record = await axios.get(
        `${this.baseUrl}/${tableName}/${recordId}`,
        { headers: this.headers }
      );

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const response = await axios.post(
        `${this.baseUrl}/${tableName}/${recordId}/${fieldName}`,
        formData,
        {
          headers: {
            ...this.headers,
            ...formData.getHeaders()
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`   ✗ Failed to upload attachment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if table exists, create if not
   */
  async ensureTable(tableName, schema) {
    try {
      // Try to list records - if 404, table doesn't exist
      await this.listRecords(tableName);
      console.log(`   ✓ Table "${tableName}" exists`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`   ⚠ Table "${tableName}" not found - will create records only`);
        return false;
      }
      throw error;
    }
  }
}

/**
 * Get or create Airtable record for an email
 */
async function getOrCreateEmailRecord(airtable, config, existingRecords) {
  // Find existing record by name
  const existing = existingRecords.find(
    r => r.fields.Name === config.name
  );

  if (existing) {
    return existing;
  }

  // Create new record
  const newRecord = await airtable.createRecord(AIRTABLE_TABLE_NAME, {
    Name: config.name,
    Day: config.day,
    Type: config.type,
    Subject: config.subject,
    Status: 'Draft',
    Preview: [], // Placeholder for attachment
    Client: 'Cameron Estate Inn'
  });

  return newRecord;
}

/**
 * Process and sync a single email preview
 */
async function processEmailPreview(airtable, emailId, options) {
  const config = emailConfigs[emailId];
  
  if (!config) {
    console.error(`Email config not found: ${emailId}`);
    return null;
  }
  
  console.log(`\n📧 Processing: ${config.name}`);
  
  try {
    // Find existing records
    const existingRecords = await airtable.listRecords(AIRTABLE_TABLE_NAME);
    console.log(`   ✓ Found ${existingRecords.length} existing records`);
    
    // Get or create record
    const record = await getOrCreateEmailRecord(airtable, config, existingRecords);
    console.log(`   ✓ Record ID: ${record.id}`);
    
    // Check for preview HTML file
    const previewPath = path.join(
      __dirname, 
      `../output/preview/${emailId}.html`
    );
    
    if (fs.existsSync(previewPath)) {
      const stats = fs.statSync(previewPath);
      const fileSize = (stats.size / 1024).toFixed(2);
      console.log(`   ✓ Preview file: ${fileSize} KB`);
      
      if (!options.dryRun) {
        // Upload to Airtable
        console.log(`   📤 Uploading to Airtable...`);
        
        await airtable.uploadAttachment(
          AIRTABLE_TABLE_NAME,
          record.id,
          'Preview',
          previewPath
        );
        
        console.log(`   ✓ Uploaded to Airtable`);
        
        // Update record with metadata
        await airtable.updateRecord(AIRTABLE_TABLE_NAME, record.id, {
          Status: 'In Review',
          'Last Generated': new Date().toISOString(),
          'HTML Size': `${fileSize} KB`
        });
        
        console.log(`   ✓ Updated record metadata`);
      } else {
        console.log(`   (Dry run - skipped upload)`);
      }
    } else {
      console.log(`   ⚠ Preview file not found: ${previewPath}`);
      console.log(`   💡 Run 'npm run preview' first to generate previews`);
    }
    
    return {
      success: true,
      name: config.name,
      recordId: record.id,
      previewPath
    };
    
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return {
      success: false,
      name: config.name,
      error: error.message
    };
  }
}

/**
 * Generate an HTML page that links to Airtable
 */
function generateAirtableLinks(results) {
  const links = results
    .filter(r => r.success)
    .map(r => `- [${r.name}](${r.previewPath.split('/output/')[1]})`)
    .join('\n');
    
  const html = `
# Cameron Estate Email Previews - Airtable Sync

**Last Synced:** ${new Date().toISOString()}

## Records to Create in Airtable

Create a new table called "Email Previews" with these fields:

| Field Name | Type |
|------------|------|
| Name | Single line text |
| Day | Number |
| Type | Single line text |
| Subject | Single line text |
| Status | Single select (Draft, In Review, Approved, Rejected) |
| Preview | Attachment |
| Client | Single line text |
| Last Generated | Date & time |
| HTML Size | Single line text |
| GHL Template ID | Single line text |

## Email Records

${links}

## Sync Status

${results.map(r => 
  `- ${r.success ? '✓' : '✗'} ${r.name}: ${r.recordId || r.error}`
).join('\n')}
`;
  
  const outputPath = path.join(__dirname, '../output/preview/airtable-sync.md');
  fs.writeFileSync(outputPath, html);
  console.log(`\n📄 Airtable setup guide: ${outputPath}`);
  
  return outputPath;
}

/**
 * Main sync function
 */
async function main() {
  const program = new Command();
  
  program
    .name('sync-airtable')
    .description('Sync email previews to Airtable')
    .option('--dry-run', 'Preview without syncing', false)
    .option('--email <name>', 'Sync specific email')
    .option('--all', 'Sync all emails');
  
  const options = program.parse();
  
  console.log('🏰 Cameron Estate - Airtable Email Preview Sync');
  console.log('==============================================\n');
  
  if (!AIRTABLE_API_KEY) {
    console.error('❌ AIRTABLE_API_KEY required in .env');
    console.log('\nAdd to your .env file:');
    console.log('  AIRTABLE_API_KEY=your_airtable_token');
    console.log('  AIRTABLE_BASE_ID=app66pKRuzhlUzy3j');
    console.log('  AIRTABLE_CAMERON_RECORD_ID=recxxx');
    process.exit(1);
  }
  
  const airtable = new AirtableClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID);
  
  // Check table exists
  await airtable.ensureTable(AIRTABLE_TABLE_NAME);
  
  // Determine which emails to sync
  const emailsToSync = [];
  
  if (options.email) {
    emailsToSync.push(options.email);
  } else if (options.all) {
    emailsToSync.push(...Object.keys(emailConfigs));
  } else {
    emailsToSync.push(...Object.keys(emailConfigs));
  }
  
  // Process each email
  const results = [];
  
  for (const emailId of emailsToSync) {
    const result = await processEmailPreview(airtable, emailId, options);
    if (result) {
      results.push(result);
    }
  }
  
  // Generate Airtable setup guide
  generateAirtableLinks(results);
  
  // Summary
  console.log('\n==============================================');
  console.log('📊 Sync Summary');
  console.log('==============================================');
  console.log(`Total emails: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  if (options.dryRun) {
    console.log('\n⚠️  Dry run - no changes made to Airtable');
  } else {
    console.log('\n✅ Previews synced to Airtable!');
  }
}

// Run if called directly
main().catch(console.error);

export { AirtableClient, processEmailPreview, main };
