#!/usr/bin/env node

/**
 * Cameron Estate Email Factory - Build Script
 *
 * Reads content configs, compiles MJML templates, and pushes to GHL API
 *
 * Usage:
 *   node src/build.js                    # Build all emails
 *   node src/build.js --dry-run          # Build without pushing
 *   node src/build.js --email day1_welcome  # Build specific email
 *   node src/build.js --push             # Push to GHL after build
 *   node src/build.js --all              # Build all emails
 */

import dotenv from 'dotenv';
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { buildEmail } from './services/mjml-compiler.js';
import { loadLinkMap, replaceLinks, validateLinks } from './utils/link-replacer.js';
import { applyCompliance, validateContent } from './utils/content-compliance.js';
import ghlPublisher from './services/ghl-publisher.js';
import { emailConfigs } from './emails-config.js';
import publishState from './utils/publish-state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Generate gallery MJML based on layout type
 */
function generateGallery(config) {
  const { images, layout } = config;

  if (!images || images.length === 0 || layout === 'none') {
    return '';
  }

  // Layout: 1-2-1 (Hero full-width + 2 side-by-side + Closer full-width)
  if (layout === '1-2-1' && images.length >= 4) {
    return `
      <mj-section padding="0">
        <mj-column>
          <mj-image
            src="${images[0].src}"
            alt="${images[0].alt}"
            width="600px"
            border-radius="4px 4px 0 0"
            padding="0" />
        </mj-column>
      </mj-section>

      <mj-section padding="4px 0" background-color="#FAFAFA">
        <mj-column>
          <mj-image
            src="${images[1].src}"
            alt="${images[1].alt}"
            width="290px"
            border-radius="0"
            padding="0 2px 0 0" />
        </mj-column>
        <mj-column>
          <mj-image
            src="${images[2].src}"
            alt="${images[2].alt}"
            width="290px"
            border-radius="0"
            padding="0 0 0 2px" />
        </mj-column>
      </mj-section>

      <mj-section padding="0">
        <mj-column>
          <mj-image
            src="${images[3].src}"
            alt="${images[3].alt}"
            width="600px"
            border-radius="0 0 4px 4px"
            padding="0" />
        </mj-column>
      </mj-section>
    `;
  }

  // Layout: single image (full width)
  if (layout === 'single' && images.length >= 1) {
    return `
      <mj-section padding="0">
        <mj-column>
          <mj-image
            src="${images[0].src}"
            alt="${images[0].alt}"
            width="600px"
            border-radius="4px"
            padding="0" />
        </mj-column>
      </mj-section>
    `;
  }

  // Default: show available images in a row
  const imageTags = images.map(img => `
    <mj-column>
      <mj-image
        src="${img.src}"
        alt="${img.alt}"
        width="${img.fullWidth ? '600px' : '290px'}"
        border-radius="4px"
        padding="5px" />
    </mj-column>
  `).join('');

  return `
    <mj-section padding="0">
      ${imageTags}
    </mj-section>
  `;
}

/**
 * Process content through compliance and link replacement pipeline
 */
function processContent(content, linkMap) {
  // Apply content compliance
  const { content: compliantContent, appliedRules } = applyCompliance(content);

  // Validate content
  const validation = validateContent(compliantContent);
  if (!validation.valid) {
    throw new Error(`Content violations: ${validation.violations.join(', ')}`);
  }

  // Replace link references
  const { content: finalContent, missingLinks } = replaceLinks(compliantContent, linkMap);
  if (missingLinks.length > 0) {
    throw new Error(`Failed to resolve links: ${missingLinks.join(', ')}`);
  }

  return { content: finalContent, appliedRules };
}

/**
 * Process a single email through the pipeline
 */
