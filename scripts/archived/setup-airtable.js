#!/usr/bin/env node

/**
 * BloomBuilder Airtable Setup Script
 * Creates tables in existing "Bloom Builder" base
 */

const BASE_ID = 'app66pKRuzhlUzy3j';
const BASE_NAME = 'Bloom Builder';
const TOKEN = 'pataoPjKadyuZ2LxN.2f582e6e56a33159d2f66ba4c2448fc8a6da3d4b3047c55ea0fc0ffa0ba0e62f';

const API_URL = 'https://api.airtable.com/v0';
const META_URL = 'https://api.airtable.com/v0/meta';

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// Simplified table definitions (avoiding linked fields first)
const tables = [
  {
    name: 'Pipelines',
    description: 'GoHighLevel pipeline definitions',
    fields: [
      { name: 'Pipeline Name', type: 'singleLineText', description: 'Name of pipeline' },
      { name: 'Pipeline ID', type: 'singleLineText', description: 'GHL Pipeline ID' },
      { name: 'Stages', type: 'multilineText', description: 'JSON array of stages' },
      { name: 'Is Default', type: 'checkbox' },
    ],
  },
  {
    name: 'Journeys',
    description: 'Customer journey definitions',
    fields: [
      { name: 'Journey Name', type: 'singleLineText' },
      { name: 'Type', type: 'singleSelect', options: { choices: [{ name: 'Wedding' }, { name: 'Corporate' }, { name: 'Event' }, { name: 'Inquiry' }, { name: 'Nurture' }] } },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Draft' }, { name: 'In Review' }, { name: 'Active' }, { name: 'Paused' }, { name: 'Archived' }] } },
      { name: 'Description', type: 'multilineText' },
      { name: 'Tags', type: 'multipleSelects', options: { choices: [{ name: 'Onboarding' }, { name: 'Retention' }, { name: 'Reactivation' }] } },
    ],
  },
  {
    name: 'Touchpoints',
    description: 'Individual communications in a journey',
    fields: [
      { name: 'Day', type: 'number', description: 'Day offset from journey start' },
      { name: 'Type', type: 'singleSelect', options: { choices: [{ name: 'Email' }, { name: 'SMS' }, { name: 'Task' }, { name: 'Wait' }, { name: 'Condition' }, { name: 'Trigger' }, { name: 'Form' }, { name: 'Call' }] } },
      { name: 'Internal Name', type: 'singleLineText' },
      { name: 'Subject', type: 'singleLineText' },
      { name: 'Body Content', type: 'richText' },
      { name: 'GHL Template ID', type: 'singleLineText' },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Draft' }, { name: 'Client Review' }, { name: 'Approved' }, { name: 'Published' }, { name: 'Needs Revision' }] } },
      { name: 'Order', type: 'number' },
    ],
  },
  {
    name: 'Versions',
    description: 'Version history for touchpoints',
    fields: [
      { name: 'Version Number', type: 'number' },
      { name: 'Subject', type: 'singleLineText' },
      { name: 'Body Content', type: 'richText' },
      { name: 'Change Notes', type: 'multilineText' },
    ],
  },
  {
    name: 'Approvals',
    description: 'Approval workflow tracking',
    fields: [
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Pending' }, { name: 'Approved' }, { name: 'Rejected' }, { name: 'Changes Requested' }] } },
      { name: 'Comments', type: 'multilineText' },
      { name: 'Approved At', type: 'dateTime' },
    ],
  },
  {
    name: 'Templates',
    description: 'GoHighLevel template mapping',
    fields: [
      { name: 'GHL Template ID', type: 'singleLineText' },
      { name: 'Template Type', type: 'singleSelect', options: { choices: [{ name: 'Email' }, { name: 'SMS' }] } },
      { name: 'Last Synced', type: 'dateTime' },
      { name: 'Sync Status', type: 'singleSelect', options: { choices: [{ name: 'Synced' }, { name: 'Pending' }, { name: 'Failed' }, { name: 'Modified in GHL' }] } },
    ],
  },
  {
    name: 'Sync History',
    description: 'Sync operation log',
    fields: [
      { name: 'Operation', type: 'singleSelect', options: { choices: [{ name: 'Full Sync' }, { name: 'Template Create' }, { name: 'Template Update' }, { name: 'Template Delete' }] } },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Success' }, { name: 'Failed' }, { name: 'Partial' }] } },
      { name: 'Items Synced', type: 'number' },
      { name: 'Errors', type: 'multilineText' },
      { name: 'Started At', type: 'dateTime' },
      { name: 'Completed At', type: 'dateTime' },
    ],
  },
];

