/**
 * TouchpointPrintView Component
 * Print-optimized layout for touchpoint review
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Printer, 
  ArrowLeft, 
  Mail, 
  MessageSquare, 
  Phone,
  Calendar,
  User,
  Clock,
  Tag,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import './TouchpointPrintView.css';

const apiClient = getApiClient();

/**
 * TouchpointPrintView - Print-optimized touchpoint details
 */
export function TouchpointPrintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [touchpoint, setTouchpoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch touchpoint data
  useEffect(() => {
    const fetchTouchpoint = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getTouchpoint(id);
        setTouchpoint(data);
      } catch (err) {
        console.error('Failed to fetch touchpoint:', err);
        setError('Failed to load touchpoint details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTouchpoint();
    }
  }, [id]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle back
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail size={20} />;
      case 'sms':
        return <MessageSquare size={20} />;
      case 'call':
        return <Phone size={20} />;
      default:
        return <Tag size={20} />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return '#10b981';
      case 'active':
        return '#3b82f6';
      case 'draft':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  // Strip HTML for content preview
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (loading) {
    return (
      <div className="touchpoint-print__loading">
        <div className="touchpoint-print__spinner" />
        <p>Loading touchpoint details...</p>
      </div>
    );
  }

  if (error || !touchpoint) {
    return (
      <div className="touchpoint-print__error">
        <AlertCircle size={48} />
        <h2>Error Loading Touchpoint</h2>
        <p>{error || 'Touchpoint not found'}</p>
        <button onClick={handleBack} className="touchpoint-print__back-btn">
          Go Back
        </button>
      </div>
    );
  }

  const isEmail = touchpoint.type === 'email';
  const content = touchpoint.content || {};

  return (
    <div className="touchpoint-print">
      {/* Print Header - Hidden when printing */}
      <header className="touchpoint-print__header">
        <button 
          className="touchpoint-print__back"
          onClick={handleBack}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div className="touchpoint-print__actions">
          <button 
            className="touchpoint-print__print-btn"
            onClick={handlePrint}
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </header>

      {/* Print Content */}
      <main className="touchpoint-print__content">
        {/* Document Header */}
        <div className="touchpoint-print__doc-header">
          <div className="touchpoint-print__meta">
            <span className="touchpoint-print__doc-type">
              Touchpoint Review Document
            </span>
            <span className="touchpoint-print__doc-date">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>
          
          <div 
            className="touchpoint-print__status"
            style={{ 
              backgroundColor: `${getStatusColor(touchpoint.status)}15`,
              color: getStatusColor(touchpoint.status),
              borderColor: getStatusColor(touchpoint.status)
            }}
          >
            {touchpoint.status === 'published' && <CheckCircle size={16} />}
            {touchpoint.status.toUpperCase()}
          </div>
        </div>

        {/* Main Info Section */}
        <section className="touchpoint-print__section">
          <h1 className="touchpoint-print__title">
            {getTypeIcon(touchpoint.type)}
            {touchpoint.name}
          </h1>
          
          <div className="touchpoint-print__info-grid">
            <div className="touchpoint-print__info-item">
              <span className="touchpoint-print__info-label">
                <Tag size={14} />
                Type
              </span>
              <span className="touchpoint-print__info-value">
                {touchpoint.type.toUpperCase()}
              </span>
            </div>
            
            <div className="touchpoint-print__info-item">
              <span className="touchpoint-print__info-label">
                <User size={14} />
                Journey
              </span>
              <span className="touchpoint-print__info-value">
                {touchpoint.journey?.name || 'Unknown Journey'}
              </span>
            </div>
            
            <div className="touchpoint-print__info-item">
              <span className="touchpoint-print__info-label">
                <Calendar size={14} />
                Created
              </span>
              <span className="touchpoint-print__info-value">
                {formatDate(touchpoint.createdAt)}
              </span>
            </div>
            
            <div className="touchpoint-print__info-item">
              <span className="touchpoint-print__info-label">
                <Clock size={14} />
                Last Modified
              </span>
              <span className="touchpoint-print__info-value">
                {formatDate(touchpoint.updatedAt)}
              </span>
            </div>
          </div>
        </section>

        {/* Content Preview Section */}
        <section className="touchpoint-print__section">
          <h2 className="touchpoint-print__section-title">
            Content Preview
          </h2>
          
          {isEmail && content.subject && (
            <div className="touchpoint-print__field">
              <label className="touchpoint-print__field-label">Subject Line</label>
              <div className="touchpoint-print__field-value touchpoint-print__field-value--highlight">
                {content.subject}
              </div>
            </div>
          )}
          
          {isEmail && content.previewText && (
            <div className="touchpoint-print__field">
              <label className="touchpoint-print__field-label">Preview Text</label>
              <div className="touchpoint-print__field-value">
                {content.previewText}
              </div>
            </div>
          )}
          
          <div className="touchpoint-print__field">
            <label className="touchpoint-print__field-label">
              {isEmail ? 'Email Body' : 'Message Content'}
            </label>
            <div className="touchpoint-print__content-preview">
              {content.body ? (
                <div 
                  className="touchpoint-print__rendered-content"
                  dangerouslySetInnerHTML={{ __html: content.body }}
                />
              ) : (
                <p className="touchpoint-print__empty-content">
                  No content available
                </p>
              )}
            </div>
          </div>
        </section>

        {/* HTML Source Section - For Email Type */}
        {isEmail && content.body && (
          <section className="touchpoint-print__section touchpoint-print__section--page-break">
            <h2 className="touchpoint-print__section-title">
              HTML Source Code
            </h2>
            <div className="touchpoint-print__source-container">
              <pre className="touchpoint-print__source">
                <code>{content.body}</code>
              </pre>
            </div>
          </section>
        )}

        {/* Configuration Section */}
        {touchpoint.config && Object.keys(touchpoint.config).length > 0 && (
          <section className="touchpoint-print__section">
            <h2 className="touchpoint-print__section-title">
              Configuration
            </h2>
            <div className="touchpoint-print__config">
              <pre className="touchpoint-print__config-code">
                {JSON.stringify(touchpoint.config, null, 2)}
              </pre>
            </div>
          </section>
        )}

        {/* Review Notes Section */}
        <section className="touchpoint-print__section touchpoint-print__section--review">
          <h2 className="touchpoint-print__section-title">
            Review Notes
          </h2>
          <div className="touchpoint-print__review-lines">
            <div className="touchpoint-print__review-line" />
            <div className="touchpoint-print__review-line" />
            <div className="touchpoint-print__review-line" />
            <div className="touchpoint-print__review-line" />
            <div className="touchpoint-print__review-line" />
            <div className="touchpoint-print__review-line" />
          </div>
        </section>

        {/* Approval Section */}
        <section className="touchpoint-print__section touchpoint-print__section--approval">
          <h2 className="touchpoint-print__section-title">
            Approval
          </h2>
          <div className="touchpoint-print__approval-grid">
            <div className="touchpoint-print__approval-box">
              <label>Reviewer Name</label>
              <div className="touchpoint-print__approval-line" />
            </div>
            <div className="touchpoint-print__approval-box">
              <label>Signature</label>
              <div className="touchpoint-print__approval-line" />
            </div>
            <div className="touchpoint-print__approval-box">
              <label>Date</label>
              <div className="touchpoint-print__approval-line" />
            </div>
          </div>
          
          <div className="touchpoint-print__approval-checks">
            <div className="touchpoint-print__check-item">
              <div className="touchpoint-print__checkbox" />
              <span>Content reviewed and approved</span>
            </div>
            <div className="touchpoint-print__check-item">
              <div className="touchpoint-print__checkbox" />
              <span>Branding guidelines followed</span>
            </div>
            <div className="touchpoint-print__check-item">
              <div className="touchpoint-print__checkbox" />
              <span>Personalization tokens verified</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="touchpoint-print__footer">
          <div className="touchpoint-print__footer-content">
            <span>Journey Builder • Touchpoint Review</span>
            <span>Page 1 of 1</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default TouchpointPrintView;