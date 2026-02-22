#!/usr/bin/env node
/**
 * Print Journeys for Review
 * 
 * Usage: node scripts/print-journeys.js [client-name]
 * Example: node scripts/print-journeys.js promise-farm
 */

const fs = require('fs');
const path = require('path');

const clientName = process.argv[2] || 'promise-farm';
const journeysDir = path.join(__dirname, '..', 'clients', clientName, 'journeys');

if (!fs.existsSync(journeysDir)) {
  console.error(`❌ No journeys found for client: ${clientName}`);
  console.log(`\nAvailable clients with journeys:`);
  const clientsDir = path.join(__dirname, '..', 'clients');
  fs.readdirSync(clientsDir).forEach(client => {
    const jDir = path.join(clientsDir, client, 'journeys');
    if (fs.existsSync(jDir)) {
      const count = fs.readdirSync(jDir).filter(f => f.endsWith('.json')).length;
      console.log(`  - ${client} (${count} journeys)`);
    }
  });
  process.exit(1);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`🌸 JOURNEYS FOR: ${clientName.toUpperCase()}`);
console.log(`${'='.repeat(80)}\n`);

const journeyFiles = fs.readdirSync(journeysDir).filter(f => f.endsWith('.json'));

journeyFiles.forEach((file, index) => {
  const filePath = path.join(journeysDir, file);
  const journey = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`${'-'.repeat(80)}`);
  console.log(`📧 JOURNEY ${index + 1}: ${journey.name}`);
  console.log(`${'-'.repeat(80)}`);
  console.log(`   ID:          ${journey.id}`);
  console.log(`   Category:    ${journey.category || 'N/A'}`);
  console.log(`   Status:      ${journey.status || 'N/A'}`);
  console.log(`   Goal:        ${journey.goal || 'N/A'}`);
  console.log(`   Touchpoints: ${journey.touchpoints?.length || 0}`);
  console.log(`   Trigger:     ${JSON.stringify(journey.trigger) || 'N/A'}`);
  console.log(`   Description: ${journey.description || 'N/A'}`);
  
  if (journey.touchpoints && journey.touchpoints.length > 0) {
    console.log(`\n   📬 TOUCHPOINTS:`);
    journey.touchpoints.forEach((tp, tpIndex) => {
      const delay = tp.delay !== undefined ? `${tp.delay} ${tp.delayUnit || 'days'}` : 'immediate';
      const trigger = tp.trigger || 'after_previous';
      console.log(`      ${tpIndex + 1}. [${tp.type}] "${tp.name}" (${delay}) - ${trigger}`);
      if (tp.content?.subject) {
        console.log(`         Subject: "${tp.content.subject}"`);
      }
      if (tp.content?.cta?.text) {
        console.log(`         CTA: ${tp.content.cta.text} → ${tp.content.cta.url}`);
      }
    });
  }
  
  console.log('');
});

console.log(`${'='.repeat(80)}`);
console.log(`✅ Found ${journeyFiles.length} journey(s) for ${clientName}`);
console.log(`${'='.repeat(80)}\n`);
