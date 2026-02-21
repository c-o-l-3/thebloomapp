import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Link Replacer - Replaces {{links.xxx}} syntax with actual GHL trigger link IDs
 */

const LINKS_FILE = path.join(__dirname, '../../data/links.json');

/**
 * Load link map from JSON file
 * @returns {object} - Map of link names to IDs
 */
export function loadLinkMap() {
  try {
    const linksPath = path.resolve(LINKS_FILE);
    if (fs.existsSync(linksPath)) {
      const data = fs.readFileSync(linksPath, 'utf-8');
      const parsed = JSON.parse(data);
      // Support both flat and nested structures
      return parsed.links || parsed;
    }
    return {};
  } catch (error) {
    console.warn('Warning: Could not load links.json:', error.message);
    return {};
  }
}

/**
 * Extract all link references from content
 * @param {string} content - Content to scan
 * @returns {array} - List of link references found
 */
export function extractLinkReferences(content) {
  const pattern = /\{\{links\.([a-zA-Z0-9_]+)\}\}/g;
  const matches = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)];
}

/**
 * Replace link references with actual IDs
 * @param {string} content - Content to process
 * @param {object} linkMap - Map of link names to IDs
 * @returns {object} - Processed content and missing links
 */
export function replaceLinks(content, linkMap) {
  const pattern = /\{\{links\.([a-zA-Z0-9_]+)\}\}/g;
  const missingLinks = [];
  let processed = content;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const linkName = match[1];
    const linkId = linkMap[linkName];

    if (linkId) {
      processed = processed.replace(match[0], linkId);
    } else {
      missingLinks.push(linkName);
    }
  }

  return {
    content: processed,
    missingLinks
  };
}

/**
 * Validate all links exist before build
 * @param {string} content - Content to validate
 * @param {object} linkMap - Map of link names to IDs
 * @returns {object} - Validation result
 */
export function validateLinks(content, linkMap) {
  const references = extractLinkReferences(content);
  const missing = [];

  for (const ref of references) {
    if (!linkMap[ref]) {
      missing.push(ref);
    }
  }

  return {
    valid: missing.length === 0,
    missingLinks: missing,
    allReferences: references
  };
}

/**
 * Save link map to JSON file
 * @param {object} linkMap - Map of link names to IDs
 */
export function saveLinkMap(linkMap) {
  const linksPath = path.resolve(LINKS_FILE);
  const dir = path.dirname(linksPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(linksPath, JSON.stringify(linkMap, null, 2));
  console.log(`Link map saved to: ${linksPath}`);
}

export default {
  loadLinkMap,
  extractLinkReferences,
  replaceLinks,
  validateLinks,
  saveLinkMap
};
