import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectRoot = path.resolve(__dirname, '../../');
const emailConfigPath = path.resolve(projectRoot, 'email-factory/src/emails-config.js');
const smsConfigPath = path.resolve(projectRoot, 'sms/sms-templates.json');
const compiledEmailsDir = path.resolve(projectRoot, 'output/compiled-emails');
const outputPath = path.resolve(__dirname, '../src/data/payload.json');
const outputDir = path.dirname(outputPath);

// Ensure output dir exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateData() {
  try {
    console.log('Reading email config from:', emailConfigPath);
    // Import email config dynamically
    const emailModule = await import(emailConfigPath);
    const emailConfigs = emailModule.emailConfigs;

    // Enhance email configs with compiled HTML
    for (const [key, config] of Object.entries(emailConfigs)) {
      const htmlPath = path.join(compiledEmailsDir, key, `${key}.html`);
      if (fs.existsSync(htmlPath)) {
        console.log(`Reading compiled HTML for ${key}`);
        const html = fs.readFileSync(htmlPath, 'utf-8');
        emailConfigs[key].compiledHtml = html;
      } else {
        console.warn(`Compiled HTML not found for ${key} at ${htmlPath}`);
        emailConfigs[key].compiledHtml = null;
      }
    }

    console.log('Reading SMS config from:', smsConfigPath);
    // Read SMS config
    let smsConfigs = [];
    if (fs.existsSync(smsConfigPath)) {
      smsConfigs = JSON.parse(fs.readFileSync(smsConfigPath, 'utf-8'));
    } else {
      console.warn('SMS config not found, using empty array');
    }

    // Combine
    const payload = {
      emails: emailConfigs,
      sms: smsConfigs,
      generatedAt: new Date().toISOString()
    };

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
    console.log(`Data generated successfully at ${outputPath}`);

  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

generateData();
