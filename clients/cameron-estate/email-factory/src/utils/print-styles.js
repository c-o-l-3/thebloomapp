/**
 * Print-Optimized Styles for Client Review
 * Generates professional print-ready HTML for journey review
 */

/**
 * Print-specific CSS for 8.5x11 paper
 */
export const printStyles = `
  @page {
    size: 8.5in 11in;
    margin: 0.75in 0.75in 1in 0.75in;
  }

  @page :first {
    margin-top: 0.5in;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: white;
    margin: 0;
    padding: 0;
  }

  /* Header Styles */
  .print-header {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 0.5in;
    margin-bottom: 0.5in;
    page-break-after: avoid;
  }

  .print-header__client {
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #666;
    margin-bottom: 0.25in;
  }

  .print-header__journey {
    font-size: 24pt;
    font-weight: bold;
    color: #1a1a1a;
    margin: 0 0 0.15in 0;
    line-height: 1.2;
  }

  .print-header__meta {
    font-size: 9pt;
    color: #666;
    display: flex;
    gap: 1in;
  }

  .print-header__meta-item {
    display: flex;
    flex-direction: column;
  }

  .print-header__meta-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #999;
    margin-bottom: 2px;
  }

  .print-header__meta-value {
    font-weight: bold;
  }

  /* Touchpoint Styles */
  .touchpoint {
    page-break-inside: avoid;
    margin-bottom: 0.5in;
    border-left: 3px solid #e0e0e0;
    padding-left: 0.25in;
  }

  .touchpoint--email {
    border-left-color: #4a90d9;
  }

  .touchpoint--sms {
    border-left-color: #7ed321;
  }

  .touchpoint--task {
    border-left-color: #f5a623;
  }

  .touchpoint--wait {
    border-left-color: #bd10e0;
  }

  .touchpoint--condition {
    border-left-color: #d0021b;
  }

  .touchpoint__header {
    page-break-after: avoid;
    margin-bottom: 0.2in;
  }

  .touchpoint__number {
    font-size: 9pt;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .touchpoint__name {
    font-size: 16pt;
    font-weight: bold;
    color: #1a1a1a;
    margin: 0;
    line-height: 1.3;
  }

  .touchpoint__type {
    font-size: 9pt;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }

  .touchpoint__meta {
    font-size: 9pt;
    color: #666;
    margin: 0.15in 0;
    display: flex;
    gap: 0.5in;
  }

  .touchpoint__content {
    font-size: 10.5pt;
    line-height: 1.7;
    color: #333;
  }

  .touchpoint__content h1,
  .touchpoint__content h2,
  .touchpoint__content h3 {
    font-family: Georgia, serif;
    color: #1a1a1a;
    margin-top: 0.3in;
    margin-bottom: 0.15in;
    page-break-after: avoid;
  }

  .touchpoint__content h1 {
    font-size: 14pt;
  }

  .touchpoint__content h2 {
    font-size: 12pt;
  }

  .touchpoint__content h3 {
    font-size: 11pt;
  }

  .touchpoint__content p {
    margin: 0 0 0.15in 0;
    text-align: justify;
    hyphens: auto;
  }

  .touchpoint__content ul,
  .touchpoint__content ol {
    margin: 0.15in 0;
    padding-left: 0.3in;
  }

  .touchpoint__content li {
    margin-bottom: 0.08in;
  }

  .touchpoint__content blockquote {
    margin: 0.2in 0;
    padding: 0.15in 0.25in;
    border-left: 2px solid #ccc;
    font-style: italic;
    color: #555;
    background: #f9f9f9;
  }

  /* Email-specific styles */
  .email-preview {
    border: 1px solid #e0e0e0;
    padding: 0.25in;
    margin: 0.2in 0;
    background: #fafafa;
  }

  .email-preview__field {
    margin-bottom: 0.1in;
    font-size: 10pt;
  }

  .email-preview__label {
    font-weight: bold;
    color: #666;
    display: inline-block;
    width: 0.8in;
  }

  .email-preview__value {
    color: #1a1a1a;
  }

  .email-preview__body {
    margin-top: 0.2in;
    padding-top: 0.2in;
    border-top: 1px solid #e0e0e0;
  }

  /* SMS-specific styles */
  .sms-preview {
    background: #f0f0f0;
    border-radius: 12px;
    padding: 0.15in;
    margin: 0.2in 0;
    max-width: 3in;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10pt;
    line-height: 1.5;
  }

  /* Page break utilities */
  .page-break {
    page-break-before: always;
  }

  .page-break-avoid {
    page-break-inside: avoid;
  }

  /* Footer */
  .print-footer {
    position: running(footer);
    font-size: 8pt;
    color: #999;
    text-align: center;
    border-top: 1px solid #e0e0e0;
    padding-top: 0.1in;
    margin-top: 0.25in;
  }

  .print-footer__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .print-footer__brand {
    font-weight: bold;
    color: #666;
  }

  .print-footer__page {
    font-size: 8pt;
  }

  /* Hide UI elements */
  .no-print,
  button,
  .button,
  .nav,
  .navigation,
  .edit-controls,
  .toolbar,
  .sidebar,
  .comments-panel,
  input,
  textarea,
  select {
    display: none !important;
  }

  /* Table of contents */
  .toc {
    page-break-after: always;
  }

  .toc__title {
    font-size: 18pt;
    font-weight: bold;
    margin-bottom: 0.3in;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 0.1in;
  }

  .toc__list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc__item {
    display: flex;
    align-items: baseline;
    margin-bottom: 0.1in;
    font-size: 11pt;
  }

  .toc__number {
    width: 0.4in;
    color: #666;
  }

  .toc__name {
    flex: 1;
  }

  .toc__type {
    font-size: 9pt;
    color: #999;
    text-transform: uppercase;
    margin-left: 0.2in;
  }

  .toc__dots {
    flex: 1;
    border-bottom: 1px dotted #ccc;
    margin: 0 0.1in;
    height: 0.6em;
  }

  /* Status badges */
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 8pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge--approved {
    background: #d4edda;
    color: #155724;
  }

  .status-badge--review {
    background: #fff3cd;
    color: #856404;
  }

  .status-badge--draft {
    background: #e2e3e5;
    color: #383d41;
  }

  /* Summary section */
  .summary-section {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    padding: 0.25in;
    margin: 0.3in 0;
    page-break-inside: avoid;
  }

  .summary-section__title {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 0.15in;
    color: #1a1a1a;
  }

  .summary-section__content {
    font-size: 10pt;
    line-height: 1.6;
  }

  .summary-section__stats {
    display: flex;
    gap: 0.5in;
    margin-top: 0.15in;
  }

  .summary-section__stat {
    text-align: center;
  }

  .summary-section__stat-value {
    font-size: 18pt;
    font-weight: bold;
    color: #1a1a1a;
  }

  .summary-section__stat-label {
    font-size: 8pt;
    color: #666;
    text-transform: uppercase;
  }

  /* Approval signature area */
  .approval-section {
    page-break-before: always;
    margin-top: 0.5in;
  }

  .approval-section__title {
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 0.3in;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 0.1in;
  }

  .approval-box {
    border: 2px solid #1a1a1a;
    padding: 0.3in;
    margin: 0.25in 0;
    page-break-inside: avoid;
  }

  .approval-box__label {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #666;
    margin-bottom: 0.15in;
  }

  .approval-box__line {
    border-bottom: 1px solid #1a1a1a;
    height: 0.3in;
    margin-bottom: 0.05in;
  }

  .approval-box__caption {
    font-size: 8pt;
    color: #999;
  }

  /* Comments section (for print) */
  .comments-print {
    margin-top: 0.3in;
    padding-top: 0.3in;
    border-top: 1px solid #e0e0e0;
  }

  .comments-print__title {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 0.15in;
  }

  .comment-print {
    margin-bottom: 0.2in;
    padding: 0.15in;
    background: #f9f9f9;
    border-left: 2px solid #ccc;
  }

  .comment-print__author {
    font-size: 9pt;
    font-weight: bold;
    color: #1a1a1a;
  }

  .comment-print__time {
    font-size: 8pt;
    color: #999;
    margin-left: 0.1in;
  }

  .comment-print__text {
    font-size: 10pt;
    color: #333;
    margin-top: 0.05in;
  }
`;

