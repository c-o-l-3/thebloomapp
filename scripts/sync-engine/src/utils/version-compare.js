/**
 * Version Comparison Engine
 * Provides diff functionality for comparing touchpoint versions
 */

/**
 * Diff result types
 */
export const DIFF_TYPE = {
  ADDED: 'added',
  REMOVED: 'removed',
  CHANGED: 'changed',
  UNCHANGED: 'unchanged'
};

/**
 * Compare two versions of content
 * @param {string} oldVersion - Old content
 * @param {string} newVersion - New content
 * @returns {Object} Diff result
 */
export function compareVersions(oldVersion, newVersion) {
  if (!oldVersion && !newVersion) {
    return { type: DIFF_TYPE.UNCHANGED, changes: [] };
  }
  
  if (!oldVersion) {
    return { type: DIFF_TYPE.ADDED, changes: [{ type: DIFF_TYPE.ADDED, value: newVersion }] };
  }
  
  if (!newVersion) {
    return { type: DIFF_TYPE.REMOVED, changes: [{ type: DIFF_TYPE.REMOVED, value: oldVersion }] };
  }

  const oldWords = tokenize(oldVersion);
  const newWords = tokenize(newVersion);
  
  const diff = computeWordDiff(oldWords, newWords);
  
  return {
    type: diff.hasChanges ? DIFF_TYPE.CHANGED : DIFF_TYPE.UNCHANGED,
    changes: diff.changes,
    summary: generateSummary(diff.changes)
  };
}

/**
 * Tokenize text into words while preserving whitespace
 * @param {string} text - Input text
 * @returns {Array} Array of tokens
 */
function tokenize(text) {
  if (!text) return [];
  
  const tokens = [];
  const regex = /(\s+|[a-zA-Z0-9]+|[^\s\w])/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      value: match[0],
      type: match[0].match(/^\s+$/) ? 'whitespace' : 'word'
    });
  }
  
  return tokens;
}

/**
 * Compute word-level diff using LCS (Longest Common Subsequence)
 * @param {Array} oldTokens - Old tokens
 * @param {Array} newTokens - New tokens
 * @returns {Object} Diff result with changes
 */
function computeWordDiff(oldTokens, newTokens) {
  const m = oldTokens.length;
  const n = newTokens.length;
  
  // Build LCS matrix
  const matrix = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensEqual(oldTokens[i - 1], newTokens[j - 1])) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find diff
  const changes = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensEqual(oldTokens[i - 1], newTokens[j - 1])) {
      // Unchanged
      changes.unshift({
        type: DIFF_TYPE.UNCHANGED,
        value: oldTokens[i - 1].value
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      // Added
      changes.unshift({
        type: DIFF_TYPE.ADDED,
        value: newTokens[j - 1].value
      });
      j--;
    } else {
      // Removed
      changes.unshift({
        type: DIFF_TYPE.REMOVED,
        value: oldTokens[i - 1].value
      });
      i--;
    }
  }
  
  // Merge consecutive changes of same type
  const merged = mergeConsecutiveChanges(changes);
  
  return {
    hasChanges: merged.some(c => c.type !== DIFF_TYPE.UNCHANGED),
    changes: merged
  };
}

/**
 * Check if two tokens are equal
 */
function tokensEqual(a, b) {
  return a.value === b.value && a.type === b.type;
}

/**
 * Merge consecutive changes of the same type
 */
