#!/usr/bin/env node
/**
 * Generate secure secrets for deployment
 */

const crypto = require('crypto');

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('='.repeat(60));
console.log('Zeabur Deployment Secrets Generator');
console.log('='.repeat(60));
console.log();

console.log('JWT_SECRET (for journey-api):');
console.log(generateSecureSecret(32));
console.log();

console.log('GHL_API_KEY (get from GoHighLevel):');
console.log('  1. Log in to GoHighLevel');
console.log('  2. Go to Settings → API');
console.log('  3. Generate new API key');
console.log();

console.log('='.repeat(60));
console.log('Next Steps:');
console.log('  1. Copy JWT_SECRET to Zeabur dashboard');
console.log('  2. Add GHL_API_KEY to both services');
console.log('  3. Deploy PostgreSQL first');
console.log('  4. Deploy journey-api');
console.log('  5. Deploy journey-visualizer');
console.log('='.repeat(60));
