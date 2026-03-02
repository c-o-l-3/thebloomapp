/**
 * Compression Middleware
 * Provides gzip and brotli compression for API responses
 * Optimizes payload size for faster transfers
 */

import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

// Compression configuration
const COMPRESSION_CONFIG = {
  // Minimum size in bytes to trigger compression
  threshold: 1024,
  
  // Compression levels (0-9 for gzip, 0-11 for brotli)
  gzip: {
    level: zlib.constants.Z_BEST_SPEED, // Use speed for API responses
  },
  brotli: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Balance between size and speed
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0,
    },
  },
  
  // MIME types to compress
  filter: (contentType) => {
    const compressibleTypes = [
      'application/json',
      'application/javascript',
      'text/html',
      'text/css',
      'text/plain',
      'text/xml',
      'application/xml',
    ];
    return compressibleTypes.some(type => contentType?.includes(type));
  },
};

/**
 * Detect preferred encoding from Accept-Encoding header
 * Priority: br (brotli) > gzip > deflate > identity
 */
function getPreferredEncoding(acceptEncoding) {
  if (!acceptEncoding) return 'identity';
  
  const encodings = acceptEncoding.toLowerCase().split(',').map(e => e.trim());
  
  // Check for brotli support
  if (encodings.some(e => e.includes('br'))) return 'br';
  
  // Check for gzip support
  if (encodings.some(e => e.includes('gzip'))) return 'gzip';
  
  // Check for deflate support
  if (encodings.some(e => e.includes('deflate'))) return 'deflate';
  
  return 'identity';
}

/**
 * Compress data based on encoding
 */
async function compressData(data, encoding) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data), 'utf8');
  
  switch (encoding) {
    case 'br':
      return brotliCompress(buffer, COMPRESSION_CONFIG.brotli);
    case 'gzip':
      return gzip(buffer, COMPRESSION_CONFIG.gzip);
    case 'deflate':
      return zlib.deflateSync(buffer);
    default:
      return buffer;
  }
}

/**
 * Compression middleware factory
 */
export function compressionMiddleware(options = {}) {
  const config = { ...COMPRESSION_CONFIG, ...options };
  
  return async (req, res, next) => {
    // Skip compression for small responses or non-compressible content
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    
    // Override res.send to add compression
    res.send = async function(data) {
      // Don't compress if already compressed or explicitly disabled
      if (req.headers['x-no-compression'] || res.getHeader('content-encoding')) {
        return originalSend(data);
      }
      
      // Check content type
      const contentType = res.getHeader('content-type') || 'text/html';
      if (!config.filter(contentType)) {
        return originalSend(data);
      }
      
      // Get preferred encoding
      const encoding = getPreferredEncoding(req.headers['accept-encoding']);
      if (encoding === 'identity') {
        return originalSend(data);
      }
      
      try {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
        
        // Skip if below threshold
        if (buffer.length < config.threshold) {
          return originalSend(data);
        }
        
        // Compress data
        const compressed = await compressData(buffer, encoding);
        
        // Set compression headers
        res.setHeader('content-encoding', encoding);
        res.setHeader('vary', 'accept-encoding');
        
        // Update content-length if compression actually helped
        if (compressed.length < buffer.length) {
          res.setHeader('content-length', compressed.length);
          return originalSend(compressed);
        }
      } catch (error) {
        console.error('Compression error:', error);
        // Fall back to uncompressed
      }
      
      return originalSend(data);
    };
    
    // Override res.json to use compression
    res.json = function(data) {
      res.setHeader('content-type', 'application/json');
      return res.send(JSON.stringify(data));
    };
    
    next();
  };
}

/**
 * Stream compression middleware for large responses
 */
export function streamCompression(req, res, next) {
  const encoding = getPreferredEncoding(req.headers['accept-encoding']);
  
  if (encoding === 'identity' || req.headers['x-no-compression']) {
    return next();
  }
  
  let compressor;
  
  switch (encoding) {
    case 'br':
      compressor = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      });
      break;
    case 'gzip':
      compressor = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });
      break;
    case 'deflate':
      compressor = zlib.createDeflate();
      break;
    default:
      return next();
  }
  
  // Set encoding header
  res.setHeader('content-encoding', encoding);
  res.setHeader('vary', 'accept-encoding');
  
  // Remove content-length as it will change
  res.removeHeader('content-length');
  
  // Pipe response through compressor
  compressor.on('error', (err) => {
    console.error('Stream compression error:', err);
    res.end();
  });
  
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  
  compressor.pipe(res);
  
  res.write = function(chunk, encoding) {
    return compressor.write(chunk, encoding);
  };
  
  res.end = function(chunk, encoding) {
    if (chunk) {
      compressor.end(chunk, encoding);
    } else {
      compressor.end();
    }
  };
  
  next();
}

export default compressionMiddleware;