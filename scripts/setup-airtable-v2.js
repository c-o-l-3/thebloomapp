#!/usr/bin/env node

/**
 * BloomBuilder Two-Pass Setup Script
 * 
 * Pass 1: Create all tables with basic fields (capture IDs)
 * Pass 2: Add select and linked fields using captured IDs
 */

const BASE_ID = 'app66pKRuzhlUzy3j';
const TOKEN = 'pataoPjKadyuZ2LxN.2f582e6e56a33159d2f66ba4c2448fc8a6da3d4b3047c55ea0fc0ffa0ba0e62f';

const META_URL = 'https://api.airtable.com/v0/meta';

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// Table definitions with field groups
const tables = [
  {
    name: 'Clients',
    basicFields: [
      { name: 'Name', type: 'singleLineText' },
      { name: 'Location ID', type: 'singleLineText' },
      { name: 'PIT Token', type: 'singleLineText' },
      { name: 'Website', type: 'url' },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Active' }, { name: 'Inactive' }, { name: 'Onboarding' }, { name: 'Archived' }] } },
      { name: 'Notes', type: 'multilineText' },
    ],
    // No linked fields - this is the root
  },
  {
    name: 'Pipelines',
    basicFields: [
      { name: 'Pipeline Name', type: 'singleLineText' },
      { name: 'Pipeline ID', type: 'singleLineText' },
      { name: 'Stages', type: 'multilineText' },
      { name: 'Is Default', type: 'checkbox', options: { color: { name: 'gray' }, icon: 'check' } },
    ],
    linkedFields: [
      { name: 'Client', type: 'multipleRecordLinks', options: { linkedTableId: 'tblClientsId' } },
    ],
  },
  {
    name: 'Journeys',
    basicFields: [
      { name: 'Journey Name', type: 'singleLineText' },
      { name: 'Type', type: 'singleSelect', options: { choices: [{ name: 'Wedding' }, { name: 'Corporate' }, { name: 'Event' }, { name: 'Inquiry' }, { name: 'Nurture' }] } },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Draft' }, { name: 'In Review' }, { name: 'Active' }, { name: 'Paused' }, { name: 'Archived' }] } },
      { name: 'Description', type: 'multilineText' },
      { name: 'Tags', type: 'multipleSelects', options: { choices: [{ name: 'Onboarding' }, { name: 'Retention' }, { name: 'Reactivation' }] } },
    ],
    linkedFields: [
      { name: 'Client', type: 'multipleRecordLinks', options: { linkedTableId: 'tblClientsId' } },
      { name: 'Pipeline', type: 'multipleRecordLinks', options: { linkedTableId: 'tblPipelinesId' } },
    ],
  },
  {
    name: 'Touchpoints',
    basicFields: [
      { name: 'Day', type: 'number', options: { precision: 0 } },
      { name: 'Type', type: 'singleSelect', options: { choices: [{ name: 'Email' }, { name: 'SMS' }, { name: 'Task' }, { name: 'Wait' }, { name: 'Condition' }, { name: 'Trigger' }, { name: 'Form' }, { name: 'Call' }] } },
      { name: 'Internal Name', type: 'singleLineText' },
      { name: 'Subject', type: 'singleLineText' },
      { name: 'Body Content', type: 'richText' },
      { name: 'GHL Template ID', type: 'singleLineText' },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Draft' }, { name: 'Client Review' }, { name: 'Approved' }, { name: 'Published' }, { name: 'Needs Revision' }] } },
      { name: 'Order', type: 'number', options: { precision: 0 } },
    ],
    linkedFields: [
      { name: 'Journey', type: 'multipleRecordLinks', options: { linkedTableId: 'tblJourneysId' } },
    ],
  },
  {
    name: 'Versions',
    basicFields: [
      { name: 'Version Number', type: 'number', options: { precision: 0 } },
      { name: 'Subject', type: 'singleLineText' },
      { name: 'Body Content', type: 'richText' },
      { name: 'Change Notes', type: 'multilineText' },
    ],
    linkedFields: [
      { name: 'Touchpoint', type: 'multipleRecordLinks', options: { linkedTableId: 'tblTouchpointsId' } },
    ],
  },
  {
    name: 'Approvals',
    basicFields: [
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Pending' }, { name: 'Approved' }, { name: 'Rejected' }, { name: 'Changes Requested' }] } },
      { name: 'Comments', type: 'multilineText' },
      { name: 'Approved At', type: 'dateTime' },
    ],
    linkedFields: [
      { name: 'Touchpoint', type: 'multipleRecordLinks', options: { linkedTableId: 'tblTouchpointsId' } },
    ],
  },
  {
    name: 'Templates',
    basicFields: [
      { name: 'GHL Template ID', type: 'singleLineText' },
      { name: 'Template Type', type: 'singleSelect', options: { choices: [{ name: 'Email' }, { name: 'SMS' }] } },
      { name: 'Last Synced', type: 'dateTime' },
      { name: 'Sync Status', type: 'singleSelect', options: { choices: [{ name: 'Synced' }, { name: 'Pending' }, { name: 'Failed' }, { name: 'Modified in GHL' }] } },
    ],
    linkedFields: [
      { name: 'Client', type: 'multipleRecordLinks', options: { linkedTableId: 'tblClientsId' } },
      { name: 'Touchpoint', type: 'multipleRecordLinks', options: { linkedTableId: 'tblTouchpointsId' } },
    ],
  },
  {
    name: 'Sync History',
    basicFields: [
      { name: 'Operation', type: 'singleSelect', options: { choices: [{ name: 'Full Sync' }, { name: 'Template Create' }, { name: 'Template Update' }, { name: 'Template Delete' }] } },
      { name: 'Status', type: 'singleSelect', options: { choices: [{ name: 'Success' }, { name: 'Failed' }, { name: 'Partial' }] } },
      { name: 'Items Synced', type: 'number', options: { precision: 0 } },
      { name: 'Errors', type: 'multilineText' },
      { name: 'Started At', type: 'dateTime' },
      { name: 'Completed At', type: 'dateTime' },
    ],
    linkedFields: [
      { name: 'Client', type: 'multipleRecordLinks', options: { linkedTableId: 'tblClientsId' } },
    ],
  },
];

