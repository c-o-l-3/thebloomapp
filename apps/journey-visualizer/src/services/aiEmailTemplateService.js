/**
 * AI Email Template Service
 * Provides AI-powered email template generation and smart suggestions
 */

import { getKnowledgeHubClient } from './knowledgeHub';

/**
 * Email campaign types for template categorization
 */
export const EMAIL_CATEGORIES = {
  WELCOME: 'welcome',
  EDUCATION: 'education',
  SOCIAL_PROOF: 'social_proof',
  EMOTIONAL: 'emotional',
  INSPIRATION: 'inspiration',
  VALUE: 'value',
  OBJECTION_HANDLING: 'objection_handling',
  CLOSE: 'close',
  FOLLOW_UP: 'follow_up',
  APPOINTMENT: 'appointment',
  PROPOSAL: 'proposal',
  CONFIRMATION: 'confirmation'
};

/**
 * Journey stages for template context
 */
export const JOURNEY_STAGES = {
  NEW_LEAD: 'new_lead',
  NURTURING: 'nurturing',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  BOOKED: 'booked',
  POST_BOOKING: 'post_booking'
};

/**
 * Default email templates for various scenarios
 */
export const DEFAULT_TEMPLATES = {
  // Welcome emails
  [EMAIL_CATEGORIES.WELCOME]: {
    name: 'Welcome Email',
    subject: 'Welcome to {{venue_name}}, {{first_name}}!',
    previewText: 'We\'re excited to connect with you!',
    category: EMAIL_CATEGORIES.WELCOME,
    structure: [
      { type: 'header', content: 'Welcome to {{venue_name}}!' },
      { type: 'text', content: 'Hi {{first_name}},\n\nThank you for reaching out to us. We\'re thrilled to help you plan your special day!' },
      { type: 'cta', label: 'Schedule a Tour', link: '{{links.book_tour}}' },
      { type: 'signature', name: '{{planner_name}}', title: 'Wedding Specialist' }
    ]
  },

  // Education emails
  [EMAIL_CATEGORIES.EDUCATION]: {
    name: 'Educational Content',
    subject: '{{first_name}}, here\'s what to look for in a venue',
    previewText: 'Tips from our team of experts',
    category: EMAIL_CATEGORIES.EDUCATION,
    structure: [
      { type: 'header', content: 'What to Look for in Your Perfect Venue' },
      { type: 'text', content: 'Hi {{first_name}},\n\nChoosing a wedding venue is one of the biggest decisions you\'ll make. Here are our top tips...' },
      { type: 'list', items: ['Consider your guest count', 'Think about your style', 'Ask about inclusions', 'Meet the team'] },
      { type: 'cta', label: 'Book a Tour', link: '{{links.book_tour}}' }
    ]
  },

  // Social proof / testimonials
  [EMAIL_CATEGORIES.SOCIAL_PROOF]: {
    name: 'Success Stories',
    subject: '{{first_name}}, hear what our couples say',
    previewText: 'Real weddings, real love stories',
    category: EMAIL_CATEGORIES.SOCIAL_PROOF,
    structure: [
      { type: 'header', content: 'What Our Couples Say' },
      { type: 'testimonial', quote: 'The best decision we made!', couple: 'Sarah & Mike', date: '2024' },
      { type: 'testimonial', quote: 'Our guests are still talking about our wedding!', couple: 'Emily & John', date: '2024' },
      { type: 'cta', label: 'Read More Reviews', link: '{{links.reviews}}' }
    ]
  },

  // Emotional / vision
  [EMAIL_CATEGORIES.EMOTIONAL]: {
    name: 'Vision Builder',
    subject: '{{first_name}}, imagine your perfect day',
    previewText: 'Close your eyes and picture it...',
    category: EMAIL_CATEGORIES.EMOTIONAL,
    structure: [
      { type: 'header', content: 'Picture Your Perfect Day' },
      { type: 'text', content: 'Hi {{first_name}},\n\nWhen you imagine your wedding day, what do you see?' },
      { type: 'vision', prompts: ['Walking down the aisle', 'Your first dance', 'The toast from your best man'] },
      { type: 'cta', label: 'See Our Venue', link: '{{links.website}}' }
    ]
  },

  // Value / inclusions
  [EMAIL_CATEGORIES.VALUE]: {
    name: 'What\'s Included',
    subject: 'What\'s really included at {{venue_name}}',
    previewText: 'No hidden fees, no surprises',
    category: EMAIL_CATEGORIES.VALUE,
    structure: [
      { type: 'header', content: 'What\'s Included in Your Package' },
      { type: 'list', items: ['Ceremony & reception venue', 'Catering & bar', 'Day-of coordination', 'All rentals included'] },
      { type: 'text', content: 'We believe in transparent pricing. No surprise fees.' },
      { type: 'cta', label: 'Get Full Details', link: '{{links.pricing}}' }
    ]
  },

  // Objection handling / FAQ
  [EMAIL_CATEGORIES.OBJECTION_HANDLING]: {
    name: 'Common Questions',
    subject: '{{first_name}}, answers to common questions',
    previewText: 'Everything you need to know',
    category: EMAIL_CATEGORIES.OBJECTION_HANDLING,
    structure: [
      { type: 'header', content: 'Common Questions Answered' },
      { type: 'faq', questions: ['What about deposits?', 'Can we bring our own vendors?', 'What\'s the payment plan?'] },
      { type: 'text', content: 'Have more questions? We\'re here to help!' },
      { type: 'cta', label: 'Contact Us', link: '{{links.contact}}' }
    ]
  },

  // Close / final
  [EMAIL_CATEGORIES.CLOSE]: {
    name: 'Final Follow-up',
    subject: 'Wishing you the best, {{first_name}}',
    previewText: 'We\'d love to host your special day',
    category: EMAIL_CATEGORIES.CLOSE,
    structure: [
      { type: 'text', content: 'Hi {{first_name}},\n\nWe haven\'t heard from you recently, but we wanted to wish you the best on your wedding planning journey.' },
      { type: 'text', content: 'If you have any questions about {{venue_name}}, we\'re always here.' },
      { type: 'signature', name: 'The Team', title: '{{venue_name}}' }
    ]
  },

  // Follow-up
  [EMAIL_CATEGORIES.FOLLOW_UP]: {
    name: 'Post-Tour Follow-up',
    subject: 'Thank you for visiting, {{first_name}}!',
    previewText: 'We loved showing you around',
    category: EMAIL_CATEGORIES.FOLLOW_UP,
    structure: [
      { type: 'header', content: 'Thank You for Visiting!' },
      { type: 'text', content: 'Hi {{first_name}},\n\nIt was wonderful meeting you! We loved showing you around {{venue_name}}.' },
      { type: 'text', content: 'Let us know if you have any questions about what you saw today.' },
      { type: 'cta', label: 'Next Steps', link: '{{links.proposal}}' }
    ]
  },

  // Appointment / tour
  [EMAIL_CATEGORIES.APPOINTMENT]: {
    name: 'Tour Reminder',
    subject: 'Your tour is tomorrow, {{first_name}}!',
    previewText: 'We can\'t wait to show you around',
    category: EMAIL_CATEGORIES.APPOINTMENT,
    structure: [
      { type: 'header', content: 'Your Tour Reminder' },
      { type: 'text', content: 'Hi {{first_name}},\n\nThis is a friendly reminder about your upcoming tour tomorrow!' },
      { type: 'details', items: ['Date: {{tour_date}}', 'Time: {{tour_time}}', 'Location: {{venue_name}}'] },
      { type: 'text', content: 'We recommend arriving 5-10 minutes early to get settled.' },
      { type: 'cta', label: 'Get Directions', link: '{{links.directions}}' }
    ]
  },

  // Proposal
  [EMAIL_CATEGORIES.PROPOSAL]: {
    name: 'Proposal Sent',
    subject: 'Your custom proposal from {{venue_name}}',
    previewText: 'Ready to make it official?',
    category: EMAIL_CATEGORIES.PROPOSAL,
    structure: [
      { type: 'header', content: 'Your Custom Proposal' },
      { type: 'text', content: 'Hi {{first_name}},\n\nThank you for considering {{venue_name}} for your special day! Please find your custom proposal attached.' },
      { type: 'details', items: ['Event Date: {{event_date}}', 'Guest Count: {{guest_count}}', 'Package: {{package_name}}'] },
      { type: 'text', content: 'We\'re excited to potentially host your wedding!' },
      { type: 'cta', label: 'Questions?', link: '{{links.contact}}' }
    ]
  },

  // Confirmation
  [EMAIL_CATEGORIES.CONFIRMATION]: {
    name: 'Booking Confirmation',
    subject: 'You\'re officially booked, {{first_name}}!',
    previewText: 'Congratulations! Your date is reserved',
    category: EMAIL_CATEGORIES.CONFIRMATION,
    structure: [
      { type: 'header', content: 'Congratulations, {{first_name}}!' },
      { type: 'text', content: 'Your wedding at {{venue_name}} is officially booked!' },
      { type: 'details', items: ['Date: {{event_date}}', 'Venue: {{venue_name}}', 'Coordinator: {{planner_name}}'] },
      { type: 'text', content: 'We can\'t wait to celebrate with you!' },
      { type: 'cta', label: 'Start Planning', link: '{{links.planning_portal}}' }
    ]
  }
};

