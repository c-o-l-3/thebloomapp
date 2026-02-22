/**
 * AIAssistantPanel Component
 * AI-powered writing sidebar with Knowledge Hub integration
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getKnowledgeHubClient } from '../services/knowledgeHub';
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
  AlertCircle
} from 'lucide-react';
import './AIAssistantPanel.css';

/**
 * AIAssistantPanel - AI-powered writing assistant
 */
export function AIAssistantPanel({ 
  clientSlug, 
  currentContent,
  onInsertSuggestion,
  onReplaceContent
}) {
  const [activeTab, setActiveTab] = useState('suggest'); // suggest, facts, voice
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [facts, setFacts] = useState([]);
  const [brandVoice, setBrandVoice] = useState(null);
  const [contentAnalysis, setContentAnalysis] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [knowledgeHub, setKnowledgeHub] = useState(null);

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

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

  // Initialize Knowledge Hub client
  useEffect(() => {
    if (clientSlug) {
      setKnowledgeHub(getKnowledgeHubClient(clientSlug));
    }
  }, [clientSlug]);

  // Load initial data
  useEffect(() => {
    if (knowledgeHub) {
      loadBrandVoice();
      loadFacts();
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
    if (currentContent && brandVoice) {
      analyzeContent();
    }
  }, [currentContent, brandVoice]);

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

  const loadFacts = async () => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const factsData = await knowledgeHub.fetchFacts(null, abortControllerRef.current.signal);
      if (isMountedRef.current) {
        setFacts(factsData.slice(0, 10)); // Show top 10 facts
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load facts:', error);
      }
    }
  };

  const analyzeContent = () => {
    if (!currentContent || !brandVoice) return;
    
    const contentText = currentContent.replace(/<[^>]*>/g, ' ').toLowerCase();
    const preferredWords = brandVoice.vocabulary?.preferred || [];
    const avoidedWords = brandVoice.vocabulary?.avoided || [];
    
    const usedPreferred = preferredWords.filter(word => contentText.includes(word.toLowerCase()));
    const usedAvoided = avoidedWords.filter(word => contentText.includes(word.toLowerCase()));
    
    setContentAnalysis({
      preferredUsed: usedPreferred,
      avoidedUsed: usedAvoided,
      score: Math.max(0, 100 - (usedAvoided.length * 10) + (usedPreferred.length * 5))
    });
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
    try {
      const results = await knowledgeHub.searchFacts(query, abortControllerRef.current.signal);
      if (isMountedRef.current) {
        setSuggestions(results.map(r => ({
          id: r.id,
          text: r.fact?.statement || r.text,
          source: r.fact?.source?.reference || r.metadata?.title || 'Knowledge Hub',
          type: r.type,
          confidence: r.fact?.confidence || r.similarity,
          category: r.fact?.category || r.metadata?.category
        })));
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
  }, [query, knowledgeHub]);

  const handleGenerate = useCallback(async () => {
    if (!knowledgeHub) return;
    
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isMountedRef.current) {
      setIsLoading(true);
    }
    try {
      const generated = await knowledgeHub.generateSuggestions(
        query || 'engaging wedding email content',
        {
          tone: brandVoice?.tone?.formality || 'friendly',
          count: 3
        },
        abortControllerRef.current.signal
      );
      if (isMountedRef.current) {
        setSuggestions(generated.map((s, i) => ({
          id: `gen-${i}`,
          text: s.text,
          source: s.source,
          type: 'generated',
          tone: s.tone
        })));
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
  }, [query, knowledgeHub, brandVoice]);

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

  return (
    <div className="ai-assistant-panel">
      {/* Header */}
      <div className="ai-assistant-panel__header">
        <Sparkles size={18} className="ai-assistant-panel__header-icon" />
        <h3 className="ai-assistant-panel__title">AI Writing Assistant</h3>
      </div>

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
          <div className="ai-assistant-panel__section-header">
            <h4 className="ai-assistant-panel__section-title">Verified Facts</h4>
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
    </div>
  );
}

export default AIAssistantPanel;
