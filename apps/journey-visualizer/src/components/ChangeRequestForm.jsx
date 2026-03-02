/**
 * ChangeRequestForm Component
 * Form for clients to submit change requests
 */

import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import './ChangeRequestForm.css';

const REQUEST_TYPES = [
  { value: 'content_change', label: 'Content Change', description: 'Modify existing email/SMS content' },
  { value: 'new_touchpoint', label: 'New Touchpoint', description: 'Add a new touchpoint to a journey' },
  { value: 'delete_touchpoint', label: 'Remove Touchpoint', description: 'Remove an existing touchpoint' },
  { value: 'brand_update', label: 'Brand Update', description: 'Update brand voice or messaging' },
  { value: 'other', label: 'Other Request', description: 'Something else not listed above' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#28a745' },
  { value: 'medium', label: 'Medium', color: '#f5a623' },
  { value: 'high', label: 'High', color: '#fd7e14' },
  { value: 'urgent', label: 'Urgent', color: '#dc3545' }
];

/**
 * ChangeRequestForm - Form for submitting change requests
 */
export function ChangeRequestForm({ journey, journeys, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    journeyId: journey?.id || '',
    type: 'content_change',
    title: '',
    description: '',
    priority: 'medium',
    proposedContent: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit change request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div className="crf-modal">
        <div className="crf-modal__overlay" onClick={onClose} />
        <div className="crf-modal__content crf-modal__content--success">
          <div className="crf-success">
            <CheckCircle size={64} />
            <h3>Request Submitted!</h3>
            <p>Your change request has been submitted and is pending review.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crf-modal">
      <div className="crf-modal__overlay" onClick={onClose} />
      <div className="crf-modal__content">
        <div className="crf-modal__header">
          <h2>Request Changes</h2>
          <button className="crf-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="crf-form" onSubmit={handleSubmit}>
          {error && (
            <div className="crf-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Journey Selection */}
          <div className="crf-field">
            <label htmlFor="journey">Journey</label>
            <select
              id="journey"
              value={formData.journeyId}
              onChange={(e) => handleChange('journeyId', e.target.value)}
              required
              disabled={!!journey}
            >
              <option value="">Select a journey...</option>
              {journeys.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>

          {/* Request Type */}
          <div className="crf-field">
            <label>Request Type</label>
            <div className="crf-type-grid">
              {REQUEST_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`crf-type-btn ${formData.type === type.value ? 'crf-type-btn--active' : ''}`}
                  onClick={() => handleChange('type', type.value)}
                >
                  <span className="crf-type-btn__label">{type.label}</span>
                  <span className="crf-type-btn__desc">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="crf-field">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Update welcome email subject line"
              required
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="crf-field">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Please describe the changes you'd like to see..."
              required
              rows={4}
            />
          </div>

          {/* Proposed Content */}
          <div className="crf-field">
            <label htmlFor="proposedContent">
              Proposed Content (Optional)
              <span className="crf-field__hint"> - Suggest the new text or content</span>
            </label>
            <textarea
              id="proposedContent"
              value={formData.proposedContent}
              onChange={(e) => handleChange('proposedContent', e.target.value)}
              placeholder="Enter your proposed content here..."
              rows={4}
            />
          </div>

          {/* Priority */}
          <div className="crf-field">
            <label>Priority</label>
            <div className="crf-priority-grid">
              {PRIORITIES.map(priority => (
                <button
                  key={priority.value}
                  type="button"
                  className={`crf-priority-btn ${formData.priority === priority.value ? 'crf-priority-btn--active' : ''}`}
                  onClick={() => handleChange('priority', priority.value)}
                  style={{
                    '--priority-color': priority.color,
                    borderColor: formData.priority === priority.value ? priority.color : undefined
                  }}
                >
                  <span 
                    className="crf-priority-dot"
                    style={{ backgroundColor: priority.color }}
                  />
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="crf-actions">
            <button 
              type="button" 
              className="crf-btn crf-btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="crf-btn crf-btn--primary"
              disabled={loading || !formData.title || !formData.description}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="crf-btn__spinner" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangeRequestForm;