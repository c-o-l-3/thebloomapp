import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectRoot = path.resolve(__dirname, '../../');
const compiledDir = path.resolve(projectRoot, 'output/compiled-emails');
const outputDir = path.resolve(projectRoot, 'output/client-review-export');

// Synthetic Data
const syntheticData = {
  '{{contact.first_name}}': 'Jane',
  '{{first_name}}': 'Jane', // Fallback for older templates
  '{{contact.last_name}}': 'Doe',
  '{{contact.email}}': 'jane.doe@example.com',
  '{{user.name}}': 'Lisa', // Sender name often used
  '{{location.name}}': 'Cameron Estate Inn',
  // Links - replace with dead links or specific landing pages if known
  '{{links.book_tour}}': 'https://cameronestateinn.com/tour',
  '{{links.view_pricing}}': 'https://cameronestateinn.com/pricing',
  '{{links.calendar}}': 'https://cameronestateinn.com/calendar',
  '{{trigger_link.kI4aVPLShqovAveOSkbk}}': 'https://pinterest.com/cameronestateinn', // Pinterest
};

// Ensure output dir
if (fs.existsSync(outputDir)) {
  // Optional: Clear directory? For now, we'll just overwrite.
} else {
  fs.mkdirSync(outputDir, { recursive: true });
}

function replaceVariables(html) {
  let processed = html;
  
  // Replace specific keys
  for (const [key, value] of Object.entries(syntheticData)) {
    // Escape special regex chars in key if any (simple approach for now)
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    processed = processed.replace(regex, value);
  }
  
  // Generic fallback for any other {{...}} tags to make them visible but not broken
  // processed = processed.replace(/\{\{.*?\}\}/g, '[VARIABLE]'); 
  // Actually, keeping them might be better if we missed some, but user asked for real info.
  // Let's replace common remaining ones with generic text
  processed = processed.replace(/\{\{links\.[^}]+\}\}/g, '#');
  processed = processed.replace(/\{\{contact\.[^}]+\}\}/g, '[Client Info]');
  
  return processed;
}

function injectHeader(html, subject, previewText) {
  // We want to inject a visible header at the top of the body
  // Find the opening <body> tag
  const headerHtml = `
    <div style="background-color: #f0f0f0; border-bottom: 2px solid #ccc; padding: 20px; font-family: sans-serif; color: #333; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin: 0;"><strong>Preview Text:</strong> ${previewText}</p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;"><em>(This header is for review purposes only and will not appear in the final email)</em></p>
    </div>
  `;

  // Try to insert after <body> if present, otherwise prepend
  if (html.includes('<body')) {
    return html.replace(/<body[^>]*>/, (match) => `${match}${headerHtml}`);
  } else {
    // Fallback for partials or if body tag missing (unlikely in MJML output)
    return headerHtml + html;
  }
}

function createEml(html, subject) {
  const boundary = `----=_Part_${Date.now().toString(16)}`;
  const date = new Date().toUTCString();
  
  return `From: "Lisa at Cameron Estate" <lisa@cameronestateinn.com>
To: "Jane Doe" <jane.doe@example.com>
Subject: ${subject}
Date: ${date}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="${boundary}"

--${boundary}
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 7bit

[This email contains HTML content. Please view it in an email client that supports HTML.]

--${boundary}
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: 7bit

${html}

--${boundary}--`;
}

async function main() {
  console.log('Generating Client Review Export (.eml files)...');
  
  // Read directories
  const dirs = fs.readdirSync(compiledDir)
    .filter(d => fs.statSync(path.join(compiledDir, d)).isDirectory())
    .filter(d => d.startsWith('001_e_')); // Only process official templates
  
  for (const dir of dirs) {
    // Look for the HTML file inside
    const htmlPath = path.join(compiledDir, dir, `${dir}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    
    let html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Extract Metadata from comments (Standard we set: Subject and Preview Text)
    // Format: <!-- Subject: ... -->
    const subjectMatch = html.match(/Subject: (.*?)\n/);
    const previewMatch = html.match(/Preview Text: (.*?)\n/);
    
    let subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
    let previewText = previewMatch ? previewMatch[1].trim() : 'No Preview Text';
    
    // 1. Replace Variables in HTML, Subject, and Preview Text
    html = replaceVariables(html);
    subject = replaceVariables(subject);
    previewText = replaceVariables(previewText);
    
    // 2. Inject Review Header (Optional but good for context)
    // We keep this because "Preview Text" isn't always obvious in all clients
    const htmlWithHeader = injectHeader(html, subject, previewText);
    
    // 3. Generate .eml content
    const emlContent = createEml(htmlWithHeader, subject);
    
    // 4. Save to output
    const outputFilename = `${dir}.eml`;
    fs.writeFileSync(path.join(outputDir, outputFilename), emlContent);
    
    console.log(`✅ Generated: ${outputFilename}`);
  }
  
  console.log(`\n🎉 All .eml files generated in: ${outputDir}`);
}

main();
