/**
 * Seed script for default field mappings
 * Creates standard field mappings for testing and demo purposes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default standard field mappings for wedding venue clients
const DEFAULT_FIELD_MAPPINGS = [
  // Contact fields
  {
    sourceField: 'firstName',
    sourceFieldType: 'TEXT',
    targetField: 'first_name',
    targetFieldType: 'TEXT',
    targetSystem: 'gohighlevel',
    description: 'Contact first name',
    isRequired: true,
    isActive: true
  },
  {
    sourceField: 'lastName',
    sourceFieldType: 'TEXT',
    targetField: 'last_name',
    targetFieldType: 'TEXT',
    targetSystem: 'gohighlevel',
    description: 'Contact last name',
    isRequired: true,
    isActive: true
  },
  {
    sourceField: 'email',
    sourceFieldType: 'EMAIL',
    targetField: 'email',
    targetFieldType: 'EMAIL',
    targetSystem: 'gohighlevel',
    description: 'Contact email address',
    isRequired: true,
    validationRule: 'email',
    isActive: true
  },
  {
    sourceField: 'phone',
    sourceFieldType: 'PHONE',
    targetField: 'phone',
    targetFieldType: 'PHONE',
    targetSystem: 'gohighlevel',
    description: 'Contact phone number',
    transformationRule: 'phone_format',
    validationRule: 'phone',
    isActive: true
  },
  // Event fields
  {
    sourceField: 'weddingDate',
    sourceFieldType: 'DATE',
    targetField: 'wedding_date',
    targetFieldType: 'DATE',
    targetSystem: 'gohighlevel',
    description: 'Wedding/event date',
    isActive: true
  },
  {
    sourceField: 'eventType',
    sourceFieldType: 'DROPDOWN',
    targetField: 'event_type',
    targetFieldType: 'DROPDOWN',
    targetSystem: 'gohighlevel',
    description: 'Type of event',
    isActive: true
  },
  {
    sourceField: 'guestCount',
    sourceFieldType: 'NUMBER',
    targetField: 'guest_count',
    targetFieldType: 'NUMBER',
    targetSystem: 'gohighlevel',
    description: 'Expected number of guests',
    isActive: true
  },
  {
    sourceField: 'budget',
    sourceFieldType: 'CURRENCY',
    targetField: 'budget',
    targetFieldType: 'CURRENCY',
    targetSystem: 'gohighlevel',
    description: 'Event budget',
    transformationRule: 'currency_format',
    isActive: true
  },
  // Venue fields
  {
    sourceField: 'venueName',
    sourceFieldType: 'TEXT',
    targetField: 'venue_name',
    targetFieldType: 'TEXT',
    targetSystem: 'gohighlevel',
    description: 'Selected or preferred venue',
    isActive: true
  },
  {
    sourceField: 'venueSelectionStatus',
    sourceFieldType: 'DROPDOWN',
    targetField: 'venue_status',
    targetFieldType: 'DROPDOWN',
    targetSystem: 'gohighlevel',
    description: 'Current venue selection status',
    isActive: true
  },
  {
    sourceField: 'ceremonyTime',
    sourceFieldType: 'TEXT',
    targetField: 'ceremony_time',
    targetFieldType: 'TEXT',
    targetSystem: 'gohighlevel',
    description: 'Preferred ceremony time',
    isActive: true
  },
  // Contract fields
  {
    sourceField: 'contractValue',
    sourceFieldType: 'CURRENCY',
    targetField: 'contract_value',
    targetFieldType: 'CURRENCY',
    targetSystem: 'gohighlevel',
    description: 'Total contract value',
    transformationRule: 'currency_format',
    isActive: true
  },
  // Marketing fields
  {
    sourceField: 'referralSource',
    sourceFieldType: 'TEXT',
    targetField: 'lead_source',
    targetFieldType: 'TEXT',
    targetSystem: 'gohighlevel',
    description: 'How the lead heard about us',
    isActive: true
  },
  {
    sourceField: 'leadScore',
    sourceFieldType: 'NUMBER',
    targetField: 'lead_score',
    targetFieldType: 'NUMBER',
    targetSystem: 'gohighlevel',
    description: 'Lead qualification score',
    isActive: true
  }
];

async function seedFieldMappings() {
  console.log('🌱 Seeding field mappings...\n');

  try {
    // Get all clients
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, slug: true }
    });

    console.log(`Found ${clients.length} clients`);

    for (const client of clients) {
      console.log(`\nProcessing client: ${client.name} (${client.slug})`);

      // Check if client already has mappings
      const existingCount = await prisma.fieldMapping.count({
        where: { clientId: client.id }
      });

      if (existingCount > 0) {
        console.log(`  ⏭️  Skipping - ${existingCount} mappings already exist`);
        continue;
      }

      // Create default mappings for this client
      const mappings = DEFAULT_FIELD_MAPPINGS.map(mapping => ({
        ...mapping,
        clientId: client.id
      }));

      const result = await prisma.fieldMapping.createMany({
        data: mappings,
        skipDuplicates: true
      });

      console.log(`  ✅ Created ${result.count} field mappings`);
    }

    console.log('\n✨ Field mapping seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding field mappings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFieldMappings();
}

export { seedFieldMappings, DEFAULT_FIELD_MAPPINGS };
