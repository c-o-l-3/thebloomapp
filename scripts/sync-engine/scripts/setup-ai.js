#!/usr/bin/env node

/**
 * AI Provider Setup Script
 * Helps users configure AI providers and validates API keys
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../src/services/ai-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('setup-ai')
  .description('Configure AI providers for the sync engine')
  .version('1.0.0')
  .option('-p, --provider <provider>', 'AI provider (openrouter, openai, google)', 'openrouter')
  .option('-k, --key <key>', 'API key for the provider')
  .option('-m, --model <model>', 'Model name (for OpenRouter)', 'moonshotai/kimi-k2.5')
  .option('--skip-validation', 'Skip API key validation')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset AI configuration');

program.parse();

const options = program.opts();

const ENV_PATH = path.join(__dirname, '..', '.env');

/**
 * Load current .env file
 */
async function loadEnv() {
  try {
    const content = await fs.readFile(ENV_PATH, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    
    return env;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

/**
 * Save .env file
 */
async function saveEnv(env) {
  let content = '# AI Configuration\n';
  content += `# Generated: ${new Date().toISOString()}\n\n`;
  
  // AI Provider
  if (env.AI_PROVIDER) {
    content += `# AI Provider Selection\n`;
    content += `AI_PROVIDER=${env.AI_PROVIDER}\n\n`;
  }
  
  // OpenRouter
  if (env.OPENROUTER_API_KEY) {
    content += `# OpenRouter Configuration\n`;
    content += `OPENROUTER_API_KEY=${env.OPENROUTER_API_KEY}\n`;
    if (env.OPENROUTER_MODEL) {
      content += `OPENROUTER_MODEL=${env.OPENROUTER_MODEL}\n`;
    }
    content += '\n';
  }
  
  // OpenAI
  if (env.OPENAI_API_KEY) {
    content += `# OpenAI Configuration\n`;
    content += `OPENAI_API_KEY=${env.OPENAI_API_KEY}\n\n`;
  }
  
  // Google
  if (env.GOOGLE_API_KEY) {
    content += `# Google Gemini Configuration\n`;
    content += `GOOGLE_API_KEY=${env.GOOGLE_API_KEY}\n\n`;
  }
  
  await fs.writeFile(ENV_PATH, content);
}

/**
 * Update existing .env file with AI configuration
 */
async function updateEnvFile(newConfig) {
  let content;
  
  try {
    content = await fs.readFile(ENV_PATH, 'utf8');
  } catch (error) {
    content = '';
  }
  
  const lines = content.split('\n');
  const updatedLines = [];
  const seenKeys = new Set();
  
  // Update existing lines
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=/);
    if (match) {
      const key = match[1].trim();
      if (newConfig[key] !== undefined) {
        updatedLines.push(`${key}=${newConfig[key]}`);
        seenKeys.add(key);
        continue;
      }
    }
    updatedLines.push(line);
  }
  
  // Add new keys
  for (const [key, value] of Object.entries(newConfig)) {
    if (!seenKeys.has(key)) {
      updatedLines.push(`${key}=${value}`);
    }
  }
  
  await fs.writeFile(ENV_PATH, updatedLines.join('\n'));
}

/**
 * Validate API key
 */
async function validateApiKey(provider, key) {
  console.log(chalk.blue(`\n🔍 Validating ${provider} API key...`));
  
  try {
    // Set the environment variable temporarily
    const envVar = provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 
                   provider === 'openai' ? 'OPENAI_API_KEY' : 'GOOGLE_API_KEY';
    process.env[envVar] = key;
    process.env.AI_PROVIDER = provider;
    
    const ai = new AIProvider();
    const isValid = await ai.validateApiKey();
    
    if (isValid) {
      console.log(chalk.green('✓ API key is valid!'));
      return true;
    } else {
      console.log(chalk.red('✗ API key validation failed'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`✗ Validation error: ${error.message}`));
    return false;
  }
}

/**
 * Show current configuration
 */
async function showConfig() {
  console.log(chalk.blue('\n📋 Current AI Configuration\n'));
  
  const env = await loadEnv();
  
  console.log(`Provider: ${env.AI_PROVIDER || chalk.gray('Not set')}`);
  console.log(`\nOpenRouter:`);
  console.log(`  API Key: ${env.OPENROUTER_API_KEY ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
  console.log(`  Model: ${env.OPENROUTER_MODEL || chalk.gray('Default (moonshotai/kimi-k2.5)')}`);
  
  console.log(`\nOpenAI:`);
  console.log(`  API Key: ${env.OPENAI_API_KEY ? chalk.green('✓ Set') : chalk.gray('Not set')}`);
  
  console.log(`\nGoogle Gemini:`);
  console.log(`  API Key: ${env.GOOGLE_API_KEY ? chalk.green('✓ Set') : chalk.gray('Not set')}`);
  
  console.log('\n');
}

/**
 * Reset configuration
 */
async function resetConfig() {
  console.log(chalk.yellow('\n⚠️  Resetting AI configuration...\n'));
  
  try {
    const env = await loadEnv();
    
    delete env.AI_PROVIDER;
    delete env.OPENROUTER_API_KEY;
    delete env.OPENROUTER_MODEL;
    delete env.OPENAI_API_KEY;
    delete env.GOOGLE_API_KEY;
    
    await saveEnv(env);
    
    console.log(chalk.green('✓ Configuration reset'));
  } catch (error) {
    console.log(chalk.red(`✗ Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Setup new configuration
 */
async function setupConfig() {
  const provider = options.provider.toLowerCase();
  const key = options.key;
  
  if (!key) {
    console.log(chalk.red('Error: API key is required. Use --key <key>'));
    process.exit(1);
  }
  
  console.log(chalk.blue(`\n🔧 Setting up ${provider} AI provider...\n`));
  
  // Validate API key
  if (!options.skipValidation) {
    const isValid = await validateApiKey(provider, key);
    if (!isValid) {
      console.log(chalk.red('\n✗ Setup failed. Please check your API key.'));
      process.exit(1);
    }
  } else {
    console.log(chalk.yellow('⚠️  Skipping API key validation'));
  }
  
  // Build configuration
  const config = {
    AI_PROVIDER: provider
  };
  
  if (provider === 'openrouter') {
    config.OPENROUTER_API_KEY = key;
    if (options.model) {
      config.OPENROUTER_MODEL = options.model;
    }
  } else if (provider === 'openai') {
    config.OPENAI_API_KEY = key;
  } else if (provider === 'google') {
    config.GOOGLE_API_KEY = key;
  } else {
    console.log(chalk.red(`Error: Unknown provider "${provider}"`));
    console.log(chalk.gray('Supported providers: openrouter, openai, google'));
    process.exit(1);
  }
  
  // Save configuration
  try {
    await updateEnvFile(config);
    console.log(chalk.green('\n✓ Configuration saved to .env'));
  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to save configuration: ${error.message}`));
    process.exit(1);
  }
  
  // Show summary
  console.log(chalk.blue('\n📋 Configuration Summary\n'));
  console.log(`Provider: ${chalk.green(provider)}`);
  if (provider === 'openrouter') {
    console.log(`Model: ${chalk.green(options.model || 'moonshotai/kimi-k2.5')}`);
  }
  console.log(`API Key: ${chalk.green('✓ Set')}`);
  console.log('\n' + chalk.gray('You can now use AI features in the sync engine.'));
  console.log(chalk.gray('Run `npm run setup:ai -- --show` to view configuration.'));
  console.log('');
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.blue('\n🤖 AI Provider Setup\n'));
  
  if (options.show) {
    await showConfig();
    return;
  }
  
  if (options.reset) {
    await resetConfig();
    return;
  }
  
  await setupConfig();
}

main().catch(error => {
  console.error(chalk.red(`\n✗ Error: ${error.message}`));
  process.exit(1);
});
