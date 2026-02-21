import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { KnowledgeHub } from './knowledge-hub.js';
import { AIProvider } from './ai-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Semantic Search Service
 * Provides vector-based semantic search over facts and documents
 */
export class SemanticSearchService {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.hub = new KnowledgeHub(clientSlug);
    this.ai = new AIProvider();
    this.embeddingsPath = null;
    this.embeddings = new Map(); // In-memory cache
    this.rateLimitDelay = 100;
    this.lastRequestTime = 0;
    
    // Initialize paths
    const repoRoot = path.resolve(__dirname, '../../../..');
    this.embeddingsPath = path.join(repoRoot, 'clients', clientSlug, 'knowledge-hub', 'embeddings', 'vectors.json');
  }

  /**
   * Check if AI provider is configured for embeddings
   */
  isConfigured() {
    return this.ai.isConfigured();
  }

  /**
   * Rate limiter
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate embedding for text using AI provider
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      return await this.ai.generateEmbedding(text);
    } catch (error) {
      logger.error('Failed to generate embedding via AI provider', { error: error.message });
      
      // Use fallback embedding
      logger.warn('Using simple fallback embedding (AI provider failed)');
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Generate a simple fallback embedding (for testing without AI provider)
   * Uses a simple hash-based approach - not for production use
   */
  generateSimpleEmbedding(text) {
    // Simple word-based embedding for fallback
    const dimensions = 384;
    const embedding = new Array(dimensions).fill(0);
    
    const words = text.toLowerCase().split(/\s+/);
    const wordSet = new Set(words);
    
    // Create a simple hash-based embedding
    wordSet.forEach((word, index) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      
      const position = Math.abs(hash) % dimensions;
      embedding[position] = Math.min(1, embedding[position] + 0.5);
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }

  /**
   * Load embeddings from disk
   */
  async loadEmbeddings() {
    try {
      const data = await fs.readFile(this.embeddingsPath, 'utf8');
      const parsed = JSON.parse(data);
      
      this.embeddings.clear();
      for (const item of parsed.vectors || []) {
        if (item.embedding && item.embedding.length > 0) {
          this.embeddings.set(item.id, {
            ...item,
            embedding: item.embedding
          });
        }
      }
      
      logger.debug(`Loaded ${this.embeddings.size} embeddings from disk`);
      return this.embeddings.size;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.debug('No embeddings file found, starting fresh');
        return 0;
      }
      throw error;
    }
  }

  /**
   * Save embeddings to disk
   */
  async saveEmbeddings() {
    const vectors = Array.from(this.embeddings.values());
    
    const data = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      model: this.isConfigured() ? 'ai-provider-embedding' : 'simple-fallback',
      dimensions: vectors[0]?.embedding?.length || 384,
      totalEmbeddings: vectors.length,
      vectors
    };

    await fs.mkdir(path.dirname(this.embeddingsPath), { recursive: true });
    await fs.writeFile(this.embeddingsPath, JSON.stringify(data, null, 2));
    
    logger.debug(`Saved ${vectors.length} embeddings to disk`);
  }

  /**
   * Add an embedding to the index
   */
  async addEmbedding(id, text, metadata = {}) {
    let embedding;
    
    try {
      embedding = await this.generateEmbedding(text);
    } catch (error) {
      logger.warn('Using simple fallback embedding (AI provider not configured)');
      embedding = this.generateSimpleEmbedding(text);
    }

    const entry = {
      id,
      type: metadata.type || 'generic',
      sourceId: metadata.sourceId || id,
      text: text.slice(0, 500), // Store truncated text for reference
      embedding,
      metadata: {
        category: metadata.category,
        tags: metadata.tags || [],
        createdAt: new Date().toISOString(),
        ...metadata
      }
    };

    this.embeddings.set(id, entry);
    
    return entry;
  }

  /**
   * Generate embeddings for all facts
   */
  async generateFactEmbeddings(options = {}) {
    logger.info('Generating embeddings for facts');

    const facts = await this.hub.getFacts(options.category, {
      verifiedOnly: options.verifiedOnly || false
    });

    let generated = 0;
    let skipped = 0;

    for (const fact of facts) {
      const embeddingId = `emb-${fact.id}`;
      
      // Skip if already exists and not forcing regeneration
      if (this.embeddings.has(embeddingId) && !options.force) {
        skipped++;
        continue;
      }

      try {
        await this.addEmbedding(embeddingId, fact.statement, {
          type: 'fact',
          sourceId: fact.id,
          category: fact.category,
          tags: fact.tags,
          confidence: fact.confidence
        });
        
        generated++;
        
        // Update fact with embedding ID
        if (!fact.embeddingId || options.force) {
          // Note: This would require a method in KnowledgeHub to update fact embeddingId
          // For now, we track it separately
        }

      } catch (error) {
        logger.error(`Failed to generate embedding for fact ${fact.id}`, { error: error.message });
      }
    }

    logger.success(`Generated ${generated} fact embeddings (${skipped} skipped)`);
    
    await this.saveEmbeddings();
    
    return { generated, skipped, total: facts.length };
  }

  /**
   * Generate embeddings for golden pages
   */
  async generatePageEmbeddings(options = {}) {
    logger.info('Generating embeddings for golden pages');

    const pages = await this.hub.getGoldenPages(options.filters || {});

    let generated = 0;
    let skipped = 0;

    for (const page of pages) {
      if (!page.textSample || page.textSample.trim().length < 50) {
        skipped++;
        continue;
      }

      const embeddingId = `emb-page-${page.id}`;
      
      if (this.embeddings.has(embeddingId) && !options.force) {
        skipped++;
        continue;
      }

      try {
        await this.addEmbedding(embeddingId, page.textSample, {
          type: 'page',
          sourceId: page.id,
          category: page.category,
          url: page.url,
          title: page.title
        });
        
        generated++;
        
      } catch (error) {
        logger.error(`Failed to generate embedding for page ${page.id}`, { error: error.message });
      }
    }

    logger.success(`Generated ${generated} page embeddings (${skipped} skipped)`);
    
    await this.saveEmbeddings();
    
    return { generated, skipped, total: pages.length };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search for similar content
   */
  async search(query, options = {}) {
    logger.info(`Searching: "${query}"`);

    // Load embeddings if not already loaded
    if (this.embeddings.size === 0) {
      await this.loadEmbeddings();
    }

    // Generate query embedding
    let queryEmbedding;
    try {
      queryEmbedding = await this.generateEmbedding(query);
    } catch (error) {
      logger.warn('Using simple fallback for query embedding');
      queryEmbedding = this.generateSimpleEmbedding(query);
    }

    // Calculate similarities
    const results = [];
    
    for (const [id, entry] of this.embeddings) {
      // Filter by type if specified
      if (options.type && entry.type !== options.type) {
        continue;
      }
      
      // Filter by category if specified
      if (options.category && entry.metadata?.category !== options.category) {
        continue;
      }
      
      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        const hasTag = options.tags.some(tag => entry.metadata?.tags?.includes(tag));
        if (!hasTag) continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      
      if (similarity >= (options.threshold || 0.5)) {
        results.push({
          id: entry.id,
          type: entry.type,
          sourceId: entry.sourceId,
          text: entry.text,
          similarity: Math.round(similarity * 1000) / 1000,
          metadata: entry.metadata
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    const limit = options.limit || 10;
    const limitedResults = results.slice(0, limit);

    logger.success(`Found ${limitedResults.length} results (from ${results.length} matches)`);

    return {
      query,
      results: limitedResults,
      totalMatches: results.length,
      threshold: options.threshold || 0.5
    };
  }

  /**
   * Search facts specifically
   */
  async searchFacts(query, options = {}) {
    const searchResults = await this.search(query, {
      ...options,
      type: 'fact'
    });

    // Enrich with full fact data
    const enrichedResults = [];
    
    for (const result of searchResults.results) {
      try {
        const fact = await this.hub.getFact(result.sourceId);
        if (fact) {
          enrichedResults.push({
            ...result,
            fact: {
              id: fact.id,
              statement: fact.statement,
              category: fact.category,
              confidence: fact.confidence,
              verificationStatus: fact.verificationStatus,
              value: fact.value,
              unit: fact.unit
            }
          });
        }
      } catch (error) {
        logger.debug(`Could not enrich result ${result.id}: ${error.message}`);
        enrichedResults.push(result);
      }
    }

    return {
      ...searchResults,
      results: enrichedResults
    };
  }

  /**
   * Find similar items to a given item
   */
  async findSimilar(itemId, options = {}) {
    const entry = this.embeddings.get(itemId);
    if (!entry) {
      throw new Error(`Embedding not found: ${itemId}`);
    }

    const results = [];
    
    for (const [id, otherEntry] of this.embeddings) {
      if (id === itemId) continue; // Skip self
      
      const similarity = this.cosineSimilarity(entry.embedding, otherEntry.embedding);
      
      if (similarity >= (options.threshold || 0.7)) {
        results.push({
          id: otherEntry.id,
          type: otherEntry.type,
          sourceId: otherEntry.sourceId,
          text: otherEntry.text,
          similarity: Math.round(similarity * 1000) / 1000
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, options.limit || 5);
  }

  /**
   * Get search statistics
   */
  async getStats() {
    await this.loadEmbeddings();
    
    const stats = {
      totalEmbeddings: this.embeddings.size,
      byType: {},
      byCategory: {}
    };

    for (const entry of this.embeddings.values()) {
      // By type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
      
      // By category
      const category = entry.metadata?.category || 'uncategorized';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Rebuild all embeddings from scratch
   */
  async rebuildEmbeddings(options = {}) {
    logger.info('Rebuilding all embeddings');

    // Clear existing embeddings
    this.embeddings.clear();

    // Generate fact embeddings
    const factResults = await this.generateFactEmbeddings({
      force: true,
      ...options
    });

    // Generate page embeddings
    const pageResults = await this.generatePageEmbeddings({
      force: true,
      ...options
    });

    logger.success('Embeddings rebuild complete');

    return {
      facts: factResults,
      pages: pageResults,
      total: this.embeddings.size
    };
  }
}

export default SemanticSearchService;
