#!/usr/bin/env node

/**
 * Export compiled HTML for manual copy/paste into GHL
 * Outputs organized file paths and content summaries
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../../output/compiled-emails');

function main() {
  console.log('📧 Compiled Email Templates for Manual GHL Upload');
  console.log('=================================================\n');
  
  const emailDirs = fs.readdirSync(OUTPUT_DIR)
    .filter(dir => dir.startsWith('001_e_'))
    .sort();
  
  for (const dir of emailDirs) {
    const htmlPath = path.join(OUTPUT_DIR, dir, `${dir}.html`);
    
    if (!fs.existsSync(htmlPath)) {
      console.log(`⚠️  Missing: ${dir}`);
      continue;
    }
    
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const fileSize = (html.length / 1024).toFixed(1);
    
    // Extract subject from HTML comments or title
    let subject = 'N/A';
    const commentMatch = html.match(/Subject: ([^\n]+)/);
    if (commentMatch) {
      subject = commentMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) subject = titleMatch[1];
    }
    
    console.log(`\n📄 ${dir}`);
    console.log(`   File: ${htmlPath}`);
    console.log(`   Size: ${fileSize} KB`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Lines: ${html.split('\n').length}`);
  }
  
  console.log('\n\n=================================================');
  console.log('To copy HTML content:');
  console.log('1. Open each .html file above');
  console.log('2. Select all (Cmd+A) and copy (Cmd+C)');
  console.log('3. In GHL: Settings > Email Builder > Templates');
  console.log('4. Create new template, switch to HTML editor');
  console.log('5. Paste the HTML content');
  console.log('=================================================\n');
}

main();
