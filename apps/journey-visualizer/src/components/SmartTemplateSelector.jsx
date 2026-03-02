/**
 * SmartTemplateSelector Component
 * AI-powered template selection for email creation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Clock,
  Zap,
  Check,
  RefreshCw,
  Loader2,
  Lightbulb,
  Target,
  Calendar
} from 'lucide-react';
import { 
  aiEmailTemplateService, 
  EMAIL_CATEGORIES, 
  JOURNEY_STAGES 
} from '../services/aiEmailTemplateService';
import './SmartTemplateSelector.css';

/**
 * SmartTemplateSelector - AI-powered template selection
 */
export function SmartTemplateSelector({ 
  clientSlug,
  onSelectTemplate,
  currentContext = {},
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [templates, setTemplates] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize the service
  useEffect(() => {
    const init = async () => {
      if (clientSlug && !initialized) {
        try {
          await aiEmailTemplateService.initialize(clientSlug);
          setTemplates(aiEmailTemplateService.getTemplates());
          setInitialized(true);
        } catch (error) {
          console.warn('Failed to initialize template service:', error);
        }
      }
    };
    init();
  }, [clientSlug, initialized]);

  // Generate suggestions when context changes
  useEffect(() => {
    if (initialized && Object.keys(currentContext).length > 0) {
      generateSuggestions();
    }
  }, [initialized, currentContext]);

  const generateSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const results = await aiEmailTemplateService.getSuggestions(currentContext);
      setSuggestions(results.slice(0, 5));
    } catch (error) {
      console.warn('Failed to generate suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectTemplate = useCallback((template, category) => {
    setSelectedCategory(category);
    setIsOpen(false);
    onSelectTemplate?.(template, category);
  }, [onSelectTemplate]);

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const getCategoryIcon = (category) => {
    switch (category) {
      case EMAIL_CATEGORIES.WELCOME:
        return <FileText size={16} />;
      case EMAIL_CATEGORIES.EDUCATION:
        return <Lightbulb size={16} />;
      case EMAIL_CATEGORIES.SOCIAL_PROOF:
        return <Target size={16} />;
      case EMAIL_CATEGORIES.EMOTIONAL:
        return <Sparkles size={16} />;
      case EMAIL_CATEGORIES.VALUE:
        return <Check size={16} />;
      case EMAIL_CATEGORIES.OBJECTION_HANDLING:
        return <Search size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      [EMAIL_CATEGORIES.WELCOME]: 'Welcome',
      [EMAIL_CATEGORIES.EDUCATION]: 'Education',
      [EMAIL_CATEGORIES.SOCIAL_PROOF]: 'Social Proof',
      [EMAIL_CATEGORIES.EMOTIONAL]: 'Emotional',
      [EMAIL_CATEGORIES.INSPIRATION]: 'Inspiration',
      [EMAIL_CATEGORIES.VALUE]: 'Value',
      [EMAIL_CATEGORIES.OBJECTION_HANDLING]: 'FAQ',
      [EMAIL_CATEGORIES.CLOSE]: 'Closing',
      [EMAIL_CATEGORIES.FOLLOW_UP]: 'Follow-up',
      [EMAIL_CATEGORIES.APPOINTMENT]: 'Appointment',
      [EMAIL_CATEGORIES.PROPOSAL]: 'Proposal',
      [EMAIL_CATEGORIES.CONFIRMATION]: 'Confirmation'
    };
    return labels[category] || category;
  };

  return (
    <div className="smart-template-selector">
      {/* Trigger Button */}
      <button 
        className="smart-template-selector__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Sparkles size={16} />
        <span>AI Templates</span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="smart-template-selector__panel">
          {/* AI Suggestions Section */}
          <div className="smart-template-selector__section smart-template-selector__section--ai">
            <div className="smart-template-selector__section-header">
              <Sparkles size={14} className="smart-template-selector__section-icon" />
              <span>AI Suggestions</span>
              <button 
                className="smart-template-selector__refresh"
                onClick={generateSuggestions}
                disabled={isLoadingSuggestions}
                title="Refresh suggestions"
              >
                {isLoadingSuggestions ? (
                  <Loader2 size={14} className="smart-template-selector__spinner" />
                ) : (
                  <RefreshCw size={14} />
                )}
              </button>
            </div>
            
            {suggestions.length > 0 ? (
              <div className="smart-template-selector__suggestions">
                {suggestions.map((item, index) => (
                  <button
                    key={index}
                    className="smart-template-selector__suggestion"
                    onClick={() => handleSelectTemplate(item.template, item.template.category)}
                  >
                    <div className="smart-template-selector__suggestion-content">
                      <span className="smart-template-selector__suggestion-name">
                        {item.template.name}
                      </span>
                      <span className="smart-template-selector__suggestion-reason">
                        {item.reason}
                      </span>
                    </div>
                    <div className="smart-template-selector__suggestion-score">
                      {Math.round(item.score * 100)}%
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="smart-template-selector__empty">
                {isLoadingSuggestions ? (
                  <>
                    <Loader2 size={20} className="smart-template-selector__spinner" />
                    <span>Generating suggestions...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb size={20} />
                    <span>Add context for AI suggestions</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Categories Section */}
          <div className="smart-template-selector__section">
            <div className="smart-template-selector__section-header">
              <FileText size={14} className="smart-template-selector__section-icon" />
              <span>All Templates</span>
            </div>
            
            <div className="smart-template-selector__categories">
              {Object.entries(templates).map(([category, template]) => (
                <button
                  key={category}
                  className={`smart-template-selector__category ${
                    selectedCategory === category ? 'smart-template-selector__category--selected' : ''
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="smart-template-selector__category-icon">
                    {getCategoryIcon(category)}
                  </div>
                  <div className="smart-template-selector__category-content">
                    <span className="smart-template-selector__category-name">
                      {template.name}
                    </span>
                    <span className="smart-template-selector__category-preview">
                      {template.previewText}
                    </span>
                  </div>
                  <ChevronRight size={14} className="smart-template-selector__category-arrow" />
                </button>
              ))}
            </div>
          </div>

          {/* Selected Template Preview */}
          {selectedCategory && templates[selectedCategory] && (
            <div className="smart-template-selector__preview">
              <div className="smart-template-selector__preview-header">
                <span>Preview: {templates[selectedCategory].name}</span>
                <button
                  className="smart-template-selector__use-btn"
                  onClick={() => handleSelectTemplate(templates[selectedCategory], selectedCategory)}
                >
                  <Check size={14} />
                  Use Template
                </button>
              </div>
              <div className="smart-template-selector__preview-content">
                <div className="smart-template-selector__preview-subject">
                  <strong>Subject:</strong> {templates[selectedCategory].subject}
                </div>
                <div className="smart-template-selector__preview-text">
                  <strong>Preview:</strong> {templates[selectedCategory].previewText}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartTemplateSelector;
