#!/usr/bin/env node
/**
 * Seed Cameron Estate into the database.
 * Creates the client, one journey, and 16 touchpoint stubs.
 *
 * Run: node src/seed-cameron-estate.js
 * (from apps/journey-api/)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const touchpointDefs = [
  { order: 1,  day: 0,  name: 'Day 0 – Welcome Email',        type: 'email', subject: 'Welcome to Cameron Estate Inn' },
  { order: 2,  day: 0,  name: 'Day 0 – Initial Text',          type: 'sms',   subject: null },
  { order: 3,  day: 1,  name: 'Day 1 – Morning Text',          type: 'sms',   subject: null },
  { order: 4,  day: 1,  name: 'Day 1 – Afternoon Email',       type: 'email', subject: 'What to Look For When Touring a Venue' },
  { order: 5,  day: 2,  name: 'Day 2 – Morning Email',         type: 'email', subject: 'What Couples Are Saying About Cameron Estate' },
  { order: 6,  day: 2,  name: 'Day 2 – Evening Text',          type: 'sms',   subject: null },
  { order: 7,  day: 3,  name: 'Day 3 – Text',                  type: 'sms',   subject: null },
  { order: 8,  day: 4,  name: 'Day 4 – Email',                 type: 'email', subject: 'The Moments That Matter Most' },
  { order: 9,  day: 6,  name: 'Day 6 – Email',                 type: 'email', subject: 'A Little Pinterest Inspiration' },
  { order: 10, day: 7,  name: 'Day 7 – Text',                  type: 'sms',   subject: null },
  { order: 11, day: 9,  name: 'Day 9 – Email',                 type: 'email', subject: 'All-Inclusive Breakdown' },
  { order: 12, day: 10, name: 'Day 10 – Text',                 type: 'sms',   subject: null },
  { order: 13, day: 11, name: 'Day 11 – Email (FAQ)',          type: 'email', subject: 'Your Questions Answered' },
  { order: 14, day: 12, name: 'Day 12 – Text',                 type: 'sms',   subject: null },
  { order: 15, day: 12, name: 'Day 12 – Email (Detailed FAQ)', type: 'email', subject: 'More Answers, More Confidence' },
  { order: 16, day: 14, name: 'Day 14 – Warm Close Email',     type: 'email', subject: 'Still Thinking It Over?' },
];

async function seed() {
  console.log('🌱 Seeding Cameron Estate...\n');

  // 1. Upsert client
  const client = await prisma.client.upsert({
    where: { slug: 'cameron-estate' },
    update: { name: 'Cameron Estate Inn' },
    create: {
      slug: 'cameron-estate',
      name: 'Cameron Estate Inn',
      industry: 'Wedding Venue',
      website: 'https://cameronestateinn.com',
      status: 'active',
      settings: {},
      config: {},
    },
  });
  console.log(`✓ Client: ${client.name} (${client.id})`);

  // 2. Find or create journey
  let journey = await prisma.journey.findFirst({
    where: { clientId: client.id, name: 'New Lead Nurture – 14 Day' },
  });

  if (!journey) {
    journey = await prisma.journey.create({
      data: {
        clientId: client.id,
        name: 'New Lead Nurture – 14 Day',
        description: '16-touchpoint nurture sequence for new leads (10 emails + 6 SMS over 14 days)',
        category: 'nurture',
        status: 'draft',
      },
    });
    console.log(`✓ Journey created: ${journey.id}`);
  } else {
    console.log(`✓ Journey found:   ${journey.id}`);
  }

  // 3. Create touchpoint stubs (skip if already exist for this journey)
  const existing = await prisma.touchpoint.findMany({
    where: { journeyId: journey.id },
    select: { orderIndex: true },
  });
  const existingOrders = new Set(existing.map((t) => t.orderIndex));

  let created = 0;
  for (const def of touchpointDefs) {
    if (existingOrders.has(def.order)) continue;

    await prisma.touchpoint.create({
      data: {
        journeyId: journey.id,
        name: def.name,
        type: def.type,
        orderIndex: def.order,
        status: 'draft',
        content: {
          type: def.type,
          ...(def.subject ? { subject: def.subject } : {}),
          body: '',
        },
        config: { day: def.day },
      },
    });
    created++;
  }

  console.log(`✓ Touchpoints: ${created} created, ${existing.length} already existed`);

  console.log('\n✅ Done!\n');
  console.log('─────────────────────────────────────────');
  console.log(`Journey ID:   ${journey.id}`);
  console.log(`Review URL:   /journeys/${journey.id}/client-review`);
  console.log('─────────────────────────────────────────\n');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
