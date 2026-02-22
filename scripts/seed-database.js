#!/usr/bin/env node
/**
 * Seed Database Script
 * Imports data from Airtable export and local journey files into PostgreSQL
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Create promise-farm client
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
    console.log(`✅ Client created: ${client.name}\n`);

    // 2. Load journeys from local files
    console.log('Loading journeys from local files...');
    const journeysDir = path.join(__dirname, '..', 'clients', 'promise-farm', 'journeys');
    const journeyFiles = await fs.readdir(journeysDir);
    
    for (const file of journeyFiles) {
      if (file.startsWith('journey_') && file.endsWith('.json')) {
        const journeyData = JSON.parse(
          await fs.readFile(path.join(journeysDir, file), 'utf-8')
        );

        // Create journey
        const journey = await prisma.journey.upsert({
          where: { id: journeyData.id },
          update: {},
          create: {
            id: journeyData.id,
            name: journeyData.name,
            description: journeyData.description || '',
            status: journeyData.status?.toLowerCase() || 'draft',
            clientId: client.id,
            category: journeyData.category || 'nurture',
            version: 1
          }
        });
        console.log(`✅ Journey: ${journey.name}`);

        // Create touchpoints
        if (journeyData.touchpoints && journeyData.touchpoints.length > 0) {
          for (const tp of journeyData.touchpoints) {
            await prisma.touchpoint.upsert({
              where: { id: tp.id },
              update: {},
              create: {
                id: tp.id,
                name: tp.name,
                type: tp.type?.toLowerCase() || 'email',
                journeyId: journey.id,
                orderIndex: tp.order || 0,
                status: 'draft',
                content: tp.content || {},
                config: {
                  delay: tp.delay || 0,
                  delayUnit: tp.delayUnit || 'hours'
                }
              }
            });
          }
          console.log(`  └─ ${journeyData.touchpoints.length} touchpoints`);
        }
      }
    }

    console.log('\n✨ Seed completed successfully!');
    
    // Summary
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
