#!/usr/bin/env node

/**
 * Sync GHL Trigger Links
 * 
 * Fetches trigger links from GoHighLevel API and saves to links.json
 * 
 * Usage:
 *   node scripts/sync-links.js
 */

import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

/**
 * GHL API Client for Links
 */
class GHLLinksClient {
  constructor(apiKey, locationId) {
    this.apiKey = apiKey;
    this.locationId = locationId;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
    this.rateLimitDelay = 250;
  }

  async request(method, endpoint, data = null) {
    const url = `${GHL_BASE_URL}${endpoint}`;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    
    try {
      const response = await axios({
        method,
        url,
        headers: this.headers,
        data
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`GHL API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get all trigger links
   * GET /links
   */
  async getLinks() {
    const response = await this.request('GET', `/links?locationId=${this.locationId}`);
    return response.links || [];
  }

  /**
   * Create a trigger link
   * POST /links
   */
  async createLink(name, options = {}) {
    return await this.request('POST', '/links', {
      locationId: this.locationId,
      name,
      ...options
    });
  }
}

/**
 * Required link definitions for Cameron Estate
 */
const requiredLinks = [
  { name: 'book_tour', description: 'Link to book a venue tour' },
  { name: 'view_pricing', description: 'Link to pricing page' },
  { name: 'view_calendar', description: 'Link to availability calendar' },
  { name: 'contact_lisa', description: 'Direct contact link for Lisa' },
  { name: 'pinterest_board', description: 'Link to Pinterest inspiration board' }
];

/**
 * Main sync function
 */
async function main() {
  console.log('🔗 Cameron Estate - GHL Link Synchronizer');
  console.log('==========================================\n');
  
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  
  if (!apiKey || !locationId) {
    console.error('❌ Error: GHL_API_KEY and GHL_LOCATION_ID required in .env');
    console.log('\nAdd these to your .env file:');
    console.log('  GHL_API_KEY=your_pit_token_here');
    console.log('  GHL_LOCATION_ID=your_location_id_here');
    process.exit(1);
  }
  
  const client = new GHLLinksClient(apiKey, locationId);
  
  try {
    // Fetch existing links
    console.log('📥 Fetching links from GoHighLevel...');
    const existingLinks = await client.getLinks();
    
    console.log(`   Found ${existingLinks.length} links in GHL\n`);
    
    // Build link map
    const linkMap = {};
    
    for (const link of existingLinks) {
      linkMap[link.name] = link.id;
      console.log(`   ✓ ${link.name}: ${link.id}`);
    }
    
    // Check for missing required links
    console.log('\n🔍 Checking required links...');
    const missingLinks = [];
    
    for (const required of requiredLinks) {
      if (linkMap[required.name]) {
        console.log(`   ✓ ${required.name} - exists`);
      } else {
        console.log(`   ✗ ${required.name} - MISSING`);
        missingLinks.push(required);
      }
    }
    
    // Save link map
    const outputPath = path.join(__dirname, '../data/links.json');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(linkMap, null, 2));
    console.log(`\n💾 Link map saved to: ${outputPath}`);
    
    // Summary
    console.log('\n==========================================');
    console.log('📊 Sync Summary');
    console.log('==========================================');
    console.log(`Total links synced: ${existingLinks.length}`);
    console.log(`Required links: ${requiredLinks.length}`);
    console.log(`Missing required links: ${missingLinks.length}`);
    
    if (missingLinks.length > 0) {
      console.log('\n⚠️  Missing required links - create these in GHL:');
      missingLinks.forEach(link => {
        console.log(`   - ${link.name}: ${link.description}`);
      });
    }
    
    console.log('\n✨ Link sync complete!');
    
  } catch (error) {
    console.error(`\n❌ Error syncing links: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
main().catch(console.error);

export { GHLLinksClient, requiredLinks, main };
