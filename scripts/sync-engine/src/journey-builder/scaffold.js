import fs from 'fs/promises';
import path from 'path';

import { crawlWebsite, classifyPage } from './crawler.js';
import { buildDefaultWeddingVenueJourneys } from './default-journeys.js';
import { buildJourneyPromptPack } from './prompts.js';
import { ensureJourneyBuilderDir, loadClientLocationConfig } from './client-loader.js';
import { KnowledgeHub } from '../services/knowledge-hub.js';
import logger from '../utils/logger.js';

function safeJsonStringify(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function buildBrandProfile(locationConfig, siteSnapshot) {
  const homepage = siteSnapshot.pages.find(p => p.depth === 0) || siteSnapshot.pages[0];

  return {
    companyName: locationConfig.name || '',
    website: locationConfig.contact?.website || '',
    logoUrl: locationConfig.logoUrl || '',
    voiceAdjectives: [],
    doSay: [],
    dontSay: [],
    visualDirection: '',
    primaryColors: [],
    typography: { headingFont: '', bodyFont: '' },
    homepageSignals: {
      title: homepage?.title || '',
      metaDescription: homepage?.description || ''
    }
  };
}

function buildVenueFacts(locationConfig, siteSnapshot) {
  const address = locationConfig.address || {};
  const contact = locationConfig.contact || {};

  const pages = siteSnapshot.pages.map(p => ({
    url: p.url,
    title: p.title,
    description: p.description,
    textSample: p.textSample
  }));

  return {
    companyName: locationConfig.name || '',
    timezone: locationConfig.timezone || '',
    address: {
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || ''
    },
    contact: {
      email: contact.email || '',
      phone: contact.phone || '',
      website: contact.website || ''
    },
    businessHours: locationConfig.businessHours || {},
    knownLinks: {
      website: contact.website || '',
      tourBooking: '{{tour_booking_link}}',
      manageTour: '{{manage_tour_link}}'
    },
    siteSnapshot: {
      origin: siteSnapshot.origin,
      crawledAt: siteSnapshot.crawledAt,
      pageCount: siteSnapshot.pages.length,
      pages
    }
  };
}

/**
 * Scaffold a client journey builder workspace
 * Enhanced to populate the Knowledge Hub
 */
export async function scaffoldClientJourneyBuilder(options) {
  const {
    clientSlug,
    website,
    maxPages = 40,
    maxDepth = 3,
    useKnowledgeHub = true
  } = options;

  const { locationConfig } = await loadClientLocationConfig(clientSlug);
  const outputDir = await ensureJourneyBuilderDir(clientSlug);

  const startUrl = website || locationConfig.contact?.website;
  if (!startUrl) {
    throw new Error('Missing website URL. Provide --website or set contact.website in location-config.json');
  }

  // Initialize Knowledge Hub first (if enabled)
  let hub;
  let hubInitialized = false;
  
  if (useKnowledgeHub) {
    hub = new KnowledgeHub(clientSlug);
    const isInitialized = await hub.isInitialized();
    
    if (!isInitialized) {
      logger.info('Initializing Knowledge Hub...');
      await hub.initialize({
        website: startUrl,
        clientName: locationConfig.name
      });
      hubInitialized = true;
      logger.success('Knowledge Hub initialized');
    } else {
      logger.info('Knowledge Hub already initialized');
    }

    // Initialize brand voice from location config
    logger.info('Initializing brand voice profile...');
    await hub.initializeBrandVoice(locationConfig);
  }

  // Crawl the website
  logger.info(`Crawling website: ${startUrl}`);
  const siteSnapshot = await crawlWebsite({ startUrl, maxPages, maxDepth });
  logger.success(`Crawled ${siteSnapshot.pages.length} pages`);

  // Populate Knowledge Hub with crawled data
  if (useKnowledgeHub && hub) {
    logger.info('Populating Knowledge Hub with crawled data...');
    
    let pagesAdded = 0;
    let factsExtracted = 0;

    for (const page of siteSnapshot.pages) {
      const classification = classifyPage(page);
      
      try {
        // Add to golden pages
        await hub.addGoldenPage({
          url: page.url,
          title: page.title,
          description: page.description,
          importance: classification.importance,
          category: classification.category,
          lastCrawled: new Date().toISOString(),
          textSample: page.textSample,
          imageUrls: page.imageUrls || []
        });
        pagesAdded++;

        // Extract basic facts from critical/high importance pages
        if (['critical', 'high'].includes(classification.importance)) {
          const extractedFacts = extractBasicFacts(page, classification.category, locationConfig);
          for (const fact of extractedFacts) {
            await hub.addFact(fact);
            factsExtracted++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to add page to Knowledge Hub: ${page.url} - ${error.message}`);
      }
    }

    logger.success(`Added ${pagesAdded} pages to Knowledge Hub, extracted ${factsExtracted} facts`);

    // Update sync state
    await hub.updateSyncState({
      startedAt: siteSnapshot.crawledAt,
      url: startUrl,
      pagesCrawled: siteSnapshot.pages.length,
      pagesChanged: pagesAdded,
      newFactsExtracted: factsExtracted
    });
  }

  // Build legacy journey builder files (for backward compatibility)
  const brandProfile = buildBrandProfile(locationConfig, siteSnapshot);
  const venueFacts = buildVenueFacts(locationConfig, siteSnapshot);
  const journeyStructure = buildDefaultWeddingVenueJourneys({
    companyName: locationConfig.name,
    timezone: locationConfig.timezone
  });
  const promptPack = buildJourneyPromptPack({
    brandProfile,
    venueFacts,
    journeys: journeyStructure
  });

  const files = {
    siteSnapshotPath: path.join(outputDir, 'site-snapshot.json'),
    brandProfilePath: path.join(outputDir, 'brand-profile.json'),
    venueFactsPath: path.join(outputDir, 'venue-facts.json'),
    journeyStructurePath: path.join(outputDir, 'journey-structure.json'),
    promptPackPath: path.join(outputDir, 'llm-prompt.txt')
  };

  await fs.writeFile(files.siteSnapshotPath, safeJsonStringify(siteSnapshot), 'utf8');
  await fs.writeFile(files.brandProfilePath, safeJsonStringify(brandProfile), 'utf8');
  await fs.writeFile(files.venueFactsPath, safeJsonStringify(venueFacts), 'utf8');
  await fs.writeFile(files.journeyStructurePath, safeJsonStringify(journeyStructure), 'utf8');
  await fs.writeFile(files.promptPackPath, promptPack + '\n', 'utf8');

  // Return comprehensive result
  return { 
    outputDir, 
    files,
    knowledgeHub: useKnowledgeHub ? {
      hubDir: hub?.hubDir,
      initialized: hubInitialized,
      pagesCrawled: siteSnapshot.pages.length
    } : null
  };
}

/**
 * Extract basic facts from a page during scaffolding
 * Simplified version for initial population
 */
function extractBasicFacts(page, category, locationConfig) {
  const facts = [];
  const text = (page.textSample || '').toLowerCase();
  
  // Add location-based facts
  if (category === 'about' && page.depth === 0) {
    // Homepage - add basic venue info
    if (locationConfig.name) {
      facts.push({
        category: 'venue-details',
        subcategory: 'name',
        type: 'text',
        statement: `The venue is called ${locationConfig.name}`,
        value: locationConfig.name,
        confidence: 1.0,
        source: {
          type: 'manual-entry',
          reference: 'location-config',
          extractedAt: new Date().toISOString()
        },
        verificationStatus: 'verified',
        tags: ['venue', 'name', 'basic']
      });
    }
    
    if (locationConfig.address?.city && locationConfig.address?.state) {
      const location = `${locationConfig.address.city}, ${locationConfig.address.state}`;
      facts.push({
        category: 'venue-details',
        subcategory: 'location',
        type: 'text',
        statement: `Located in ${location}`,
        value: location,
        confidence: 1.0,
        source: {
          type: 'manual-entry',
          reference: 'location-config',
          extractedAt: new Date().toISOString()
        },
        verificationStatus: 'verified',
        tags: ['venue', 'location', 'address', 'basic']
      });
    }
  }
  
  // Extract contact info from contact pages
  if (category === 'contact') {
    if (locationConfig.contact?.email) {
      facts.push({
        category: 'contact',
        subcategory: 'email',
        type: 'text',
        statement: `Contact email: ${locationConfig.contact.email}`,
        value: locationConfig.contact.email,
        confidence: 1.0,
        source: {
          type: 'manual-entry',
          reference: 'location-config',
          extractedAt: new Date().toISOString()
        },
        verificationStatus: 'verified',
        tags: ['contact', 'email', 'basic']
      });
    }
    
    if (locationConfig.contact?.phone) {
      facts.push({
        category: 'contact',
        subcategory: 'phone',
        type: 'text',
        statement: `Contact phone: ${locationConfig.contact.phone}`,
        value: locationConfig.contact.phone,
        confidence: 1.0,
        source: {
          type: 'manual-entry',
          reference: 'location-config',
          extractedAt: new Date().toISOString()
        },
        verificationStatus: 'verified',
        tags: ['contact', 'phone', 'basic']
      });
    }
  }
  
  // Simple pattern matching for pricing
  if (category === 'pricing') {
    const priceMatches = text.matchAll(/\$([\d,]+(?:\.\d{2})?)/g);
    const prices = [...priceMatches].map(m => parseFloat(m[1].replace(/,/g, '')));
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      facts.push({
        category: 'pricing',
        subcategory: 'price-range',
        type: 'scalar',
        statement: `Prices mentioned on pricing page range from $${minPrice.toLocaleString()}`,
        value: minPrice,
        unit: 'USD',
        confidence: 0.7,
        source: {
          type: 'website',
          reference: page.url,
          url: page.url,
          extractedAt: new Date().toISOString()
        },
        verificationStatus: 'ai-extracted',
        tags: ['pricing', 'auto-extracted']
      });
    }
  }
  
  // Simple pattern matching for capacity
  if (category === 'venue') {
    const capacityMatch = text.match(/(?:up to|accommodates?)\s*(\d+)\s*guests?/i);
    if (capacityMatch) {
      const capacity = parseInt(capacityMatch[1], 10);
      facts.push({
        category: 'capacity',
        subcategory: 'guest-capacity',
        type: 'scalar',
        statement: `Venue accommodates up to ${capacity} guests`,
        value: capacity,
        unit: 'guests',
        confidence: 0.75,
        source: {
          type: 'website',
          reference: page.url,
          url: page.url,
          extractedAt: new Date().toISOString()
        },
        verificationStatus: 'ai-extracted',
        tags: ['capacity', 'guests', 'auto-extracted']
      });
    }
  }
  
  return facts;
}

export default {
  scaffoldClientJourneyBuilder,
  buildBrandProfile,
  buildVenueFacts
};
