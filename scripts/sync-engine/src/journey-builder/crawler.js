import axios from 'axios';
import crypto from 'crypto';
import { extractInternalLinks, extractMetaDescription, extractTitle, htmlToText } from './html.js';
import { KnowledgeHub } from '../services/knowledge-hub.js';
import logger from '../utils/logger.js';

/**
 * Crawl a website and return structured data
 * Enhanced to populate the Knowledge Hub
 */
export async function crawlWebsite(options) {
  const {
    startUrl,
    maxPages = 40,
    maxDepth = 3,
    timeoutMs = 15000,
    userAgent = 'TheBloomAppJourneyBuilder/1.0'
  } = options;

  const start = new URL(startUrl);
  const origin = start.origin;

  const queue = [{ url: normalizeUrl(start.toString()), depth: 0 }];
  const seen = new Set();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const { url, depth } = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);

    if (depth > maxDepth) continue;

    let html;
    try {
      const response = await axios.get(url, {
        timeout: timeoutMs,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        },
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400
      });
      html = typeof response.data === 'string' ? response.data : '';
    } catch {
      continue;
    }

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const text = htmlToText(html);
    const imageUrls = extractImageUrls(html, url);

    pages.push({
      url,
      depth,
      title,
      description,
      textSample: text.slice(0, 2000),
      imageUrls: imageUrls.slice(0, 20), // Limit to 20 images per page
      discoveredAt: new Date().toISOString()
    });

    const links = extractInternalLinks(html, url);
    for (const link of links) {
      try {
        const u = new URL(link);
        if (u.origin !== origin) continue;
        if (u.search && u.search.length > 0) continue;
        const normalized = normalizeUrl(u.toString());
        if (!seen.has(normalized)) queue.push({ url: normalized, depth: depth + 1 });
      } catch {
        continue;
      }
    }
  }

  return {
    startUrl: start.toString(),
    origin,
    maxPages,
    maxDepth,
    crawledAt: new Date().toISOString(),
    pages
  };
}

/**
 * Extract image URLs from HTML
 * @param {string} html - The HTML content
 * @param {string} baseUrl - The base URL for resolving relative URLs
 * @returns {string[]} - Array of image URLs
 */
export function extractImageUrls(html, baseUrl) {
  const imageUrls = new Set();
  
  // Match img src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const normalized = normalizeImageUrl(src, baseUrl);
    if (normalized) imageUrls.add(normalized);
  }
  
  // Match background-image URLs in style attributes
  const bgRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    const src = match[1];
    const normalized = normalizeImageUrl(src, baseUrl);
    if (normalized) imageUrls.add(normalized);
  }
  
  // Match meta og:image
  const ogImageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i;
  const ogMatch = html.match(ogImageRegex);
  if (ogMatch) {
    const normalized = normalizeImageUrl(ogMatch[1], baseUrl);
    if (normalized) imageUrls.add(normalized);
  }
  
  return Array.from(imageUrls);
}

/**
 * Normalize an image URL
 */
