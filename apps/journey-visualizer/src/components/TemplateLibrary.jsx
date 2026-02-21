/**
 * TemplateLibrary Component
 * Pre-built touchpoint template browser and selector
 */

import React, { useState, useEffect, useMemo } from 'react';
import { getKnowledgeHubClient } from '../services/knowledgeHub';
import { TOUCHPOINT_TYPE } from '../types';
import { 
  X, 
  Search, 
  Filter,
  Mail,
  MessageSquare,
  Clock,
  CheckSquare,
  Zap,
  ChevronRight,
  Eye,
  Check,
  LayoutGrid,
  List
} from 'lucide-react';
import './TemplateLibrary.css';

// Template categories
const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: LayoutGrid },
  { id: 'welcome', label: 'Welcome', icon: Mail },
  { id: 'follow-up', label: 'Follow-up', icon: MessageSquare },
  { id: 'nurture', label: 'Nurture', icon: Clock },
  { id: 'close', label: 'Close', icon: CheckSquare },
  { id: 'trigger', label: 'Triggers', icon: Zap }
];

// Template type filters
const TYPE_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' }
];

/**
 * TemplateLibrary - Modal for browsing and selecting templates
 */
export function TemplateLibrary({ 
  isOpen, 
  onClose, 
  clientSlug, 
  onSelectTemplate 
}) {
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load templates
  useEffect(() => {
    if (isOpen && clientSlug) {
      loadTemplates();
    }
  }, [isOpen, clientSlug]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const hub = getKnowledgeHubClient(clientSlug);
      const data = await hub.fetchTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false;
      }
      
      // Type filter
      if (selectedType !== 'all' && template.type !== selectedType) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          template.name?.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          template.subject?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [templates, selectedCategory, selectedType, searchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups = {};
    filteredTemplates.forEach(template => {
      const category = template.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate?.(selectedTemplate);
      onClose();
    }
  };

  const getTemplateIcon = (type) => {
    switch (type) {
      case 'email': return <Mail size={20} />;
      case 'sms': return <MessageSquare size={20} />;
      default: return <Mail size={20} />;
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    const Icon = category?.icon || LayoutGrid;
    return <Icon size={16} />;
  };

  if (!isOpen) return null;

  return (
    <div className="template-library-overlay" onClick={onClose}>
      <div className="template-library" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="template-library__header">
          <div className="template-library__header-left">
            <h2 className="template-library__title">Template Library</h2>
            <p className="template-library__subtitle">
              Choose a pre-built template to get started
            </p>
          </div>
          <button className="template-library__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="template-library__filters">
          <div className="template-library__search">
            <Search size={18} className="template-library__search-icon" />
            <input
              type="text"
              className="template-library__search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
            />
          </div>

          <div className="template-library__filter-group">
            <Filter size={16} className="template-library__filter-icon" />
            <select
              className="template-library__filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {TYPE_FILTERS.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="template-library__view-toggle">
            <button
              className={`template-library__view-btn ${viewMode === 'grid' ? 'template-library__view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`template-library__view-btn ${viewMode === 'list' ? 'template-library__view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="template-library__content">
          {/* Category Sidebar */}
          <div className="template-library__sidebar">
            <h3 className="template-library__sidebar-title">Categories</h3>
            <ul className="template-library__category-list">
              {CATEGORIES.map(category => (
                <li key={category.id}>
                  <button
                    className={`template-library__category-btn ${selectedCategory === category.id ? 'template-library__category-btn--active' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className="template-library__category-icon">{category.icon && <category.icon size={16} />}</span>
                    <span className="template-library__category-label">{category.label}</span>
                    <span className="template-library__category-count">
                      {templates.filter(t => category.id === 'all' || t.category === category.id).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Templates Grid/List */}
          <div className="template-library__templates">
            {isLoading ? (
              <div className="template-library__loading">
                <div className="template-library__spinner" />
                <span>Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="template-library__empty">
                <Mail size={48} className="template-library__empty-icon" />
                <h3>No templates found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {selectedCategory === 'all' ? (
                  // Show grouped by category
                  Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                    <div key={category} className="template-library__group">
                      <h4 className="template-library__group-title">
                        {getCategoryIcon(category)}
                        {CATEGORIES.find(c => c.id === category)?.label || category}
                        <span className="template-library__group-count">({categoryTemplates.length})</span>
                      </h4>
                      <div className={`template-library__grid template-library__grid--${viewMode}`}>
                        {categoryTemplates.map(template => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isSelected={selectedTemplate?.id === template.id}
                            viewMode={viewMode}
                            onClick={() => handleSelectTemplate(template)}
                            getTemplateIcon={getTemplateIcon}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // Show flat list for selected category
                  <div className={`template-library__grid template-library__grid--${viewMode}`}>
                    {filteredTemplates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selectedTemplate?.id === template.id}
                        viewMode={viewMode}
                        onClick={() => handleSelectTemplate(template)}
                        getTemplateIcon={getTemplateIcon}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {selectedTemplate && (
          <div className="template-library__preview">
            <div className="template-library__preview-header">
              <h3 className="template-library__preview-title">
                {getTemplateIcon(selectedTemplate.type)}
                {selectedTemplate.name}
              </h3>
              <button className="template-library__preview-close" onClick={() => setSelectedTemplate(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="template-library__preview-content">
              <div className="template-library__preview-meta">
                <span className={`template-library__preview-type template-library__preview-type--${selectedTemplate.type}`}>
                  {selectedTemplate.type?.toUpperCase()}
                </span>
                <span className="template-library__preview-category">
                  {CATEGORIES.find(c => c.id === selectedTemplate.category)?.label || selectedTemplate.category}
                </span>
              </div>

              {selectedTemplate.subject && (
                <div className="template-library__preview-field">
                  <label>Subject:</label>
                  <span>{selectedTemplate.subject}</span>
                </div>
              )}

              <div className="template-library__preview-body">
                <label>Preview:</label>
                <div 
                  className="template-library__preview-html"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedTemplate.content || selectedTemplate.body || 'No content preview available'
                  }}
                />
              </div>

              {selectedTemplate.description && (
                <p className="template-library__preview-description">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            <div className="template-library__preview-actions">
              <button
                className="template-library__btn template-library__btn--secondary"
                onClick={() => setSelectedTemplate(null)}
              >
                Cancel
              </button>
              <button
                className="template-library__btn template-library__btn--primary"
                onClick={handleUseTemplate}
              >
                <Check size={16} />
                Use This Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * TemplateCard - Individual template card component
 */
function TemplateCard({ template, isSelected, viewMode, onClick, getTemplateIcon }) {
  if (viewMode === 'list') {
    return (
      <div
        className={`template-card template-card--list ${isSelected ? 'template-card--selected' : ''}`}
        onClick={onClick}
      >
        <div className="template-card__icon template-card__icon--list">
          {getTemplateIcon(template.type)}
        </div>
        <div className="template-card__content template-card__content--list">
          <h4 className="template-card__title">{template.name}</h4>
          <p className="template-card__description">{template.description}</p>
        </div>
        <div className="template-card__meta template-card__meta--list">
          <span className={`template-card__type template-card__type--${template.type}`}>
            {template.type}
          </span>
          <ChevronRight size={16} className="template-card__arrow" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`template-card ${isSelected ? 'template-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="template-card__header">
        <div className={`template-card__icon template-card__icon--${template.type}`}>
          {getTemplateIcon(template.type)}
        </div>
        <span className={`template-card__type template-card__type--${template.type}`}>
          {template.type}
        </span>
      </div>
      <div className="template-card__content">
        <h4 className="template-card__title">{template.name}</h4>
        <p className="template-card__description">{template.description}</p>
      </div>
      <div className="template-card__footer">
        <button className="template-card__preview-btn">
          <Eye size={14} />
          Preview
        </button>
      </div>
    </div>
  );
}

export default TemplateLibrary;
