/**
 * Brand Voice Analyzer Service
 * Analyzes content against brand voice guidelines and provides context-aware suggestions
 */

import { getKnowledgeHubClient } from './knowledgeHub';

/**
 * Journey stage definitions with context-appropriate messaging guidelines
 */
export const JOURNEY_STAGE_CONTEXT = {
  NEW_LEAD: {
    stage: 'new_lead',
    name: 'New Lead',
    description: 'Initial contact, first impression',
    toneModifiers: {
      formality: 0.3,
      enthusiasm: 0.8,
      urgency: 0.1
    },
    messagingFocus: ['welcome', 'introduction', 'venue_overview'],
    factCategories: ['venue-details', 'team', 'services'],
    vocabulary: {
      preferred: ['welcome', 'celebrate', 'excited', 'special day'],
      avoided: ['sales', 'contract', 'deposit', 'price']
    }
  },
  NURTURING: {
    stage: 'nurturing',
    name: 'Nurturing',
    description: 'Building relationship, providing value',
    toneModifiers: {
      formality: 0.4,
      enthusiasm: 0.6,
      urgency: 0.2
    },
    messagingFocus: ['education', 'social_proof', 'inspiration'],
    factCategories: ['venue-details', 'amenities', 'team', 'testimonials'],
    vocabulary: {
      preferred: ['imagine', 'picture', 'beautiful', 'memories'],
      avoided: ['pushy', 'urgent', 'limited time']
    }
  },
  QUALIFIED: {
    stage: 'qualified',
    name: 'Qualified Lead',
    description: 'Serious interest, actively considering',
    toneModifiers: {
      formality: 0.5,
      enthusiasm: 0.7,
      urgency: 0.4
    },
    messagingFocus: ['details', 'faq', 'value_proposition'],
    factCategories: ['pricing', 'packages', 'services', 'amenities'],
    vocabulary: {
      preferred: ['details', 'included', 'coordinate', 'personalized'],
      avoided: ['cheap', 'basic', 'standard']
    }
  },
  PROPOSAL: {
    stage: 'proposal',
    name: 'Proposal Stage',
    description: 'Custom proposal, booking decision',
    toneModifiers: {
      formality: 0.5,
      enthusiasm: 0.7,
      urgency: 0.6
    },
    messagingFocus: ['proposal', 'next_steps', 'availability'],
    factCategories: ['pricing', 'packages', 'calendar', 'team'],
    vocabulary: {
      preferred: ['proposal', 'custom', 'reserve', 'date'],
      avoided: ['final', 'last chance', 'act now']
    }
  },
  BOOKED: {
    stage: 'booked',
    name: 'Booked',
    description: 'Date secured, planning begins',
    toneModifiers: {
      formality: 0.4,
      enthusiasm: 0.8,
      urgency: 0.3
    },
    messagingFocus: ['confirmation', 'celebration', 'planning'],
    factCategories: ['services', 'team', 'amenities'],
    vocabulary: {
      preferred: ['congratulations', 'booked', 'planning', 'celebrate'],
      avoided: ['sold', 'final', 'non-refundable']
    }
  },
  POST_BOOKING: {
    stage: 'post_booking',
    name: 'Post-Booking',
    description: 'Ongoing relationship, referrals',
    toneModifiers: {
      formality: 0.3,
      enthusiasm: 0.6,
      urgency: 0.1
    },
    messagingFocus: ['support', 'referrals', 'reviews'],
    factCategories: ['team', 'services'],
    vocabulary: {
      preferred: ['journey', 'memories', 'referral', 'review'],
      avoided: ['complaint', 'problem', 'issue']
    }
  }
};

/**
 * Touchpoint position context
 */
export const TOUCHPOINT_POSITION = {
  FIRST: { position: 'first', label: 'Opening Touchpoint', importance: 'critical' },
  EARLY: { position: 'early', label: 'Early Sequence', importance: 'high' },
  MIDDLE: { position: 'middle', label: 'Mid Sequence', importance: 'medium' },
  LATE: { position: 'late', label: 'Late Sequence', importance: 'high' },
  LAST: { position: 'last', label: 'Closing Touchpoint', importance: 'critical' }
};

