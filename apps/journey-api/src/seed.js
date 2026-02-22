#!/usr/bin/env node
/**
 * Seed Database Script
 * Imports promise-farm journey data into PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Embedded journey data from clients/promise-farm/journeys/
const journeysData = [
  {
    id: "journey_7e17da7f",
    name: "Post-Booking Welcome",
    description: "3-touchpoint welcome series for booked couples",
    category: "onboarding",
    status: "Draft",
    touchpoints: [
      {
        id: "tp_3bec0f6e",
        name: "Welcome to the Family!",
        type: "Email",
        order: 1,
        delay: 0,
        delayUnit: "hours",
        content: {
          type: "email",
          subject: "🎉 Welcome to the {{company_name}} Family!",
          body: "Congratulations! We're absolutely thrilled that you've chosen {{company_name}} for your wedding day.\n\nYour date is officially reserved:\n📅 {{wedding_date}}\n👥 {{guest_count}} guests\n💍 {{ceremony_type}}\n\nWhat happens next..."
        }
      },
      {
        id: "tp_caed7d1f",
        name: "Planning Timeline - 48h",
        type: "Email",
        order: 2,
        delay: 2,
        delayUnit: "days",
        content: {
          type: "email",
          subject: "Your wedding planning timeline",
          body: "Now that your date is secured, here's what to expect over the coming months..."
        }
      },
      {
        id: "tp_53a32eb4",
        name: "Vendor Recommendations - 1 week",
        type: "Email",
        order: 3,
        delay: 7,
        delayUnit: "days",
        content: {
          type: "email",
          subject: "Our favorite vendor partners",
          body: "Over the years, we've worked with some amazing vendors..."
        }
      }
    ]
  },
  {
    id: "journey_d7cf9a7c",
    name: "Tour Confirmation",
    description: "2-touchpoint tour confirmation sequence",
    category: "confirmation",
    status: "Draft",
    touchpoints: [
      {
        id: "tp_tour_001",
        name: "Tour Confirmed",
        type: "Email",
        order: 1,
        delay: 0,
        delayUnit: "hours",
        content: {
          type: "email",
          subject: "Your tour is confirmed!",
          body: "We're excited to show you around..."
        }
      },
      {
        id: "tp_tour_002",
        name: "Tour Reminder",
        type: "SMS",
        order: 2,
        delay: 24,
        delayUnit: "hours",
        content: {
          type: "sms",
          body: "Hi {{first_name}}! Just confirming your tour tomorrow at {{tour_time}}. See you then!"
        }
      }
    ]
  }
];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Create promise-farm client
    console.log('Creating client: promise-farm...');
    const client = await prisma.client.upsert({
      where: { slug: 'promise-farm' },
      update: {},
      create: {
        id: 'client_promise_farm',
        name: 'Promise Farm',
        slug: 'promise-farm',
        status: 'active'
      }
    });
    console.log(`✅ Client: ${client.name}\n`);

    // Create journeys and touchpoints
    console.log('Creating journeys...');
    for (const journeyData of journeysData) {
      const journey = await prisma.journey.upsert({
        where: { id: journeyData.id },
        update: {},
        create: {
          id: journeyData.id,
          name: journeyData.name,
          description: journeyData.description || '',
          status: journeyData.status.toLowerCase(),
          clientId: client.id,
          category: journeyData.category,
          version: 1
        }
      });
      console.log(`✅ Journey: ${journey.name}`);

      // Create touchpoints
      if (journeyData.touchpoints) {
        for (const tp of journeyData.touchpoints) {
          await prisma.touchpoint.upsert({
            where: { id: tp.id },
            update: {},
            create: {
              id: tp.id,
              name: tp.name,
              type: tp.type.toLowerCase(),
              journeyId: journey.id,
              orderIndex: tp.order,
              status: 'draft',
              content: tp.content,
              config: {
                delay: tp.delay,
                delayUnit: tp.delayUnit
              }
            }
          });
        }
        console.log(`  └─ ${journeyData.touchpoints.length} touchpoints`);
      }
    }

    // Summary
    console.log('\n✨ Seed completed!');
    console.log(`\n📊 Database now contains:`);
    console.log(`   • ${await prisma.client.count()} clients`);
    console.log(`   • ${await prisma.journey.count()} journeys`);
    console.log(`   • ${await prisma.touchpoint.count()} touchpoints`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
