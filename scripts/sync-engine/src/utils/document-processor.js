import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Document Processor Utilities
 * Handles text extraction from various document formats and text processing
 */

/**
 * Extract text from a PDF file using pdf-parse
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, pages: number, info: object}>}
 */
export async function extractTextFromPDF(filePath) {
  try {
    // Dynamic import to handle potential missing dependency gracefully
    let pdfParse;
    try {
      const module = await import('pdf-parse');
      pdfParse = module.default || module;
    } catch (importError) {
      logger.warn('pdf-parse not installed, using fallback extraction');
      return extractTextFromPDFFallback(filePath);
    }

    const dataBuffer = await fs.readFile(filePath);
    const result = await pdfParse(dataBuffer);

    return {
      text: result.text || '',
      pages: result.numpages || 0,
      info: result.info || {},
      version: result.version || null
    };
  } catch (error) {
    logger.error(`PDF extraction failed for ${filePath}`, { error: error.message });
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Fallback PDF extraction when pdf-parse is not available
 * Reads file as text and attempts basic extraction
 */
async function extractTextFromPDFFallback(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    // PDF files contain text mixed with binary data
    // Extract readable ASCII characters
    let text = '';
    let inText = false;
    
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      // Look for text markers in PDF
      if (byte === 40 || byte === 60) { // '(' or '<'
        inText = true;
      } else if (byte === 41 || byte === 62) { // ')' or '>'
        inText = false;
        text += ' ';
      } else if (inText && byte >= 32 && byte < 127) {
        text += String.fromCharCode(byte);
      }
    }

    // Clean up extracted text
    text = text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .replace(/\\(.)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text,
      pages: 0, // Unknown in fallback mode
      info: {},
      version: null,
      fallback: true
    };
  } catch (error) {
    logger.error(`Fallback PDF extraction failed for ${filePath}`, { error: error.message });
    throw new Error(`Failed to extract text from PDF (fallback): ${error.message}`);
  }
}

/**
 * Extract text from a DOCX file using mammoth
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<{text: string, pages: number|null, messages: array}>}
 */
export async function extractTextFromDOCX(filePath) {
  try {
    // Dynamic import to handle potential missing dependency gracefully
    let mammoth;
    try {
      const module = await import('mammoth');
      mammoth = module.default || module;
    } catch (importError) {
      logger.warn('mammoth not installed, using fallback extraction');
      return extractTextFromDOCXFallback(filePath);
    }

    const result = await mammoth.extractRawText({ path: filePath });

    // Estimate pages (rough approximation: ~500 words per page)
    const wordCount = result.value.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / 500);

    return {
      text: result.value || '',
      pages: estimatedPages,
      wordCount,
      messages: result.messages || [],
      rawXml: null
    };
  } catch (error) {
    logger.error(`DOCX extraction failed for ${filePath}`, { error: error.message });
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

/**
 * Fallback DOCX extraction using unzip and XML parsing
 */
async function extractTextFromDOCXFallback(filePath) {
  try {
    // DOCX is a zip file containing XML
    // Read document.xml from the zip
    let JSZip;
    try {
      const module = await import('jszip');
      JSZip = module.default || module;
    } catch {
      // If JSZip not available, return empty with error
      return {
        text: '',
        pages: null,
        wordCount: 0,
        messages: ['DOCX extraction requires mammoth or jszip package'],
        fallback: true,
        error: 'Dependencies not available'
      };
    }

    const buffer = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(buffer);
    
    // Read word/document.xml
    const documentXml = await zip.file('word/document.xml')?.async('text');
    
    if (!documentXml) {
      throw new Error('Could not find document.xml in DOCX');
    }

    // Simple XML text extraction
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = textMatches
      .map(match => match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const wordCount = text.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / 500);

    return {
      text,
      pages: estimatedPages,
      wordCount,
      messages: ['Extracted using fallback method'],
      fallback: true
    };
  } catch (error) {
    logger.error(`Fallback DOCX extraction failed for ${filePath}`, { error: error.message });
    throw new Error(`Failed to extract text from DOCX (fallback): ${error.message}`);
  }
}

/**
 * Extract text from a plain text file
 * @param {string} filePath - Path to the text file
 * @returns {Promise<{text: string, pages: number|null, wordCount: number}>}
 */
export async function extractTextFromTXT(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const estimatedPages = Math.ceil(wordCount / 500);

    return {
      text,
      pages: estimatedPages,
      wordCount,
      encoding: 'utf8'
    };
  } catch (error) {
    logger.error(`Text file extraction failed for ${filePath}`, { error: error.message });
    throw new Error(`Failed to read text file: ${error.message}`);
  }
}

