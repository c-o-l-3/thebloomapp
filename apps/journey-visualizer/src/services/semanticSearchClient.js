/**
 * Semantic Search Client for Frontend
 * Provides vector-based semantic search capabilities
 * Works with pre-computed embeddings from the knowledge hub
 */

import { fetchLocalFacts } from './knowledgeHub';
import { fetchLocalGoldenPages } from './knowledgeHub';

/**
 * Generate a simple embedding for text (TF-IDF style)
 * This is a lightweight version that works in the browser
 * For production, use server-side embeddings via API
 */
export function generateEmbedding(text) {
  const dimensions = 384;
  const embedding = new Array(dimensions).fill(0);
  
  if (!text || text.trim().length === 0) {
    return embedding;
  }

  const words = text.toLowerCase().split(/\s+/);
  const wordSet = new Set(words);
  
  // Create a hash-based embedding with multiple hash functions
  wordSet.forEach((word) => {
    // Use multiple hash functions for better distribution
    const hashes = [
      hashString(word, 1),
      hashString(word, 2),
      hashString(word, 3),
      hashString(word, 4)
    ];
    
    hashes.forEach((hash, idx) => {
      const position = Math.abs(hash) % dimensions;
      // Distribute weight across multiple positions
      embedding[position] = Math.min(1, embedding[position] + 0.25);
    });
  });

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

/**
 * Simple string hash function with seed
 */
function hashString(str, seed = 0) {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
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
 * Semantic Search Client class
 */
export class SemanticSearchClient {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.embeddings = new Map();
    this.initialized = false;
  }

  /**
   * Initialize by loading embeddings from local files
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Try to load embeddings from local file
      const embeddingsUrl = new URL(`../../../clients/${this.clientSlug}/knowledge-hub/embeddings/vectors.json`, import.meta.url).href;
      const embeddingsModule = await import(/* @vite-ignore */ embeddingsUrl);
      const data = embeddingsModule.default;
      
      if (data && data.vectors) {
        for (const vector of data.vectors) {
          if (vector.embedding && vector.embedding.length > 0) {
            this.embeddings.set(vector.id, vector);
          }
        }
        console.log(`Loaded ${this.embeddings.size} embeddings from vectors.json`);
      }
    } catch (error) {
      console.warn('No pre-computed embeddings found, using runtime computation:', error.message);
    }

    this.initialized = true;
  }

  /**
   * Search across facts and golden pages using semantic similarity
   */
  async search(query, options = {}) {
    await this.initialize();

    const threshold = options.threshold || 0.3;
    const limit = options.limit || 10;
    const types = options.types || ['fact', 'page'];

    // Generate query embedding
    const queryEmbedding = generateEmbedding(query);

    // Get facts and pages to search
    const results = [];

    // Search facts if requested
    if (types.includes('fact')) {
      const facts = await fetchLocalFacts(this.clientSlug);
      
      for (const fact of facts) {
        // Generate embedding for fact statement
        const factEmbedding = generateEmbedding(fact.statement);
        const similarity = cosineSimilarity(queryEmbedding, factEmbedding);
        
        if (similarity >= threshold) {
          results.push({
            id: `fact-${fact.id}`,
            type: 'fact',
            sourceId: fact.id,
            text: fact.statement,
            similarity: Math.round(similarity * 1000) / 1000,
            category: fact.category,
            metadata: {
              statement: fact.statement,
              category: fact.category,
              confidence: fact.confidence,
              verificationStatus: fact.verificationStatus,
              value: fact.value,
              unit: fact.unit
            }
          });
        }
      }
    }

    // Search golden pages if requested
    if (types.includes('page')) {
      const pages = await fetchLocalGoldenPages(this.clientSlug);
      
      for (const page of pages) {
        // Combine title, description, and textSample for embedding
        const pageText = [
          page.title || '',
          page.description || '',
          page.textSample || ''
        ].join(' ');

        if (pageText.trim().length < 20) continue;

        const pageEmbedding = generateEmbedding(pageText);
        const similarity = cosineSimilarity(queryEmbedding, pageEmbedding);
        
        if (similarity >= threshold) {
          results.push({
            id: `page-${page.id}`,
            type: 'page',
            sourceId: page.id,
            text: page.textSample || page.description,
            similarity: Math.round(similarity * 1000) / 1000,
            category: page.category,
            metadata: {
              title: page.title,
              url: page.url,
              category: page.category,
              importance: page.importance
            }
          });
        }
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Apply boost for verified facts
    for (const result of results) {
      if (result.type === 'fact' && result.metadata?.verificationStatus === 'verified') {
        result.similarity = Math.min(0.99, result.similarity * 1.1);
        result.similarity = Math.round(result.similarity * 1000) / 1000;
      }
    }

    // Re-sort after boost
    results.sort((a, b) => b.similarity - a.similarity);

    return {
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
      threshold,
      searchMode: 'semantic'
    };
  }

  /**
   * Search only facts with semantic similarity
   */
  async searchFacts(query, options = {}) {
    return this.search(query, { ...options, types: ['fact'] });
  }

  /**
   * Search only golden pages with semantic similarity
   */
  async searchPages(query, options = {}) {
    return this.search(query, { ...options, types: ['page'] });
  }

  /**
   * Find similar items to a given fact or page
   */
  async findSimilar(itemId, options = {}) {
    await this.initialize();

    const threshold = options.threshold || 0.5;
    const limit = options.limit || 5;

    // Find the source item
    let sourceItem = null;
    let sourceText = '';
    let sourceType = '';

    if (itemId.startsWith('fact-')) {
      const facts = await fetchLocalFacts(this.clientSlug);
      const factId = itemId.replace('fact-', '');
      sourceItem = facts.find(f => f.id === factId);
      if (sourceItem) {
        sourceText = sourceItem.statement;
        sourceType = 'fact';
      }
    } else if (itemId.startsWith('page-')) {
      const pages = await fetchLocalGoldenPages(this.clientSlug);
      const pageId = itemId.replace('page-', '');
      sourceItem = pages.find(p => p.id === pageId);
      if (sourceItem) {
        sourceText = [sourceItem.title, sourceItem.description, sourceItem.textSample].join(' ');
        sourceType = 'page';
      }
    }

    if (!sourceItem) {
      return { results: [], message: 'Item not found' };
    }

    // Generate embedding for source
    const sourceEmbedding = generateEmbedding(sourceText);

    // Search for similar items
    const results = await this.search(sourceText, {
      threshold,
      limit: limit + 1 // Include self, then filter
    });

    // Filter out self
    results.results = results.results.filter(r => r.id !== itemId);

    return {
      source: {
        id: itemId,
        type: sourceType,
        text: sourceText
      },
      results: results.results.slice(0, limit),
      searchMode: 'semantic'
    };
  }

  /**
   * Get search statistics
   */
  async getStats() {
    await this.initialize();

    const facts = await fetchLocalFacts(this.clientSlug);
    const pages = await fetchLocalGoldenPages(this.clientSlug);

    return {
      embeddingsLoaded: this.embeddings.size,
      factsCount: facts.length,
      pagesCount: pages.length,
      searchMode: 'semantic'
    };
  }
}

// Cache for instances
const searchClients = new Map();

/**
 * Get or create a semantic search client for a client slug
 */
export function getSemanticSearchClient(clientSlug) {
  if (!searchClients.has(clientSlug)) {
    searchClients.set(clientSlug, new SemanticSearchClient(clientSlug));
  }
  return searchClients.get(clientSlug);
}

/**
 * Convenience function for quick semantic search
 */
export async function semanticSearch(query, clientSlug, options = {}) {
  const client = getSemanticSearchClient(clientSlug);
  return client.search(query, options);
}

export default SemanticSearchClient;
