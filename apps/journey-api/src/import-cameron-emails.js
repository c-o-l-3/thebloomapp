#!/usr/bin/env node
/**
 * Import Cameron Estate Unlayer email designs into the database via the live API.
 *
 * For each of the 8 email JSONs in clients/cameron-estate/email-generation/emails/,
 * this script finds the matching touchpoint by orderIndex, then updates it with:
 *   - content.unlayerDesign  — the Unlayer JSON (source of truth for the visual editor)
 *   - content.subject        — confirmed subject line
 *   - content.previewText    — preheader text
 *   - content.body           — left empty; compile by opening in the visual editor and clicking Save
 *
 * Usage:
 *   node src/import-cameron-emails.js                          # uses production API
 *   API_URL=http://localhost:3001/api node src/import-cameron-emails.js  # local API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.API_URL || 'https://bloom-backend.zeabur.app/api';
const EMAIL = process.env.BLOOM_EMAIL || 'cole@bloom.com';
const NAME  = process.env.BLOOM_NAME  || 'Cole';

// Path to the email-generation folder relative to this script
const EMAIL_DIR = resolve(__dirname, '../../../clients/cameron-estate/email-generation/emails');

/**
 * Mapping: each entry ties a JSON file to the touchpoint orderIndex it belongs to,
 * along with the definitive subject and preview (preheader) text.
 *
 * orderIndex values match those set in seed-cameron-estate.js.
 */
const EMAIL_MAP = [
  {
    file: '01-welcome-email.json',
    orderIndex: 1,
    subject: 'Welcome to Cameron Estate Inn',
    previewText: 'Your wedding journey starts here — take a look inside.',
  },
  {
    file: '02-what-to-look-for.json',
    orderIndex: 4,
    subject: 'What to Look For When Touring a Venue',
    previewText: 'The 5 things most couples miss — and how to spot the perfect fit.',
  },
  {
    file: '03-real-stories.json',
    orderIndex: 5,
    subject: 'What Couples Are Saying About Cameron Estate',
    previewText: 'Real stories from couples who said "I do" here.',
  },
  {
    file: '04-vision.json',
    orderIndex: 8,
    subject: "Your Wedding Vision — Let's Make It Real",
    previewText: 'The details that turn a beautiful day into an unforgettable one.',
  },
  {
    file: '05-pinterest.json',
    orderIndex: 9,
    subject: 'Pinterest vs. Reality: What Actually Works',
    previewText: 'The gap between inspiration boards and the real day — and how we bridge it.',
  },
  {
    file: '06-inclusions.json',
    orderIndex: 11,
    subject: 'Everything Included — No Surprises',
    previewText: "Here's exactly what comes with your venue rental.",
  },
  {
    file: '07-faq.json',
    orderIndex: 13,
    subject: 'Your Questions, Answered',
    previewText: 'The most common questions we get — with honest answers.',
  },
  {
    file: '08-last-chance.json',
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

    // Read and parse the Unlayer design JSON
    const filePath = resolve(EMAIL_DIR, entry.file);
    let design;
    try {
      design = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`  ERROR reading ${entry.file}: ${err.message}`);
      skipped++;
      continue;
    }

    // Merge new fields into existing content — preserve anything we're not touching
    const updatedContent = {
      ...(tp.content || {}),
      subject: entry.subject,
      previewText: entry.previewText,
      unlayerDesign: design,
      // body left as-is (empty until compiled in the visual editor)
    };

    await apiFetch(`/touchpoints/${tp.id}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({ content: updatedContent }),
    });

    console.log(`  OK    [${entry.orderIndex}] ${tp.name}`);
    console.log(`        Subject:  ${entry.subject}`);
    console.log(`        Preview:  ${entry.previewText}`);
    updated++;
  }

  console.log(`\n${updated} updated, ${skipped} skipped.\n`);
  console.log('Next step:');
  console.log('  Open each email in the visual editor (Touchpoints -> Edit Visually)');
  console.log('  and click Save to compile the HTML body for client review previews.');
  console.log(`\n  Review URL: https://bloom-frontend.zeabur.app/journeys/${journey.id}/client-review\n`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
