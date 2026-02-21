/**
 * Content Compliance Overrides
 * Applies client-specific text replacements for legal compliance
 * 
 * Cameron Estate Specific Rules:
 * - Champagne toast → Champagne toast (included in select packages)
 * - Rentals & Décor → Event Inclusions
 * - Bridal Suite → Two private changing spaces provided for the couple
 */

const complianceRules = [
  {
    // Champagne toast disclaimer - only apply if not already present
    // Uses negative lookahead with case-insensitive matching
    pattern: /Champagne toast(?!.*\(included in select packages\))/gi,
    replacement: 'Champagne toast (included in select packages)',
    description: 'Added disclaimer to Champagne toast mention'
  },
  {
    // Rentals & Décor → Event Inclusions
    pattern: /Rentals & Décor/gi,
    replacement: 'Event Inclusions',
    description: 'Replaced "Rentals & Décor" header with "Event Inclusions"'
  },
  {
    // Bridal Suite → Two private changing spaces
    pattern: /Bridal Suite/gi,
    replacement: 'Two private changing spaces provided for the couple',
    description: 'Replaced "Bridal Suite" with compliance text'
  }
];

/**
 * Apply all compliance rules to content
 * @param {string} content - The email content to process
 * @returns {object} - Processed content and list of applied rules
 */
export function applyCompliance(content) {
  let processed = content;
  const appliedRules = [];

  for (const rule of complianceRules) {
    const matches = processed.match(rule.pattern);
    if (matches) {
      processed = processed.replace(rule.pattern, rule.replacement);
      appliedRules.push({
        description: rule.description,
        matches: matches.length
      });
    }
  }

  return {
    content: processed,
    appliedRules
  };
}

/**
 * Check if content needs compliance review
 * @param {string} content - Content to check
 * @returns {array} - List of rules that would be applied
 */
export function checkCompliance(content) {
  const needed = [];

  for (const rule of complianceRules) {
    if (rule.pattern.test(content)) {
      needed.push(rule.description);
    }
  }

  return needed;
}

/**
 * Validate content doesn't contain prohibited terms
 * @param {string} content - Content to validate
 * @returns {object} - Validation result
 */
export function validateContent(content) {
  const violations = [];
  
  // Check for any terms that should never appear
  const prohibitedPatterns = [
    { pattern: /unlimited\s+alcohol/gi, message: 'Unlimited alcohol claims require legal review' },
    { pattern: /free\s+wedding/gi, message: 'Free wedding claims require legal review' }
  ];

  for (const rule of prohibitedPatterns) {
    if (rule.pattern.test(content)) {
      violations.push(rule.message);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

export default {
  applyCompliance,
  checkCompliance,
  validateContent,
  complianceRules
};
