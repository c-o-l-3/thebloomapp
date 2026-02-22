/**
 * Onboarding Report Generator - BLOOM-205 Improvements
 * Generates comprehensive HTML/Markdown reports for client onboarding
 *
 * Improvements:
 * - Time tracking per step
 * - Performance metrics
 * - Before/after comparison
 * - Setup time reduction tracking
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { KnowledgeHub } from '../services/knowledge-hub.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

// Baseline time from before BLOOM-205 (25 minutes average)
const BASELINE_ONBOARDING_TIME_MINUTES = 25;

export class OnboardingReportGenerator {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.data = {
      clientSlug,
      timestamp: new Date().toISOString(),
      steps: {},
      extractedData: {},
      journeys: [],
      nextSteps: [],
      performance: {
        startTime: null,
        endTime: null,
        stepTimings: {}
      }
    };
  }

  /**
   * Start timing
   */
  startTiming() {
    this.data.performance.startTime = Date.now();
  }

  /**
   * End timing
   */
  endTiming() {
    this.data.performance.endTime = Date.now();
  }

  /**
   * Record step timing
   */
  recordStepTiming(stepName, durationMs) {
    this.data.performance.stepTimings[stepName] = durationMs;
  }

  /**
   * Get total duration in seconds
   */
  getTotalDuration() {
    if (!this.data.performance.startTime) return 0;
    const end = this.data.performance.endTime || Date.now();
    return Math.round((end - this.data.performance.startTime) / 1000);
  }

  /**
   * Format duration
   */
  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  /**
   * Calculate time saved vs baseline
   */
  getTimeSaved() {
    const actualMinutes = this.getTotalDuration() / 60;
    const saved = BASELINE_ONBOARDING_TIME_MINUTES - actualMinutes;
    const percentage = Math.round((saved / BASELINE_ONBOARDING_TIME_MINUTES) * 100);
    return {
      baselineMinutes: BASELINE_ONBOARDING_TIME_MINUTES,
      actualMinutes: Math.round(actualMinutes * 10) / 10,
      savedMinutes: Math.round(saved * 10) / 10,
      percentage: Math.max(0, percentage)
    };
  }

  /**
   * Record a step result
   */
  recordStep(stepName, status, details = {}) {
    this.data.steps[stepName] = {
      status,
      completedAt: new Date().toISOString(),
      ...details
    };
    return this;
  }

  /**
   * Set extracted data
   */
  setExtractedData(data) {
    this.data.extractedData = { ...this.data.extractedData, ...data };
    return this;
  }

  /**
   * Set journeys info
   */
  setJourneys(journeys) {
    this.data.journeys = journeys;
    return this;
  }

  /**
   * Set next steps
   */
  setNextSteps(steps) {
    this.data.nextSteps = steps;
    return this;
  }

  /**
   * Get Knowledge Hub stats
   */
  async getKnowledgeHubStats() {
    try {
      const hub = new KnowledgeHub(this.clientSlug);
      const isInitialized = await hub.isInitialized();
      
      if (!isInitialized) {
        return { initialized: false, pages: 0, facts: 0 };
      }

      const stats = await hub.getStats();
      return {
        initialized: true,
        pages: stats.goldenPages.total,
        facts: stats.facts.total,
        verifiedFacts: stats.facts.verified,
        byImportance: stats.goldenPages.byImportance,
        byCategory: stats.facts.byCategory
      };
    } catch (error) {
      logger.warn('Failed to get Knowledge Hub stats', { error: error.message });
      return { initialized: false, error: error.message };
    }
  }

  /**
   * Get brand voice summary
   */
  async getBrandVoiceSummary() {
    try {
      const hub = new KnowledgeHub(this.clientSlug);
      const profile = await hub.getBrandVoice();
      
      return {
        analyzed: true,
        adjectives: profile.voice?.adjectives || [],
        personality: profile.voice?.personality || '',
        dos: profile.voice?.do?.slice(0, 5) || [],
        donts: profile.voice?.dont?.slice(0, 5) || []
      };
    } catch (error) {
      return { analyzed: false, error: error.message };
    }
  }

  /**
   * Get location config summary
   */
  async getLocationConfigSummary() {
    try {
      const configPath = path.join(this.clientDir, 'location-config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
      
      return {
        loaded: true,
        name: config.name,
        locationId: config.locationId,
        timezone: config.timezone,
        address: config.address,
        contact: config.contact,
        pipelines: config.pipelines,
        calendars: config.calendars
      };
    } catch (error) {
      return { loaded: false, error: error.message };
    }
  }

  /**
   * Get extracted facts summary
   */
  async getExtractedFactsSummary() {
    try {
      const hub = new KnowledgeHub(this.clientSlug);
      const facts = await hub.getFacts();
      
      const byCategory = {};
      facts.forEach(fact => {
        if (!byCategory[fact.category]) {
          byCategory[fact.category] = [];
        }
        byCategory[fact.category].push({
          statement: fact.statement,
          confidence: fact.confidence,
          status: fact.verificationStatus
        });
      });

      // Get top facts by category
      const topFacts = {};
      Object.entries(byCategory).forEach(([category, catFacts]) => {
        topFacts[category] = catFacts
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3);
      });

      return {
        extracted: true,
        total: facts.length,
        byCategory: topFacts
      };
    } catch (error) {
      return { extracted: false, error: error.message };
    }
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdown() {
    const [khStats, brandVoice, locationConfig, facts] = await Promise.all([
      this.getKnowledgeHubStats(),
      this.getBrandVoiceSummary(),
      this.getLocationConfigSummary(),
      this.getExtractedFactsSummary()
    ]);

    const title = locationConfig.name || this.clientSlug;
    const duration = this.getTotalDuration();
    const timeSaved = this.getTimeSaved();
    
    let markdown = `# Onboarding Report: ${title}

Generated: ${new Date().toLocaleString()}
Client: ${this.clientSlug}
Setup Duration: ${this.formatDuration(duration)}

---

## Summary

`;

    // Performance metrics
    markdown += `### Performance Metrics\n\n`;
    markdown += `- **Total Setup Time**: ${this.formatDuration(duration)}\n`;
    markdown += `- **Baseline Time**: ${timeSaved.baselineMinutes} minutes\n`;
    if (timeSaved.savedMinutes > 0) {
      markdown += `- **Time Saved**: ${timeSaved.savedMinutes} minutes (${timeSaved.percentage}% faster) 🎉\n`;
    }
    markdown += `\n`;

    // Step statuses
    Object.entries(this.data.steps).forEach(([step, info]) => {
      const icon = info.status === 'success' ? '✅' : info.status === 'warning' ? '⚠️' : '❌';
      markdown += `- ${icon} ${this.formatStepName(step)}`;
      if (info.details) {
        markdown += `: ${info.details}`;
      }
      markdown += '\n';
    });

    // Knowledge Hub stats
    markdown += `
---

## Knowledge Hub

`;
    if (khStats.initialized) {
      markdown += `- **Status**: ✅ Initialized\n`;
      markdown += `- **Pages Crawled**: ${khStats.pages}\n`;
      markdown += `- **Facts Extracted**: ${khStats.facts} (${khStats.verifiedFacts} verified)\n`;
      
      if (khStats.byImportance) {
        markdown += `- **Pages by Importance**: Critical: ${khStats.byImportance.critical}, High: ${khStats.byImportance.high}, Medium: ${khStats.byImportance.medium}\n`;
      }
    } else {
      markdown += `- **Status**: ❌ Not initialized\n`;
    }

    // Brand Voice
    markdown += `
---

## Brand Voice Analysis

`;
    if (brandVoice.analyzed) {
      markdown += `- **Status**: ✅ Analyzed\n`;
      markdown += `- **Adjectives**: ${brandVoice.adjectives.join(', ')}\n`;
      markdown += `- **Personality**: ${brandVoice.personality}\n`;
      
      if (brandVoice.dos.length > 0) {
        markdown += `\n### DO's\n`;
        brandVoice.dos.forEach(d => markdown += `- ${d}\n`);
      }
      
      if (brandVoice.donts.length > 0) {
        markdown += `\n### DON'Ts\n`;
        brandVoice.donts.forEach(d => markdown += `- ${d}\n`);
      }
    } else {
      markdown += `- **Status**: ❌ Not analyzed\n`;
    }

    // Extracted Facts
    markdown += `
---

## Key Facts Extracted

`;
    if (facts.extracted && facts.total > 0) {
      markdown += `**Total Facts**: ${facts.total}\n\n`;
      
      Object.entries(facts.byCategory).forEach(([category, catFacts]) => {
        markdown += `### ${this.formatCategoryName(category)}\n\n`;
        catFacts.forEach(fact => {
          markdown += `- ${fact.statement}\n`;
        });
        markdown += '\n';
      });
    } else {
      markdown += 'No facts extracted yet.\n';
    }

    // Location Config
    markdown += `
---

## Location Configuration

`;
    if (locationConfig.loaded) {
      markdown += `- **Name**: ${locationConfig.name}\n`;
      markdown += `- **Location ID**: ${locationConfig.locationId}\n`;
      markdown += `- **Timezone**: ${locationConfig.timezone}\n`;
      
      if (locationConfig.address?.city) {
        markdown += `- **Location**: ${locationConfig.address.city}, ${locationConfig.address.state}\n`;
      }
      
      if (locationConfig.contact?.email) {
        markdown += `- **Email**: ${locationConfig.contact.email}\n`;
      }
      
      if (locationConfig.contact?.phone) {
        markdown += `- **Phone**: ${locationConfig.contact.phone}\n`;
      }
    } else {
      markdown += 'Location config not loaded.\n';
    }

    // Journeys
    markdown += `
---

## Generated Journeys

`;
    if (this.data.journeys && this.data.journeys.length > 0) {
      markdown += `**Total Journeys**: ${this.data.journeys.length}\n`;
      markdown += `**Total Touchpoints**: ${this.data.journeys.reduce((sum, j) => sum + (j.touchpointCount || 0), 0)}\n\n`;
      
      this.data.journeys.forEach(journey => {
        markdown += `### ${journey.name}\n`;
        markdown += `- **ID**: ${journey.id}\n`;
        markdown += `- **Category**: ${journey.category}\n`;
        markdown += `- **Touchpoints**: ${journey.touchpointCount || 'N/A'}\n\n`;
      });
    } else {
      markdown += 'No journeys generated yet.\n';
    }

    // Next Steps
    markdown += `
---

## Next Steps for Writers

`;
    if (this.data.nextSteps && this.data.nextSteps.length > 0) {
      this.data.nextSteps.forEach((step, index) => {
        markdown += `${index + 1}. ${step}\n`;
      });
    } else {
      markdown += `1. Review extracted facts in Knowledge Hub\n`;
      markdown += `2. Verify brand voice profile\n`;
      markdown += `3. Edit default journey touchpoints\n`;
      markdown += `4. Get client approval\n`;
      markdown += `5. Deploy to production\n`;
    }

    // File Locations
    markdown += `
---

## File Locations

- **Client Directory**: \`clients/${this.clientSlug}/\`
- **Knowledge Hub**: \`clients/${this.clientSlug}/knowledge-hub/\`
- **Location Config**: \`clients/${this.clientSlug}/location-config.json\`
- **API Responses**: \`clients/${this.clientSlug}/api-responses/\`
- **Journeys**: \`clients/${this.clientSlug}/journeys/\`

---

*Report generated by BloomBuilder Onboarding Wizard*
`;

    return markdown;
  }

  /**
   * Generate HTML report
   */
  async generateHTML() {
    const markdown = await this.generateMarkdown();
    
    // Simple markdown to HTML conversion
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Onboarding Report: ${this.clientSlug}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 15px;
            margin-bottom: 30px;
        }
        h2 {
            color: #34495e;
            margin-top: 35px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ecf0f1;
        }
        h3 {
            color: #7f8c8d;
            margin-top: 25px;
        }
        ul {
            padding-left: 25px;
        }
        li {
            margin-bottom: 8px;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
        hr {
            border: none;
            border-top: 1px solid #ecf0f1;
            margin: 30px 0;
        }
        .meta {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-bottom: 30px;
        }
        .summary-box {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div class="container">
        ${this.markdownToHTML(markdown)}
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Simple markdown to HTML converter
   */
  markdownToHTML(markdown) {
    return markdown
      // Headers
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hlu])(.*$)/gim, '<p>$1</p>')
      // Clean up
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<li>.*<\/li>)<\/p>/g, '$1')
      .replace(/(<li>.*<\/li>)(?!<\/ul>)/g, '$1</ul>')
      .replace(/(?<!<ul>)(<li>)/g, '<ul>$1');
  }

  /**
   * Format step name for display
   */
  formatStepName(step) {
    return step
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  }

  /**
   * Format category name
   */
  formatCategoryName(category) {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate and save reports
   */
  async generate(options = {}) {
    logger.info(`Generating onboarding report for ${this.clientSlug}`);

    const markdown = await this.generateMarkdown();
    const html = await this.generateHTML();

    const files = {
      markdown: null,
      html: null
    };

    // Save Markdown
    if (options.saveMarkdown !== false) {
      const mdPath = options.markdownPath || path.join(this.clientDir, 'ONBOARDING-REPORT.md');
      await fs.writeFile(mdPath, markdown, 'utf8');
      files.markdown = mdPath;
      logger.success(`Markdown report saved: ${mdPath}`);
    }

    // Save HTML
    if (options.saveHTML !== false) {
      const htmlPath = options.htmlPath || path.join(this.clientDir, 'ONBOARDING-REPORT.html');
      await fs.writeFile(htmlPath, html, 'utf8');
      files.html = htmlPath;
      logger.success(`HTML report saved: ${htmlPath}`);
    }

    return {
      markdown,
      html,
      files
    };
  }

  /**
   * Print summary to console
   */
  async printSummary() {
    const [khStats, locationConfig] = await Promise.all([
      this.getKnowledgeHubStats(),
      this.getLocationConfigSummary()
    ]);

    const duration = this.getTotalDuration();
    const timeSaved = this.getTimeSaved();

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║       Onboarding Complete!                     ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log(`Client: ${locationConfig.name || this.clientSlug}`);
    console.log(`Location: ${locationConfig.address?.city}, ${locationConfig.address?.state}`);
    console.log(`Setup Time: ${this.formatDuration(duration)}`);
    
    if (timeSaved.savedMinutes > 0) {
      console.log(chalk.green(`Time Saved: ${timeSaved.savedMinutes} minutes (${timeSaved.percentage}% faster than baseline) 🎉`));
    }
    console.log('');

    console.log('✅ Completed Steps:');
    Object.entries(this.data.steps).forEach(([step, info]) => {
      const icon = info.status === 'success' ? '✅' : info.status === 'warning' ? '⚠️' : '❌';
      const durationStr = info.duration ? chalk.gray(` (${info.duration}s)`) : '';
      console.log(`  ${icon} ${this.formatStepName(step)}${durationStr}`);
    });

    console.log('\n📊 Knowledge Hub:');
    console.log(`  - Pages: ${khStats.pages || 0}`);
    console.log(`  - Facts: ${khStats.facts || 0}`);

    if (this.data.journeys && this.data.journeys.length > 0) {
      console.log(`\n🎯 Journeys Generated: ${this.data.journeys.length}`);
      this.data.journeys.forEach(j => {
        console.log(`  - ${j.name} (${j.touchpointCount} touchpoints)`);
      });
    }

    console.log('\n📄 Reports:');
    console.log(`  - Markdown: ONBOARDING-REPORT.md`);
    console.log(`  - HTML: ONBOARDING-REPORT.html`);

    console.log('\n📝 Next Steps:');
    (this.data.nextSteps || [
      'Review extracted facts in Knowledge Hub',
      'Verify brand voice profile',
      'Edit default journey touchpoints',
      'Get client approval',
      'Deploy to production'
    ]).forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });

    console.log('');
  }
}

export default OnboardingReportGenerator;