function mergeConsecutiveChanges(changes) {
  if (changes.length === 0) return [];
  
  const merged = [];
  let current = { ...changes[0], value: changes[0].value };
  
  for (let i = 1; i < changes.length; i++) {
    const change = changes[i];
    if (change.type === current.type) {
      current.value += change.value;
    } else {
      merged.push(current);
      current = { ...change, value: change.value };
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * Generate summary of changes
 */
function generateSummary(changes) {
  let added = 0;
  let removed = 0;
  let changed = 0;
  
  changes.forEach(c => {
    if (c.type === DIFF_TYPE.ADDED) {
      added += c.value.trim().split(/\s+/).filter(Boolean).length;
    } else if (c.type === DIFF_TYPE.REMOVED) {
      removed += c.value.trim().split(/\s+/).filter(Boolean).length;
    }
  });
  
  return {
    added,
    removed,
    changed: Math.min(added, removed),
    totalChanges: changes.filter(c => c.type !== DIFF_TYPE.UNCHANGED).length
  };
}

/**
 * Compare two touchpoint objects
 * @param {Object} oldTouchpoint - Old touchpoint
 * @param {Object} newTouchpoint - New touchpoint
 * @returns {Object} Detailed comparison
 */
export function compareTouchpoints(oldTouchpoint, newTouchpoint) {
  const fields = ['name', 'type', 'content.subject', 'content.body', 'content.previewText', 'delay', 'delayUnit'];
  const fieldComparisons = {};
  
  fields.forEach(field => {
    const oldValue = getNestedValue(oldTouchpoint, field);
    const newValue = getNestedValue(newTouchpoint, field);
    
    fieldComparisons[field] = compareVersions(oldValue, newValue);
  });
  
  const hasChanges = Object.values(fieldComparisons).some(f => f.type !== DIFF_TYPE.UNCHANGED);
  
  return {
    touchpointId: newTouchpoint.id || oldTouchpoint.id,
    hasChanges,
    fields: fieldComparisons,
    oldVersion: oldTouchpoint.version,
    newVersion: newTouchpoint.version
  };
}

/**
 * Compare entire journeys
 * @param {Object} oldJourney - Old journey
 * @param {Object} newJourney - New journey
 * @returns {Object} Journey comparison
 */
export function compareJourneys(oldJourney, newJourney) {
  const oldTouchpoints = oldJourney.touchpoints || [];
  const newTouchpoints = newJourney.touchpoints || [];
  
  const touchpointComparisons = [];
  const addedTouchpoints = [];
  const removedTouchpoints = [];
  
  // Find modified and unchanged touchpoints
  newTouchpoints.forEach(newTp => {
    const oldTp = oldTouchpoints.find(tp => tp.id === newTp.id);
    
    if (!oldTp) {
      addedTouchpoints.push(newTp);
    } else {
      const comparison = compareTouchpoints(oldTp, newTp);
      if (comparison.hasChanges) {
        touchpointComparisons.push(comparison);
      }
    }
  });
  
  // Find removed touchpoints
  oldTouchpoints.forEach(oldTp => {
    const newTp = newTouchpoints.find(tp => tp.id === oldTp.id);
    if (!newTp) {
      removedTouchpoints.push(oldTp);
    }
  });
  
  return {
    journeyId: newJourney.id || oldJourney.id,
    oldVersion: oldJourney.version,
    newVersion: newJourney.version,
    hasChanges: touchpointComparisons.length > 0 || addedTouchpoints.length > 0 || removedTouchpoints.length > 0,
    modifiedTouchpoints: touchpointComparisons,
    addedTouchpoints,
    removedTouchpoints,
    summary: {
      modified: touchpointComparisons.length,
      added: addedTouchpoints.length,
      removed: removedTouchpoints.length,
      total: newTouchpoints.length
    }
  };
}

/**
 * Generate HTML diff view
 * @param {Array} changes - Array of change objects
 * @param {Object} options - Rendering options
 * @returns {string} HTML string
 */
export function generateHtmlDiff(changes, options = {}) {
  const {
    addedClass = 'diff-added',
    removedClass = 'diff-removed',
    unchangedClass = 'diff-unchanged',
    inline = false
  } = options;
  
  let html = '<div class="diff-view">';
  
  changes.forEach(change => {
    const className = change.type === DIFF_TYPE.ADDED ? addedClass :
                      change.type === DIFF_TYPE.REMOVED ? removedClass :
                      unchangedClass;
    
    const escapedValue = escapeHtml(change.value);
    
    if (inline) {
      html += `<span class="${className}">${escapedValue}</span>`;
    } else {
      html += `<div class="${className}">${escapedValue}</div>`;
    }
  });
  
  html += '</div>';
  return html;
}

/**
 * Generate side-by-side comparison HTML
 * @param {string} oldContent - Old content
 * @param {string} newContent - New content
 * @returns {string} HTML for side-by-side view
 */
export function generateSideBySideDiff(oldContent, newContent) {
  const diff = compareVersions(oldContent, newContent);
  
  let oldHtml = '';
  let newHtml = '';
  
  diff.changes.forEach(change => {
    const escapedValue = escapeHtml(change.value);
    
    switch (change.type) {
      case DIFF_TYPE.UNCHANGED:
        oldHtml += `<div class="diff-line diff-unchanged">${escapedValue}</div>`;
        newHtml += `<div class="diff-line diff-unchanged">${escapedValue}</div>`;
        break;
      case DIFF_TYPE.REMOVED:
        oldHtml += `<div class="diff-line diff-removed">${escapedValue}</div>`;
        newHtml += `<div class="diff-line diff-empty">&nbsp;</div>`;
        break;
      case DIFF_TYPE.ADDED:
        oldHtml += `<div class="diff-line diff-empty">&nbsp;</div>`;
        newHtml += `<div class="diff-line diff-added">${escapedValue}</div>`;
        break;
    }
  });
  
  return `
    <div class="diff-side-by-side">
      <div class="diff-column diff-column--old">
        <div class="diff-column-header">Previous Version</div>
        <div class="diff-column-content">${oldHtml}</div>
      </div>
      <div class="diff-column diff-column--new">
        <div class="diff-column-header">Current Version</div>
        <div class="diff-column-content">${newHtml}</div>
      </div>
    </div>
  `;
}

/**
 * Generate unified diff (like git diff)
 * @param {string} oldContent - Old content
 * @param {string} newContent - New content
 * @param {Object} options - Options
 * @returns {string} Unified diff text
 */
export function generateUnifiedDiff(oldContent, newContent, options = {}) {
  const { contextLines = 3, oldLabel = '--- old', newLabel = '+++ new' } = options;
  
  const diff = compareVersions(oldContent, newContent);
  
  if (diff.type === DIFF_TYPE.UNCHANGED) {
    return 'No changes.';
  }
  
  let output = `${oldLabel}\n${newLabel}\n@@ -1,${oldContent?.split('\n').length || 0} +1,${newContent?.split('\n').length || 0} @@\n`;
  
  diff.changes.forEach(change => {
    const prefix = change.type === DIFF_TYPE.ADDED ? '+' :
                   change.type === DIFF_TYPE.REMOVED ? '-' : ' ';
    
    const lines = change.value.split('\n');
    lines.forEach(line => {
      output += `${prefix}${line}\n`;
    });
  });
  
  return output;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }
  
  return value;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * CSS styles for diff views
 */
export const diffStyles = `
  .diff-view {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .diff-added {
    background-color: #d4edda;
    color: #155724;
    padding: 2px 4px;
    border-radius: 3px;
    text-decoration: none;
  }

  .diff-removed {
    background-color: #f8d7da;
    color: #721c24;
    padding: 2px 4px;
    border-radius: 3px;
    text-decoration: line-through;
  }

  .diff-unchanged {
    color: #333;
  }

  .diff-side-by-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
  }

  .diff-column {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }

  .diff-column-header {
    background: #f5f5f5;
    padding: 8px 12px;
    font-weight: bold;
    border-bottom: 1px solid #e0e0e0;
  }

  .diff-column-content {
    padding: 12px;
    max-height: 500px;
    overflow-y: auto;
  }

  .diff-line {
    padding: 2px 4px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .diff-line.diff-added {
    background-color: #d4edda;
  }

  .diff-line.diff-removed {
    background-color: #f8d7da;
  }

  .diff-line.diff-empty {
    background-color: #f5f5f5;
    color: #ccc;
  }

  .diff-stats {
    display: flex;
    gap: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .diff-stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .diff-stat__value {
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .diff-stat__value--added {
    background: #d4edda;
    color: #155724;
  }

  .diff-stat__value--removed {
    background: #f8d7da;
    color: #721c24;
  }

  .diff-stat__value--changed {
    background: #fff3cd;
    color: #856404;
  }
`;

/**
 * Export comparison to various formats
 * @param {Object} comparison - Comparison result
 * @param {string} format - Export format (json, html, markdown)
 * @returns {string} Exported data
 */
export function exportComparison(comparison, format = 'json') {
  switch (format) {
    case 'json':
      return JSON.stringify(comparison, null, 2);
    
    case 'html':
      return generateComparisonHtml(comparison);
    
    case 'markdown':
      return generateComparisonMarkdown(comparison);
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate full HTML comparison document
 */
function generateComparisonHtml(comparison) {
  const touchpointDiffs = comparison.modifiedTouchpoints.map(tp => {
    const fieldDiffs = Object.entries(tp.fields)
      .filter(([_, diff]) => diff.type !== DIFF_TYPE.UNCHANGED)
      .map(([field, diff]) => `
        <div class="field-diff">
          <h4>${field}</h4>
          ${generateHtmlDiff(diff.changes)}
        </div>
      `).join('');
    
    return `
      <div class="touchpoint-diff">
        <h3>${tp.touchpointId}</h3>
        ${fieldDiffs}
      </div>
    `;
  }).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Version Comparison</title>
  <style>${diffStyles}</style>
</head>
<body>
  <h1>Version Comparison</h1>
  <div class="comparison-summary">
    <p>Comparing version ${comparison.oldVersion} to ${comparison.newVersion}</p>
    <ul>
      <li>${comparison.summary.modified} modified</li>
      <li>${comparison.summary.added} added</li>
      <li>${comparison.summary.removed} removed</li>
    </ul>
  </div>
  ${touchpointDiffs}
</body>
</html>`;
}

/**
 * Generate markdown comparison
 */
function generateComparisonMarkdown(comparison) {
  let md = `# Version Comparison\n\n`;
  md += `Comparing version ${comparison.oldVersion} to ${comparison.newVersion}\n\n`;
  md += `## Summary\n\n`;
  md += `- Modified: ${comparison.summary.modified}\n`;
  md += `- Added: ${comparison.summary.added}\n`;
  md += `- Removed: ${comparison.summary.removed}\n\n`;
  
  comparison.modifiedTouchpoints.forEach(tp => {
    md += `### ${tp.touchpointId}\n\n`;
    Object.entries(tp.fields)
      .filter(([_, diff]) => diff.type !== DIFF_TYPE.UNCHANGED)
      .forEach(([field, diff]) => {
        md += `**${field}**:\n\n`;
        diff.changes.forEach(change => {
          const prefix = change.type === DIFF_TYPE.ADDED ? '+ ' :
                         change.type === DIFF_TYPE.REMOVED ? '- ' : '  ';
          md += `${prefix}${change.value}\n`;
        });
        md += '\n';
      });
  });
  
  return md;
}

export default {
  DIFF_TYPE,
  compareVersions,
  compareTouchpoints,
  compareJourneys,
  generateHtmlDiff,
  generateSideBySideDiff,
  generateUnifiedDiff,
  exportComparison,
  diffStyles
};