async function processEmail(emailId, options = {}) {
  const config = emailConfigs[emailId];

  if (!config) {
    console.error(`Email config not found: ${emailId}`);
    return null;
  }

  console.log(`\n📧 Processing: ${config.name}`);
  console.log(`   Subject: ${config.subject}`);
  console.log(`   Preview: ${config.previewText || '(none)'}`);
  console.log(`   Category: ${config.category}`);

  try {
    // Step 1: Load link map
    const linkMap = loadLinkMap();
    console.log(`   ✓ Loaded ${Object.keys(linkMap).length} links`);

    // Step 2: Validate links in all content sections
    const allContent = (config.openingContent || '') + (config.content || '');
    const linkValidation = validateLinks(allContent, linkMap);
    if (!linkValidation.valid) {
      throw new Error(`Missing links: ${linkValidation.missingLinks.join(', ')}`);
    }
    console.log(`   ✓ All links validated`);

    // Step 3-5: Process opening content and body content through compliance + links
    let finalOpeningContent = '';
    let finalContent = '';
    let totalAppliedRules = [];

    if (config.openingContent) {
      const openingResult = processContent(config.openingContent, linkMap);
      finalOpeningContent = openingResult.content;
      totalAppliedRules.push(...openingResult.appliedRules);
    }

    if (config.content) {
      const contentResult = processContent(config.content, linkMap);
      finalContent = contentResult.content;
      totalAppliedRules.push(...contentResult.appliedRules);
    }

    if (totalAppliedRules.length > 0) {
      console.log(`   ✓ Applied ${totalAppliedRules.length} compliance rule(s)`);
      totalAppliedRules.forEach(rule => {
        console.log(`     - ${rule.description}`);
      });
    }
    console.log(`   ✓ Content validated`);

    // Step 6: Generate gallery
    const galleryMJML = generateGallery(config.gallery || { images: [], layout: 'none' });
    console.log(`   ✓ Gallery generated (${config.gallery?.layout || 'none'} layout)`);

    // Step 7: Build email
    const buildResult = buildEmail({
      openingContent: finalOpeningContent,
      content: finalContent,
      gallery: galleryMJML,
      variables: {
        previewText: config.previewText
      }
    });

    if (!buildResult.success) {
      throw new Error(`MJML compilation failed: ${buildResult.error}`);
    }
    console.log(`   ✓ MJML compiled to HTML`);

    // Step 8: Output files
    const outputDir = path.join(__dirname, '../../output/compiled-emails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const emailOutputDir = path.join(outputDir, emailId);
    if (!fs.existsSync(emailOutputDir)) {
      fs.mkdirSync(emailOutputDir, { recursive: true });
    }

    // Save HTML
    const htmlPath = path.join(emailOutputDir, `${emailId}.html`);
    console.log(`   Detailed HTML Path: ${htmlPath}`);
    console.log(`   HTML Preview (first 100 chars): ${buildResult.html.substring(0, 100)}...`);

    // Prepend Subject and Preview Text for easy manual copying
    const finalHtml = `<!--
Subject: ${config.subject}
Preview Text: ${config.previewText || ''}
-->
${buildResult.html}`;

    fs.writeFileSync(
      htmlPath,
      finalHtml
    );
    console.log(`   ✓ Saved HTML to output/${emailId}/${emailId}.html`);

    // Save MJML
    fs.writeFileSync(
      path.join(emailOutputDir, `${emailId}.mjml`),
      buildResult.mjml
    );

    return {
      success: true,
      name: config.name,
      subject: config.subject,
      category: config.category,
      html: buildResult.html,
      htmlPath: path.join(emailOutputDir, `${emailId}.html`),
      mjmlPath: path.join(emailOutputDir, `${emailId}.mjml`)
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
 * Main build function
 */
async function main() {
  const program = new Command();

  program
    .name('email-factory-build')
    .description('Build Cameron Estate emails with MJML')
    .option('--dry-run', 'Build without pushing to GHL', false)
    .option('--email <name>', 'Build specific email')
    .option('--push', 'Push compiled emails to GHL')
    .option('--force', 'Force push even if content is unchanged')
    .option('--all', 'Build all emails')
    .option('--category <name>', 'Build emails by category (welcome, education, social_proof, emotional, inspiration, value, objection_handling, close)');

  program.parse();
  const options = program.opts();
  const shouldPush = options.push || process.env.PUSH_TO_GHL === 'true';
  const forcePush = options.force || false;

  console.log('🏗️  Cameron Estate Email Factory');
  console.log('================================\n');

  // Connect to GHL if pushing
  if (shouldPush && !options.dryRun) {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
      console.error('❌ GHL_API_KEY and GHL_LOCATION_ID required for push');
      process.exit(1);
    }

    ghlPublisher.connect(apiKey, locationId);
    console.log('✓ Connected to GoHighLevel\n');
  }

  // Determine which emails to build
  let emailsToBuild = [];

  if (options.email) {
    emailsToBuild.push(options.email);
  } else if (options.category) {
    emailsToBuild = Object.keys(emailConfigs).filter(id =>
      emailConfigs[id].category === options.category
    );
    console.log(`📂 Building emails in category: ${options.category}\n`);
  } else if (options.all) {
    emailsToBuild.push(...Object.keys(emailConfigs));
  } else {
    // Default: build all
    emailsToBuild.push(...Object.keys(emailConfigs));
  }

  // Build each email
  const results = [];
  const categoryGroups = {};

  for (const emailId of emailsToBuild) {
    const result = await processEmail(emailId, options);
    if (result) {
      results.push(result);

      // Group by category
      const config = emailConfigs[emailId];
      if (!categoryGroups[config.category]) {
        categoryGroups[config.category] = [];
      }
      categoryGroups[config.category].push(result.name);

      // Push to GHL if requested
      if (shouldPush && !options.dryRun && result.success) {
        
        // Check if content changed
        const hasChanged = publishState.shouldPublish(emailId, result.html);
        
        if (hasChanged || forcePush) {
          // Get existing GHL ID if available
          const existingId = publishState.getGhlId(emailId);
          
          console.log(`   📤 Pushing to GHL...${forcePush ? ' (forced)' : ''}`);
          const pushResult = await ghlPublisher.pushEmail({
            id: existingId,
            name: result.name,
            subject: result.subject,
            previewText: config.previewText,
            html: result.html
          });

          if (pushResult.success) {
            console.log(`   ✓ Pushed to GHL (${pushResult.action}, template ID: ${pushResult.templateId})`);
            publishState.updateState(emailId, result.html, 'email', result.name, pushResult.templateId);
          } else {
            console.error(`   ✗ GHL push failed: ${pushResult.error}`);
          }
        } else {
          console.log(`   ⏭️  Skipping push (content unchanged)`);
        }
      }
    }
  }

  // Summary
  console.log('\n================================');
  console.log('📊 Build Summary');
  console.log('================================');
  console.log(`Total emails: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);

  if (results.filter(r => !r.success).length > 0) {
    console.log('\nFailed emails:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n✨ Build complete!');
}

// Run if called directly
main().catch(console.error);

export { processEmail, main, emailConfigs, generateGallery };
