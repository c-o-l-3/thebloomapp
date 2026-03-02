/**
 * FieldMappingManager Component - P1 Q2 2026
 * UI for mapping custom fields between the system and GoHighLevel
 * Supports field type validation and transformation rules
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../services/apiClient';
import './FieldMappingManager.css';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text', icon: '📝' },
  { value: 'NUMBER', label: 'Number', icon: '🔢' },
  { value: 'DATE', label: 'Date', icon: '📅' },
  { value: 'DATETIME', label: 'Date & Time', icon: '🕐' },
  { value: 'EMAIL', label: 'Email', icon: '📧' },
  { value: 'PHONE', label: 'Phone', icon: '📞' },
  { value: 'URL', label: 'URL', icon: '🔗' },
  { value: 'DROPDOWN', label: 'Dropdown', icon: '📋' },
  { value: 'MULTI_SELECT', label: 'Multi Select', icon: '☑️' },
  { value: 'CHECKBOX', label: 'Checkbox', icon: '✅' },
  { value: 'TEXTAREA', label: 'Text Area', icon: '📄' },
  { value: 'CURRENCY', label: 'Currency', icon: '💵' },
  { value: 'PERCENTAGE', label: 'Percentage', icon: '📊' }
];

const TRANSFORMATION_RULES = [
  { value: '', label: 'None' },
  { value: 'uppercase', label: 'Convert to Uppercase' },
  { value: 'lowercase', label: 'Convert to Lowercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'capitalize', label: 'Capitalize Words' },
  { value: 'date_format', label: 'Format Date' },
  { value: 'phone_format', label: 'Format Phone Number' },
  { value: 'currency_format', label: 'Format Currency' },
  { value: 'strip_non_numeric', label: 'Remove Non-Numeric Characters' },
  { value: 'default_value', label: 'Set Default Value' },
  { value: 'concatenate', label: 'Concatenate Fields' },
  { value: 'substring', label: 'Extract Substring' },
  { value: 'lookup', label: 'Lookup Value from Table' }
];

const VALIDATION_RULES = [
  { value: '', label: 'None' },
  { value: 'required', label: 'Required Field' },
  { value: 'email', label: 'Valid Email' },
  { value: 'phone', label: 'Valid Phone Number' },
  { value: 'url', label: 'Valid URL' },
  { value: 'min_length', label: 'Minimum Length' },
  { value: 'max_length', label: 'Maximum Length' },
  { value: 'min_value', label: 'Minimum Value' },
  { value: 'max_value', label: 'Maximum Value' },
  { value: 'regex', label: 'Regex Pattern' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'enum', label: 'Allowed Values' }
];

const STANDARD_SOURCE_FIELDS = [
  { name: 'firstName', type: 'TEXT', label: 'First Name', category: 'contact' },
  { name: 'lastName', type: 'TEXT', label: 'Last Name', category: 'contact' },
  { name: 'email', type: 'EMAIL', label: 'Email', category: 'contact' },
  { name: 'phone', type: 'PHONE', label: 'Phone', category: 'contact' },
  { name: 'address.street', type: 'TEXT', label: 'Street Address', category: 'contact' },
  { name: 'address.city', type: 'TEXT', label: 'City', category: 'contact' },
  { name: 'address.state', type: 'TEXT', label: 'State', category: 'contact' },
  { name: 'address.postalCode', type: 'TEXT', label: 'Postal Code', category: 'contact' },
  { name: 'company', type: 'TEXT', label: 'Company', category: 'contact' },
  { name: 'jobTitle', type: 'TEXT', label: 'Job Title', category: 'contact' },
  { name: 'source', type: 'TEXT', label: 'Lead Source', category: 'contact' },
  { name: 'tags', type: 'MULTI_SELECT', label: 'Tags', category: 'contact' },
  { name: 'notes', type: 'TEXTAREA', label: 'Notes', category: 'contact' },
  { name: 'weddingDate', type: 'DATE', label: 'Wedding Date', category: 'event' },
  { name: 'eventDate', type: 'DATE', label: 'Event Date', category: 'event' },
  { name: 'eventType', type: 'DROPDOWN', label: 'Event Type', category: 'event' },
  { name: 'guestCount', type: 'NUMBER', label: 'Guest Count', category: 'event' },
  { name: 'budget', type: 'CURRENCY', label: 'Budget', category: 'event' },
  { name: 'venueName', type: 'TEXT', label: 'Venue Name', category: 'venue' },
  { name: 'ceremonyTime', type: 'TEXT', label: 'Ceremony Time', category: 'event' },
  { name: 'venueSelectionStatus', type: 'DROPDOWN', label: 'Venue Selection Status', category: 'venue' },
  { name: 'contractValue', type: 'CURRENCY', label: 'Contract Value', category: 'contract' },
  { name: 'referralSource', type: 'TEXT', label: 'Referral Source', category: 'marketing' },
  { name: 'leadScore', type: 'NUMBER', label: 'Lead Score', category: 'marketing' }
];

const CATEGORIES = {
  contact: { label: 'Contact Fields', icon: '👤', color: '#4CAF50' },
  event: { label: 'Event Fields', icon: '🎉', color: '#2196F3' },
  venue: { label: 'Venue Fields', icon: '🏛️', color: '#FF9800' },
  contract: { label: 'Contract Fields', icon: '📝', color: '#9C27B0' },
  marketing: { label: 'Marketing Fields', icon: '📢', color: '#E91E63' }
};

export function FieldMappingManager({ clientId, clientName, onClose }) {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testData, setTestData] = useState(null);
  const [testResults, setTestResults] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    sourceField: '',
    sourceFieldType: 'TEXT',
    targetField: '',
    targetFieldType: 'TEXT',
    transformationRule: '',
    validationRule: '',
    isRequired: false,
    isActive: true,
    description: '',
    exampleValue: ''
  });

  const apiClient = getApiClient();

  // Load field mappings
  const loadMappings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getFieldMappings(clientId);
      setMappings(response.mappings || []);
    } catch (err) {
      console.error('Error loading field mappings:', err);
      setError('Failed to load field mappings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [clientId, apiClient]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle source field selection
  const handleSourceFieldChange = (fieldName) => {
    const field = STANDARD_SOURCE_FIELDS.find(f => f.name === fieldName);
    if (field) {
      setFormData(prev => ({
        ...prev,
        sourceField: field.name,
        sourceFieldType: field.type,
        targetField: prev.targetField || field.name,
        description: prev.description || field.label
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sourceField: fieldName
      }));
    }
  };

  // Save mapping
  const handleSaveMapping = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      if (editingMapping) {
        await apiClient.updateFieldMapping(clientId, editingMapping.id, formData);
      } else {
        await apiClient.createFieldMapping(clientId, formData);
      }

      await loadMappings();
      resetForm();
      setShowAddForm(false);
      setEditingMapping(null);
    } catch (err) {
      console.error('Error saving field mapping:', err);
      setError(err.response?.data?.error || 'Failed to save field mapping');
    } finally {
      setSaving(false);
    }
  };

  // Delete mapping
  const handleDeleteMapping = async (mappingId) => {
    if (!confirm('Are you sure you want to delete this field mapping?')) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.deleteFieldMapping(clientId, mappingId);
      await loadMappings();
    } catch (err) {
      console.error('Error deleting field mapping:', err);
      setError('Failed to delete field mapping');
    } finally {
      setSaving(false);
    }
  };

  // Edit mapping
  const handleEditMapping = (mapping) => {
    setEditingMapping(mapping);
    setFormData({
      sourceField: mapping.sourceField,
      sourceFieldType: mapping.sourceFieldType,
      targetField: mapping.targetField,
      targetFieldType: mapping.targetFieldType,
      transformationRule: mapping.transformationRule || '',
      validationRule: mapping.validationRule || '',
      isRequired: mapping.isRequired,
      isActive: mapping.isActive,
      description: mapping.description || '',
      exampleValue: mapping.exampleValue || ''
    });
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      sourceField: '',
      sourceFieldType: 'TEXT',
      targetField: '',
      targetFieldType: 'TEXT',
      transformationRule: '',
      validationRule: '',
      isRequired: false,
      isActive: true,
      description: '',
      exampleValue: ''
    });
  };

  // Toggle mapping active status
  const handleToggleActive = async (mapping) => {
    try {
      await apiClient.updateFieldMapping(clientId, mapping.id, {
        isActive: !mapping.isActive
      });
      await loadMappings();
    } catch (err) {
      console.error('Error toggling mapping status:', err);
      setError('Failed to update mapping status');
    }
  };

  // Test transformation
  const handleTestTransformation = async () => {
    if (!testData) return;

    try {
      const result = await apiClient.transformFieldData(clientId, JSON.parse(testData));
      setTestResults(result);
    } catch (err) {
      console.error('Error testing transformation:', err);
      setTestResults({ error: err.message });
    }
  };

  // Filter mappings
  const filteredMappings = mappings.filter(mapping => {
    const matchesCategory = activeCategory === 'all' || 
      STANDARD_SOURCE_FIELDS.find(f => f.name === mapping.sourceField)?.category === activeCategory;
    
    const matchesSearch = !searchQuery ||
      mapping.sourceField.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.targetField.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Group mappings by category
  const groupedMappings = filteredMappings.reduce((acc, mapping) => {
    const field = STANDARD_SOURCE_FIELDS.find(f => f.name === mapping.sourceField);
    const category = field?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(mapping);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="field-mapping-manager">
        <div className="fmm-loading">
          <div className="fmm-loading__spinner"></div>
          <p>Loading field mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="field-mapping-manager">
      {/* Header */}
      <header className="fmm-header">
        <div className="fmm-header__content">
          <div className="fmm-header__title">
            <span className="fmm-header__icon">🔄</span>
            <h2>Field Mapping Configuration</h2>
          </div>
          <div className="fmm-header__client">
            <span className="fmm-header__client-label">Client:</span>
            <span className="fmm-header__client-name">{clientName}</span>
          </div>
        </div>
        <button className="fmm-header__close" onClick={onClose}>✕</button>
      </header>

      {/* Error Message */}
      {error && (
        <div className="fmm-error">
          <span className="fmm-error__icon">⚠️</span>
          <span className="fmm-error__message">{error}</span>
          <button className="fmm-error__close" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="fmm-toolbar">
        <div className="fmm-toolbar__search">
          <span className="fmm-toolbar__search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search mappings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fmm-toolbar__search-input"
          />
        </div>
        
        <div className="fmm-toolbar__categories">
          <button
            className={`fmm-category-btn ${activeCategory === 'all' ? 'fmm-category-btn--active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([key, config]) => (
            <button
              key={key}
              className={`fmm-category-btn ${activeCategory === key ? 'fmm-category-btn--active' : ''}`}
              onClick={() => setActiveCategory(key)}
              style={{ '--category-color': config.color }}
            >
              <span>{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>

        <button
          className="fmm-toolbar__add-btn"
          onClick={() => {
            resetForm();
            setEditingMapping(null);
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Mapping'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="fmm-form-container">
          <h3 className="fmm-form__title">
            {editingMapping ? 'Edit Field Mapping' : 'Add New Field Mapping'}
          </h3>
          <form onSubmit={handleSaveMapping} className="fmm-form">
            <div className="fmm-form__grid">
              {/* Source Field */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">
                  Source Field <span className="fmm-form__required">*</span>
                </label>
                <select
                  name="sourceField"
                  value={formData.sourceField}
                  onChange={(e) => handleSourceFieldChange(e.target.value)}
                  className="fmm-form__select"
                  required
                >
                  <option value="">Select source field...</option>
                  {Object.entries(CATEGORIES).map(([catKey, catConfig]) => (
                    <optgroup key={catKey} label={`${catConfig.icon} ${catConfig.label}`}>
                      {STANDARD_SOURCE_FIELDS
                        .filter(f => f.category === catKey)
                        .map(field => (
                          <option key={field.name} value={field.name}>
                            {field.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                  <option value="custom">Custom Field...</option>
                </select>
                {formData.sourceField === 'custom' && (
                  <input
                    type="text"
                    name="sourceField"
                    value={formData.sourceField === 'custom' ? '' : formData.sourceField}
                    onChange={(e) => handleSourceFieldChange(e.target.value)}
                    placeholder="Enter custom field name"
                    className="fmm-form__input fmm-form__input--inline"
                    required
                  />
                )}
              </div>

              {/* Source Field Type */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">Source Field Type</label>
                <select
                  name="sourceFieldType"
                  value={formData.sourceFieldType}
                  onChange={handleInputChange}
                  className="fmm-form__select"
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Field */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">
                  Target Field <span className="fmm-form__required">*</span>
                </label>
                <input
                  type="text"
                  name="targetField"
                  value={formData.targetField}
                  onChange={handleInputChange}
                  placeholder="e.g., custom_field_123"
                  className="fmm-form__input"
                  required
                />
                <span className="fmm-form__hint">GoHighLevel custom field ID</span>
              </div>

              {/* Target Field Type */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">Target Field Type</label>
                <select
                  name="targetFieldType"
                  value={formData.targetFieldType}
                  onChange={handleInputChange}
                  className="fmm-form__select"
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transformation Rule */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">Transformation Rule</label>
                <select
                  name="transformationRule"
                  value={formData.transformationRule}
                  onChange={handleInputChange}
                  className="fmm-form__select"
                >
                  {TRANSFORMATION_RULES.map(rule => (
                    <option key={rule.value} value={rule.value}>
                      {rule.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Validation Rule */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">Validation Rule</label>
                <select
                  name="validationRule"
                  value={formData.validationRule}
                  onChange={handleInputChange}
                  className="fmm-form__select"
                >
                  {VALIDATION_RULES.map(rule => (
                    <option key={rule.value} value={rule.value}>
                      {rule.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="fmm-form__field fmm-form__field--full">
                <label className="fmm-form__label">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this field mapping"
                  className="fmm-form__input"
                />
              </div>

              {/* Example Value */}
              <div className="fmm-form__field">
                <label className="fmm-form__label">Example Value</label>
                <input
                  type="text"
                  name="exampleValue"
                  value={formData.exampleValue}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  className="fmm-form__input"
                />
              </div>

              {/* Checkboxes */}
              <div className="fmm-form__field fmm-form__field--checkboxes">
                <label className="fmm-form__checkbox">
                  <input
                    type="checkbox"
                    name="isRequired"
                    checked={formData.isRequired}
                    onChange={handleInputChange}
                  />
                  <span>Required Field</span>
                </label>
                <label className="fmm-form__checkbox">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div className="fmm-form__actions">
              <button
                type="button"
                className="fmm-form__btn fmm-form__btn--secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMapping(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="fmm-form__btn fmm-form__btn--primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : editingMapping ? 'Update Mapping' : 'Create Mapping'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mappings List */}
      <div className="fmm-mappings">
        {filteredMappings.length === 0 ? (
          <div className="fmm-empty">
            <div className="fmm-empty__icon">📭</div>
            <p>No field mappings found</p>
            <button 
              className="fmm-empty__action"
              onClick={() => setShowAddForm(true)}
            >
              Add your first mapping
            </button>
          </div>
        ) : (
          Object.entries(groupedMappings).map(([category, categoryMappings]) => (
            <div key={category} className="fmm-category">
              <h4 className="fmm-category__title">
                <span className="fmm-category__icon">
                  {CATEGORIES[category]?.icon || '📁'}
                </span>
                {CATEGORIES[category]?.label || 'Other Fields'}
                <span className="fmm-category__count">({categoryMappings.length})</span>
              </h4>
              <div className="fmm-mappings__grid">
                {categoryMappings.map(mapping => (
                  <div
                    key={mapping.id}
                    className={`fmm-mapping-card ${!mapping.isActive ? 'fmm-mapping-card--inactive' : ''}`}
                  >
                    <div className="fmm-mapping-card__header">
                      <div className="fmm-mapping-card__fields">
                        <div className="fmm-mapping-card__source">
                          <span className="fmm-mapping-card__label">From</span>
                          <span className="fmm-mapping-card__field-name">{mapping.sourceField}</span>
                          <span className="fmm-mapping-card__field-type">
                            {FIELD_TYPES.find(t => t.value === mapping.sourceFieldType)?.icon}
                            {mapping.sourceFieldType}
                          </span>
                        </div>
                        <div className="fmm-mapping-card__arrow">→</div>
                        <div className="fmm-mapping-card__target">
                          <span className="fmm-mapping-card__label">To</span>
                          <span className="fmm-mapping-card__field-name">{mapping.targetField}</span>
                          <span className="fmm-mapping-card__field-type">
                            {FIELD_TYPES.find(t => t.value === mapping.targetFieldType)?.icon}
                            {mapping.targetFieldType}
                          </span>
                        </div>
                      </div>
                      <div className="fmm-mapping-card__status">
                        {mapping.isRequired && (
                          <span className="fmm-mapping-card__badge fmm-mapping-card__badge--required">
                            Required
                          </span>
                        )}
                        <button
                          className={`fmm-mapping-card__toggle ${mapping.isActive ? 'fmm-mapping-card__toggle--active' : ''}`}
                          onClick={() => handleToggleActive(mapping)}
                          title={mapping.isActive ? 'Active' : 'Inactive'}
                        >
                          {mapping.isActive ? '✓' : '○'}
                        </button>
                      </div>
                    </div>
                    
                    {mapping.description && (
                      <p className="fmm-mapping-card__description">{mapping.description}</p>
                    )}
                    
                    {(mapping.transformationRule || mapping.validationRule) && (
                      <div className="fmm-mapping-card__rules">
                        {mapping.transformationRule && (
                          <span className="fmm-mapping-card__rule">
                            🔄 {TRANSFORMATION_RULES.find(r => r.value === mapping.transformationRule)?.label || mapping.transformationRule}
                          </span>
                        )}
                        {mapping.validationRule && (
                          <span className="fmm-mapping-card__rule">
                            ✓ {VALIDATION_RULES.find(r => r.value === mapping.validationRule)?.label || mapping.validationRule}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="fmm-mapping-card__actions">
                      <button
                        className="fmm-mapping-card__action"
                        onClick={() => handleEditMapping(mapping)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="fmm-mapping-card__action fmm-mapping-card__action--danger"
                        onClick={() => handleDeleteMapping(mapping.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Test Transformation Panel */}
      <div className="fmm-test-panel">
        <h4 className="fmm-test-panel__title">🧪 Test Transformations</h4>
        <div className="fmm-test-panel__content">
          <textarea
            className="fmm-test-panel__input"
            placeholder={`Enter test data as JSON, e.g.:\n{\n  "firstName": "John",\n  "lastName": "Doe",\n  "email": "john@example.com"\n}`}
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            rows={5}
          />
          <button
            className="fmm-test-panel__btn"
            onClick={handleTestTransformation}
            disabled={!testData}
          >
            Run Test
          </button>
        </div>
        {testResults && (
          <div className={`fmm-test-panel__results ${testResults.error ? 'fmm-test-panel__results--error' : ''}`}>
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <footer className="fmm-footer">
        <div className="fmm-stats">
          <div className="fmm-stat">
            <span className="fmm-stat__value">{mappings.length}</span>
            <span className="fmm-stat__label">Total Mappings</span>
          </div>
          <div className="fmm-stat">
            <span className="fmm-stat__value">{mappings.filter(m => m.isActive).length}</span>
            <span className="fmm-stat__label">Active</span>
          </div>
          <div className="fmm-stat">
            <span className="fmm-stat__value">{mappings.filter(m => m.isRequired).length}</span>
            <span className="fmm-stat__label">Required</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default FieldMappingManager;
