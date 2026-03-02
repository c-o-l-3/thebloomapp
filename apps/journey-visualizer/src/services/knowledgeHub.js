/**
 * Knowledge Hub API Client
 * Connects to Knowledge Hub services for AI-powered content assistance
 * Supports both API mode and local file mode
 */

import axios from 'axios';
import { semanticSearch, getSemanticSearchClient } from './semanticSearchClient';

const API_BASE_URL = import.meta.env.VITE_KNOWLEDGE_HUB_API_URL || 'http://localhost:3001/api';
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'airtable';
const DEFAULT_CLIENT_SLUG = import.meta.env.VITE_CLIENT_SLUG || 'promise-farm';

/**
 * KnowledgeHub API Client class
 */
export class KnowledgeHubClient {
  constructor(clientSlug) {
    this.clientSlug = clientSlug || DEFAULT_CLIENT_SLUG;
    this.usingLocalMode = DATA_SOURCE === 'local';
    
    if (!this.usingLocalMode) {
      this.client = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  /**
   * Set the client slug for subsequent requests
   */
  setClientSlug(clientSlug) {
    this.clientSlug = clientSlug;
  }

  /**
   * Check if local mode is enabled
   */
  isLocalMode() {
    return this.usingLocalMode;
  }

  /**
   * Fetch golden pages (important website pages) for the client
   * @returns {Promise<Array>} Array of golden page objects
   */
  async fetchGoldenPages() {
    if (this.usingLocalMode) {
      return this.fetchLocalGoldenPages(this.clientSlug);
    }

    try {
      const response = await this.client.get(`/clients/${this.clientSlug}/golden-pages`);
      return response.data?.pages || [];
    } catch (error) {
      console.warn('Failed to fetch golden pages, using mock data:', error.message);
      return this.getMockGoldenPages();
    }
  }

  /**
   * Fetch verified facts for the client
   * @param {string} category - Optional category filter
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Array>} Array of fact objects
   */
  async fetchFacts(category = null, signal = null) {
    if (this.usingLocalMode) {
      return this.fetchLocalFacts(this.clientSlug, category);
    }

    try {
      const params = category ? { category } : {};
      const config = { params };
      if (signal) {
        config.signal = signal;
      }
      const response = await this.client.get(`/clients/${this.clientSlug}/facts`, config);
      return response.data?.facts || [];
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error; // Re-throw abort errors
      }
      console.warn('Failed to fetch facts, using mock data:', error.message);
      return this.getMockFacts(category);
    }
  }

  /**
   * Search facts using semantic search
   * @param {string} query - Search query
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Array>} Array of search results with facts and pages
   */
  async searchFacts(query, signal = null) {
    // Try semantic search first in local mode
    if (this.usingLocalMode) {
      try {
        // Use semantic search with vector similarity
        const semanticResults = await semanticSearch(query, this.clientSlug, {
          threshold: 0.25,
          limit: 10
        });
        
        if (semanticResults && semanticResults.results && semanticResults.results.length > 0) {
          return semanticResults.results;
        }
      } catch (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error.message);
      }
      
      // Fallback to keyword search
      const [facts, goldenPages] = await Promise.all([
        this.fetchLocalFacts(this.clientSlug),
        this.fetchLocalGoldenPages(this.clientSlug)
      ]);
      
      const queryLower = query.toLowerCase();
      
      // Search facts
      const factResults = facts
        .filter(f => f.statement?.toLowerCase().includes(queryLower))
        .map(f => ({
          id: f.id,
          type: 'fact',
          similarity: 0.8,
          text: f.statement,
          fact: f,
          category: f.category
        }))
        .slice(0, 8);
      
      // Search golden pages
      const pageResults = goldenPages
        .filter(p => 
          p.title?.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.textSample?.toLowerCase().includes(queryLower)
        )
        .map(p => ({
          id: p.id,
          type: 'page',
          similarity: 0.7,
          text: p.textSample || p.description,
          metadata: {
            title: p.title,
            url: p.url,
            category: p.category,
            importance: p.importance
          },
          category: p.category
        }))
        .slice(0, 5);
      
      // Combine and sort by similarity
      return [...factResults, ...pageResults]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10);
    }

