import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { KnowledgeHub } from './knowledge-hub.js';
import { AIProvider } from './ai-provider.js';

/**
 * AI Fact Extraction Service
 * Uses LLM to extract structured facts from crawled website content
 */
export class FactExtractionService {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.hub = new KnowledgeHub(clientSlug);
    this.ai = new AIProvider();
  }

  /**
   * Check if AI provider is configured
   */
  isConfigured() {
    return this.ai.isConfigured();
  }

  /**
   * Extract facts from a golden page
   * @param {Object} page - The golden page object
   * @returns {Promise<Array>} Array of extracted facts
   */
  async extractFactsFromPage(page) {
    if (!this.isConfigured()) {
      throw new Error('AI provider not configured. Set AI_PROVIDER and corresponding API key in .env');
    }

    logger.info(`Extracting facts from page: ${page.url}`);

    const content = page.textSample || '';
    if (!content.trim()) {
      logger.warn(`No content available for page: ${page.url}`);
      return [];
    }

    try {
      const result = await this.ai.extractFacts(page, this.getFactExtractionPrompt());
      
      if (!result.facts || !Array.isArray(result.facts)) {
        logger.warn(`No facts extracted from page: ${page.url}`);
        return [];
      }

      // Process and validate extracted facts
      const facts = result.facts.map(fact => this.processFact(fact, page));
      
      logger.success(`Extracted ${facts.length} facts from ${page.url}`);
      
      return facts;

    } catch (error) {
      logger.error(`Failed to extract facts from ${page.url}`, { error: error.message });
      
      // Try fallback provider if available
      if (await this.ai.fallback()) {
        logger.info('Retrying with fallback provider...');
        return this.extractFactsFromPage(page);
      }
      
      throw error;
    }
  }

  /**
   * Get the fact extraction prompt for the LLM
   */
  getFactExtractionPrompt() {
    return `You are a precise fact extraction system for wedding venue websites. 
Extract structured facts from the provided content and return them as a JSON object.

Categories to extract:
- pricing: Package prices, deposits, payment terms, what's included
- capacity: Guest numbers, room sizes, space configurations
- amenities: Services included (coordination, catering, etc.), features
- policies: Vendor policies, cancellation, restrictions, rules
- venue_details: Location, style, architecture, history, physical attributes
- services: Available services, add-ons, upgrades

For each fact, provide:
- category: One of the categories above
- key: A machine-readable key (snake_case)
- value: The fact value (can be string, number, boolean, or array)
- statement: A clear, natural language statement of the fact
- confidence: A score from 0.0 to 1.0 based on clarity and certainty
- type: The data type (text, number, boolean, list, range)

Return format:
{
  "facts": [
    {
      "category": "pricing",
      "key": "starting_price",
      "value": "$5,000",
      "statement": "Wedding packages start at $5,000",
      "confidence": 0.95,
      "type": "text"
    }
  ]
}

Rules:
- Only extract facts that are explicitly stated or very strongly implied
- Use confidence < 0.7 for ambiguous information
- Don't make assumptions beyond what's in the text
- Convert prices to include currency symbols
- Include units for measurements (guests, hours, sq ft, etc.)
- If a value is a range, use "type": "range" and provide min/max`;
  }

  /**
   * Process and normalize a raw extracted fact
   */
  processFact(fact, page) {
    const factId = `fact-${uuidv4().split('-')[0]}`;
    
    // Normalize category
    const validCategories = ['pricing', 'capacity', 'amenities', 'policies', 'venue_details', 'services'];
    const category = validCategories.includes(fact.category) ? fact.category : 'venue_details';
    
    // Normalize type
    const validTypes = ['text', 'number', 'boolean', 'list', 'range'];
    const type = validTypes.includes(fact.type) ? fact.type : 'text';
    
    // Ensure confidence is a valid number between 0 and 1
    let confidence = parseFloat(fact.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      confidence = 0.7; // Default to medium confidence
    }

    return {
      id: factId,
      category,
      subcategory: fact.key || '',
      type,
      statement: fact.statement || String(fact.value),
      value: fact.value,
      unit: this.extractUnit(fact.statement, fact.value),
      source: {
        type: 'website',
        reference: page.id || page.url,
        url: page.url,
        extractedAt: new Date().toISOString()
      },
      confidence,
      verificationStatus: confidence >= 0.9 ? 'ai-extracted' : 'pending-review',
      tags: this.generateTags(fact, category),
      pageId: page.id
    };
  }

  /**
   * Extract unit from statement or value
   */
  extractUnit(statement, value) {
    const statementStr = String(statement).toLowerCase();
    
    if (statementStr.includes('guest')) return 'guests';
    if (statementStr.includes('hour')) return 'hours';
    if (statementStr.includes('sq ft') || statementStr.includes('sqft')) return 'sq ft';
    if (statementStr.includes('$') || statementStr.includes('dollar')) return 'USD';
    if (statementStr.includes('%') || statementStr.includes('percent')) return 'percent';
    
    return null;
  }

  /**
   * Generate tags for a fact
   */
  generateTags(fact, category) {
    const tags = [category];
    
    if (fact.key) {
      tags.push(fact.key);
    }
    
    // Add category-specific tags
    const statement = String(fact.statement).toLowerCase();
    
    if (category === 'pricing') {
      if (statement.includes('deposit')) tags.push('deposit');
      if (statement.includes('package')) tags.push('packages');
      if (statement.includes('include')) tags.push('inclusions');
    }
    
    if (category === 'capacity') {
      if (statement.includes('ceremony')) tags.push('ceremony');
      if (statement.includes('reception')) tags.push('reception');
      if (statement.includes('indoor')) tags.push('indoor');
      if (statement.includes('outdoor')) tags.push('outdoor');
    }
    
    if (category === 'policies') {
      if (statement.includes('vendor')) tags.push('vendors');
      if (statement.includes('cancel')) tags.push('cancellation');
      if (statement.includes('alcohol')) tags.push('alcohol');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract facts from all golden pages
   */
  async extractAllFacts(options = {}) {
    const pages = await this.hub.getGoldenPages(options.filters || {});
    
    logger.info(`Starting fact extraction for ${pages.length} pages`);
    
    const results = {
      pagesProcessed: 0,
      factsExtracted: 0,
      factsAdded: 0,
      factsQueued: 0,
      errors: []
    };

    for (const page of pages) {
      try {
        // Skip pages without content
        if (!page.textSample || page.textSample.trim().length < 50) {
          logger.debug(`Skipping page with insufficient content: ${page.url}`);
          continue;
        }

        const facts = await this.extractFactsFromPage(page);
        
        // Store extracted facts
        const pageFactIds = [];
        for (const fact of facts) {
          try {
            // Validate confidence threshold
            if (fact.confidence < 0.7) {
              logger.warn(`Skipping low confidence fact (${fact.confidence}): ${fact.statement}`);
              continue;
            }

            const storedFact = await this.hub.addFact(fact);
            pageFactIds.push(storedFact.id);
            results.factsExtracted++;
            
            // Track verification status
            if (fact.confidence < 0.9) {
              results.factsQueued++;
            } else {
              results.factsAdded++;
            }
          } catch (error) {
            logger.error(`Failed to store fact`, { error: error.message, fact });
          }
        }

        // Update golden page with extracted fact IDs
        if (pageFactIds.length > 0) {
          const existingFacts = page.extractedFacts || [];
          await this.hub.updateGoldenPage(page.id, {
            extractedFacts: [...new Set([...existingFacts, ...pageFactIds])]
          });
        }

        results.pagesProcessed++;
        
      } catch (error) {
        logger.error(`Failed to process page: ${page.url}`, { error: error.message });
        results.errors.push({ page: page.url, error: error.message });
      }
    }

    logger.success(`Fact extraction complete: ${results.factsExtracted} facts from ${results.pagesProcessed} pages`);
    
    return results;
  }

  /**
   * Re-extract facts for a specific page
   */
  async reextractPageFacts(pageId) {
    const page = await this.hub.getGoldenPage(pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    logger.info(`Re-extracting facts for page: ${page.url}`);

    // Clear existing fact references
    if (page.extractedFacts && page.extractedFacts.length > 0) {
      // Note: We don't delete the facts, just unlink them from this page
      // The facts remain in the system for reference
      logger.info(`Page had ${page.extractedFacts.length} previously extracted facts`);
    }

    const facts = await this.extractFactsFromPage(page);
    const pageFactIds = [];

    for (const fact of facts) {
      if (fact.confidence >= 0.7) {
        const storedFact = await this.hub.addFact(fact);
        pageFactIds.push(storedFact.id);
      }
    }

    // Update page with new fact IDs
    await this.hub.updateGoldenPage(page.id, {
      extractedFacts: pageFactIds,
      lastCrawled: new Date().toISOString()
    });

    return {
      pageId: page.id,
      factsExtracted: facts.length,
      factsStored: pageFactIds.length,
      factIds: pageFactIds
    };
  }

  /**
   * Get extraction statistics
   */
  async getStats() {
    const facts = await this.hub.getFacts();
    
    const stats = {
      totalFacts: facts.length,
      byCategory: {},
      byConfidence: {
        high: 0,    // >= 0.9
        medium: 0,  // 0.7 - 0.89
        low: 0      // < 0.7
      },
      byStatus: {},
      needsVerification: 0
    };

    for (const fact of facts) {
      // By category
      stats.byCategory[fact.category] = (stats.byCategory[fact.category] || 0) + 1;
      
      // By confidence
      if (fact.confidence >= 0.9) stats.byConfidence.high++;
      else if (fact.confidence >= 0.7) stats.byConfidence.medium++;
      else stats.byConfidence.low++;
      
      // By status
      stats.byStatus[fact.verificationStatus] = (stats.byStatus[fact.verificationStatus] || 0) + 1;
      
      // Needs verification
      if (fact.confidence < 0.9 || fact.verificationStatus === 'pending-review') {
        stats.needsVerification++;
      }
    }

    return stats;
  }
}

export default FactExtractionService;