/**
 * Extract text from an image using OCR (requires tesseract.js)
 * @param {string} filePath - Path to the image file
 * @returns {Promise<{text: string, confidence: number|null}>}
 */
export async function extractTextFromImage(filePath) {
  try {
    let Tesseract;
    try {
      const module = await import('tesseract.js');
      Tesseract = module.default || module;
    } catch (importError) {
      logger.warn('tesseract.js not installed, OCR unavailable');
      return {
        text: '',
        confidence: null,
        error: 'tesseract.js not installed'
      };
    }

    const result = await Tesseract.recognize(filePath, 'eng');
    
    return {
      text: result.data.text || '',
      confidence: result.data.confidence || null,
      words: result.data.words?.length || 0
    };
  } catch (error) {
    logger.error(`OCR extraction failed for ${filePath}`, { error: error.message });
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

/**
 * Extract text from any supported document type
 * @param {string} filePath - Path to the document
 * @returns {Promise<{text: string, type: string, pages: number|null, wordCount: number}>}
 */
export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return { type: 'pdf', ...(await extractTextFromPDF(filePath)) };
    case '.docx':
    case '.doc':
      return { type: 'docx', ...(await extractTextFromDOCX(filePath)) };
    case '.txt':
    case '.md':
    case '.json':
    case '.csv':
      return { type: 'text', ...(await extractTextFromTXT(filePath)) };
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.webp':
    case '.tiff':
    case '.bmp':
      return { type: 'image', ...(await extractTextFromImage(filePath)) };
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Chunk text into semantic pieces for embedding
 * @param {string} text - The text to chunk
 * @param {object} options - Chunking options
 * @returns {Array<{text: string, index: number, start: number, end: number}>}
 */
export function chunkText(text, options = {}) {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    splitOn = ['\n\n', '\n', '. ', '? ', '! ', ' ']
  } = options;

  if (!text || text.length === 0) {
    return [];
  }

  const chunks = [];
  let position = 0;
  let index = 0;

  while (position < text.length) {
    // Calculate chunk boundaries
    let end = Math.min(position + chunkSize, text.length);
    
    // Try to find a natural break point
    if (end < text.length) {
      for (const delimiter of splitOn) {
        const breakPoint = text.lastIndexOf(delimiter, end);
        if (breakPoint > position) {
          end = breakPoint + delimiter.length;
          break;
        }
      }
    }

    // Extract chunk
    const chunkText = text.slice(position, end).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index,
        start: position,
        end: end,
        charCount: chunkText.length,
        wordCount: chunkText.split(/\s+/).filter(w => w.length > 0).length
      });
      index++;
    }

    // Move position forward with overlap
    position = end - chunkOverlap;
    if (position >= end) {
      position = end;
    }
  }

  return chunks;
}

/**
 * Generate a placeholder embedding for text
 * In production, this would call an embedding API like OpenAI
 * @param {string} text - The text to embed
 * @param {object} options - Embedding options
 * @returns {Promise<{embedding: number[], model: string, dimensions: number}>}
 */
export async function generateEmbedding(text, options = {}) {
  const {
    model = 'text-embedding-3-large',
    dimensions = 3072,
    provider = 'openai'
  } = options;

  // This is a placeholder implementation
  // In production, you would call an actual embedding API
  logger.debug(`Generating embedding (placeholder) for ${text.slice(0, 50)}...`);

  // Generate a deterministic pseudo-random embedding based on text hash
  // This is NOT for production use - just for development/testing
  const hash = hashString(text);
  const embedding = [];
  
  // Use hash to seed pseudo-random values
  for (let i = 0; i < Math.min(dimensions, 1536); i++) {
    const hashValue = hash + i * 31;
    // Generate value between -1 and 1
    const value = ((hashValue % 2000) / 1000) - 1;
    embedding.push(parseFloat(value.toFixed(6)));
  }

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  const normalizedEmbedding = embedding.map(val => val / magnitude);

  return {
    embedding: normalizedEmbedding,
    model,
    dimensions: normalizedEmbedding.length,
    provider,
    placeholder: true,
    note: 'This is a placeholder embedding. Use actual embedding API in production.'
  };
}