    try {
      const config = {};
      if (signal) {
        config.signal = signal;
      }
      const response = await this.client.post(`/clients/${this.clientSlug}/search`, {
        query,
        type: 'fact',
        limit: 10
      }, config);
      return response.data?.results || [];
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error; // Re-throw abort errors
      }
      console.warn('Failed to search facts, using mock data:', error.message);
      return this.getMockSearchResults(query);
    }
  }

  /**
   * Fetch brand voice profile for the client
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Object>} Brand voice profile
   */
  async fetchBrandVoice(signal = null) {
    if (this.usingLocalMode) {
      return this.fetchLocalBrandVoice(this.clientSlug);
    }

    try {
      const config = {};
      if (signal) {
        config.signal = signal;
      }
      const response = await this.client.get(`/clients/${this.clientSlug}/brand-voice`, config);
      return response.data;
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error; // Re-throw abort errors
      }
      console.warn('Failed to fetch brand voice, using mock data:', error.message);
      return this.getMockBrandVoice();
    }
  }

  /**
   * Fetch email template library
   * @returns {Promise<Array>} Array of template objects
   */
  async fetchTemplates() {
    if (this.usingLocalMode) {
      return this.getMockTemplates();
    }

    try {
      const response = await this.client.get('/templates');
      return response.data?.templates || [];
    } catch (error) {
      console.warn('Failed to fetch templates, using mock data:', error.message);
      return this.getMockTemplates();
    }
  }

  /**
   * Generate AI copy suggestions
   * @param {string} context - The context/prompt for generation
   * @param {Object} options - Generation options
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Array>} Array of AI suggestions
   */
  async generateSuggestions(context, options = {}, signal = null) {
    if (this.usingLocalMode) {
      // In local mode, return mock suggestions based on brand voice
      return this.getMockSuggestions(context);
    }

    try {
      const config = {};
      if (signal) {
        config.signal = signal;
      }
      const response = await this.client.post(`/clients/${this.clientSlug}/ai-suggest`, {
        context,
        tone: options.tone || 'friendly',
        maxLength: options.maxLength || 200,
        count: options.count || 3
      }, config);
      return response.data?.suggestions || [];
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error; // Re-throw abort errors
      }
      console.warn('Failed to generate suggestions, using mock data:', error.message);
      return this.getMockSuggestions(context);
    }
  }

  /**
   * Check content against brand voice guidelines
   * @param {string} content - Content to check
   * @returns {Promise<Object>} Analysis results
   */
  async checkBrandVoice(content) {
    if (this.usingLocalMode) {
      return { score: 0.8, suggestions: [] };
    }

    try {
      const response = await this.client.post(`/clients/${this.clientSlug}/brand-voice/check`, {
        content
      });
      return response.data;
    } catch (error) {
      console.warn('Failed to check brand voice:', error.message);
      return { score: 0.8, suggestions: [] };
    }
  }

  // ==================== LOCAL FILE METHODS ====================

  /**
   * Fetch facts from local knowledge hub files
   * @param {string} clientSlug - Client slug
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} Array of fact objects
   */
  async fetchLocalFacts(clientSlug, category = null) {
    try {
      // Use Vite's dynamic import to load from local files
      // Use URL constructor to avoid build-time resolution issues
      const factsUrl = new URL(`../../../clients/${clientSlug}/knowledge-hub/facts/index.json`, import.meta.url).href;
      const factsModule = await import(/* @vite-ignore */ factsUrl);
      const factsData = factsModule.default;
      
      let facts = factsData.facts || [];
      
      // Filter by category if specified
      if (category) {
        facts = facts.filter(f => f.category === category);
      }
      
      return facts;
    } catch (error) {
      console.warn(`Failed to load local facts for ${clientSlug}:`, error.message);
      return this.getMockFacts(category);
    }
  }

  /**
   * Fetch brand voice from local knowledge hub files
   * @param {string} clientSlug - Client slug
   * @returns {Promise<Object>} Brand voice profile
   */
  async fetchLocalBrandVoice(clientSlug) {
    try {
      // Use Vite's dynamic import to load from local files
      const brandVoiceUrl = new URL(`../../../clients/${clientSlug}/knowledge-hub/brand-voice/profile.json`, import.meta.url).href;
      const brandVoiceModule = await import(/* @vite-ignore */ brandVoiceUrl);
      const brandVoiceData = brandVoiceModule.default;
      
      // Transform to expected format if needed
      return {
        companyName: brandVoiceData.companyName || brandVoiceData.venueName || clientSlug,
        voice: brandVoiceData.voice || brandVoiceData.brandVoice || {},
        tone: brandVoiceData.tone || {},
        vocabulary: brandVoiceData.vocabulary || brandVoiceData.voiceProfile || {},
        raw: brandVoiceData
      };
    } catch (error) {
      console.warn(`Failed to load local brand voice for ${clientSlug}:`, error.message);
      return this.getMockBrandVoice();
    }
  }

  /**
   * Fetch golden pages from local knowledge hub files
   * @param {string} clientSlug - Client slug
   * @returns {Promise<Array>} Array of golden page objects
   */
  async fetchLocalGoldenPages(clientSlug) {
    try {
      const pagesUrl = new URL(`../../../clients/${clientSlug}/knowledge-hub/golden-pages/index.json`, import.meta.url).href;
      const pagesModule = await import(/* @vite-ignore */ pagesUrl);
      const pagesData = pagesModule.default;
      
      return pagesData.pages || pagesData.goldenPages || [];
    } catch (error) {
      console.warn(`Failed to load local golden pages for ${clientSlug}:`, error.message);
      return this.getMockGoldenPages();
    }
  }

  /**
   * Search golden pages only
   * @param {string} query - Search query
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Array>} Array of golden page search results
   */
  async searchGoldenPages(query, signal = null) {
    if (this.usingLocalMode) {
      // Try semantic search first
      try {
        const client = getSemanticSearchClient(this.clientSlug);
        const semanticResults = await client.searchPages(query, {
          threshold: 0.25,
          limit: 10
        });
        
        if (semanticResults && semanticResults.results && semanticResults.results.length > 0) {
          return semanticResults.results;
        }
      } catch (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error.message);
      }
      
      // Fallback to keyword search
      const goldenPages = await this.fetchLocalGoldenPages(this.clientSlug);
      const queryLower = query.toLowerCase();
      
      return goldenPages
        .filter(p => 
          p.title?.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower) ||
          p.textSample?.toLowerCase().includes(queryLower)
        )
        .map(p => ({
          id: p.id,
          type: 'page',
          similarity: 0.7,
          text: p.textSample || p.description,
          metadata: {
            title: p.title,
            url: p.url,
            category: p.category,
            importance: p.importance
          },
          category: p.category
        }))
        .slice(0, 10);
    }

    try {
      const config = {};
      if (signal) {
        config.signal = signal;
      }
      const response = await this.client.post(`/clients/${this.clientSlug}/search/pages`, {
        query,
        limit: 10
      }, config);
      return response.data?.results || [];
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error;
      }
      console.warn('Failed to search golden pages:', error.message);
      return this.getMockSearchResults(query).filter(r => r.type === 'page');
    }
  }

  /**
   * Search facts only
   * @param {string} query - Search query
   * @param {string} category - Optional category filter
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Array>} Array of fact search results
   */
  async searchFactsOnly(query, category = null, signal = null) {
    if (this.usingLocalMode) {
      // Try semantic search first
      try {
        const client = getSemanticSearchClient(this.clientSlug);
        const semanticResults = await client.searchFacts(query, {
          threshold: 0.25,
          limit: 10
        });
        
        if (semanticResults && semanticResults.results && semanticResults.results.length > 0) {
          // Filter by category if specified
          let results = semanticResults.results;
          if (category) {
            results = results.filter(r => r.category === category);
          }
          return results;
        }
      } catch (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error.message);
      }
      
      // Fallback to keyword search
      let facts = await this.fetchLocalFacts(this.clientSlug);
      
      // Filter by category if specified
      if (category) {
        facts = facts.filter(f => f.category === category);
      }
      
      const queryLower = query.toLowerCase();
      return facts
        .filter(f => f.statement?.toLowerCase().includes(queryLower))
        .map(f => ({
          id: f.id,
          type: 'fact',
          similarity: 0.8,
          text: f.statement,
          fact: f,
          category: f.category
        }))
        .slice(0, 10);
    }

    try {
      const config = { params: {} };
      if (category) {
        config.params.category = category;
      }
      if (signal) {
        config.signal = signal;
      }
      const response = await this.client.post(`/clients/${this.clientSlug}/search/facts`, {
        query,
        category,
        limit: 10
      }, config);
      return response.data?.results || [];
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error;
      }
      console.warn('Failed to search facts:', error.message);
      return this.getMockSearchResults(query).filter(r => r.type === 'fact');
    }
  }

  /**
   * Search facts with context awareness
   * @param {string} query - Search query
   * @param {Object} context - Context for search (journeyStage, touchpointNumber, etc.)
   * @param {AbortSignal} signal - AbortController signal for cancellation
   * @returns {Promise<Array>} Array of contextually relevant search results
   */
  async searchFactsWithContext(query, context = {}, signal = null) {
    const { journeyStage, touchpointNumber, touchpointType } = context;
    
    // Define fact categories by journey stage
    const stageToCategories = {
      'new_lead': ['venue-details', 'team', 'services', 'amenities'],
      'nurturing': ['venue-details', 'testimonials', 'amenities', 'services'],
      'qualified': ['pricing', 'packages', 'services', 'amenities'],
      'proposal': ['pricing', 'packages', 'calendar', 'team'],
      'booked': ['services', 'team', 'amenities', 'timeline'],
      'post_booking': ['services', 'team', 'referrals']
    };

    // Get relevant categories for this stage
    const relevantCategories = journeyStage
      ? stageToCategories[journeyStage] || ['venue-details', 'services']
      : null;

    // First try semantic search
    let results = [];
    
    try {
      if (this.usingLocalMode) {
        // Try semantic search first
        const client = getSemanticSearchClient(this.clientSlug);
        const semanticResults = await client.searchFacts(query || '', {
          threshold: 0.2,
          limit: 15
        });
        
        if (semanticResults?.results?.length > 0) {
          results = semanticResults.results;
        }
        
        // If no semantic results, fall back to keyword search
        if (results.length === 0) {
          const allFacts = await this.fetchLocalFacts(this.clientSlug);
          const queryLower = (query || '').toLowerCase();
          
          results = allFacts
            .filter(f => !query || f.statement?.toLowerCase().includes(queryLower))
            .map(f => ({
              id: f.id,
              type: 'fact',
              similarity: query ? 0.7 : 0.5,
              text: f.statement,
              fact: f,
              category: f.category
            }));
        }
      } else {
        // API mode
        const config = {};
        if (signal) config.signal = signal;
        
        const response = await this.client.post(`/clients/${this.clientSlug}/search/facts`, {
          query: query || '',
          limit: 15,
          context: { journeyStage, touchpointNumber }
        }, config);
        
        results = response.data?.results || [];
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        throw error;
      }
      console.warn('Context-aware search failed, using fallback:', error.message);
      results = this.getMockSearchResults(query || '').filter(r => r.type === 'fact');
    }

    // Score and sort results by contextual relevance
    results = results.map(result => {
      let contextScore = result.similarity || 0.5;
      
      // Boost score for facts in relevant categories
      if (relevantCategories && result.category) {
        const categoryIndex = relevantCategories.indexOf(result.category);
        if (categoryIndex !== -1) {
          // Boost by relevance position (earlier = more relevant)
          contextScore += (relevantCategories.length - categoryIndex) * 0.1;
        }
      }
      
      // Boost for verified facts
      if (result.fact?.verificationStatus === 'verified') {
        contextScore += 0.05;
      }
      
      // Boost for high confidence
      if (result.fact?.confidence > 0.9) {
        contextScore += 0.03;
      }
      
      return {
        ...result,
        contextScore: Math.min(1, contextScore)
      };
    });

    // Sort by context score
    results.sort((a, b) => b.contextScore - a.contextScore);

    // Add contextual metadata
    return results.slice(0, 10).map(result => ({
      ...result,
      contextRelevance: {
        stage: journeyStage,
        categoryMatch: relevantCategories?.includes(result.category) || false,
        recommendedUse: this.getRecommendedFactUse(result, context)
      }
    }));
  }

  /**
   * Get recommended use for a fact based on context
   */
  getRecommendedFactUse(result, context) {
    const { journeyStage, touchpointType } = context;
    const category = result.category;
    
    const recommendations = {
      'venue-details': {
        'new_lead': 'Great for welcome emails - helps introduce the venue',
        'nurturing': 'Use to paint a picture of the venue experience',
        'qualified': 'Share specific details to help with decision-making'
      },
      'pricing': {
        'qualified': 'Share when they\'re actively considering options',
        'proposal': 'Use in proposal discussions and follow-ups'
      },
      'testimonials': {
        'nurturing': 'Perfect for building trust and social proof',
        'qualified': 'Helps validate their decision to consider you'
      },
      'team': {
        'new_lead': 'Introduce the team they\'ll be working with',
        'booked': 'Reassure them about who will handle their event'
      },
      'services': {
        'nurturing': 'Highlight what\'s included in your packages',
        'qualified': 'Detail your service offerings'
      }
    };

    const categoryRecs = recommendations[category];
    if (categoryRecs) {
      return categoryRecs[journeyStage] || categoryRecs['nurturing'] || 'Relevant for this stage';
    }
    
    return 'Consider using this fact to add credibility';
  }

  /**
   * Get smart facts based on journey context (no query needed)
   */
  async getSmartFacts(context = {}, signal = null) {
    const { journeyStage, touchpointNumber, limit = 5 } = context;
    
    // Define smart queries based on stage
    const stageQueries = {
      'new_lead': ['venue capacity', 'welcome', 'beautiful location', 'wedding venue'],
      'nurturing': ['couples love', 'testimonials', 'beautiful ceremony', 'reception space'],
      'qualified': ['packages', 'pricing', 'includes', 'coordinator'],
      'proposal': ['availability', 'booking', 'reserve date', 'next steps'],
      'booked': ['planning', 'timeline', 'coordinator', 'details']
    };

    const queries = stageQueries[journeyStage] || ['venue details'];
    
    // Use the first query for semantic search
    const primaryQuery = queries[0];
    
    try {
      const results = await this.searchFactsWithContext(primaryQuery, context, signal);
      
      // If we need more results, try other queries
      if (results.length < limit && queries.length > 1) {
        const additionalResults = [];
        
        for (let i = 1; i < queries.length && results.length + additionalResults.length < limit; i++) {
          const moreResults = await this.searchFactsWithContext(queries[i], context, signal);
          
          // Add unique results
          for (const result of moreResults) {
            if (!results.find(r => r.id === result.id) &&
                !additionalResults.find(r => r.id === result.id)) {
              additionalResults.push(result);
            }
          }
        }
        
        return [...results, ...additionalResults].slice(0, limit);
      }
      
      return results.slice(0, limit);
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.warn('Smart facts retrieval failed:', error);
      return [];
    }
  }

  // ==================== MOCK DATA ====================

  getMockGoldenPages() {
    return [
      {
        id: 'page-1',
        url: 'https://example.com/weddings',
        title: 'Wedding Venue Information',
        description: 'Everything you need to know about our wedding venue',
        importance: 'critical',
        category: 'weddings',
        textSample: 'Our venue offers a stunning backdrop for your special day with capacity for up to 200 guests.'
      },
      {
        id: 'page-2',
        url: 'https://example.com/pricing',
        title: 'Pricing & Packages',
        description: 'Wedding packages and pricing information',
        importance: 'high',
        category: 'pricing',
        textSample: 'We offer three wedding packages starting from $5,000, each customizable to your needs.'
      },
      {
        id: 'page-3',
        url: 'https://example.com/about',
        title: 'About Us',
        description: 'Our story and team',
        importance: 'medium',
        category: 'about',
        textSample: 'Founded in 2010, we have hosted over 500 beautiful weddings.'
      }
    ];
  }

  getMockFacts(category = null) {
    const facts = [
      {
        id: 'fact-1',
        category: 'venue-details',
        statement: 'The venue can accommodate up to 200 guests for a seated dinner',
        value: 200,
        unit: 'guests',
        confidence: 0.95,
        verificationStatus: 'verified',
        source: { type: 'website', reference: 'Pricing page' }
      },
      {
        id: 'fact-2',
        category: 'venue-details',
        statement: 'Ceremony space includes 150 white folding chairs',
        value: 150,
        unit: 'chairs',
        confidence: 0.9,
        verificationStatus: 'verified',
        source: { type: 'website', reference: 'Amenities page' }
      },
      {
        id: 'fact-3',
        category: 'services',
        statement: 'In-house catering available with customizable menus',
        confidence: 0.88,
        verificationStatus: 'ai-extracted',
        source: { type: 'website', reference: 'Services page' }
      },
      {
        id: 'fact-4',
        category: 'pricing',
        statement: 'Peak season pricing applies from May through October',
        confidence: 0.92,
        verificationStatus: 'verified',
        source: { type: 'website', reference: 'Pricing page' }
      },
      {
        id: 'fact-5',
        category: 'team',
        statement: 'Dedicated wedding coordinator assigned to each event',
        confidence: 0.85,
        verificationStatus: 'verified',
        source: { type: 'website', reference: 'About page' }
      }
    ];

    if (category) {
      return facts.filter(f => f.category === category);
    }
    return facts;
  }

  getMockSearchResults(query) {
    // Combine facts and golden pages in mock results
    const facts = [
      {
        id: 'emb-fact-1',
        type: 'fact',
        similarity: 0.92,
        text: 'The venue can accommodate up to 200 guests for a seated dinner',
        fact: {
          id: 'fact-1',
          statement: 'The venue can accommodate up to 200 guests for a seated dinner',
          category: 'venue-details',
          confidence: 0.95,
          verificationStatus: 'verified'
        },
        category: 'venue-details'
      },
      {
        id: 'emb-fact-3',
        type: 'fact',
        similarity: 0.78,
        text: 'In-house catering available with customizable menus',
        fact: {
          id: 'fact-3',
          statement: 'In-house catering available with customizable menus',
          category: 'services',
          confidence: 0.88,
          verificationStatus: 'ai-extracted'
        },
        category: 'services'
      }
    ];
    
    const pages = [
      {
        id: 'emb-page-1',
        type: 'page',
        similarity: 0.71,
        text: 'Our venue offers a stunning backdrop for your special day with capacity for up to 200 guests.',
        metadata: {
          title: 'Wedding Venue Information',
          url: 'https://example.com/weddings',
          category: 'venue',
          importance: 'critical'
        },
        category: 'venue'
      },
      {
        id: 'emb-page-2',
        type: 'page',
        similarity: 0.65,
        text: 'We offer three wedding packages starting from $5,000, each customizable to your needs.',
        metadata: {
          title: 'Pricing & Packages',
          url: 'https://example.com/pricing',
          category: 'pricing',
          importance: 'high'
        },
        category: 'pricing'
      }
    ];

    // Filter based on query relevance simulation
    const queryLower = query.toLowerCase();
    const filteredFacts = facts.filter(r => 
      r.text.toLowerCase().includes(queryLower) ||
      queryLower.includes('venue') ||
      queryLower.includes('wedding') ||
      queryLower.includes('catering')
    );
    
    const filteredPages = pages.filter(r => 
      r.text.toLowerCase().includes(queryLower) ||
      r.metadata?.title?.toLowerCase().includes(queryLower) ||
      queryLower.includes('venue') ||
      queryLower.includes('wedding') ||
      queryLower.includes('pricing')
    );
    
    return [...filteredFacts, ...filteredPages]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  getMockBrandVoice() {
    return {
      companyName: 'Sample Venue',
      voice: {
        adjectives: ['warm', 'elegant', 'approachable', 'knowledgeable', 'romantic'],
        personality: 'An elegant but approachable host who genuinely loves celebrations',
        do: [
          'Use warm, inviting language',
          'Refer to the venue as "we" and "our team"',
          'Include specific details and numbers',
          'Address the couple by first name',
          'Share genuine enthusiasm'
        ],
        dont: [
          'Use pushy sales language',
          'Be overly formal or stuffy',
          'Make promises that can\'t be kept',
          'Use generic wedding industry buzzwords'
        ]
      },
      tone: {
        formality: 'semi-formal',
        enthusiasm: 'high',
        humor: 'light'
      },
      vocabulary: {
        preferred: ['celebrate', 'magical', 'intimate', 'personalized', 'memorable'],
        avoided: ['cheap', 'budget', 'basic', 'standard', 'corporate']
      }
    };
  }

  getMockTemplates() {
    return [
      {
        id: 'tmpl-welcome-1',
        category: 'welcome',
        name: 'Warm Welcome',
        description: 'A friendly introduction to your venue',
        subject: 'Welcome to {{venue_name}}!',
        content: '<p>Hi {{first_name}},</p><p>Welcome to {{venue_name}}! We\'re so excited to help you plan your special day.</p>',
        type: 'email'
      },
      {
        id: 'tmpl-followup-1',
        category: 'follow-up',
        name: 'Gentle Follow-up',
        description: 'Follow up after initial inquiry',
        subject: 'Following up on your visit, {{first_name}}',
        content: '<p>Hi {{first_name}},</p><p>We wanted to follow up and see if you have any questions after your recent visit.</p>',
        type: 'email'
      },
      {
        id: 'tmpl-nurture-1',
        category: 'nurture',
        name: 'Value Nurture',
        description: 'Share valuable wedding planning tips',
        subject: '5 Tips for a Stress-Free Wedding Day',
        content: '<p>Hi {{first_name}},</p><p>We wanted to share some tips to help make your wedding planning journey smoother.</p>',
        type: 'email'
      },
      {
        id: 'tmpl-close-1',
        category: 'close',
        name: 'Soft Close',
        description: 'Gentle nudge toward booking',
        subject: 'Your date is popular, {{first_name}}',
        content: '<p>Hi {{first_name}},</p><p>We wanted to let you know that your preferred date is generating a lot of interest.</p>',
        type: 'email'
      },
      {
        id: 'tmpl-sms-1',
        category: 'welcome',
        name: 'SMS Welcome',
        description: 'Quick welcome text message',
        content: 'Hi {{first_name}}! Thanks for your interest in {{venue_name}}. We\'ll be in touch soon! 💕',
        type: 'sms'
      }
    ];
  }

  getMockSuggestions(context) {
    return [
      {
        id: 'sugg-1',
        text: 'We\'d love to welcome you and your guests to our stunning venue, where unforgettable memories are made.',
        tone: 'warm',
        source: 'AI-generated based on brand voice'
      },
      {
        id: 'sugg-2',
        text: 'Imagine saying "I do" surrounded by the natural beauty and elegance that only {{venue_name}} can provide.',
        tone: 'romantic',
        source: 'AI-generated based on venue facts'
      },
      {
        id: 'sugg-3',
        text: 'Our team is dedicated to making your wedding day as unique and special as your love story.',
        tone: 'personal',
        source: 'AI-generated with venue details'
      }
    ];
  }
}

