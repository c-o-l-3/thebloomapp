import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 */
function generateEmbedding(text) {
  const dimensions = 384;
  const embedding = new Array(dimensions).fill(0);
  
  if (!text || text.trim().length === 0) {
    return embedding;
  }

  const cleanText = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  const words = cleanText.split(/\s+/);
  const wordFreq = new Map();
  const totalWords = words.length;
  
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to',
    'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'or',
    'but', 'so', 'yet', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
  
  wordFreq.forEach((freq, word) => {
    const tf = Math.log(1 + freq / totalWords);
    const stopWordPenalty = stopWords.has(word) ? 0.3 : 1.0;
    const lengthBoost = Math.min(1.5, 0.8 + word.length * 0.05);
    const weight = tf * stopWordPenalty * lengthBoost;
    
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
    
    if (word.length >= 3) {
      for (let i = 0; i < word.length - 2; i++) {
        const trigram = word.substring(i, i + 3);
        const trigramHash = hashString(trigram, 10 + i);
        const position = Math.abs(trigramHash) % dimensions;
        embedding[position] = Math.min(1, embedding[position] + weight * 0.15);
      }
    }
  });

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

async function testSemanticSearch() {
  console.log('\n🔍 Testing Semantic Search Implementation (Knowledge Hub v2)\n');
  
  const repoRoot = path.resolve(__dirname, '../..');
  const factsPath = path.join(repoRoot, 'clients', 'maison-albion', 'knowledge-hub', 'facts', 'index.json');
  
  try {
    const data = await fs.readFile(factsPath, 'utf8');
    const facts = JSON.parse(data).facts || [];
    
    console.log(`Loaded ${facts.length} facts from knowledge hub\n`);
    
    const queries = [
      'How many guests can the venue hold?',
      'What is the deposit amount?',
      'Do you offer catering services?',
      'What is included in the package?',
      'venue capacity',
      'pricing',
      'amenities'
    ];
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Query Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    for (const query of queries) {
      console.log(`\n📌 Query: "${query}"`);
      console.log('─────────────────────────────────────────────────────────────');
      
      const expandedTerms = expandQuery(query);
      const queryEmbedding = generateEmbedding(expandedTerms.join(' '));
      const results = [];
      
      for (const fact of facts) {
        const factText = [
          fact.statement,
          fact.category || '',
          (fact.tags || []).join(' ')
        ].join(' ');
        
        const factEmbedding = generateEmbedding(factText);
        let similarity = cosineSimilarity(queryEmbedding, factEmbedding);
        
        // Hybrid scoring with synonyms and tags
        const statementLower = fact.statement.toLowerCase();
        const categoryLower = (fact.category || '').toLowerCase();
        const tagsLower = (fact.tags || []).join(' ').toLowerCase();
        
        const matchingSynonyms = expandedTerms.filter(term => 
          statementLower.includes(term) || categoryLower.includes(term) || tagsLower.includes(term)
        ).length;
        const synonymBoost = matchingSynonyms > 0 ? 0.15 + (matchingSynonyms * 0.03) : 0;
        
        const tagBoost = (fact.tags || []).some(tag => 
          expandedTerms.some(term => tag.toLowerCase().includes(term))
        ) ? 0.25 : 0;
        
        similarity = Math.min(0.99, similarity + synonymBoost + tagBoost);
        
        if (similarity >= 0.25) {
          results.push({
            statement: fact.statement,
            similarity,
            category: fact.category
          });
        }
      }
      
      results.sort((a, b) => b.similarity - a.similarity);
      
      const topResults = results.slice(0, 3);
      
      if (topResults.length === 0) {
        console.log('   ⚠️  No matching results');
      } else {
        topResults.forEach((result, i) => {
          const percentage = Math.round(result.similarity * 100);
          const indicator = percentage >= 60 ? '✅' : percentage >= 40 ? '⚡' : '🔍';
          console.log(`   ${i + 1}. ${indicator} ${percentage}% - ${result.statement.substring(0, 80)}...`);
        });
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Semantic search test completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test accuracy for known queries
    console.log('\n🎯 Accuracy Test:');
    console.log('─────────────────────────────────────────────────────────────');
    
    const accuracyTests = [
      {
        query: 'capacity',
        expected: /guests|capacity|accommodate/i,
        description: 'Should find capacity-related facts'
      },
      {
        query: 'pricing',
        expected: /\$|price|cost|package|deposit/i,
        description: 'Should find pricing-related facts'
      },
      {
        query: 'amenities',
        expected: /included|coordination|service|amenity/i,
        description: 'Should find amenity-related facts'
      }
    ];
    
    let passed = 0;
    
    for (const test of accuracyTests) {
      const expandedTerms = expandQuery(test.query);
      const queryEmbedding = generateEmbedding(expandedTerms.join(' '));
      const results = [];
      
      for (const fact of facts) {
        const factText = [fact.statement, fact.category || '', (fact.tags || []).join(' ')].join(' ');
        const factEmbedding = generateEmbedding(factText);
        let similarity = cosineSimilarity(queryEmbedding, factEmbedding);
        
        // Apply hybrid scoring
        const statementLower = fact.statement.toLowerCase();
        const categoryLower = (fact.category || '').toLowerCase();
        const tagsLower = (fact.tags || []).join(' ').toLowerCase();
        
        const matchingSynonyms = expandedTerms.filter(term => 
          statementLower.includes(term) || categoryLower.includes(term) || tagsLower.includes(term)
        ).length;
        const synonymBoost = matchingSynonyms > 0 ? 0.15 + (matchingSynonyms * 0.03) : 0;
        const tagBoost = (fact.tags || []).some(tag => 
          expandedTerms.some(term => tag.toLowerCase().includes(term))
        ) ? 0.25 : 0;
        
        similarity = Math.min(0.99, similarity + synonymBoost + tagBoost);
        
        if (similarity >= 0.25) {
          results.push({
            statement: fact.statement,
            similarity,
            matches: test.expected.test(fact.statement)
          });
        }
      }
      
      results.sort((a, b) => b.similarity - a.similarity);
      const topResult = results[0];
      
      if (topResult && topResult.matches) {
        passed++;
        console.log(`   ✅ ${test.description}: PASSED (${Math.round(topResult.similarity * 100)}% confidence)`);
      } else {
        console.log(`   ❌ ${test.description}: FAILED`);
      }
    }
    
    const accuracy = Math.round((passed / accuracyTests.length) * 100);
    console.log(`\n   Overall Accuracy: ${accuracy}% (${passed}/${accuracyTests.length} tests passed)`);
    console.log(`   Target: 95% (with production AI embeddings)\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSemanticSearch();