/**
 * Simple string hash function for deterministic pseudo-random values
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Sanitize a filename for safe storage
 * @param {string} filename - The original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename) return 'unnamed';
  
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-')  // Replace invalid chars with dash
    .replace(/-+/g, '-')               // Collapse multiple dashes
    .replace(/^-+|-+$/g, '')           // Trim leading/trailing dashes
    .toLowerCase()
    .slice(0, 200);                    // Limit length
}

/**
 * Detect the document type from filename and/or content
 * @param {string} filePath - Path to the document
 * @returns {string} - Document type category
 */
export function detectDocumentType(filePath) {
  const filename = path.basename(filePath).toLowerCase();
  
  // Pricing-related keywords
  if (/price|cost|package|investment|fee|rate/i.test(filename)) {
    return 'pricing';
  }
  
  // Contract/legal keywords
  if (/contract|agreement|terms|policy|legal/i.test(filename)) {
    return 'contract';
  }
  
  // Menu/food keywords
  if (/menu|catering|food|dining|chef/i.test(filename)) {
    return 'menu';
  }
  
  // Floor plan keywords
  if (/floor.?plan|layout|map|diagram|seating/i.test(filename)) {
    return 'floor-plan';
  }
  
  // Brochure/marketing keywords
  if (/brochure|guide|packet|welcome|info/i.test(filename)) {
    return 'brochure';
  }
  
  return 'other';
}

/**
 * Extract metadata from a document
 * @param {string} filePath - Path to the document
 * @returns {Promise<object>} - Document metadata
 */
export async function extractMetadata(filePath) {
  const stats = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);
  
  const metadata = {
    filename,
    extension: ext,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    category: detectDocumentType(filePath),
    detectedType: null
  };

  // Try to extract more metadata based on file type
  try {
    switch (ext) {
      case '.pdf': {
        let pdfParse;
        try {
          const module = await import('pdf-parse');
          pdfParse = module.default || module;
          const dataBuffer = await fs.readFile(filePath);
          const result = await pdfParse(dataBuffer);
          metadata.pages = result.numpages;
          metadata.detectedType = 'pdf';
          if (result.info) {
            metadata.title = result.info.Title;
            metadata.author = result.info.Author;
            metadata.subject = result.info.Subject;
            metadata.creator = result.info.Creator;
          }
        } catch {
          // Fallback
        }
        break;
      }
      case '.docx': {
        // Try to extract core.xml for metadata
        let JSZip;
        try {
          const module = await import('jszip');
          JSZip = module.default || module;
          const buffer = await fs.readFile(filePath);
          const zip = await JSZip.loadAsync(buffer);
          const coreXml = await zip.file('docProps/core.xml')?.async('text');
          if (coreXml) {
            const titleMatch = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/);
            const authorMatch = coreXml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
            if (titleMatch) metadata.title = titleMatch[1];
            if (authorMatch) metadata.author = authorMatch[1];
          }
        } catch {
          // Fallback
        }
        break;
      }
    }
  } catch (error) {
    logger.warn(`Could not extract detailed metadata for ${filename}`);
  }

  return metadata;
}

/**
 * Process a document end-to-end: extract text, chunk, and prepare for embedding
 * @param {string} filePath - Path to the document
 * @param {object} options - Processing options
 * @returns {Promise<object>} - Processed document data
 */
export async function processDocument(filePath, options = {}) {
  logger.info(`Processing document: ${path.basename(filePath)}`);

  const startTime = Date.now();
  
  // Step 1: Extract metadata
  const metadata = await extractMetadata(filePath);
  
  // Step 2: Extract text
  const extraction = await extractText(filePath);
  
  // Step 3: Chunk the text
  const chunks = chunkText(extraction.text, options.chunkOptions);
  
  // Step 4: Generate embeddings for chunks (optional)
  let embeddings = [];
  if (options.generateEmbeddings) {
    embeddings = await Promise.all(
      chunks.map(async (chunk, i) => {
        logger.progressBar(i + 1, chunks.length);
        return generateEmbedding(chunk.text, options.embeddingOptions);
      })
    );
    if (chunks.length > 0) process.stdout.write('\n');
  }

  const duration = Date.now() - startTime;

  return {
    metadata,
    extraction: {
      type: extraction.type,
      text: extraction.text,
      pages: extraction.pages,
      wordCount: extraction.wordCount || extraction.text.split(/\s+/).length
    },
    chunks,
    embeddings: embeddings.map(e => e.embedding),
    stats: {
      chunkCount: chunks.length,
      hasEmbeddings: embeddings.length > 0,
      processingTimeMs: duration
    }
  };
}

export default {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  extractTextFromImage,
  extractText,
  chunkText,
  generateEmbedding,
  sanitizeFilename,
  detectDocumentType,
  extractMetadata,
  processDocument
};