/**
 * AIEmailTemplateService - Provides AI-powered email template functionality
 */
class AIEmailTemplateService {
  constructor() {
    this.knowledgeHub = null;
    this.clientSlug = null;
    this.brandVoice = null;
    this.templates = { ...DEFAULT_TEMPLATES };
  }

  /**
   * Initialize the service with a client slug
   */
  async initialize(clientSlug) {
    this.clientSlug = clientSlug;
    this.knowledgeHub = getKnowledgeHubClient(clientSlug);
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
   * Get available templates
   */
  getTemplates(category = null) {
    if (category) {
      return this.templates[category] || null;
    }
    return this.templates;
  }

  /**
   * Get templates by journey stage
   */
  getTemplatesForStage(stage) {
    const stageToCategory = {
      [JOURNEY_STAGES.NEW_LEAD]: [EMAIL_CATEGORIES.WELCOME, EMAIL_CATEGORIES.FOLLOW_UP],
      [JOURNEY_STAGES.NURTURING]: [EMAIL_CATEGORIES.EDUCATION, EMAIL_CATEGORIES.SOCIAL_PROOF, EMAIL_CATEGORIES.EMOTIONAL, EMAIL_CATEGORIES.INSPIRATION, EMAIL_CATEGORIES.VALUE],
      [JOURNEY_STAGES.QUALIFIED]: [EMAIL_CATEGORIES.VALUE, EMAIL_CATEGORIES.OBJECTION_HANDLING],
      [JOURNEY_STAGES.PROPOSAL]: [EMAIL_CATEGORIES.PROPOSAL],
      [JOURNEY_STAGES.BOOKED]: [EMAIL_CATEGORIES.CONFIRMATION],
      [JOURNEY_STAGES.POST_BOOKING]: [EMAIL_CATEGORIES.FOLLOW_UP]
    };

    const categories = stageToCategory[stage] || [];
    return categories.map(cat => this.templates[cat]).filter(Boolean);
  }

  /**
   * Generate AI-powered content for a template
   */
  async generateContent(template, context = {}) {
    const { brandVoice } = this;
    
    // Build prompt based on template and context
    const prompt = this.buildGenerationPrompt(template, context, brandVoice);
    
    if (!this.knowledgeHub) {
      // Fallback to template content if no AI available
      return this.generateFallbackContent(template, context);
    }

    try {
      const suggestions = await this.knowledgeHub.generateSuggestions(prompt, {
        tone: brandVoice?.tone?.formality || 'friendly',
        count: 1
      });
      
      if (suggestions && suggestions.length > 0) {
        return {
          content: suggestions[0].text,
          tone: suggestions[0].tone,
          source: 'ai'
        };
      }
    } catch (error) {
      console.warn('AI generation failed, using fallback:', error);
    }

    return this.generateFallbackContent(template, context);
  }

  /**
   * Build generation prompt
   */
  buildGenerationPrompt(template, context, brandVoice) {
    const categoryLabels = {
      [EMAIL_CATEGORIES.WELCOME]: 'a warm welcome email',
      [EMAIL_CATEGORIES.EDUCATION]: 'an educational email about venue selection',
      [EMAIL_CATEGORIES.SOCIAL_PROOF]: 'a social proof email with testimonials',
      [EMAIL_CATEGORIES.EMOTIONAL]: 'an emotional email helping them visualize their day',
      [EMAIL_CATEGORIES.INSPIRATION]: 'an inspirational email with Pinterest ideas',
      [EMAIL_CATEGORIES.VALUE]: 'a value-focused email about inclusions',
      [EMAIL_CATEGORIES.OBJECTION_HANDLING]: 'an FAQ/objection handling email',
      [EMAIL_CATEGORIES.CLOSE]: 'a gentle closing email',
      [EMAIL_CATEGORIES.FOLLOW_UP]: 'a post-tour follow-up email',
      [EMAIL_CATEGORIES.APPOINTMENT]: 'a tour reminder email',
      [EMAIL_CATEGORIES.PROPOSAL]: 'a proposal email',
      [EMAIL_CATEGORIES.CONFIRMATION]: 'a booking confirmation email'
    };

    let prompt = `Write ${categoryLabels[template.category] || 'an email'} for a wedding venue.`;
    
    if (context.first_name) {
      prompt += `\nThe couple's first name is: ${context.first_name}`;
    }
    
    if (context.venue_name) {
      prompt += `\nThe venue name is: ${context.venue_name}`;
    }

    if (brandVoice?.voice?.personality) {
      prompt += `\nThe brand personality is: ${brandVoice.voice.personality}`;
    }

    if (brandVoice?.voice?.adjectives?.length > 0) {
      prompt += `\nUse these adjectives: ${brandVoice.voice.adjectives.join(', ')}`;
    }

    prompt += '\nWrite compelling, warm, and professional content that encourages them to book a tour or make a decision.';

    return prompt;
  }

  /**
   * Generate fallback content from template structure
   */
  generateFallbackContent(template, context) {
    const replacements = {
      '{{first_name}}': context.first_name || 'there',
      '{{last_name}}': context.last_name || '',
      '{{full_name}}': context.full_name || context.first_name || 'there',
      '{{venue_name}}': context.venue_name || 'our venue',
      '{{event_date}}': context.event_date || 'your special day',
      '{{guest_count}}': context.guest_count || 'your guests',
      '{{planner_name}}': context.planner_name || 'our team',
      '{{tour_date}}': context.tour_date || 'tomorrow',
      '{{tour_time}}': context.tour_time || '10:00 AM',
      '{{package_name}}': context.package_name || 'your chosen package'
    };

    let content = '';

    if (template.structure) {
      for (const block of template.structure) {
        switch (block.type) {
          case 'header':
            content += `<h1>${this.replaceTokens(block.content, replacements)}</h1>\n\n`;
            break;
          case 'text':
            content += `<p>${this.replaceTokens(block.content, replacements)}</p>\n\n`;
            break;
          case 'cta':
            content += `<a href="${block.link}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">${block.label}</a>\n\n`;
            break;
          case 'list':
            if (block.items) {
              content += '<ul>\n';
              for (const item of block.items) {
                content += `<li>${this.replaceTokens(item, replacements)}</li>\n`;
              }
              content += '</ul>\n\n';
            }
            break;
          case 'testimonial':
            content += `<blockquote>"${block.quote}"</blockquote>\n<p>— ${block.couple}, ${block.date}</p>\n\n`;
            break;
          case 'signature':
            content += `<p>Best,<br/>${block.name}<br/>${block.title}</p>\n\n`;
            break;
          case 'details':
            if (block.items) {
              content += '<p>\n';
              for (const item of block.items) {
                content += `${this.replaceTokens(item, replacements)}<br/>\n`;
              }
              content += '</p>\n\n';
            }
            break;
        }
      }
    }

    return {
      content: content || template.subject,
      tone: 'friendly',
      source: 'template'
    };
  }

  /**
   * Replace tokens in content
   */
  replaceTokens(text, replacements) {
    let result = text;
    for (const [token, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(token, 'g'), value);
    }
    return result;
  }

  /**
   * Get smart template suggestions based on context
   */
  async getSuggestions(context = {}) {
    const { 
      journeyStage, 
      touchpointNumber, 
      daysSinceLead, 
      contactData,
      previousEmails 
    } = context;

    const suggestions = [];

    // Stage-based suggestions
    if (journeyStage) {
      const stageTemplates = this.getTemplatesForStage(journeyStage);
      for (const template of stageTemplates) {
        suggestions.push({
          template,
          reason: `Recommended for ${journeyStage} stage`,
          score: 0.9
        });
      }
    }

    // Day-based suggestions for nurture sequence
    if (daysSinceLead !== undefined) {
      const dayTemplates = this.getDayBasedTemplate(daysSinceLead);
      if (dayTemplates) {
        suggestions.unshift({
          template: dayTemplates,
          reason: `Standard sequence for Day ${daysSinceLead}`,
          score: 1.0
        });
      }
    }

    // Touchpoint-based suggestions
    if (touchpointNumber) {
      const touchpointTemplate = this.getTouchpointTemplate(touchpointNumber);
      if (touchpointTemplate) {
        suggestions.unshift({
          template: touchpointTemplate,
          reason: `Standard sequence for Touchpoint ${touchpointNumber}`,
          score: 1.0
        });
      }
    }

    // AI-enhanced suggestions
    if (this.knowledgeHub && contactData) {
      try {
        const personalized = await this.personalizeSuggestions(suggestions, contactData);
        return personalized;
      } catch (error) {
        console.warn('Personalization failed:', error);
      }
    }

    // Sort by score
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Get template for specific day in nurture sequence
   */
  getDayBasedTemplate(day) {
    const dayTemplates = {
      1: EMAIL_CATEGORIES.WELCOME,
      2: EMAIL_CATEGORIES.EDUCATION,
      3: EMAIL_CATEGORIES.SOCIAL_PROOF,
      5: EMAIL_CATEGORIES.EMOTIONAL,
      7: EMAIL_CATEGORIES.INSPIRATION,
      10: EMAIL_CATEGORIES.VALUE,
      12: EMAIL_CATEGORIES.OBJECTION_HANDLING,
      14: EMAIL_CATEGORIES.CLOSE
    };

    const category = dayTemplates[day];
    return category ? this.templates[category] : null;
  }

  /**
   * Get template for specific touchpoint
   */
  getTouchpointTemplate(touchpointNumber) {
    // Map touchpoint numbers to categories (similar to 14-day sequence)
    const touchpointCategories = {
      1: EMAIL_CATEGORIES.WELCOME,
      2: EMAIL_CATEGORIES.EDUCATION,
      3: EMAIL_CATEGORIES.SOCIAL_PROOF,
      5: EMAIL_CATEGORIES.EMOTIONAL,
      6: EMAIL_CATEGORIES.INSPIRATION,
      8: EMAIL_CATEGORIES.OBJECTION_HANDLING,
      10: EMAIL_CATEGORIES.CLOSE
    };

    const category = touchpointCategories[touchpointNumber];
    return category ? this.templates[category] : null;
  }

  /**
   * Personalize suggestions with AI
   */
  async personalizeSuggestions(suggestions, contactData) {
    if (!this.knowledgeHub || !this.brandVoice) {
      return suggestions;
    }

    try {
      // Analyze contact data for personalization
      const context = {
        first_name: contactData.first_name,
        venue_name: contactData.venue_name || 'our venue',
        event_date: contactData.event_date,
        guest_count: contactData.guest_count,
        budget: contactData.budget,
        style: contactData.style
      };

      // Re-score suggestions based on contact data
      for (const suggestion of suggestions) {
        // Adjust score based on match with contact preferences
        if (contactData.style && suggestion.template.category === EMAIL_CATEGORIES.INSPIRATION) {
          suggestion.score += 0.1;
        }
        if (contactData.guest_count && suggestion.template.category === EMAIL_CATEGORIES.VALUE) {
          suggestion.score += 0.1;
        }
      }

      return suggestions.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.warn('Personalization failed:', error);
      return suggestions;
    }
  }

  /**
   * Expand a template into full HTML email
   */
  async expandToHTML(template, context = {}) {
    const content = await this.generateContent(template, context);
    
    // Build HTML from template structure
    let html = this.buildHTMLFromTemplate(template, content, context);
    
    return html;
  }

  /**
   * Build HTML email from template
   */
  buildHTMLFromTemplate(template, generatedContent, context) {
    const replacements = {
      '{{first_name}}': context.first_name || 'there',
      '{{last_name}}': context.last_name || '',
      '{{full_name}}': context.full_name || context.first_name || 'there',
      '{{venue_name}}': context.venue_name || 'Our Venue',
      '{{event_date}}': context.event_date || 'your special day',
      '{{guest_count}}': context.guest_count || 'your guests',
      '{{planner_name}}': context.planner_name || 'Our Team',
      '{{contact_email}}': context.contact_email || 'info@venue.com',
      '{{contact_phone}}': context.contact_phone || '(555) 123-4567'
    };

    const primaryColor = context.primary_color || '#2C3E50';
    const accentColor = context.accent_color || '#D4AF37';
    const fontFamily = context.font_family || 'Arial, sans-serif';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.replaceTokens(template.subject, replacements)}</title>
  <style>
    body { margin: 0; padding: 0; font-family: ${fontFamily}; line-height: 1.6; color: #333; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background-color: ${primaryColor}; color: #ffffff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px 20px; }
    .content p { margin: 0 0 15px; }
    .cta { text-align: center; padding: 20px; }
    .cta a { display: inline-block; padding: 14px 30px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 500; }
    .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #666; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    blockquote { border-left: 4px solid ${accentColor}; padding-left: 20px; margin: 20px 0; font-style: italic; color: #555; }
  </style>
</head>
<body>
  <table class="email-container" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td class="header">
        <h1>${this.replaceTokens(template.name, replacements)}</h1>
      </td>
    </tr>
    <tr>
      <td class="content">
        ${generatedContent.content}
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>${context.venue_name || 'The Venue Team'}</p>
        <p>${context.contact_email || ''} | ${context.contact_phone || ''}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

// Export singleton instance
export const aiEmailTemplateService = new AIEmailTemplateService();

// Export class for custom instances
export { AIEmailTemplateService };

// Export categories for reference
export default {
  EMAIL_CATEGORIES,
  JOURNEY_STAGES,
  DEFAULT_TEMPLATES,
  aiEmailTemplateService,
  AIEmailTemplateService
};
