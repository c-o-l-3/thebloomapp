import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

/**
 * KnowledgeHub Service
 * Manages the centralized knowledge repository for each client
 */
export class KnowledgeHub {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.hubDir = path.join(this.clientDir, 'knowledge-hub');
    this.templateDir = path.join(repoRoot, 'templates', 'knowledge-hub');
  }

  /**
   * Get the path to a specific knowledge hub file/directory
   */
  getPath(...segments) {
    return path.join(this.hubDir, ...segments);
  }

  /**
   * Check if the knowledge hub is initialized
   */
  async isInitialized() {
    try {
      await fs.access(this.getPath('config.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the knowledge hub directory structure for a client
   */
  async initialize(options = {}) {
    logger.info(`Initializing Knowledge Hub for ${this.clientSlug}`);

    // Create directory structure
    const dirs = [
      this.hubDir,
      this.getPath('golden-pages'),
      this.getPath('documents'),
      this.getPath('documents', 'uploads'),
      this.getPath('documents', 'extracted'),
      this.getPath('documents', 'chunks'),
      this.getPath('facts'),
      this.getPath('brand-voice'),
      this.getPath('embeddings'),
      this.getPath('verification'),
      this.getPath('sync-state')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Copy template files if they don't exist
    await this.copyTemplateFiles(options);

    logger.success(`Knowledge Hub initialized at ${this.hubDir}`);
    return { hubDir: this.hubDir, initialized: true };
  }

  /**
   * Copy template files to the knowledge hub
   */
  async copyTemplateFiles(options = {}) {
    const templateFiles = [
      { src: 'config.json', dest: 'config.json', transform: true },
      { src: 'golden-pages/index.json', dest: 'golden-pages/index.json' },
      { src: 'documents/index.json', dest: 'documents/index.json' },
      { src: 'facts/index.json', dest: 'facts/index.json' },
      { src: 'brand-voice/profile.json', dest: 'brand-voice/profile.json', transform: true },
      { src: 'embeddings/index.json', dest: 'embeddings/index.json' },
      { src: 'verification/queue.json', dest: 'verification/queue.json' },
      { src: 'sync-state/last-crawl.json', dest: 'sync-state/last-crawl.json' }
    ];

    for (const { src, dest, transform } of templateFiles) {
      const destPath = this.getPath(dest);
      
      try {
        // Check if file already exists
        await fs.access(destPath);
        logger.debug(`Template file already exists: ${dest}`);
        continue;
      } catch {
        // File doesn't exist, copy it
      }

      const srcPath = path.join(this.templateDir, src);
      let content = await fs.readFile(srcPath, 'utf8');

      if (transform) {
        content = this.transformTemplate(content, options);
      }

      await fs.writeFile(destPath, content, 'utf8');
      logger.debug(`Copied template: ${src} -> ${dest}`);
    }
  }

  /**
   * Transform template content with client-specific values
   */
  transformTemplate(content, options = {}) {
    let transformed = content;
    
    // Replace placeholders
    transformed = transformed.replace(/\{\{client-id\}\}/g, this.clientSlug);
    transformed = transformed.replace(/\{\{website-url\}\}/g, options.website || '');
    
    // Update timestamps
    const now = new Date().toISOString();
    transformed = transformed.replace(/"lastUpdated":\s*"[^"]*"/g, `"lastUpdated": "${now}"`);
    
    return transformed;
  }

  /**
   * Read and parse a JSON file from the knowledge hub
   */
  async readJson(filePath) {
    const fullPath = this.getPath(filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Write data as JSON to a file in the knowledge hub
   */
  async writeJson(filePath, data) {
    const fullPath = this.getPath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  /**
   * Generate a unique ID with optional prefix
   */
  generateId(prefix = '') {
    const id = uuidv4().split('-')[0];
    return prefix ? `${prefix}-${id}` : id;
  }

  /**
   * Calculate content hash for change detection
   */
  calculateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
  }

  // ==================== GOLDEN PAGES ====================

  /**
   * Add a website page to golden-pages/index.json
   */
  async addGoldenPage(pageData) {
    const indexPath = 'golden-pages/index.json';
    const index = await this.readJson(indexPath);

    const page = {
      id: pageData.id || this.generateId('page'),
      url: pageData.url,
      title: pageData.title || '',
      description: pageData.description || '',
      importance: pageData.importance || 'medium',
      category: pageData.category || 'other',
      lastCrawled: pageData.lastCrawled || new Date().toISOString(),
      contentHash: pageData.contentHash || this.calculateHash(pageData.textSample || ''),
      extractedFacts: pageData.extractedFacts || [],
      embeddingId: pageData.embeddingId || null,
      imageUrls: pageData.imageUrls || [],
      textSample: pageData.textSample || ''
    };

    // Check if page already exists
    const existingIndex = index.pages.findIndex(p => p.url === page.url);
    if (existingIndex >= 0) {
      // Update existing page
      const existing = index.pages[existingIndex];
      page.id = existing.id; // Keep the same ID
      page.extractedFacts = pageData.extractedFacts || existing.extractedFacts;
      page.embeddingId = pageData.embeddingId || existing.embeddingId;
      index.pages[existingIndex] = { ...existing, ...page };
      logger.debug(`Updated golden page: ${page.url}`);
    } else {
      // Add new page
      index.pages.push(page);
      logger.debug(`Added golden page: ${page.url}`);
    }

    index.lastUpdated = new Date().toISOString();
    await this.writeJson(indexPath, index);

    return page;
  }

  /**
   * Get golden pages with optional filtering
   */
  async getGoldenPages(filters = {}) {
    const index = await this.readJson('golden-pages/index.json');
    let pages = index.pages;

    if (filters.category) {
      pages = pages.filter(p => p.category === filters.category);
    }

    if (filters.importance) {
      const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (filters.importance === 'high+') {
        pages = pages.filter(p => ['critical', 'high'].includes(p.importance));
      } else {
        pages = pages.filter(p => p.importance === filters.importance);
      }
    }

    if (filters.verified !== undefined) {
      // Filter by whether page has extracted facts that are verified
      // This is a simplified implementation
      pages = pages.filter(p => filters.verified ? p.extractedFacts.length > 0 : p.extractedFacts.length === 0);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      pages = pages.filter(p => 
        (p.title && p.title.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower)) ||
        (p.url && p.url.toLowerCase().includes(searchLower))
      );
    }

    // Sort by importance
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    pages.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

    return pages;
  }

  /**
   * Get a single golden page by ID
   */
  async getGoldenPage(pageId) {
    const index = await this.readJson('golden-pages/index.json');
    return index.pages.find(p => p.id === pageId) || null;
  }

  /**
   * Update a golden page
   */
  async updateGoldenPage(pageId, updates) {
    const indexPath = 'golden-pages/index.json';
    const index = await this.readJson(indexPath);

    const pageIndex = index.pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) {
      throw new Error(`Golden page not found: ${pageId}`);
    }

    index.pages[pageIndex] = { ...index.pages[pageIndex], ...updates };
    index.lastUpdated = new Date().toISOString();
    await this.writeJson(indexPath, index);

    return index.pages[pageIndex];
  }

  // ==================== DOCUMENTS ====================

  /**
   * Import a document into the knowledge hub
   */
  async importDocument(filePath, metadata = {}) {
    const filename = path.basename(filePath);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const docId = this.generateId('doc');
    const sanitizedFilename = this.sanitizeFilename(filename);
    const storedFilename = `${docId}-${sanitizedFilename}`;
    
    // Copy file to uploads directory
    const uploadDir = this.getPath('documents', 'uploads');
    const destPath = path.join(uploadDir, storedFilename);
    
    await fs.copyFile(filePath, destPath);

    // Get file stats
    const stats = await fs.stat(destPath);

    // Create document entry
    const document = {
      id: docId,
      filename: storedFilename,
      originalName: metadata.originalName || filename,
      type: ext,
      category: metadata.category || 'other',
      uploadedAt: new Date().toISOString(),
      uploadedBy: metadata.uploadedBy || 'system',
      fileSize: stats.size,
      pages: metadata.pages || null,
      ocrStatus: 'pending',
      ocrTextPath: null,
      wordCount: null,
      chunkCount: null,
      embeddingIds: [],
      extractedFacts: [],
      tags: metadata.tags || []
    };

    // Add to index
    const indexPath = 'documents/index.json';
    const index = await this.readJson(indexPath);
    index.documents.push(document);
    index.lastUpdated = new Date().toISOString();
    await this.writeJson(indexPath, index);

    logger.success(`Imported document: ${filename} -> ${docId}`);
    return document;
  }

  /**
   * Update document OCR status and extracted data
   */
  async updateDocumentOcr(docId, ocrData) {
    const indexPath = 'documents/index.json';
    const index = await this.readJson(indexPath);

    const docIndex = index.documents.findIndex(d => d.id === docId);
    if (docIndex === -1) {
      throw new Error(`Document not found: ${docId}`);
    }

    index.documents[docIndex] = {
      ...index.documents[docIndex],
      ...ocrData,
      ocrStatus: ocrData.ocrStatus || 'completed'
    };

    index.lastUpdated = new Date().toISOString();
    await this.writeJson(indexPath, index);

    return index.documents[docIndex];
  }

  /**
   * Get all documents or a specific document
   */
  async getDocuments(docId = null) {
    const index = await this.readJson('documents/index.json');
    
    if (docId) {
      return index.documents.find(d => d.id === docId) || null;
    }
    
    return index.documents;
  }

  /**
   * Get document by ID
   */
  async getDocument(docId) {
    return this.getDocuments(docId);
  }

  // ==================== FACTS ====================

  /**
   * Add a structured fact to the facts database
   */
  async addFact(factData) {
    const indexPath = 'facts/index.json';
    const index = await this.readJson(indexPath);

    const fact = {
      id: factData.id || this.generateId('fact'),
      category: factData.category || 'venue-details',
      subcategory: factData.subcategory || '',
      type: factData.type || 'text',
      statement: factData.statement,
      value: factData.value !== undefined ? factData.value : null,
      unit: factData.unit || null,
      validFrom: factData.validFrom || null,
      validUntil: factData.validUntil || null,
      source: {
        type: factData.source?.type || 'manual-entry',
        reference: factData.source?.reference || '',
        url: factData.source?.url || null,
        extractedAt: factData.source?.extractedAt || new Date().toISOString()
      },
      confidence: factData.confidence !== undefined ? factData.confidence : 0.8,
      verificationStatus: factData.verificationStatus || 'ai-extracted',
      verifiedBy: factData.verifiedBy || null,
      verifiedAt: factData.verifiedAt || null,
      verificationNotes: factData.verificationNotes || null,
      tags: factData.tags || [],
      embeddingId: factData.embeddingId || null,
      usedIn: factData.usedIn || []
    };

    // Check if fact already exists (by statement hash)
    const existingIndex = index.facts.findIndex(f => 
      f.statement === fact.statement && f.category === fact.category
    );

    if (existingIndex >= 0) {
      // Update existing fact
      const existing = index.facts[existingIndex];
      fact.id = existing.id;
      index.facts[existingIndex] = { ...existing, ...fact };
      logger.debug(`Updated fact: ${fact.id}`);
    } else {
      // Add new fact
      index.facts.push(fact);
      logger.debug(`Added fact: ${fact.id}`);
    }

    // Update statistics
    index.factCount = index.facts.length;
    index.verifiedCount = index.facts.filter(f => f.verificationStatus === 'verified').length;
    index.lastUpdated = new Date().toISOString();

    // Update category counts
    const category = index.categories.find(c => c.id === fact.category);
    if (category) {
      category.factCount = index.facts.filter(f => f.category === fact.category).length;
    }

    await this.writeJson(indexPath, index);

    // Add to verification queue if confidence is low
    if (fact.confidence < 0.85 && fact.verificationStatus === 'ai-extracted') {
      await this.addToVerificationQueue(fact);
    }

    return fact;
  }

  /**
   * Get facts with optional filtering by category
   */
  async getFacts(category = null, options = {}) {
    const index = await this.readJson('facts/index.json');
    let facts = index.facts;

    if (category) {
      facts = facts.filter(f => f.category === category);
    }

    if (options.subcategory) {
      facts = facts.filter(f => f.subcategory === options.subcategory);
    }

    if (options.verifiedOnly) {
      facts = facts.filter(f => f.verificationStatus === 'verified');
    }

    if (options.tags && options.tags.length > 0) {
      facts = facts.filter(f => 
        options.tags.some(tag => f.tags.includes(tag))
      );
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      facts = facts.filter(f => 
        f.statement.toLowerCase().includes(searchLower) ||
        f.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by confidence (highest first) then by verification status
    const statusOrder = { verified: 0, 'ai-extracted': 1, 'pending-review': 2, disputed: 3, deprecated: 4 };
    facts.sort((a, b) => {
      if (a.verificationStatus !== b.verificationStatus) {
        return statusOrder[a.verificationStatus] - statusOrder[b.verificationStatus];
      }
      return b.confidence - a.confidence;
    });

    return facts;
  }

  /**
   * Get a single fact by ID
   */
  async getFact(factId) {
    const index = await this.readJson('facts/index.json');
    return index.facts.find(f => f.id === factId) || null;
  }

  /**
   * Verify a fact
   */
  async verifyFact(factId, verification) {
    const indexPath = 'facts/index.json';
    const index = await this.readJson(indexPath);

    const factIndex = index.facts.findIndex(f => f.id === factId);
    if (factIndex === -1) {
      throw new Error(`Fact not found: ${factId}`);
    }

    const fact = index.facts[factIndex];
    fact.verificationStatus = verification.status || 'verified';
    fact.verifiedBy = verification.verifiedBy || 'system';
    fact.verifiedAt = new Date().toISOString();
    fact.verificationNotes = verification.notes || null;
    fact.confidence = verification.confidence || 1.0;

    index.verifiedCount = index.facts.filter(f => f.verificationStatus === 'verified').length;
    index.lastUpdated = new Date().toISOString();

    await this.writeJson(indexPath, index);

    // Remove from verification queue if present
    await this.removeFromVerificationQueue(factId);

    logger.success(`Verified fact: ${factId} (${fact.verificationStatus})`);
    return fact;
  }

  /**
   * Add fact to verification queue
   */
  async addToVerificationQueue(fact) {
    const queuePath = 'verification/queue.json';
    const queue = await this.readJson(queuePath);

    // Check if already in queue
    if (queue.queue.some(item => item.factId === fact.id)) {
      return;
    }

    queue.queue.push({
      factId: fact.id,
      statement: fact.statement,
      confidence: fact.confidence,
      source: fact.source,
      extractedAt: fact.source.extractedAt,
      priority: fact.confidence < 0.7 ? 'high' : 'medium',
      reason: fact.confidence < 0.7 
        ? 'Low confidence score requires immediate review'
        : 'New AI-extracted fact needs verification'
    });

    queue.pendingCount = queue.queue.length;
    queue.lastUpdated = new Date().toISOString();

    await this.writeJson(queuePath, queue);
  }

  /**
   * Remove fact from verification queue
   */
  async removeFromVerificationQueue(factId) {
    const queuePath = 'verification/queue.json';
    const queue = await this.readJson(queuePath);

    queue.queue = queue.queue.filter(item => item.factId !== factId);
    queue.pendingCount = queue.queue.length;
    queue.lastUpdated = new Date().toISOString();

    await this.writeJson(queuePath, queue);
  }

  /**
   * Get verification queue
   */
  async getVerificationQueue() {
    return this.readJson('verification/queue.json');
  }

  // ==================== BRAND VOICE ====================

  /**
   * Get brand voice profile
   */
  async getBrandVoice() {
    return this.readJson('brand-voice/profile.json');
  }

  /**
   * Update brand voice profile
   */
  async updateBrandVoice(voiceData) {
    const profilePath = 'brand-voice/profile.json';
    const existing = await this.readJson(profilePath);

    const updated = {
      ...existing,
      ...voiceData,
      version: this.incrementVersion(existing.version),
      lastUpdated: new Date().toISOString()
    };

    // Deep merge for nested objects
    if (voiceData.voice) {
      updated.voice = { ...existing.voice, ...voiceData.voice };
    }
    if (voiceData.vocabulary) {
      updated.vocabulary = { ...existing.vocabulary, ...voiceData.vocabulary };
    }
    if (voiceData.tone) {
      updated.tone = { ...existing.tone, ...voiceData.tone };
    }
    if (voiceData.visual) {
      updated.visual = { ...existing.visual, ...voiceData.visual };
    }

    await this.writeJson(profilePath, updated);
    logger.success('Updated brand voice profile');
    return updated;
  }

  /**
   * Initialize brand voice from location config
   */
  async initializeBrandVoice(locationConfig) {
    const voiceData = {
      companyName: locationConfig.name || '',
      website: locationConfig.contact?.website || '',
      logoUrl: locationConfig.logoUrl || '',
      voice: {
        adjectives: ['warm', 'elegant', 'approachable', 'knowledgeable', 'romantic'],
        personality: 'An elegant but approachable host who genuinely loves celebrations',
        do: [
          'Use warm, inviting language',
          'Refer to the venue as "we" and "our team"',
          'Include specific details and numbers',
          'Address the couple by first name',
          'Share genuine enthusiasm'
        ],
        dont: [
          'Use pushy sales language',
          'Be overly formal or stuffy',
          'Make promises that can\'t be kept',
          'Use generic wedding industry buzzwords'
        ]
      }
    };

    return this.updateBrandVoice(voiceData);
  }

  // ==================== UTILITIES ====================

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
  }

  /**
   * Increment version string (e.g., "1.0.0" -> "1.0.1")
   */
  incrementVersion(version) {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  /**
   * Update sync state after crawl
   */
  async updateSyncState(crawlData) {
    const statePath = 'sync-state/last-crawl.json';
    const existing = await this.readJson(statePath);

    const updated = {
      ...existing,
      version: this.incrementVersion(existing.version),
      lastCrawl: {
        startedAt: crawlData.startedAt,
        completedAt: new Date().toISOString(),
        url: crawlData.url,
        pagesCrawled: crawlData.pagesCrawled,
        pagesChanged: crawlData.pagesChanged || 0,
        newFactsExtracted: crawlData.newFactsExtracted || 0,
        status: 'completed'
      },
      crawlHistory: [
        {
          date: new Date().toISOString(),
          pagesCrawled: crawlData.pagesCrawled,
          pagesChanged: crawlData.pagesChanged || 0,
          status: 'completed'
        },
        ...(existing.crawlHistory || []).slice(0, 9) // Keep last 10
      ]
    };

    await this.writeJson(statePath, updated);
    return updated;
  }

  /**
   * Get knowledge hub statistics
   */
  async getStats() {
    const [goldenPages, facts, documents, queue] = await Promise.all([
      this.readJson('golden-pages/index.json'),
      this.readJson('facts/index.json'),
      this.readJson('documents/index.json'),
      this.readJson('verification/queue.json')
    ]);

    return {
      clientSlug: this.clientSlug,
      goldenPages: {
        total: goldenPages.pages.length,
        byImportance: {
          critical: goldenPages.pages.filter(p => p.importance === 'critical').length,
          high: goldenPages.pages.filter(p => p.importance === 'high').length,
          medium: goldenPages.pages.filter(p => p.importance === 'medium').length,
          low: goldenPages.pages.filter(p => p.importance === 'low').length
        }
      },
      facts: {
        total: facts.factCount,
        verified: facts.verifiedCount,
        pending: facts.factCount - facts.verifiedCount,
        byCategory: facts.categories.map(c => ({
          id: c.id,
          name: c.name,
          count: c.factCount
        }))
      },
      documents: {
        total: documents.documents.length,
        byStatus: {
          completed: documents.documents.filter(d => d.ocrStatus === 'completed').length,
          pending: documents.documents.filter(d => d.ocrStatus === 'pending').length,
          processing: documents.documents.filter(d => d.ocrStatus === 'processing').length,
          failed: documents.documents.filter(d => d.ocrStatus === 'failed').length
        }
      },
      verification: {
        pending: queue.pendingCount
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

export default KnowledgeHub;