// Create singleton instance
let knowledgeHubClient = null;

export function getKnowledgeHubClient(clientSlug) {
  if (!knowledgeHubClient || knowledgeHubClient.clientSlug !== clientSlug) {
    knowledgeHubClient = new KnowledgeHubClient(clientSlug);
  }
  return knowledgeHubClient;
}

// Export local file methods for direct use
export async function fetchLocalFacts(clientSlug, category = null) {
  const client = new KnowledgeHubClient(clientSlug);
  return client.fetchLocalFacts(clientSlug, category);
}

export async function fetchLocalBrandVoice(clientSlug) {
  const client = new KnowledgeHubClient(clientSlug);
  return client.fetchLocalBrandVoice(clientSlug);
}

export async function fetchLocalGoldenPages(clientSlug) {
  const client = new KnowledgeHubClient(clientSlug);
  return client.fetchLocalGoldenPages(clientSlug);
}

export async function searchGoldenPages(query, clientSlug = DEFAULT_CLIENT_SLUG) {
  const client = new KnowledgeHubClient(clientSlug);
  return client.searchGoldenPages(query);
}

export async function searchFactsOnly(query, category = null, clientSlug = DEFAULT_CLIENT_SLUG) {
  const client = new KnowledgeHubClient(clientSlug);
  return client.searchFactsOnly(query, category);
}

export { SemanticSearchClient, getSemanticSearchClient, semanticSearch } from './semanticSearchClient';

export default KnowledgeHubClient;