async function checkBase() {
  console.log(`Checking base: ${BASE_NAME} (${BASE_ID})`);
  
  const response = await fetch(`${META_URL}/bases/${BASE_ID}`, { headers });
  if (response.ok) {
    const base = await response.json();
    console.log(`✅ Base found: ${base.name}`);
    return true;
  }
  console.log(`❌ Base not found or no access`);
  return false;
}

async function getExistingTables() {
  const response = await fetch(`${META_URL}/bases/${BASE_ID}/tables`, { headers });
  const data = await response.json();
  return data.tables.map(t => t.name);
}

async function createTable(tableDef) {
  console.log(`Creating table: ${tableDef.name}`);
  
  const fields = tableDef.fields.map(field => {
    const fieldObj = { name: field.name };
    
    switch (field.type) {
      case 'singleLineText':
        fieldObj.type = 'singleLineText';
        break;
      case 'multilineText':
        fieldObj.type = 'multilineText';
        break;
      case 'richText':
        fieldObj.type = 'richText';
        break;
      case 'number':
        fieldObj.type = 'number';
        fieldObj.options = { precision: 0 };
        break;
      case 'checkbox':
        fieldObj.type = 'checkbox';
        fieldObj.options = { color: { name: 'gray' }, icon: 'check' };
        break;
      case 'dateTime':
        fieldObj.type = 'dateTime';
        break;
      case 'singleSelect':
        fieldObj.type = 'singleSelect';
        fieldObj.options = { choices: field.options.choices.map(c => ({ name: c.name })) };
        break;
      case 'multipleSelects':
        fieldObj.type = 'multipleSelects';
        fieldObj.options = { choices: field.options.choices.map(c => ({ name: c.name })) };
        break;
      default:
        fieldObj.type = 'singleLineText';
    }
    
    if (field.description) {
      fieldObj.description = field.description;
    }
    
    return fieldObj;
  });

  const response = await fetch(`${META_URL}/bases/${BASE_ID}/tables`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: tableDef.name,
      description: tableDef.description,
      fields,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.error?.type === 'DUPLICATE_TABLE_NAME') {
      console.log(`  ⚠️  Table "${tableDef.name}" already exists`);
      return 'exists';
    }
    throw new Error(JSON.stringify(error));
  }

  const created = await response.json();
  console.log(`  ✅ Created (${created.fields.length} fields)`);
  return 'created';
}

async function main() {
  console.log('🚀 BloomBuilder Airtable Setup\n');
  console.log(`Base ID: ${BASE_ID}`);
  console.log(`Base Name: ${BASE_NAME}\n`);

  const baseExists = await checkBase();
  if (!baseExists) {
    console.log('\n❌ Base not found. Please create it manually in Airtable.');
    return;
  }

  const existingTables = await getExistingTables();
  console.log(`Existing tables: ${existingTables.join(', ') || 'None'}\n`);

  for (const table of tables) {
    if (existingTables.includes(table.name)) {
      console.log(`⏭  Skipping "${table.name}" - already exists`);
      continue;
    }
    
    try {
      const result = await createTable(table);
    } catch (error) {
      console.error(`❌ Error creating "${table.name}":`, error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Add linked fields manually in Airtable UI');
  console.log('2. Link Pipelines → Clients');
  console.log('3. Link Journeys → Clients, Pipelines');
  console.log('4. Link Touchpoints → Journeys');
  console.log('5. Add remaining linked fields');
}

main().catch(console.error);
