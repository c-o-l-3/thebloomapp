/**
 * AIAssistantPanel Component
 * AI-powered writing sidebar with Knowledge Hub integration and context awareness
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getKnowledgeHubClient } from '../services/knowledgeHub';
import { getBrandVoiceAnalyzer } from '../services/brand-voice-analyzer';
import {
  Sparkles,
  Search,
  Check,
  X,
  Copy,
  RefreshCw,
  Lightbulb,
  Quote,
  BookOpen,
  MessageSquare,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  History,
  Target,
  Compass
} from 'lucide-react';
import './AIAssistantPanel.css';

/**
 * AIAssistantPanel - AI-powered writing assistant with context awareness
 *
 * @param {string} clientSlug - Client identifier
 * @param {string} currentContent - Current editor content
 * @param {Function} onInsertSuggestion - Callback to insert suggestion
 * @param {Function} onReplaceContent - Callback to replace content
 * @param {Object} context - Context object with journeyStage, touchpointNumber, touchpointType, journey, touchpoint
 */
export function AIAssistantPanel({
  clientSlug,
  currentContent,
  onInsertSuggestion,
  onReplaceContent,
  context = {}
}) {
  const [activeTab, setActiveTab] = useState('suggest'); // suggest, facts, voice, context, history
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [facts, setFacts] = useState([]);
  const [brandVoice, setBrandVoice] = useState(null);
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [knowledgeHub, setKnowledgeHub] = useState(null);
  const [brandVoiceAnalyzer, setBrandVoiceAnalyzer] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [contextAwareness, setContextAwareness] = useState(null);
  const [smartFacts, setSmartFacts] = useState([]);

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const historyEndRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Initialize Knowledge Hub and Brand Voice Analyzer clients
  useEffect(() => {
    if (clientSlug) {
      setKnowledgeHub(getKnowledgeHubClient(clientSlug));
      const analyzer = getBrandVoiceAnalyzer(clientSlug);
      analyzer.initialize(clientSlug).then(() => {
        if (isMountedRef.current) {
          setBrandVoiceAnalyzer(analyzer);
        }
      });
    }
  }, [clientSlug]);

  // Build context awareness when context changes
  useEffect(() => {
    if (brandVoiceAnalyzer && context) {
      const awareness = brandVoiceAnalyzer.buildContext(context);
      setContextAwareness(awareness);
    }
  }, [brandVoiceAnalyzer, context]);

  // Load initial data
  useEffect(() => {
    if (knowledgeHub) {
      loadBrandVoice();
      loadSmartFacts();
    }
    // Cleanup function to abort pending requests when knowledgeHub changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [knowledgeHub]);

  // Analyze current content when it changes
  useEffect(() => {
    if (currentContent && brandVoice && brandVoiceAnalyzer) {
      performContentAnalysis();
    }
  }, [currentContent, brandVoice, brandVoiceAnalyzer]);

  // Scroll to bottom of history when it changes
  useEffect(() => {
    if (historyEndRef.current && activeTab === 'history') {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory, activeTab]);

  const loadBrandVoice = async () => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const voice = await knowledgeHub.fetchBrandVoice(abortControllerRef.current.signal);
      if (isMountedRef.current) {
        setBrandVoice(voice);
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load brand voice:', error);
      }
    }
  };

  const loadSmartFacts = async () => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Use context-aware fact retrieval
      const factsData = await knowledgeHub.getSmartFacts(context, abortControllerRef.current.signal);
      if (isMountedRef.current) {
        setSmartFacts(factsData);
        // Also load general facts as backup
        const generalFacts = await knowledgeHub.fetchFacts(null, abortControllerRef.current.signal);
        setFacts(generalFacts.slice(0, 10));
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load smart facts:', error);
        // Fallback to regular facts
        try {
          const factsData = await knowledgeHub.fetchFacts(null, abortControllerRef.current.signal);
          if (isMountedRef.current) {
            setFacts(factsData.slice(0, 10));
          }
        } catch (fallbackError) {
          console.error('Failed to load facts:', fallbackError);
        }
      }
    }
  };

  const performContentAnalysis = () => {
    if (!currentContent || !brandVoiceAnalyzer) return;
    
    const analysis = brandVoiceAnalyzer.analyzeContent(currentContent, context);
    setContentAnalysis(analysis);
  };

  const addToHistory = (role, content, metadata = {}) => {
    const newEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };
    setConversationHistory(prev => [...prev.slice(-19), newEntry]);
    
    // Also add to analyzer history if available
    if (brandVoiceAnalyzer) {
      brandVoiceAnalyzer.addToHistory(role, content, metadata);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !knowledgeHub) return;
    
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isMountedRef.current) {
      setIsLoading(true);
    }
    
    // Add user query to history
    addToHistory('user', query, { type: 'search' });
    
    try {
      // Use context-aware search
      const results = await knowledgeHub.searchFactsWithContext(
        query,
        context,
        abortControllerRef.current.signal
      );
      
      if (isMountedRef.current) {
        const mappedResults = results.map(r => ({
          id: r.id,
          text: r.fact?.statement || r.text,
          source: r.fact?.source?.reference || r.metadata?.title || 'Knowledge Hub',
          type: r.type,
          confidence: r.contextScore || r.fact?.confidence || r.similarity,
          category: r.fact?.category || r.metadata?.category,
          contextRelevance: r.contextRelevance
        }));
        
        setSuggestions(mappedResults);
        
        // Add results to history
        if (mappedResults.length > 0) {
          addToHistory('assistant', `Found ${mappedResults.length} relevant facts for your search`, {
            type: 'search_results',
            query,
            resultCount: mappedResults.length
          });
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMountedRef.current) {
        console.error('Search failed:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [query, knowledgeHub, context]);

  const handleGenerate = useCallback(async () => {
    if (!knowledgeHub || !brandVoiceAnalyzer) return;
    
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isMountedRef.current) {
      setIsLoading(true);
    }
    
    // Add user request to history
    addToHistory('user', query || 'Generate content suggestions', { type: 'generate' });
    
    try {
      // Build context-aware prompt
      const prompt = brandVoiceAnalyzer.buildGenerationPrompt(
        query || 'engaging wedding email content',
        context
      );
      
      const generated = await knowledgeHub.generateSuggestions(
        prompt,
        {
          tone: brandVoice?.tone?.formality || 'friendly',
          count: 3
        },
        abortControllerRef.current.signal
      );
      
      if (isMountedRef.current) {
        const mappedResults = generated.map((s, i) => ({
          id: `gen-${i}`,
          text: s.text,
          source: s.source,
          type: 'generated',
          tone: s.tone,
          contextAware: true
        }));
        
        setSuggestions(mappedResults);
        
        // Add generation to history
        addToHistory('assistant', `Generated ${mappedResults.length} context-aware suggestions`, {
          type: 'generation',
          query: prompt.substring(0, 100) + '...',
          resultCount: mappedResults.length
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMountedRef.current) {
        console.error('Generation failed:', error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [query, knowledgeHub, brandVoice, brandVoiceAnalyzer, context]);

  const insertSuggestion = (text) => {
    onInsertSuggestion?.(`<p>${text}</p>`);
    setSelectedSuggestion(null);
  };

  const replaceWithSuggestion = (text) => {
    onReplaceContent?.(`<p>${text}</p>`);
    setSelectedSuggestion(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Get context display info
  const getContextDisplay = () => {
    if (!contextAwareness) return null;
    const { stage, position } = contextAwareness;
    return {
      stage: stage?.name || 'Unknown Stage',
      position: position?.label || 'General',
      tone: contextAwareness.effectiveTone
    };
  };

  const contextDisplay = getContextDisplay();

  return (
    <div className="ai-assistant-panel">
      {/* Header */}
      <div className="ai-assistant-panel__header">
        <Sparkles size={18} className="ai-assistant-panel__header-icon" />
        <h3 className="ai-assistant-panel__title">AI Writing Assistant</h3>
        {contextDisplay && (
          <div className="ai-assistant-panel__context-badge" title={`${contextDisplay.stage} • ${contextDisplay.position}`}>
            <Target size={12} />
            <span>{contextDisplay.stage}</span>
          </div>
        )}
      </div>

      {/* Context Bar */}
      {contextDisplay && (
        <div className="ai-assistant-panel__context-bar">
          <div className="ai-assistant-panel__context-info">
            <Compass size={12} />
            <span>{contextDisplay.position}</span>
            {contextDisplay.tone && (
              <span className="ai-assistant-panel__tone-indicator">
                Formality: {Math.round(contextDisplay.tone.formality * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="ai-assistant-panel__tabs">
        <button
          className={`ai-assistant-panel__tab ${activeTab === 'suggest' ? 'ai-assistant-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('suggest')}
        >
          <Lightbulb size={14} />
          Suggest
        </button>
        <button
          className={`ai-assistant-panel__tab ${activeTab === 'facts' ? 'ai-assistant-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('facts')}
        >
          <BookOpen size={14} />
          Facts
        </button>
        <button
          className={`ai-assistant-panel__tab ${activeTab === 'voice' ? 'ai-assistant-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('voice')}
        >
          <MessageSquare size={14} />
          Voice
        </button>
        <button
          className={`ai-assistant-panel__tab ${activeTab === 'history' ? 'ai-assistant-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={14} />
          History
          {conversationHistory.length > 0 && (
            <span className="ai-assistant-panel__tab-badge">{conversationHistory.length}</span>
          )}
        </button>
      </div>

      {/* Suggest Tab */}
      {activeTab === 'suggest' && (
        <div className="ai-assistant-panel__section">
          <div className="ai-assistant-panel__query">
            <div className="ai-assistant-panel__query-input-wrapper">
              <Search size={16} className="ai-assistant-panel__query-icon" />
              <input
                type="text"
                className="ai-assistant-panel__query-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What should I write about..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="ai-assistant-panel__query-actions">
              <button
                className="ai-assistant-panel__btn ai-assistant-panel__btn--secondary"
                onClick={handleSearch}
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? <Loader2 size={14} className="ai-assistant-panel__spinner" /> : <Search size={14} />}
                Search Facts
              </button>
              <button
                className="ai-assistant-panel__btn ai-assistant-panel__btn--primary"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 size={14} className="ai-assistant-panel__spinner" /> : <Sparkles size={14} />}
                Generate with AI
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="ai-assistant-panel__suggestions">
            {suggestions.length === 0 && !isLoading && (
              <div className="ai-assistant-panel__empty">
                <Sparkles size={32} className="ai-assistant-panel__empty-icon" />
                <p>Enter a query and click "Generate with AI" or "Search Facts" to get suggestions</p>
              </div>
            )}

            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`ai-assistant-panel__suggestion ${selectedSuggestion?.id === suggestion.id ? 'ai-assistant-panel__suggestion--selected' : ''}`}
                onClick={() => setSelectedSuggestion(suggestion)}
              >
                <div className="ai-assistant-panel__suggestion-content">
                  <p className="ai-assistant-panel__suggestion-text">{suggestion.text}</p>
                  <div className="ai-assistant-panel__suggestion-meta">
                    <span className="ai-assistant-panel__suggestion-source">
                      <Quote size={12} />
                      {suggestion.source}
                    </span>
                    {suggestion.confidence && (
                      <span className="ai-assistant-panel__suggestion-confidence">
                        {Math.round(suggestion.confidence * 100)}% match
                      </span>
                    )}
                    {suggestion.category && (
                      <span className="ai-assistant-panel__suggestion-category">
                        {suggestion.category}
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedSuggestion?.id === suggestion.id && (
                  <div className="ai-assistant-panel__suggestion-actions">
                    <button
                      className="ai-assistant-panel__action-btn"
                      onClick={() => insertSuggestion(suggestion.text)}
                      title="Insert at cursor"
                    >
                      <ChevronRight size={14} />
                      Insert
                    </button>
                    <button
                      className="ai-assistant-panel__action-btn"
                      onClick={() => replaceWithSuggestion(suggestion.text)}
                      title="Replace all content"
                    >
                      <RefreshCw size={14} />
                      Replace
                    </button>
                    <button
                      className="ai-assistant-panel__action-btn"
                      onClick={() => copyToClipboard(suggestion.text)}
                      title="Copy to clipboard"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facts Tab */}
      {activeTab === 'facts' && (
        <div className="ai-assistant-panel__section">
          {/* Smart Facts Section */}
          {smartFacts.length > 0 && (
            <div className="ai-assistant-panel__smart-facts">
              <div className="ai-assistant-panel__section-header">
                <h4 className="ai-assistant-panel__section-title">
                  <Sparkles size={14} />
                  Recommended for {contextDisplay?.stage || 'Current Stage'}
                </h4>
                <span className="ai-assistant-panel__section-count">{smartFacts.length} facts</span>
              </div>

              <div className="ai-assistant-panel__facts-list">
                {smartFacts.map((fact) => (
                  <div key={`smart-${fact.id}`} className="ai-assistant-panel__fact ai-assistant-panel__fact--smart">
                    <div className="ai-assistant-panel__fact-status">
                      {fact.fact?.verificationStatus === 'verified' ? (
                        <CheckCircle2 size={14} className="ai-assistant-panel__fact-verified" />
                      ) : (
                        <AlertCircle size={14} className="ai-assistant-panel__fact-pending" />
                      )}
                    </div>
                    <div className="ai-assistant-panel__fact-content">
                      <p className="ai-assistant-panel__fact-text">{fact.fact?.statement || fact.text}</p>
                      <div className="ai-assistant-panel__fact-meta">
                        <span className="ai-assistant-panel__fact-category">{fact.category}</span>
                        {fact.contextRelevance?.recommendedUse && (
                          <span className="ai-assistant-panel__fact-recommendation" title={fact.contextRelevance.recommendedUse}>
                            {fact.contextRelevance.recommendedUse.substring(0, 40)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="ai-assistant-panel__fact-insert"
                      onClick={() => insertSuggestion(fact.fact?.statement || fact.text)}
                      title="Insert fact"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ai-assistant-panel__section-header">
            <h4 className="ai-assistant-panel__section-title">All Verified Facts</h4>
            <span className="ai-assistant-panel__section-count">{facts.length} facts</span>
          </div>

          <div className="ai-assistant-panel__facts-list">
            {facts.map((fact) => (
              <div key={fact.id} className="ai-assistant-panel__fact">
                <div className="ai-assistant-panel__fact-status">
                  {fact.verificationStatus === 'verified' ? (
                    <CheckCircle2 size={14} className="ai-assistant-panel__fact-verified" />
                  ) : (
                    <AlertCircle size={14} className="ai-assistant-panel__fact-pending" />
                  )}
                </div>
                <div className="ai-assistant-panel__fact-content">
                  <p className="ai-assistant-panel__fact-text">{fact.statement}</p>
                  <div className="ai-assistant-panel__fact-meta">
                    <span className="ai-assistant-panel__fact-category">{fact.category}</span>
                    {fact.value && (
                      <span className="ai-assistant-panel__fact-value">
                        {fact.value} {fact.unit}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="ai-assistant-panel__fact-insert"
                  onClick={() => insertSuggestion(fact.statement)}
                  title="Insert fact"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Tab */}
      {activeTab === 'voice' && brandVoice && (
        <div className="ai-assistant-panel__section">
          {/* Content Analysis */}
          {contentAnalysis && (
            <div className="ai-assistant-panel__analysis">
              <h4 className="ai-assistant-panel__analysis-title">Content Analysis</h4>
              <div className="ai-assistant-panel__analysis-score">
                <div 
                  className="ai-assistant-panel__score-bar"
                  style={{ width: `${Math.min(100, Math.max(0, contentAnalysis.score))}%` }}
                />
                <span className="ai-assistant-panel__score-value">{Math.round(contentAnalysis.score)}%</span>
              </div>
              
              {contentAnalysis.avoidedUsed.length > 0 && (
                <div className="ai-assistant-panel__analysis-section">
                  <span className="ai-assistant-panel__analysis-label ai-assistant-panel__analysis-label--warning">
                    <AlertCircle size={12} />
                    Words to avoid:
                  </span>
                  <div className="ai-assistant-panel__word-tags">
                    {contentAnalysis.avoidedUsed.map(word => (
                      <span key={word} className="ai-assistant-panel__word-tag ai-assistant-panel__word-tag--avoid">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {contentAnalysis.preferredUsed.length > 0 && (
                <div className="ai-assistant-panel__analysis-section">
                  <span className="ai-assistant-panel__analysis-label ai-assistant-panel__analysis-label--success">
                    <CheckCircle2 size={12} />
                    Great word choices:
                  </span>
                  <div className="ai-assistant-panel__word-tags">
                    {contentAnalysis.preferredUsed.map(word => (
                      <span key={word} className="ai-assistant-panel__word-tag ai-assistant-panel__word-tag--good">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Brand Voice Guidelines */}
          <div className="ai-assistant-panel__voice-section">
            <h4 className="ai-assistant-panel__section-title">Voice Guidelines</h4>
            
            <div className="ai-assistant-panel__voice-block">
              <span className="ai-assistant-panel__voice-label">Personality</span>
              <p className="ai-assistant-panel__voice-text">{brandVoice.voice?.personality}</p>
            </div>

            <div className="ai-assistant-panel__voice-block">
              <span className="ai-assistant-panel__voice-label">Adjectives</span>
              <div className="ai-assistant-panel__voice-tags">
                {brandVoice.voice?.adjectives?.map(adj => (
                  <span key={adj} className="ai-assistant-panel__voice-tag">{adj}</span>
                ))}
              </div>
            </div>

            <div className="ai-assistant-panel__voice-block">
              <span className="ai-assistant-panel__voice-label">Do</span>
              <ul className="ai-assistant-panel__voice-list">
                {brandVoice.voice?.do?.slice(0, 3).map((item, i) => (
                  <li key={i} className="ai-assistant-panel__voice-item">
                    <Check size={12} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ai-assistant-panel__voice-block">
              <span className="ai-assistant-panel__voice-label">Don't</span>
              <ul className="ai-assistant-panel__voice-list">
                {brandVoice.voice?.dont?.slice(0, 3).map((item, i) => (
                  <li key={i} className="ai-assistant-panel__voice-item ai-assistant-panel__voice-item--dont">
                    <X size={12} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="ai-assistant-panel__section">
          <div className="ai-assistant-panel__section-header">
            <h4 className="ai-assistant-panel__section-title">
              <History size={14} />
              Conversation History
            </h4>
            {conversationHistory.length > 0 && (
              <button
                className="ai-assistant-panel__clear-history"
                onClick={() => setConversationHistory([])}
              >
                Clear
              </button>
            )}
          </div>

          {conversationHistory.length === 0 ? (
            <div className="ai-assistant-panel__empty">
              <History size={32} className="ai-assistant-panel__empty-icon" />
              <p>No conversation history yet</p>
              <p className="ai-assistant-panel__empty-hint">
                Your searches and generations will appear here
              </p>
            </div>
          ) : (
            <div className="ai-assistant-panel__history-list">
              {conversationHistory.map((entry, index) => (
                <div
                  key={index}
                  className={`ai-assistant-panel__history-item ai-assistant-panel__history-item--${entry.role}`}
                >
                  <div className="ai-assistant-panel__history-header">
                    <span className="ai-assistant-panel__history-role">
                      {entry.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <span className="ai-assistant-panel__history-time">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="ai-assistant-panel__history-content">
                    {entry.content}
                  </p>
                  {entry.metadata?.type && (
                    <span className="ai-assistant-panel__history-type">
                      {entry.metadata.type}
                    </span>
                  )}
                </div>
              ))}
              <div ref={historyEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AIAssistantPanel;
