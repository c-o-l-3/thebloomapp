import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Repo root path
const repoRoot = path.resolve(__dirname, '../../../..');

// Synonym expansion for common wedding venue terms
const synonymMap = {
  'pricing': ['price', 'cost', 'fee', 'rate', 'package', 'deposit', 'payment', 'dollar', '$'],
  'cost': ['price', 'pricing', 'fee', 'rate', 'package', 'deposit', 'payment'],
  'capacity': ['guests', 'accommodate', 'hold', 'fit', 'space', 'seating', 'attendance'],
  'guests': ['capacity', 'people', 'attendees', 'attendance', 'seating'],
  'amenities': ['included', 'service', 'coordination', 'facility', 'feature', 'offering'],
  'included': ['amenity', 'service', 'package', 'coordination', 'offering'],
  'catering': ['food', 'meal', 'dining', 'chef', 'kitchen', 'menu'],
  'venue': ['location', 'place', 'site', 'space', 'facility', 'property'],
  'wedding': ['marriage', 'ceremony', 'reception', 'event', 'celebration'],
  'policy': ['rule', 'guideline', 'restriction', 'requirement', 'term'],
  'vendor': ['supplier', 'provider', 'contractor', 'caterer', 'photographer'],
  'booking': ['reserve', 'reservation', 'schedule', 'date', 'availability']
};

/**
 * Expand query with synonyms
 */
function expandQuery(query) {
  const words = query.toLowerCase().split(/\s+/);
  const expanded = new Set(words);
  
  words.forEach(word => {
    if (synonymMap[word]) {
      synonymMap[word].forEach(syn => expanded.add(syn));
    }
  });
  
  return Array.from(expanded);
}

/**
 * Generate embedding for text using enhanced TF-IDF with multiple hash functions
 * and word importance weighting for improved semantic similarity
 */