/**
 * Brand Voice Analyzer class
 * Provides context-aware brand voice analysis and suggestions
 */
export class BrandVoiceAnalyzer {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.knowledgeHub = null;
    this.brandVoice = null;
    this.conversationHistory = [];
  }

  /**
   * Initialize the analyzer
   */
  async initialize(clientSlug) {
    this.clientSlug = clientSlug || this.clientSlug;
    this.knowledgeHub = getKnowledgeHubClient(this.clientSlug);
    await this.loadBrandVoice();
    return this;
  }

  /**
   * Load brand voice from Knowledge Hub
   */
  async loadBrandVoice() {
    if (!this.knowledgeHub) return null;
    try {
      this.brandVoice = await this.knowledgeHub.fetchBrandVoice();
      return this.brandVoice;
    } catch (error) {
      console.warn('Failed to load brand voice:', error);
      return null;
    }
  }

  /**
   * Get context for a specific journey stage
   */
  getStageContext(stage) {
    const stageKey = Object.keys(JOURNEY_STAGE_CONTEXT).find(
      key => JOURNEY_STAGE_CONTEXT[key].stage === stage
    );
    return stageKey ? JOURNEY_STAGE_CONTEXT[stageKey] : JOURNEY_STAGE_CONTEXT.NURTURING;
  }

  /**
   * Determine touchpoint position in sequence
   */
  getTouchpointPosition(touchpointNumber, totalTouchpoints) {
    if (touchpointNumber === 1) return TOUCHPOINT_POSITION.FIRST;
    if (touchpointNumber === totalTouchpoints) return TOUCHPOINT_POSITION.LAST;
    
    const percentage = touchpointNumber / totalTouchpoints;
    if (percentage <= 0.33) return TOUCHPOINT_POSITION.EARLY;
    if (percentage <= 0.66) return TOUCHPOINT_POSITION.MIDDLE;
    return TOUCHPOINT_POSITION.LATE;
  }

  /**
   * Build comprehensive context object for AI generation
   */
  buildContext(context = {}) {
    const {
      journeyStage,
      touchpointNumber,
      totalTouchpoints,
      touchpointType,
      previousContent,
      contactData
    } = context;

    const stageContext = this.getStageContext(journeyStage);
    const position = touchpointNumber && totalTouchpoints 
      ? this.getTouchpointPosition(touchpointNumber, totalTouchpoints)
      : null;

    return {
      stage: stageContext,
      position,
      touchpointType: touchpointType || 'email',
      brandVoice: this.brandVoice,
      previousContent,
      contactData,
      // Merge brand voice tone with stage-specific modifiers
      effectiveTone: this.calculateEffectiveTone(stageContext),
      // Get relevant fact categories for this stage
      relevantFactCategories: stageContext.factCategories,
      // Get vocabulary guidance
      vocabulary: stageContext.vocabulary
    };
  }

  /**
   * Calculate effective tone based on brand voice and stage modifiers
   */
  calculateEffectiveTone(stageContext) {
    if (!this.brandVoice?.tone?.byStage) {
      return stageContext.toneModifiers;
    }

    // Find matching stage in brand voice
    const stageTone = this.brandVoice.tone.byStage.find(
      s => s.stage === stageContext.stage
    );

    if (!stageTone) {
      return stageContext.toneModifiers;
    }

    // Merge with stage context modifiers
    return {
      formality: stageTone.formality ?? stageContext.toneModifiers.formality,
      enthusiasm: stageTone.enthusiasm ?? stageContext.toneModifiers.enthusiasm,
      urgency: stageTone.urgency ?? stageContext.toneModifiers.urgency
    };
  }

  /**
   * Analyze content against brand voice guidelines
   */
  analyzeContent(content, context = {}) {
    if (!this.brandVoice || !content) {
      return { score: 0, issues: [], suggestions: [] };
    }

    const issues = [];
    const suggestions = [];
    const contentText = content.toLowerCase();
    const contentWords = contentText.split(/\s+/);

    // Check vocabulary - avoided words
    const avoidedWords = this.brandVoice.vocabulary?.avoided || [];
    const usedAvoided = avoidedWords.filter(word => 
      contentText.includes(word.toLowerCase())
    );

    usedAvoided.forEach(word => {
      issues.push({
        type: 'vocabulary',
        severity: 'warning',
        message: `Avoid using "${word}"`,
        word,
        suggestion: this.getAlternativeWord(word)
      });
    });

    // Check vocabulary - preferred words not used
    const preferredWords = this.brandVoice.vocabulary?.preferred || [];
    const usedPreferred = preferredWords.filter(word => 
      contentText.includes(word.toLowerCase())
    );

    // Suggest adding preferred words if not used
    const unusedPreferred = preferredWords.filter(word => 
      !contentText.includes(word.toLowerCase())
    );

    if (unusedPreferred.length > 0 && usedPreferred.length < 3) {
      suggestions.push({
        type: 'vocabulary',
        message: `Consider using: ${unusedPreferred.slice(0, 3).join(', ')}`,
        words: unusedPreferred.slice(0, 3)
      });
    }

    // Check do's and don'ts
    const dos = this.brandVoice.voice?.do || [];
    const donts = this.brandVoice.voice?.dont || [];

    // Check for don't patterns
    donts.forEach(dont => {
      // Extract key phrases from the don't statement
      const keyPhrase = dont.toLowerCase().replace(/use |be |avoid /g, '').split(' ')[0];
      if (contentText.includes(keyPhrase) && keyPhrase.length > 4) {
        issues.push({
          type: 'guideline',
          severity: 'suggestion',
          message: `Check: ${dont}`,
          guideline: dont
        });
      }
    });

    // Calculate score
    const baseScore = 100;
    const avoidedPenalty = usedAvoided.length * 15;
    const preferredBonus = Math.min(usedPreferred.length * 5, 20);
    const score = Math.max(0, Math.min(100, baseScore - avoidedPenalty + preferredBonus));

    // Generate context-aware suggestions
    const contextualSuggestions = this.generateContextualSuggestions(content, context);

    return {
      score,
      issues,
      suggestions: [...suggestions, ...contextualSuggestions],
      stats: {
        wordCount: contentWords.length,
        preferredWordsUsed: usedPreferred.length,
        avoidedWordsUsed: usedAvoided.length,
        readability: this.estimateReadability(contentText)
      }
    };
  }

  /**
   * Get alternative word suggestion
   */
  getAlternativeWord(word) {
    const alternatives = {
      'cheap': 'affordable',
      'free': 'included',
      'budget': 'investment-friendly',
      'basic': 'essential',
      'standard': 'classic',
      'corporate': 'professional',
      'clients': 'couples',
      'customers': 'guests'
    };
    return alternatives[word.toLowerCase()] || null;
  }

  /**
   * Generate contextual suggestions based on journey stage and content
   */
  generateContextualSuggestions(content, context) {
    const suggestions = [];
    const { journeyStage, touchpointNumber } = context;
    const contentText = content.toLowerCase();

    // Stage-specific suggestions
    switch (journeyStage) {
      case 'new_lead':
        if (!contentText.includes('welcome')) {
          suggestions.push({
            type: 'content',
            message: 'Consider a warm welcome message for new leads'
          });
        }
        if (!contentText.includes('?')) {
          suggestions.push({
            type: 'engagement',
            message: 'Add a question to encourage engagement'
          });
        }
        break;

      case 'nurturing':
        if (!contentText.includes('imagine') && !contentText.includes('picture')) {
          suggestions.push({
            type: 'imagery',
            message: 'Use sensory language to help them visualize their day'
          });
        }
        break;

      case 'qualified':
        if (!contentText.includes('included') && !contentText.includes('includes')) {
          suggestions.push({
            type: 'value',
            message: 'Highlight what\'s included in your packages'
          });
        }
        break;

      case 'proposal':
        if (!contentText.includes('next')) {
          suggestions.push({
            type: 'cta',
            message: 'Include clear next steps'
          });
        }
        break;
    }

    // Touchpoint position suggestions
    if (touchpointNumber === 1) {
      if (contentText.length > 1500) {
        suggestions.push({
          type: 'length',
          message: 'First touchpoint should be concise (under 1500 characters)'
        });
      }
    }

    return suggestions;
  }

  /**
   * Estimate readability score (simple version)
   */
  estimateReadability(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 50;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = words.reduce((acc, word) => {
      return acc + this.countSyllables(word);
    }, 0) / words.length;

    // Simple Flesch Reading Ease approximation
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !prevWasVowel) count++;
      prevWasVowel = isVowel;
    }
    
    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }

  /**
   * Build AI generation prompt with full context
   */
  buildGenerationPrompt(query, context = {}) {
    const fullContext = this.buildContext(context);
    const { stage, position, effectiveTone, brandVoice, vocabulary } = fullContext;

    let prompt = query || 'Write engaging email content';
    
    // Add context header
    prompt += `\n\nContext:`;
    prompt += `\n- Journey Stage: ${stage.name} (${stage.description})`;
    
    if (position) {
      prompt += `\n- Position in Sequence: ${position.label}`;
    }

    // Add tone guidance
    if (effectiveTone) {
      prompt += `\n- Formality Level: ${Math.round(effectiveTone.formality * 100)}%`;
      prompt += `\n- Enthusiasm Level: ${Math.round(effectiveTone.enthusiasm * 100)}%`;
    }

    // Add brand voice guidance
    if (brandVoice?.voice?.personality) {
      prompt += `\n- Brand Personality: ${brandVoice.voice.personality}`;
    }

    if (brandVoice?.voice?.adjectives?.length > 0) {
      prompt += `\n- Use these adjectives: ${brandVoice.voice.adjectives.join(', ')}`;
    }

    // Add stage-specific vocabulary guidance
    if (vocabulary?.preferred?.length > 0) {
      prompt += `\n- Preferred words: ${vocabulary.preferred.join(', ')}`;
    }

    if (vocabulary?.avoided?.length > 0) {
      prompt += `\n- Avoid: ${vocabulary.avoided.join(', ')}`;
    }

    // Add contact personalization
    if (context.contactData) {
      const { first_name, event_date, venue_name } = context.contactData;
      if (first_name) prompt += `\n- Recipient Name: ${first_name}`;
      if (event_date) prompt += `\n- Event Date: ${event_date}`;
      if (venue_name) prompt += `\n- Venue: ${venue_name}`;
    }

    // Add messaging focus
    if (stage?.messagingFocus?.length > 0) {
      prompt += `\n- Focus Areas: ${stage.messagingFocus.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Add message to conversation history
   */
  addToHistory(role, content, metadata = {}) {
    this.conversationHistory.push({
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString(),
      metadata
    });

    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(limit = 10) {
    return this.conversationHistory.slice(-limit);
  }

  /**
   * Get context from recent conversation history
   */
  getConversationContext() {
    const recentMessages = this.getHistory(5);
    if (recentMessages.length === 0) return '';

    return recentMessages.map(msg => {
      const prefix = msg.role === 'user' ? 'User' : 'Assistant';
      return `${prefix}: ${msg.content.substring(0, 100)}...`;
    }).join('\n');
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }
}

// Singleton instance
let brandVoiceAnalyzer = null;

/**
 * Get singleton instance of BrandVoiceAnalyzer
 */
export function getBrandVoiceAnalyzer(clientSlug) {
  if (!brandVoiceAnalyzer || brandVoiceAnalyzer.clientSlug !== clientSlug) {
    brandVoiceAnalyzer = new BrandVoiceAnalyzer(clientSlug);
  }
  return brandVoiceAnalyzer;
}

// Export class for custom instances
export { BrandVoiceAnalyzer };

export default {
  BrandVoiceAnalyzer,
  getBrandVoiceAnalyzer,
  JOURNEY_STAGE_CONTEXT,
  TOUCHPOINT_POSITION
};