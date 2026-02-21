#!/usr/bin/env node

/**
 * AI Provider Test Script
 * Tests the AI provider configuration and validates API keys
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProvider } from '../src/services/ai-provider.js';
import chalk from 'chalk';

// Load environment variables from the correct path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log(chalk.blue('\n🧪 AI Provider Test\n'));

async function testProvider() {
  try {
    // Create AI provider instance
    console.log('Initializing AI provider...');
    const ai = new AIProvider();
    
    console.log(chalk.green(`✓ Provider: ${ai.getProviderName()}`));
    console.log(chalk.green(`✓ Model: ${ai.getModelName()}`));
    console.log(chalk.green(`✓ Configured: ${ai.isConfigured()}`));
    
    // Test 1: Validate API Key
    console.log(chalk.blue('\n📋 Test 1: Validating API Key...'));
    const isValid = await ai.validateApiKey();
    
    if (!isValid) {
      console.log(chalk.red('✗ API key validation failed'));
      process.exit(1);
    }
    console.log(chalk.green('✓ API key is valid'));
    
    // Test 2: Simple text generation
    console.log(chalk.blue('\n📋 Test 2: Testing text generation...'));
    const copy = await ai.generateCopy('Write a one-sentence welcome message for a wedding venue website.');
    console.log(chalk.green('✓ Text generation successful'));
    console.log(chalk.gray(`  Output: "${copy.trim()}"`));
    
    // Test 3: JSON extraction (fact extraction simulation)
    console.log(chalk.blue('\n📋 Test 3: Testing JSON extraction (fact extraction)...'));
    const page = {
      title: 'Wedding Packages',
      url: 'https://example.com/weddings',
      textSample: 'Our wedding packages start at $5,000 and include catering for up to 100 guests. We offer both indoor and outdoor ceremony options.'
    };
    
    const prompt = `Extract facts from this wedding venue page and return as JSON with format: {"facts": [{"category": "pricing", "key": "starting_price", "value": "$5,000", "statement": "Wedding packages start at $5,000", "confidence": 0.95, "type": "text"}]}`;
    
    const facts = await ai.extractFacts(page, prompt);
    console.log(chalk.green('✓ JSON extraction successful'));
    console.log(chalk.gray(`  Found ${facts.facts?.length || 0} facts`));
    
    // Test 4: Text analysis (brand voice simulation)
    console.log(chalk.blue('\n📋 Test 4: Testing text analysis...'));
    const text = 'Welcome to our beautiful venue where dreams come true. We create magical moments that last a lifetime.';
    const analysisPrompt = 'Analyze this text for tone and return JSON with: {toneAdjectives: string[], formalityScore: number, enthusiasmScore: number}';
    
    const analysis = await ai.analyzeText(text, analysisPrompt);
    console.log(chalk.green('✓ Text analysis successful'));
    console.log(chalk.gray(`  Tone: ${analysis.toneAdjectives?.join(', ') || 'N/A'}`));
    
    // Note: Embeddings test requires OpenAI or Google since OpenRouter doesn't support embeddings
    if (process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY) {
      console.log(chalk.blue('\n📋 Test 5: Testing embeddings generation...'));
      try {
        const embedding = await ai.generateEmbedding('Wedding venue with beautiful gardens');
        console.log(chalk.green('✓ Embeddings generation successful'));
        console.log(chalk.gray(`  Vector dimensions: ${embedding.length}`));
      } catch (err) {
        console.log(chalk.yellow(`⚠️  Embeddings test skipped: ${err.message}`));
        console.log(chalk.gray('  Note: Semantic search will use fallback embeddings (lower quality)'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Skipping embeddings test (requires OPENAI_API_KEY or GOOGLE_API_KEY)'));
    }
    
    console.log(chalk.green('\n✅ All tests passed!\n'));
    
  } catch (error) {
    console.error(chalk.red(`\n✗ Test failed: ${error.message}`));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  }
}

testProvider();