/**
 * Generate print-ready HTML for a journey
 * @param {Object} options - Print options
 * @param {string} options.clientName - Client name
 * @param {string} options.journeyName - Journey name
 * @param {Array} options.touchpoints - Array of touchpoint objects
 * @param {string} options.generatedAt - ISO timestamp
 * @param {string} options.version - Journey version
 * @param {string} options.status - Journey status
 * @param {Array} options.comments - Optional comments to include
 * @returns {string} Complete HTML document
 */
export function generatePrintHtml(options) {
  const {
    clientName = 'Unknown Client',
    journeyName = 'Untitled Journey',
    touchpoints = [],
    generatedAt = new Date().toISOString(),
    version = '1.0',
    status = 'Draft',
    comments = [],
    includeToc = true,
    includeApprovalSection = true
  } = options;

  const formattedDate = new Date(generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const touchpointHtml = touchpoints.map((tp, index) => {
    const typeClass = `touchpoint--${tp.type?.toLowerCase() || 'email'}`;
    const tpNumber = index + 1;
    
    let contentHtml = '';
    
    if (tp.type === 'Email') {
      contentHtml = renderEmailContent(tp);
    } else if (tp.type === 'SMS') {
      contentHtml = renderSmsContent(tp);
    } else {
      contentHtml = renderGenericContent(tp);
    }

    return `
      <div class="touchpoint ${typeClass}" id="touchpoint-${tp.id}">
        <div class="touchpoint__header">
          <div class="touchpoint__number">Touchpoint ${tpNumber}</div>
          <h2 class="touchpoint__name">${escapeHtml(tp.name)}</h2>
          <div class="touchpoint__type">${tp.type || 'Email'}</div>
        </div>
        ${tp.delay ? `
        <div class="touchpoint__meta">
          <span>Delay: ${tp.delay} ${tp.delayUnit || 'hours'}</span>
        </div>
        ` : ''}
        <div class="touchpoint__content">
          ${contentHtml}
        </div>
        ${renderTouchpointComments(tp.id, comments)}
      </div>
    `;
  }).join('');

  const tocHtml = includeToc ? generateTableOfContents(touchpoints) : '';
  const approvalHtml = includeApprovalSection ? generateApprovalSection() : '';
  const summaryHtml = generateSummarySection(touchpoints, status);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(journeyName)} - ${escapeHtml(clientName)}</title>
  <style>
    ${printStyles}
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-header__client">${escapeHtml(clientName)}</div>
    <h1 class="print-header__journey">${escapeHtml(journeyName)}</h1>
    <div class="print-header__meta">
      <div class="print-header__meta-item">
        <span class="print-header__meta-label">Generated</span>
        <span class="print-header__meta-value">${formattedDate}</span>
      </div>
      <div class="print-header__meta-item">
        <span class="print-header__meta-label">Version</span>
        <span class="print-header__meta-value">${version}</span>
      </div>
      <div class="print-header__meta-item">
        <span class="print-header__meta-label">Status</span>
        <span class="print-header__meta-value">${status}</span>
      </div>
    </div>
  </div>

  ${tocHtml}
  
  ${summaryHtml}

  <div class="touchpoints">
    ${touchpointHtml}
  </div>

  ${approvalHtml}

  <div class="print-footer">
    <div class="print-footer__content">
      <span class="print-footer__brand">Generated by BloomBuilder</span>
      <span class="print-footer__page">Page </span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render email-specific content
 */
function renderEmailContent(touchpoint) {
  const content = touchpoint.content || {};
  
  return `
    <div class="email-preview">
      <div class="email-preview__field">
        <span class="email-preview__label">Subject:</span>
        <span class="email-preview__value">${escapeHtml(content.subject || 'No subject')}</span>
      </div>
      <div class="email-preview__field">
        <span class="email-preview__label">Preview:</span>
        <span class="email-preview__value">${escapeHtml(content.previewText || '')}</span>
      </div>
      <div class="email-preview__body">
        ${content.body || '<p><em>No content provided</em></p>'}
      </div>
    </div>
  `;
}

/**
 * Render SMS-specific content
 */
function renderSmsContent(touchpoint) {
  const content = touchpoint.content || {};
  
  return `
    <div class="sms-preview">
      ${escapeHtml(content.body || content.message || 'No message content')}
    </div>
    <p class="touchpoint__meta">Character count: ${(content.body || content.message || '').length}</p>
  `;
}

/**
 * Render generic touchpoint content
 */
function renderGenericContent(touchpoint) {
  const content = touchpoint.content || {};
  
  if (content.description) {
    return `<p>${escapeHtml(content.description)}</p>`;
  }
  
  if (content.body) {
    return content.body;
  }
  
  return '<p><em>No content provided</em></p>';
}

/**
 * Generate table of contents
 */
function generateTableOfContents(touchpoints) {
  const items = touchpoints.map((tp, index) => `
    <li class="toc__item">
      <span class="toc__number">${index + 1}.</span>
      <span class="toc__name">${escapeHtml(tp.name)}</span>
      <span class="toc__dots"></span>
      <span class="toc__type">${tp.type || 'Email'}</span>
    </li>
  `).join('');

  return `
    <div class="toc">
      <h2 class="toc__title">Table of Contents</h2>
      <ul class="toc__list">
        ${items}
      </ul>
    </div>
  `;
}

/**
 * Generate journey summary section
 */
function generateSummarySection(touchpoints, status) {
  const counts = touchpoints.reduce((acc, tp) => {
    const type = tp.type || 'Email';
    acc[type] = (acc[type] || 0) + 1;
    acc.total++;
    return acc;
  }, { total: 0 });

  const statsHtml = Object.entries(counts)
    .filter(([key]) => key !== 'total')
    .map(([type, count]) => `
      <div class="summary-section__stat">
        <div class="summary-section__stat-value">${count}</div>
        <div class="summary-section__stat-label">${type}s</div>
      </div>
    `).join('');

  return `
    <div class="summary-section">
      <h2 class="summary-section__title">Journey Summary</h2>
      <div class="summary-section__content">
        <p>This journey contains <strong>${counts.total} touchpoints</strong> designed to guide prospects through the customer journey.</p>
        <div class="summary-section__stats">
          ${statsHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate approval signature section
 */
function generateApprovalSection() {
  return `
    <div class="approval-section">
      <h2 class="approval-section__title">Approval</h2>
      
      <div class="approval-box">
        <div class="approval-box__label">Approved By</div>
        <div class="approval-box__line"></div>
        <div class="approval-box__caption">Signature & Date</div>
      </div>

      <div class="approval-box">
        <div class="approval-box__label">Date Approved</div>
        <div class="approval-box__line"></div>
        <div class="approval-box__caption">MM/DD/YYYY</div>
      </div>

      <div class="approval-box">
        <div class="approval-box__label">Notes</div>
        <div class="approval-box__line"></div>
        <div class="approval-box__line"></div>
        <div class="approval-box__line"></div>
      </div>
    </div>
  `;
}

/**
 * Render comments for a specific touchpoint
 */
function renderTouchpointComments(touchpointId, allComments) {
  const tpComments = allComments.filter(c => c.touchpointId === touchpointId);
  
  if (tpComments.length === 0) return '';

  const commentsHtml = tpComments.map(comment => `
    <div class="comment-print">
      <span class="comment-print__author">${escapeHtml(comment.author)}</span>
      <span class="comment-print__time">${new Date(comment.timestamp).toLocaleDateString()}</span>
      <div class="comment-print__text">${escapeHtml(comment.text)}</div>
    </div>
  `).join('');

  return `
    <div class="comments-print">
      <div class="comments-print__title">Comments (${tpComments.length})</div>
      ${commentsHtml}
    </div>
  `;
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
 * Export print HTML to file
 * @param {string} filePath - Output file path
 * @param {Object} options - Print options
 */
export async function exportPrintHtml(filePath, options) {
  const html = generatePrintHtml(options);
  
  // Node.js environment
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html, 'utf8');
    return filePath;
  }
  
  // Browser environment - trigger download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.journeyName.replace(/\s+/g, '-').toLowerCase()}-print.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return a.download;
}

/**
 * Trigger browser print dialog with custom styles
 * @param {Object} options - Print options
 */
export function printJourney(options) {
  const html = generatePrintHtml(options);
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    // Optionally close after print (commented out for user to decide)
    // printWindow.close();
  }, 500);
}

export default {
  printStyles,
  generatePrintHtml,
  exportPrintHtml,
  printJourney
};