function normalizeImageUrl(src, baseUrl) {
  if (!src) return null;
  
  // Skip data URIs
  if (src.startsWith('data:')) return null;
  
  // Skip SVGs that are likely icons
  if (/\.svg(\?|$)/i.test(src) && (src.includes('icon') || src.includes('logo'))) {
    return null;
  }
  
  try {
    const url = new URL(src, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    
    // Only include common image formats
    const validExtensions = /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i;
    if (!validExtensions.test(url.pathname)) return null;
    
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Identify the importance and category of a page based on URL and content
 * @param {object} page - The page object
 * @returns {object} - { importance: string, category: string }
 */
export function classifyPage(page) {
  const url = page.url.toLowerCase();
  const title = (page.title || '').toLowerCase();
  const text = (page.textSample || '').toLowerCase();
  
  // Check for pricing pages
  if (/price|cost|package|investment|fee|pricing/i.test(url) ||
      /price|cost|package|investment|pricing/i.test(title)) {
    return { importance: 'critical', category: 'pricing' };
  }
  
  // Check for venue/space pages
  if (/venue|space|room|hall|ballroom|garden|ceremony|reception/i.test(url) ||
      /venue|space|ceremony|reception/i.test(title)) {
    return { importance: 'critical', category: 'venue' };
  }
  
  // Check for accommodation pages
  if (/accommodation|lodging|hotel|stay|room|suite/i.test(url) ||
      /accommodation|lodging|hotel/i.test(title)) {
    return { importance: 'high', category: 'accommodations' };
  }
  
  // Check for gallery/photo pages
  if (/gallery|photo|image|picture|portfolio/i.test(url) ||
      /gallery|photos|portfolio/i.test(title)) {
    return { importance: 'high', category: 'gallery' };
  }
  
  // Check for FAQ pages
  if (/faq|question|help/i.test(url) || /faq|frequently asked/i.test(title)) {
    return { importance: 'high', category: 'policies' };
  }
  
  // Check for contact pages
  if (/contact|reach|inquire|book/i.test(url) || /contact|inquiry/i.test(title)) {
    return { importance: 'high', category: 'contact' };
  }
  
  // Check for about pages
  if (/about|story|history|team|staff/i.test(url) || 
      /about us|our story|meet the team/i.test(title)) {
    return { importance: 'high', category: 'about' };
  }
  
  // Check for blog/news pages
  if (/blog|news|article|story|journal/i.test(url)) {
    return { importance: 'medium', category: 'blog' };
  }
  
  // Homepage detection
  if (url.replace(/https?:\/\//, '').replace(/\/$/, '').split('/').length <= 2) {
    return { importance: 'critical', category: 'about' };
  }
  
  // Default
  return { importance: 'medium', category: 'other' };
}

/**
 * Calculate content hash for change detection
 */
function calculateContentHash(text) {
  return crypto.createHash('md5').update(text || '').digest('hex').slice(0, 12);
}

/**
 * Crawl website and populate the Knowledge Hub
 * @param {string} clientSlug - The client identifier
 * @param {string} website - The website URL to crawl
 * @param {object} options - Crawl options
 * @returns {Promise<object>} - Crawl results
 */
export async function crawlAndPopulateHub(clientSlug, website, options = {}) {
  const {
    maxPages = 40,
    maxDepth = 3,
    dryRun = false
  } = options;

  logger.info(`Starting crawl for ${clientSlug}: ${website}`);
  logger.info(`Options: maxPages=${maxPages}, maxDepth=${maxDepth}`);

  const hub = new KnowledgeHub(clientSlug);
  
  // Check if hub is initialized
  const isInitialized = await hub.isInitialized();
  if (!isInitialized) {
    throw new Error(`Knowledge Hub not initialized for ${clientSlug}. Run 'knowledge:init' first.`);
  }

  const startedAt = new Date().toISOString();
  
  // Perform the crawl
  const crawlResult = await crawlWebsite({
    startUrl: website,
    maxPages,
    maxDepth
  });

  logger.info(`Crawled ${crawlResult.pages.length} pages`);

  if (dryRun) {
    logger.info('Dry run mode - not saving to Knowledge Hub');
    return {
      dryRun: true,
      pagesFound: crawlResult.pages.length,
      pages: crawlResult.pages.map(p => ({
        url: p.url,
        title: p.title,
        ...classifyPage(p)
      }))
    };
  }

  // Process and save pages to Knowledge Hub
  let pagesAdded = 0;
  let pagesUpdated = 0;
  const newFacts = [];

  for (const page of crawlResult.pages) {
    const classification = classifyPage(page);
    
    try {
      // Check if page already exists and has changed
      const existingPages = await hub.getGoldenPages({ search: page.url });
      const existingPage = existingPages.find(p => p.url === page.url);
      
      const pageData = {
        url: page.url,
        title: page.title,
        description: page.description,
        importance: classification.importance,
        category: classification.category,
        lastCrawled: new Date().toISOString(),
        textSample: page.textSample,
        imageUrls: page.imageUrls
      };

      if (existingPage) {
        // Compare content hash to detect changes
        const contentHash = calculateContentHash(page.textSample || '');
        if (existingPage.contentHash !== contentHash) {
          await hub.updateGoldenPage(existingPage.id, { ...pageData, contentHash });
          pagesUpdated++;
          logger.debug(`Updated page (changed): ${page.url}`);
        } else {
          // Just update the crawl timestamp
          await hub.updateGoldenPage(existingPage.id, { lastCrawled: pageData.lastCrawled });
        }
      } else {
        const contentHash = calculateContentHash(page.textSample || '');
        await hub.addGoldenPage({ ...pageData, contentHash });
        pagesAdded++;
        logger.debug(`Added new page: ${page.url}`);
      }

      // Extract potential facts from important pages
      if (['critical', 'high'].includes(classification.importance)) {
        const extractedFacts = extractFactsFromPage(page, classification.category);
        for (const fact of extractedFacts) {
          const savedFact = await hub.addFact(fact);
          newFacts.push(savedFact);
        }
      }

    } catch (error) {
      logger.warn(`Failed to process page ${page.url}: ${error.message}`);
    }
  }

  // Update sync state
  await hub.updateSyncState({
    startedAt,
    url: website,
    pagesCrawled: crawlResult.pages.length,
    pagesChanged: pagesUpdated,
    newFactsExtracted: newFacts.length
  });

  logger.success(`Crawl complete: ${pagesAdded} added, ${pagesUpdated} updated, ${newFacts.length} facts extracted`);

  return {
    clientSlug,
    website,
    pagesCrawled: crawlResult.pages.length,
    pagesAdded,
    pagesUpdated,
    factsExtracted: newFacts.length,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

/**
 * Extract potential facts from a crawled page
 * This is a simplified implementation - in production, this would use AI
 * @param {object} page - The crawled page
 * @param {string} category - The page category
 * @returns {Array} - Array of fact objects
 */
function extractFactsFromPage(page, category) {
  const facts = [];
  const text = (page.textSample || '').toLowerCase();
  
  // Pricing facts extraction
  if (category === 'pricing') {
    // Look for price patterns
    const pricePatterns = [
      { regex: /\$([\d,]+(?:\.\d{2})?)\s*(?:per|\/)?\s*(person|guest|head)/i, type: 'per-person', unit: 'USD' },
      { regex: /(?:starting|starts|from|as low as)\s*(?:at\s*)?\$([\d,]+(?:\.\d{2})?)/i, type: 'starting-at', unit: 'USD' },
      { regex: /\$([\d,]+(?:\.\d{2})?)\s*(?:minimum|min)/i, type: 'minimum', unit: 'USD' },
      { regex: /deposit\s*(?:of\s*)?\$([\d,]+(?:\.\d{2})?)/i, type: 'deposit', unit: 'USD' }
    ];
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        const statement = match[0];
        
        facts.push({
          category: 'pricing',
          subcategory: pattern.type,
          type: 'scalar',
          statement: statement.charAt(0).toUpperCase() + statement.slice(1),
          value,
          unit: pattern.unit,
          confidence: 0.75,
          source: {
            type: 'website',
            reference: page.url,
            url: page.url,
            extractedAt: new Date().toISOString()
          },
          tags: ['pricing', pattern.type, 'auto-extracted']
        });
      }
    }
  }
  
  // Capacity facts extraction
  if (category === 'venue') {
    const capacityPatterns = [
      { regex: /(?:up to|accommodates?|holds?|seats?)\s*(\d+)\s*(?:guests?|people|attendees?)/i, type: 'capacity' },
      { regex: /(\d+)\s*(?:guests?|people)\s*(?:maximum|max)/i, type: 'maximum-capacity' },
      { regex: /(\d+)\s*(?:square feet|sq\.?\s*ft\.?|sqft)/i, type: 'square-footage', unit: 'sq ft' }
    ];
    
    for (const pattern of capacityPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        const value = parseInt(match[1], 10);
        const statement = match[0];
        
        facts.push({
          category: 'capacity',
          subcategory: pattern.type,
          type: 'scalar',
          statement: statement.charAt(0).toUpperCase() + statement.slice(1),
          value,
          unit: pattern.unit || 'guests',
          confidence: 0.8,
          source: {
            type: 'website',
            reference: page.url,
            url: page.url,
            extractedAt: new Date().toISOString()
          },
          tags: ['capacity', pattern.type, 'auto-extracted']
        });
      }
    }
  }
  
  // Policy facts extraction
  if (category === 'policies') {
    const policyPatterns = [
      { regex: /(?:outside|external)\s*(?:caterers?|vendors?|alcohol)/i, statement: 'Allows outside vendors/caterers', positive: true },
      { regex: /(?:no|not allowed|prohibited|forbidden)\s*(?:outside|external)\s*(?:caterers?|vendors?)/i, statement: 'No outside vendors/caterers allowed', positive: false },
      { regex: /(?:cancellation|cancel)\s*(?:policy|fee)/i, statement: 'Has cancellation policy', positive: true }
    ];
    
    for (const pattern of policyPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        facts.push({
          category: 'policies',
          subcategory: 'general',
          type: 'boolean',
          statement: pattern.statement,
          value: pattern.positive,
          confidence: 0.7,
          source: {
            type: 'website',
            reference: page.url,
            url: page.url,
            extractedAt: new Date().toISOString()
          },
          tags: ['policy', 'auto-extracted']
        });
      }
    }
  }
  
  return facts;
}

function normalizeUrl(url) {
  return url.replace(/\/$/, '');
}

export default {
  crawlWebsite,
  crawlAndPopulateHub,
  extractImageUrls,
  classifyPage
};