function generateEmbedding(text) {
  const dimensions = 384;
  const embedding = new Array(dimensions).fill(0);
  
  if (!text || text.trim().length === 0) {
    return embedding;
  }

  // Clean and tokenize
  const cleanText = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const words = cleanText.split(/\s+/);
  const wordFreq = new Map();
  const totalWords = words.length;
  
  // Calculate term frequency
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  // Common stop words to down-weight
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to',
    'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'or',
    'but', 'so', 'yet', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
  
  // Generate embedding with TF-IDF weighting and multiple hash functions
  wordFreq.forEach((freq, word) => {
    // Calculate term frequency weight
    const tf = Math.log(1 + freq / totalWords);
    
    // Down-weight stop words
    const stopWordPenalty = stopWords.has(word) ? 0.3 : 1.0;
    
    // Boost longer words (more likely to be meaningful)
    const lengthBoost = Math.min(1.5, 0.8 + word.length * 0.05);
    
    const weight = tf * stopWordPenalty * lengthBoost;
    
    // Use multiple hash functions with character-level n-grams
    const hashes = [
      hashString(word, 1),
      hashString(word.substring(0, 4), 2),
      hashString(word.substring(word.length - 4), 3),
      hashString(word, 4),
      hashString(word.split('').reverse().join(''), 5)
    ];
    
    hashes.forEach((hash, idx) => {
      const position = Math.abs(hash) % dimensions;
      embedding[position] = Math.min(1, embedding[position] + weight * 0.2);
    });
    
    // Add n-gram representation for phrases
    if (word.length >= 3) {
      for (let i = 0; i < word.length - 2; i++) {
        const trigram = word.substring(i, i + 3);
        const trigramHash = hashString(trigram, 10 + i);
        const position = Math.abs(trigramHash) % dimensions;
        embedding[position] = Math.min(1, embedding[position] + weight * 0.15);
      }
    }
  });

  // Normalize the embedding vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

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
function cosineSimilarity(vecA, vecB) {
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
 * Load facts for a client
 */
async function loadFacts(clientSlug) {
  const factsPath = path.join(repoRoot, 'clients', clientSlug, 'knowledge-hub', 'facts', 'index.json');
  try {
    const data = await fs.readFile(factsPath, 'utf8');
    return JSON.parse(data).facts || [];
  } catch (error) {
    console.warn(`Could not load facts for ${clientSlug}:`, error.message);
    return [];
  }
}

/**
 * Load golden pages for a client
 */
async function loadGoldenPages(clientSlug) {
  const pagesPath = path.join(repoRoot, 'clients', clientSlug, 'knowledge-hub', 'golden-pages', 'index.json');
  try {
    const data = await fs.readFile(pagesPath, 'utf8');
    return JSON.parse(data).pages || [];
  } catch (error) {
    console.warn(`Could not load golden pages for ${clientSlug}:`, error.message);
    return [];
  }
}

/**
 * POST /api/search - Semantic search across facts and golden pages
 */
router.post('/', async (req, res) => {
  try {
    const { 
      query, 
      clientSlug = 'maison-albion', 
      types = ['fact', 'page'],
      threshold = 0.25,
      limit = 10 
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Generate query embedding
    const queryEmbedding = generateEmbedding(query);

    // Load data
    const facts = types.includes('fact') ? await loadFacts(clientSlug) : [];
    const pages = types.includes('page') ? await loadGoldenPages(clientSlug) : [];

    const results = [];

    // Expand query with synonyms for better matching
    const expandedQueryTerms = expandQuery(query);
    const queryLower = query.toLowerCase();
    
    // Search facts with hybrid scoring
    for (const fact of facts) {
      // Combine statement, category, and tags for embedding
      const factText = [
        fact.statement,
        fact.category || '',
        (fact.tags || []).join(' ')
      ].join(' ');
      
      const factEmbedding = generateEmbedding(factText);
      let similarity = cosineSimilarity(queryEmbedding, factEmbedding);
      
      // Hybrid scoring: combine semantic similarity with keyword matching
      const statementLower = fact.statement.toLowerCase();
      const categoryLower = (fact.category || '').toLowerCase();
      const tagsLower = (fact.tags || []).join(' ').toLowerCase();
      
      // Expanded keyword matching with synonyms
      const matchingSynonyms = expandedQueryTerms.filter(term => 
        statementLower.includes(term) || 
        categoryLower.includes(term) ||
        tagsLower.includes(term)
      ).length;
      const synonymBoost = matchingSynonyms > 0 ? 0.15 + (matchingSynonyms * 0.03) : 0;
      
      // Direct match bonus
      const directMatchBonus = statementLower.includes(queryLower) ? 0.35 : 0;
      
      // Category match boost
      const categoryBoost = expandedQueryTerms.some(term => categoryLower.includes(term)) ? 0.2 : 0;
      
      // Tag match boost (tags are curated keywords)
      const tagBoost = (fact.tags || []).some(tag => 
        expandedQueryTerms.some(term => tag.toLowerCase().includes(term))
      ) ? 0.25 : 0;
      
      // Combine scores
      similarity = Math.min(0.99, similarity + synonymBoost + directMatchBonus + categoryBoost + tagBoost);
      
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

    // Search golden pages
    for (const page of pages) {
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

    // Apply boost for verified facts
    for (const result of results) {
      if (result.type === 'fact' && result.metadata?.verificationStatus === 'verified') {
        result.similarity = Math.min(0.99, result.similarity * 1.1);
        result.similarity = Math.round(result.similarity * 1000) / 1000;
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    res.json({
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
      threshold,
      searchMode: 'semantic'
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * POST /api/search/facts - Search only facts
 */
router.post('/facts', async (req, res) => {
  try {
    const { query, clientSlug = 'maison-albion', threshold = 0.25, limit = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryEmbedding = generateEmbedding(query);
    const facts = await loadFacts(clientSlug);

    const results = [];

    for (const fact of facts) {
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

    // Boost verified facts
    for (const result of results) {
      if (result.metadata?.verificationStatus === 'verified') {
        result.similarity = Math.min(0.99, result.similarity * 1.1);
        result.similarity = Math.round(result.similarity * 1000) / 1000;
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    res.json({
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
      threshold,
      searchMode: 'semantic'
    });
  } catch (error) {
    console.error('Search facts error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * POST /api/search/pages - Search only golden pages
 */
router.post('/pages', async (req, res) => {
  try {
    const { query, clientSlug = 'maison-albion', threshold = 0.25, limit = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryEmbedding = generateEmbedding(query);
    const pages = await loadGoldenPages(clientSlug);

    const results = [];

    for (const page of pages) {
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

    results.sort((a, b) => b.similarity - a.similarity);

    res.json({
      query,
      results: results.slice(0, limit),
      totalMatches: results.length,
      threshold,
      searchMode: 'semantic'
    });
  } catch (error) {
    console.error('Search pages error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * GET /api/search/stats - Get search statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { clientSlug = 'maison-albion' } = req.query;

    const facts = await loadFacts(clientSlug);
    const pages = await loadGoldenPages(clientSlug);

    res.json({
      clientSlug,
      factsCount: facts.length,
      pagesCount: pages.length,
      searchMode: 'semantic'
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats', message: error.message });
  }
});

export const searchRouter = router;
