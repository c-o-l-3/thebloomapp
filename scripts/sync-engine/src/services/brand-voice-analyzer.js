import logger from '../utils/logger.js';
import { KnowledgeHub } from './knowledge-hub.js';
import { AIProvider } from './ai-provider.js';

/**
 * Brand Voice Analyzer Service
 * Analyzes golden pages to extract brand voice characteristics
 */
export class BrandVoiceAnalyzer {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.hub = new KnowledgeHub(clientSlug);
    this.ai = new AIProvider();
  }

  /**
   * Check if AI provider is configured
   */
  isConfigured() {
    return this.ai.isConfigured();
  }

  /**
   * Analyze brand voice from golden pages
   */
  async analyzeBrandVoice(options = {}) {
    if (!this.isConfigured()) {
      throw new Error('AI provider not configured. Set AI_PROVIDER and corresponding API key in .env');
    }

    logger.info(`Starting brand voice analysis for ${this.clientSlug}`);

    // Get golden pages for analysis
    const pages = await this.hub.getGoldenPages({
      importance: options.importance || 'high+',
      ...options.filters
    });

    if (pages.length === 0) {
      throw new Error('No golden pages found for analysis');
    }

    logger.info(`Analyzing ${pages.length} pages for brand voice`);

    // Combine text samples from all pages
    const combinedText = pages
      .filter(p => p.textSample && p.textSample.trim().length > 100)
      .map(p => `=== ${p.title} ===\n${p.textSample.slice(0, 2000)}`)
      .join('\n\n');

    if (combinedText.length < 500) {
      throw new Error('Insufficient text content for brand voice analysis');
    }

    try {
      const analysis = await this.ai.analyzeBrandVoice(combinedText, this.getBrandVoiceAnalysisPrompt());
      
      logger.success('Brand voice analysis complete');
      
      return this.processAnalysis(analysis);

    } catch (error) {
      logger.error('Brand voice analysis failed', { error: error.message });
      
      // Try fallback provider if available
      if (await this.ai.fallback()) {
        logger.info('Retrying with fallback provider...');
        return this.analyzeBrandVoice(options);
      }
      
      throw error;
    }
  }

  /**
   * Get the brand voice analysis prompt
   */
  getBrandVoiceAnalysisPrompt() {
    return `You are a brand voice expert analyzing wedding venue website content. 
Extract the brand voice characteristics and return them as JSON.

Analyze the following aspects:

1. TONE ADJECTIVES: 5-8 adjectives describing the writing tone (e.g., "warm", "professional", "playful")

2. PERSONALITY: A brief description of the brand's personality (1-2 sentences)

3. DO's: 6-10 things the brand DOES in their writing (e.g., "Uses warm, inviting language")

4. DON'Ts: 6-10 things the brand AVOIDS in their writing (e.g., "Uses pushy sales language")

5. VOCABULARY PREFERENCES: Words they use instead of common alternatives (e.g., "celebration" instead of "event")

6. PROHIBITED TERMS: Words or phrases they likely avoid and what they use instead

7. SENTENCE PATTERNS: Common sentence structures they use (e.g., "Rhetorical questions", "Short punchy statements")

8. FORMALITY LEVEL: A score from 0.0 (very casual) to 1.0 (very formal)

9. ENTHUSIASM LEVEL: A score from 0.0 (reserved) to 1.0 (very enthusiastic)

10. INDUSTRY TERMS: Wedding/venue industry vocabulary they use

Return format:
{
  "toneAdjectives": ["warm", "elegant", "approachable"],
  "personality": "An elegant but approachable host...",
  "dos": ["Use warm, inviting language", ...],
  "donts": ["Use pushy sales language", ...],
  "vocabularyPreferences": [
    {"term": "celebration", "insteadOf": "event", "context": "Conveys joy"}
  ],
  "prohibitedTerms": [
    {"term": "cheap", "alternative": "affordable", "reason": "Implies low quality"}
  ],
  "sentencePatterns": [
    {"name": "Rhetorical Questions", "description": "...", "examples": [...]}
  ],
  "formalityLevel": 0.4,
  "enthusiasmLevel": 0.7,
  "industryTerms": ["venue", "ceremony", "reception", ...]
}`;
  }

  /**
   * Process raw analysis into brand voice profile format
   */
  processAnalysis(analysis) {
    return {
      voice: {
        adjectives: analysis.toneAdjectives || ['warm', 'professional'],
        personality: analysis.personality || 'A professional wedding venue',
        do: analysis.dos || [],
        dont: analysis.donts || []
      },
      vocabulary: {
        preferred: analysis.vocabularyPreferences || [],
        prohibited: analysis.prohibitedTerms || [],
        industry: analysis.industryTerms || []
      },
      tone: {
        formalityLevel: analysis.formalityLevel || 0.5,
        enthusiasmLevel: analysis.enthusiasmLevel || 0.6,
        patterns: analysis.sentencePatterns || []
      },
      rawAnalysis: analysis
    };
  }

  /**
   * Update the brand voice profile in Knowledge Hub
   */
  async updateBrandVoiceProfile(analysis, options = {}) {
    logger.info('Updating brand voice profile');

    // Get existing profile
    let existingProfile;
    try {
      existingProfile = await this.hub.getBrandVoice();
    } catch (error) {
      existingProfile = {};
    }

    // Merge with existing
    const updatedProfile = {
      ...existingProfile,
      voice: {
        ...(existingProfile.voice || {}),
        ...analysis.voice
      },
      vocabulary: {
        preferred: [
          ...(existingProfile.vocabulary?.preferred || []),
          ...analysis.vocabulary.preferred
        ],
        prohibited: [
          ...(existingProfile.vocabulary?.prohibited || []),
          ...analysis.vocabulary.prohibited
        ],
        industry: [
          ...new Set([
            ...(existingProfile.vocabulary?.industry || []),
            ...analysis.vocabulary.industry
          ])
        ]
      },
      tone: {
        ...(existingProfile.tone || {}),
        ...analysis.tone
      },
      lastAnalyzed: new Date().toISOString(),
      analysisSource: options.sourcePages || 'golden-pages'
    };

    // Save to Knowledge Hub
    await this.hub.updateBrandVoice(updatedProfile);

    logger.success('Brand voice profile updated');

    return updatedProfile;
  }

  /**
   * Analyze specific text content for voice patterns
   */
  async analyzeTextContent(text, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('AI provider not configured');
    }

    logger.info('Analyzing text content for voice patterns');

    const systemPrompt = `Analyze the following text for brand voice characteristics. 
Return a JSON object with:
- toneAdjectives: array of 3-5 adjectives
- keyPhrases: array of distinctive phrases used
- formalityScore: 0.0-1.0
- enthusiasmScore: 0.0-1.0
- writingStyle: brief description`;

    try {
      return await this.ai.analyzeText(text, systemPrompt);
    } catch (error) {
      logger.error('Text analysis failed', { error: error.message });
      
      // Try fallback provider if available
      if (await this.ai.fallback()) {
        logger.info('Retrying with fallback provider...');
        return this.analyzeTextContent(text, options);
      }
      
      throw error;
    }
  }

  /**
   * Compare text against brand voice guidelines
   */
  async compareToBrandVoice(text) {
    if (!this.isConfigured()) {
      throw new Error('AI provider not configured');
    }

    const brandVoice = await this.hub.getBrandVoice();
    
    logger.info('Comparing text to brand voice guidelines');

    const guidelinesPrompt = `Compare the following text to these brand voice guidelines:

BRAND VOICE:
- Adjectives: ${brandVoice.voice?.adjectives?.join(', ') || 'Not defined'}
- Personality: ${brandVoice.voice?.personality || 'Not defined'}
- DO: ${brandVoice.voice?.do?.join('; ') || 'Not defined'}
- DON'T: ${brandVoice.voice?.dont?.join('; ') || 'Not defined'}

Analyze the text and return JSON with:
- alignmentScore: 0.0-1.0 indicating how well it matches brand voice
- matches: array of elements that align with brand voice
- mismatches: array of elements that don't align
- suggestions: array of improvement suggestions`;

    try {
      return await this.ai.compareToGuidelines(text, guidelinesPrompt);
    } catch (error) {
      logger.error('Brand voice comparison failed', { error: error.message });
      
      // Try fallback provider if available
      if (await this.ai.fallback()) {
        logger.info('Retrying with fallback provider...');
        return this.compareToBrandVoice(text);
      }
      
      throw error;
    }
  }

  /**
   * Generate brand voice guidelines document
   */
  async generateGuidelinesDocument() {
    const brandVoice = await this.hub.getBrandVoice();
    
    const guidelines = `# Brand Voice Guidelines

## Company
${brandVoice.companyName || 'Your Wedding Venue'}

## Voice Adjectives
${brandVoice.voice?.adjectives?.map(a => `- ${a}`).join('\n') || '- Warm\n- Professional'}

## Personality
${brandVoice.voice?.personality || 'Professional and welcoming'}

## DO's
${brandVoice.voice?.do?.map(d => `- ${d}`).join('\n') || '- Be authentic'}

## DON'Ts
${brandVoice.voice?.dont?.map(d => `- ${d}`).join('\n') || '- Be generic'}

## Preferred Vocabulary
${brandVoice.vocabulary?.preferred?.map(v => `- **${v.term}** (instead of "${v.insteadOf}"): ${v.context}`).join('\n') || ''}

## Prohibited Terms
${brandVoice.vocabulary?.prohibited?.map(p => `- **${p.term}**: Use "${p.alternative}" instead (${p.reason})`).join('\n') || ''}

## Tone Metrics
- Formality: ${Math.round((brandVoice.tone?.formalityLevel || 0.5) * 100)}%
- Enthusiasm: ${Math.round((brandVoice.tone?.enthusiasmLevel || 0.6) * 100)}%

---
Generated: ${new Date().toISOString()}
`;

    return guidelines;
  }

  /**
   * Run complete brand voice analysis and update profile
   */
  async runFullAnalysis(options = {}) {
    logger.info(`Running full brand voice analysis for ${this.clientSlug}`);

    // Analyze voice from pages
    const analysis = await this.analyzeBrandVoice(options);

    // Update profile
    const pages = await this.hub.getGoldenPages({ importance: 'high+' });
    const updatedProfile = await this.updateBrandVoiceProfile(analysis, {
      sourcePages: pages.map(p => p.id)
    });

    // Generate guidelines
    const guidelines = await this.generateGuidelinesDocument();

    return {
      success: true,
      profile: updatedProfile,
      guidelines,
      pagesAnalyzed: pages.length,
      timestamp: new Date().toISOString()
    };
  }
}

export default BrandVoiceAnalyzer;
