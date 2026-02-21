import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import logger from '../utils/logger.js';

/**
 * Unified AI Provider Service
 * Supports OpenRouter (default), OpenAI, and Google Gemini with a common interface
 */
export class AIProvider {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openrouter'; // Default to OpenRouter
    this.openai = null;
    this.gemini = null;
    this.openrouter = null;
    this.rateLimitDelay = 1000;
    this.lastRequestTime = 0;
    
    this.initializeProvider();
  }

  /**
   * Initialize the selected AI provider
   */
  initializeProvider() {
    logger.info(`Initializing AI provider: ${this.provider}`);

    switch (this.provider.toLowerCase()) {
      case 'openai':
        this.initializeOpenAI();
        break;
      case 'google':
        this.initializeGemini();
        break;
      case 'openrouter':
        this.initializeOpenRouter();
        break;
      default:
        // Try to auto-detect based on available keys
        if (process.env.OPENROUTER_API_KEY) {
          this.provider = 'openrouter';
          this.initializeOpenRouter();
        } else if (process.env.OPENAI_API_KEY) {
          this.provider = 'openai';
          this.initializeOpenAI();
        } else if (process.env.GOOGLE_API_KEY) {
          this.provider = 'google';
          this.initializeGemini();
        } else {
          throw new Error('No AI provider configured. Set AI_PROVIDER and corresponding API key in .env');
        }
    }
  }

  /**
   * Initialize OpenAI client
   */
  initializeOpenAI() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured. Set it in .env file');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    logger.success('OpenAI provider initialized');
  }

  /**
   * Initialize OpenRouter client (uses OpenAI SDK with custom base URL)
   */
  initializeOpenRouter() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured. Set it in .env file');
    }

    this.openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://thebloom.app',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'The Bloom App'
      }
    });
    logger.success('OpenRouter provider initialized');
  }

  /**
   * Initialize Google Gemini client
   */
  initializeGemini() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured. Set it in .env file');
    }

    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    logger.success('Google Gemini provider initialized');
  }

  /**
   * Check if provider is configured and available
   */
  isConfigured() {
    switch (this.provider) {
      case 'openai':
        return !!this.openai;
      case 'openrouter':
        return !!this.openrouter;
      case 'google':
        return !!this.gemini;
      default:
        return false;
    }
  }

  /**
   * Get current provider name
   */
  getProviderName() {
    return this.provider;
  }

  /**
   * Get the model name based on provider
   */
  getModelName() {
    switch (this.provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'openrouter':
        return process.env.OPENROUTER_MODEL || 'moonshotai/kimi-k2.5';
      case 'google':
        return 'gemini-1.5-flash';
      default:
        return 'moonshotai/kimi-k2.5';
    }
  }

  /**
   * Get the embedding model name based on provider
   */
  getEmbeddingModelName() {
    switch (this.provider) {
      case 'openai':
        return 'text-embedding-3-small';
      case 'openrouter':
        // OpenRouter doesn't have embeddings, use OpenAI if available or fallback
        return 'openai/text-embedding-3-small';
      case 'google':
        return 'text-embedding-004';
      default:
        return 'openai/text-embedding-3-small';
    }
  }

  /**
   * Rate limiter to avoid API throttling
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract structured facts from text
   * @param {Object} page - Page object with title, url, and textSample
   * @param {string} prompt - The system prompt for fact extraction
   * @returns {Promise<Object>} - Parsed JSON with facts array
   */
  async extractFacts(page, prompt) {
    const content = `Page Title: ${page.title || 'N/A'}\nPage URL: ${page.url}\n\nContent:\n${page.textSample?.slice(0, 8000) || ''}`;

    switch (this.provider) {
      case 'openai':
        return this.extractFactsOpenAI(content, prompt);
      case 'openrouter':
        return this.extractFactsOpenRouter(content, prompt);
      case 'google':
        return this.extractFactsGemini(content, prompt);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Extract facts using OpenAI
   */
  async extractFactsOpenAI(content, prompt) {
    await this.rateLimit();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: content }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.error('OpenAI fact extraction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract facts using OpenRouter
   */
  async extractFactsOpenRouter(content, prompt) {
    await this.rateLimit();

    try {
      const response = await this.openrouter.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: content }
        ],
        temperature: 0.3
      });

      const content_text = response.choices[0].message.content;
      
      // Try to extract JSON from response (in case there's markdown)
      const jsonMatch = content_text.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content_text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(content_text);
    } catch (error) {
      logger.error('OpenRouter fact extraction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract facts using Google Gemini
   */
  async extractFactsGemini(content, prompt) {
    await this.rateLimit();

    try {
      const model = this.gemini.getGenerativeModel({ 
        model: this.getModelName(),
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent([
        { text: prompt + '\n\nRespond with valid JSON only.' },
        { text: content }
      ]);

      const response = result.response.text();
      
      // Try to extract JSON from response (in case there's markdown)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(response);
    } catch (error) {
      logger.error('Gemini fact extraction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze brand voice from website content
   * @param {string} combinedText - Combined text from golden pages
   * @param {string} prompt - The analysis prompt
   * @returns {Promise<Object>} - Brand voice analysis result
   */
  async analyzeBrandVoice(combinedText, prompt) {
    switch (this.provider) {
      case 'openai':
        return this.analyzeBrandVoiceOpenAI(combinedText, prompt);
      case 'openrouter':
        return this.analyzeBrandVoiceOpenRouter(combinedText, prompt);
      case 'google':
        return this.analyzeBrandVoiceGemini(combinedText, prompt);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Analyze brand voice using OpenAI
   */
  async analyzeBrandVoiceOpenAI(combinedText, prompt) {
    await this.rateLimit();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: combinedText.slice(0, 12000) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.error('OpenAI brand voice analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze brand voice using OpenRouter
   */
  async analyzeBrandVoiceOpenRouter(combinedText, prompt) {
    await this.rateLimit();

    try {
      const response = await this.openrouter.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: combinedText.slice(0, 12000) }
        ],
        temperature: 0.4
      });

      const content_text = response.choices[0].message.content;
      
      // Try to extract JSON from response
      const jsonMatch = content_text.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content_text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(content_text);
    } catch (error) {
      logger.error('OpenRouter brand voice analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze brand voice using Google Gemini
   */
  async analyzeBrandVoiceGemini(combinedText, prompt) {
    await this.rateLimit();

    try {
      const model = this.gemini.getGenerativeModel({ 
        model: this.getModelName(),
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent([
        { text: prompt + '\n\nRespond with valid JSON only.' },
        { text: combinedText.slice(0, 12000) }
      ]);

      const response = result.response.text();
      
      // Try to extract JSON from response
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(response);
    } catch (error) {
      logger.error('Gemini brand voice analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate text embedding for semantic search
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    // OpenRouter doesn't support embeddings directly, use OpenAI or Google
    if (this.provider === 'openrouter') {
      if (process.env.OPENAI_API_KEY) {
        return this.generateEmbeddingOpenAI(text);
      } else if (process.env.GOOGLE_API_KEY) {
        return this.generateEmbeddingGemini(text);
      } else {
        throw new Error('OpenRouter does not support embeddings. Please configure OPENAI_API_KEY or GOOGLE_API_KEY for embeddings.');
      }
    }

    switch (this.provider) {
      case 'openai':
        return this.generateEmbeddingOpenAI(text);
      case 'google':
        return this.generateEmbeddingGemini(text);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  async generateEmbeddingOpenAI(text) {
    await this.rateLimit();

    try {
      const client = this.openai || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI embedding generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate embedding using Google Gemini
   */
  async generateEmbeddingGemini(text) {
    await this.rateLimit();

    try {
      // Use Gemini's text embedding model via the embedding API
      const geminiClient = this.gemini || new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const embeddingModel = geminiClient.getGenerativeModel({ 
        model: 'models/embedding-001'
      });

      const result = await embeddingModel.embedContent(text.slice(0, 8000));
      
      return result.embedding.values;
    } catch (error) {
      logger.error('Gemini embedding generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate copy/content based on a prompt
   * @param {string} prompt - The generation prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCopy(prompt, options = {}) {
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2000;

    switch (this.provider) {
      case 'openai':
        return this.generateCopyOpenAI(prompt, temperature, maxTokens);
      case 'openrouter':
        return this.generateCopyOpenRouter(prompt, temperature, maxTokens);
      case 'google':
        return this.generateCopyGemini(prompt, temperature, maxTokens);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Generate copy using OpenAI
   */
  async generateCopyOpenAI(prompt, temperature, maxTokens) {
    await this.rateLimit();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: 'You are a helpful copywriting assistant for wedding venues.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('OpenAI copy generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate copy using OpenRouter
   */
  async generateCopyOpenRouter(prompt, temperature, maxTokens) {
    await this.rateLimit();

    try {
      const response = await this.openrouter.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: 'You are a helpful copywriting assistant for wedding venues.' },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('OpenRouter copy generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate copy using Google Gemini
   */
  async generateCopyGemini(prompt, temperature, maxTokens) {
    await this.rateLimit();

    try {
      const model = this.gemini.getGenerativeModel({ 
        model: this.getModelName(),
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
        }
      });

      const result = await model.generateContent([
        { text: 'You are a helpful copywriting assistant for wedding venues.' },
        { text: prompt }
      ]);

      return result.response.text();
    } catch (error) {
      logger.error('Gemini copy generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze text content for voice patterns
   * @param {string} text - Text to analyze
   * @param {string} systemPrompt - Analysis prompt
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeText(text, systemPrompt) {
    switch (this.provider) {
      case 'openai':
        return this.analyzeTextOpenAI(text, systemPrompt);
      case 'openrouter':
        return this.analyzeTextOpenRouter(text, systemPrompt);
      case 'google':
        return this.analyzeTextGemini(text, systemPrompt);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Analyze text using OpenAI
   */
  async analyzeTextOpenAI(text, systemPrompt) {
    await this.rateLimit();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.slice(0, 4000) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.error('OpenAI text analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze text using OpenRouter
   */
  async analyzeTextOpenRouter(text, systemPrompt) {
    await this.rateLimit();

    try {
      const response = await this.openrouter.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.slice(0, 4000) }
        ],
        temperature: 0.3
      });

      const content_text = response.choices[0].message.content;
      
      // Try to extract JSON
      const jsonMatch = content_text.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content_text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(content_text);
    } catch (error) {
      logger.error('OpenRouter text analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze text using Google Gemini
   */
  async analyzeTextGemini(text, systemPrompt) {
    await this.rateLimit();

    try {
      const model = this.gemini.getGenerativeModel({ 
        model: this.getModelName(),
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent([
        { text: systemPrompt + '\n\nRespond with valid JSON only.' },
        { text: text.slice(0, 4000) }
      ]);

      const response = result.response.text();
      
      // Try to extract JSON
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(response);
    } catch (error) {
      logger.error('Gemini text analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Compare text against guidelines
   * @param {string} text - Text to compare
   * @param {string} guidelinesPrompt - Guidelines comparison prompt
   * @returns {Promise<Object>} - Comparison result
   */
  async compareToGuidelines(text, guidelinesPrompt) {
    switch (this.provider) {
      case 'openai':
        return this.compareToGuidelinesOpenAI(text, guidelinesPrompt);
      case 'openrouter':
        return this.compareToGuidelinesOpenRouter(text, guidelinesPrompt);
      case 'google':
        return this.compareToGuidelinesGemini(text, guidelinesPrompt);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  /**
   * Compare to guidelines using OpenAI
   */
  async compareToGuidelinesOpenAI(text, guidelinesPrompt) {
    await this.rateLimit();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: guidelinesPrompt },
          { role: 'user', content: text.slice(0, 4000) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      logger.error('OpenAI guidelines comparison failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Compare to guidelines using OpenRouter
   */
  async compareToGuidelinesOpenRouter(text, guidelinesPrompt) {
    await this.rateLimit();

    try {
      const response = await this.openrouter.chat.completions.create({
        model: this.getModelName(),
        messages: [
          { role: 'system', content: guidelinesPrompt },
          { role: 'user', content: text.slice(0, 4000) }
        ],
        temperature: 0.3
      });

      const content_text = response.choices[0].message.content;
      
      // Try to extract JSON
      const jsonMatch = content_text.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content_text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(content_text);
    } catch (error) {
      logger.error('OpenRouter guidelines comparison failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Compare to guidelines using Google Gemini
   */
  async compareToGuidelinesGemini(text, guidelinesPrompt) {
    await this.rateLimit();

    try {
      const model = this.gemini.getGenerativeModel({ 
        model: this.getModelName(),
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      });

      const result = await model.generateContent([
        { text: guidelinesPrompt + '\n\nRespond with valid JSON only.' },
        { text: text.slice(0, 4000) }
      ]);

      const response = result.response.text();
      
      // Try to extract JSON
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(response);
    } catch (error) {
      logger.error('Gemini guidelines comparison failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate API key works by making a simple test request
   * @returns {Promise<boolean>} - True if API key is valid
   */
  async validateApiKey() {
    try {
      if (this.provider === 'openai') {
        // Test with a simple completion
        await this.rateLimit();
        await this.openai.chat.completions.create({
          model: this.getModelName(),
          messages: [{ role: 'user', content: 'Say "OK"' }],
          max_tokens: 5
        });
        return true;
      } else if (this.provider === 'openrouter') {
        // Test with a simple completion
        await this.rateLimit();
        await this.openrouter.chat.completions.create({
          model: this.getModelName(),
          messages: [{ role: 'user', content: 'Say "OK"' }],
          max_tokens: 5
        });
        return true;
      } else if (this.provider === 'google') {
        // Test with a simple generation
        await this.rateLimit();
        const model = this.gemini.getGenerativeModel({ model: this.getModelName() });
        await model.generateContent('Say "OK"');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('API key validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Switch to fallback provider if primary fails
   */
  async fallback() {
    const providers = ['openrouter', 'openai', 'google'];
    const currentIndex = providers.indexOf(this.provider);
    
    // Try remaining providers in order
    for (let i = currentIndex + 1; i < providers.length; i++) {
      const nextProvider = providers[i];
      
      try {
        if (nextProvider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
          logger.warn(`Falling back to OpenRouter provider`);
          this.provider = 'openrouter';
          this.initializeOpenRouter();
          return true;
        } else if (nextProvider === 'openai' && process.env.OPENAI_API_KEY) {
          logger.warn(`Falling back to OpenAI provider`);
          this.provider = 'openai';
          this.initializeOpenAI();
          return true;
        } else if (nextProvider === 'google' && process.env.GOOGLE_API_KEY) {
          logger.warn(`Falling back to Google Gemini provider`);
          this.provider = 'google';
          this.initializeGemini();
          return true;
        }
      } catch (error) {
        logger.warn(`Fallback to ${nextProvider} failed: ${error.message}`);
      }
    }
    
    return false;
  }
}

// Singleton instance (lazy-loaded)
let _aiProvider = null;

export function getAIProvider() {
  if (!_aiProvider) {
    _aiProvider = new AIProvider();
  }
  return _aiProvider;
}

// For backward compatibility - lazy singleton
export const aiProvider = new Proxy({}, {
  get(target, prop) {
    const provider = getAIProvider();
    return provider[prop];
  }
});

export default AIProvider;
