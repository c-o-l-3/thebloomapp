#!/usr/bin/env node
/**
 * Import compiled HTML emails into the database touchpoints
 * 
 * This bypasses Unlayer entirely - we store the pre-compiled HTML
 * and display it directly in the client review
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.API_URL || 'https://bloom-backend.zeabur.app/api';
const EMAIL = process.env.BLOOM_EMAIL || 'cole@bloom.com';
const NAME  = process.env.BLOOM_NAME  || 'Cole';

// Path to compiled HTML files
const HTML_DIR = resolve(__dirname, '../../../clients/cameron-estate/output/compiled-emails');

/**
 * Mapping: email factory IDs to touchpoint order indices
 */
const EMAIL_MAP = [
  {
    file: '001_e_day1_welcome/001_e_day1_welcome.html',
    orderIndex: 1,
    subject: 'Welcome to Cameron Estate Inn',
    previewText: 'Your wedding journey starts here — take a look inside.',
  },
  {
    file: '001_e_day2_what_to_look_for/001_e_day2_what_to_look_for.html',
    orderIndex: 4,
    subject: 'What to Look For When Touring a Venue',
    previewText: 'The 5 things most couples miss — and how to spot the perfect fit.',
  },
  {
    file: '001_e_day3_stories/001_e_day3_stories.html',
    orderIndex: 5,
    subject: 'What Couples Are Saying About Cameron Estate',
    previewText: 'Real stories from couples who said "I do" here.',
  },
  {
    file: '001_e_day5_vision/001_e_day5_vision.html',
    orderIndex: 8,
    subject: "Your Wedding Vision — Let's Make It Real",
    previewText: 'The details that turn a beautiful day into an unforgettable one.',
  },
  {
    file: '001_e_day7_pinterest/001_e_day7_pinterest.html',
    orderIndex: 9,
    subject: 'Pinterest vs. Reality: What Actually Works',
    previewText: 'The gap between inspiration boards and the real day — and how we bridge it.',
  },
  {
    file: '001_e_day10_inclusions/001_e_day10_inclusions.html',
    orderIndex: 11,
    subject: 'Everything Included — No Surprises',
    previewText: "Here's exactly what comes with your venue rental.",
  },
  {
    file: '001_e_day12_faq/001_e_day12_faq.html',
    orderIndex: 13,
    subject: 'Your Questions, Answered',
    previewText: 'The most common questions we get — with honest answers.',
  },
  {
    file: '001_e_day14_close/001_e_day14_close.html',
    orderIndex: 16,
    subject: 'Still Thinking It Over?',
    previewText: "No pressure — but we'd love to host your wedding.",
  },
];

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method || 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`API: ${API_URL}\n`);

  // 1. Authenticate
  console.log(`Authenticating as ${EMAIL}...`);
  const { token } = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, name: NAME }),
  });
  const auth = { Authorization: `Bearer ${token}` };
  console.log('Authenticated.\n');

  // 2. Find Cameron Estate client
  const clients = await apiFetch('/clients', { headers: auth });
  const client = clients.find((c) => c.slug === 'cameron-estate');
  if (!client) {
    console.error('Cameron Estate client not found. Run the seed first.');
    process.exit(1);
  }

  // 3. Find the journey
  const journeys = await apiFetch(`/journeys?clientId=${client.id}`, { headers: auth });
  const journey = journeys[0];
  if (!journey) {
    console.error('No journey found for Cameron Estate. Run seed-cameron-estate.js first.');
    process.exit(1);
  }
  console.log(`Journey: ${journey.name} (${journey.id})\n`);

  // 4. Fetch all touchpoints for this journey
  const touchpoints = await apiFetch(`/touchpoints?journeyId=${journey.id}`, { headers: auth });
  const byOrder = new Map(touchpoints.map((tp) => [tp.orderIndex, tp]));

  let updated = 0;
  let skipped = 0;

  for (const entry of EMAIL_MAP) {
    const tp = byOrder.get(entry.orderIndex);

    if (!tp) {
      console.warn(`  SKIP  orderIndex ${entry.orderIndex} — touchpoint not found`);
      skipped++;
      continue;
    }

    // Read the compiled HTML file
    const filePath = resolve(HTML_DIR, entry.file);
    let html;
    try {
      html = readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`  ERROR reading ${entry.file}: ${err.message}`);
      skipped++;
      continue;
    }

    // Update content with HTML body (this is what client review will display)
    const updatedContent = {
      ...(tp.content || {}),
      subject: entry.subject,
      previewText: entry.previewText,
      body: html,  // Store compiled HTML for client review
      // Keep unlayerDesign if it exists, but we won't use it
    };

    await apiFetch(`/touchpoints/${tp.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ content: updatedContent }),
    });

    console.log(`  OK    [${entry.orderIndex}] ${tp.name}`);
    console.log(`        HTML: ${html.length} chars`);
    updated++;
  }

  console.log(`\n${updated} updated, ${skipped} skipped.\n`);
  console.log('The compiled HTML is now stored in touchpoint.content.body');
  console.log('Client review will display this HTML directly (no Unlayer needed).');
  console.log(`\n  Review URL: https://bloom-frontend.zeabur.app/journeys/${journey.id}/client-review\n`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