// Map of table names to IDs
const tableIds = {};

async function createTableWithBasicFields(table) {
  console.log(`Creating table: ${table.name}...`);
  
  try {
    const response = await fetch(`${META_URL}/bases/${BASE_ID}/tables`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: table.name,
        fields: table.basicFields,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error?.type === 'DUPLICATE_TABLE_NAME') {
        console.log(`  ⚠️  Table "${table.name}" already exists`);
        return null;
      }
      throw new Error(JSON.stringify(error));
    }

    const created = await response.json();
    console.log(`  ✅ Created (${created.fields.length} fields)`);
    return created;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function addFieldToTable(tableId, field) {
  try {
    const response = await fetch(`${META_URL}/bases/${BASE_ID}/tables/${tableId}/fields`, {
      method: 'POST',
      headers,
      body: JSON.stringify(field),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`  ❌ Failed to add ${field.name}: ${error.error?.message || error.message}`);
      return false;
    }

    console.log(`  ✅ Added field: ${field.name}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error adding ${field.name}: ${error.message}`);
    return false;
  }
}

async function getExistingTableId(name) {
  // Check if table already exists
  const response = await fetch(`${META_URL}/bases/${BASE_ID}/tables`, { headers });
  if (response.ok) {
    const data = await response.json();
    const existing = data.tables.find(t => t.name === name);
    if (existing) {
      return existing.id;
    }
  }
  return null;
}

async function runPass1() {
  console.log('\n📋 PASS 1: Creating tables with basic fields\n');
  console.log('='.repeat(50));

  for (const table of tables) {
    // Check if table already exists
    const existingId = await getExistingTableId(table.name);
    if (existingId) {
      console.log(`⏭  "${table.name}" already exists (ID: ${existingId})`);
      tableIds[table.name] = existingId;
      continue;
    }

    const created = await createTableWithBasicFields(table);
    if (created) {
      tableIds[table.name] = created.id;
    }
    
    // Small delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Table IDs captured:');
  Object.entries(tableIds).forEach(([name, id]) => {
    console.log(`   ${name}: ${id}`);
  });
}

async function runPass2() {
  console.log('\n📋 PASS 2: Adding select and linked fields\n');
  console.log('='.repeat(50));

  for (const table of tables) {
    if (!table.linkedFields || table.linkedFields.length === 0) {
      console.log(`⏭  "${table.name}" - no linked fields to add`);
      continue;
    }

    const tableId = tableIds[table.name];
    if (!tableId) {
      console.log(`❌ "${table.name}" - ID not found`);
      continue;
    }

    console.log(`\nAdding fields to "${table.name}":`);

    for (const field of table.linkedFields) {
      // Replace placeholder IDs with actual IDs
      let fieldDef = { ...field };
      if (fieldDef.options?.linkedTableId?.startsWith('tbl')) {
        const targetName = fieldDef.options.linkedTableId.replace('tbl', '').replace('Id', '');
        const targetId = tableIds[targetName + 's'] || tableIds[targetName]; // Handle pluralization
        if (targetId) {
          fieldDef.options.linkedTableId = targetId;
          await addFieldToTable(tableId, fieldDef);
        } else {
          console.log(`  ⚠️  Cannot link ${field.name} - target table not found`);
        }
      } else {
        await addFieldToTable(tableId, fieldDef);
      }
    }
  }
}

async function main() {
  console.log('🚀 BloomBuilder Two-Pass Setup');
  console.log(`Base ID: ${BASE_ID}\n`);

  await runPass1();
  await runPass2();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Verify linked fields in Airtable UI');
  console.log('2. Add sample journey data');
  console.log('3. Test sync engine');
}

main().catch(console.error);
