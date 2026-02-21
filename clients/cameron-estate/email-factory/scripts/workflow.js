import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

const steps = [
  {
    key: '1',
    name: 'Import Brand (Configuration)',
    action: async () => {
      console.log('\n--- Step 1: Import Brand ---');
      console.log('Action: Please manually check "src/emails-config.js" and "templates/master-shell.mjml"');
      console.log('Ensure fonts, colors, and logos match the client brand.');
      // Future: Add automated brand config wizard
    }
  },
  {
    key: '2',
    name: 'Review/Select Templates',
    action: async () => {
      console.log('\n--- Step 2: Templates ---');
      console.log('Action: Review "src/emails-config.js" to confirm the journey sequence.');
      // Future: Template selector
    }
  },
  {
    key: '3',
    name: 'Review Assets',
    action: async () => {
      console.log('\n--- Step 3: Assets ---');
      console.log('Action: Check "assetPool" in "src/emails-config.js".');
      console.log('Ensure all image links are valid.');
    }
  },
  {
    key: '4',
    name: 'Build Emails (Compile MJML)',
    action: async () => {
      console.log('\n--- Step 4: Building Emails ---');
      await runScript('src/build.js');
    }
  },
  {
    key: '5',
    name: 'Generate Client Previews (.eml)',
    action: async () => {
      console.log('\n--- Step 5 & 6: Generating Previews ---');
      await runScript('scripts/generate-preview-attachments.js');
    }
  },
  {
    key: '8',
    name: 'Final Export (Push/Sync)',
    action: async () => {
      console.log('\n--- Step 8: Final Export ---');
      console.log('Run "npm run push" to sync with GHL if configured.');
      console.log('Or use HTML files in "output/compiled-emails/"');
    }
  }
];

function runScript(scriptRelativePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(projectRoot, scriptRelativePath);
    console.log(`> Running: node ${scriptRelativePath}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: projectRoot
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error(`Script exited with code ${code}`);
        reject(new Error(`Script failed: ${scriptRelativePath}`));
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🌸 THE BLOOM APP - WORKFLOW CLI 🌸');

  if (command === 'all' || command === 'generate-previews') {
    if (command === 'generate-previews') {
       // Just build and preview
       await steps[3].action(); // Build
       await steps[4].action(); // Preview
    } else {
      // Run all
      for (const step of steps) {
        await step.action();
      }
    }
    return;
  }

  // Interactive-ish menu
  console.log('\nAvailable Steps:');
  steps.forEach(s => console.log(`${s.key}. ${s.name}`));
  console.log('\nUsage:');
  console.log('  npm run workflow all               # Run full sequence');
  console.log('  npm run workflow generate-previews # Build + Generate EMLs');
  
  // Simple default run for now: Build + Preview (Most common)
  console.log('\nDefaulting to: Build + Generate Previews...');
  await steps[3].action();
  await steps[4].action();
}

main().catch(console.error);
