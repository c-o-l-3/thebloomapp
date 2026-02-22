/**
 * JourneyPrintView Component
 * Print-optimized view for entire customer journey
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Printer, 
  ArrowLeft, 
  Mail, 
  MessageSquare, 
  Phone,
  Tag,
  Clock,
  FileText
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import './JourneyPrintView.css';

const apiClient = getApiClient();

/**
 * JourneyPrintView - Print entire journey with all touchpoints
 */
export function JourneyPrintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [journey, setJourney] = useState(null);
  const [touchpoints, setTouchpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch journey and touchpoints data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch journey details
        const journeyData = await apiClient.getJourney(id);
        setJourney(journeyData);
        
        // Fetch all touchpoints for this journey
        const touchpointsData = await apiClient.getTouchpoints({ journeyId: id });
        
        // Sort by order
        const sorted = (touchpointsData.touchpoints || touchpointsData || []).sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );
        setTouchpoints(sorted);
      } catch (err) {
        console.error('Failed to fetch journey:', err);
        setError('Failed to load journey details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
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
        return <Mail size={16} />;
      case 'sms':
        return <MessageSquare size={16} />;
      case 'call':
        return <Phone size={16} />;
      default:
        return <Tag size={16} />;
    }
  };

  // Get type label
  const getTypeLabel = (type) => {
    switch (type) {
      case 'email':
        return 'EMAIL';
      case 'sms':
        return 'SMS';
      case 'call':
        return 'CALL';
      default:
        return type?.toUpperCase() || 'OTHER';
    }
  };

  // Format delay
  const formatDelay = (touchpoint) => {
    if (!touchpoint.delay && touchpoint.delay !== 0) return 'Immediate';
    const unit = touchpoint.delayUnit || 'days';
    return `Day ${touchpoint.delay} (${unit})`;
  };

  // Strip HTML for preview
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (loading) {
    return (
      <div className="journey-print__loading">
        <div className="journey-print__spinner" />
        <p>Loading journey details...</p>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="journey-print__error">
        <FileText size={48} />
        <h2>Error Loading Journey</h2>
        <p>{error || 'Journey not found'}</p>
        <button onClick={handleBack} className="journey-print__back-btn">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="journey-print">
      {/* Print Header - Hidden when printing */}
      <header className="journey-print__header">
        <button 
          className="journey-print__back"
          onClick={handleBack}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div className="journey-print__title-group">
          <h1>{journey.name}</h1>
          <span className="journey-print__subtitle">Customer Journey</span>
        </div>
        
        <div className="journey-print__actions">
          <button 
            className="journey-print__print-btn"
            onClick={handlePrint}
          >
            <Printer size={18} />
            Print Journey
          </button>
        </div>
      </header>

      {/* Print Content */}
      <main className="journey-print__content">
        {/* Document Header */}
        <div className="journey-print__doc-header">
          <div className="journey-print__meta">
            <span className="journey-print__doc-type">
              Customer Journey Map
            </span>
            <span className="journey-print__doc-date">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>
          <div className="journey-print__summary">
            <span className="journey-print__summary-item">
              {touchpoints.filter(t => t.type === 'email').length} Emails
            </span>
            <span className="journey-print__summary-item">
              {touchpoints.filter(t => t.type === 'sms').length} SMS
            </span>
            <span className="journey-print__summary-item">
              {touchpoints.length} Total Touchpoints
            </span>
          </div>
        </div>

        {/* Touchpoints List */}
        <div className="journey-print__timeline">
          {touchpoints.map((touchpoint, index) => {
            const content = touchpoint.content || {};
            const isEmail = touchpoint.type === 'email';
            
            return (
              <div 
                key={touchpoint.id} 
                className="journey-print__touchpoint"
              >
                {/* Timeline Marker */}
                <div className="journey-print__timeline-marker">
                  <div className="journey-print__marker-dot" data-type={touchpoint.type}>
                    {getTypeIcon(touchpoint.type)}
                  </div>
                  {index < touchpoints.length - 1 && (
                    <div className="journey-print__marker-line" />
                  )}
                </div>

                {/* Touchpoint Content */}
                <div className="journey-print__touchpoint-content">
                  {/* Header */}
                  <div className="journey-print__touchpoint-header">
                    <div className="journey-print__touchpoint-title">
                      <span className="journey-print__touchpoint-number">
                        {index + 1}
                      </span>
                      <span className="journey-print__touchpoint-name">
                        {touchpoint.name}
                      </span>
                    </div>
                    <div className="journey-print__touchpoint-meta">
                      <span className="journey-print__touchpoint-type" data-type={touchpoint.type}>
                        {getTypeLabel(touchpoint.type)}
                      </span>
                      <span className="journey-print__touchpoint-delay">
                        <Clock size={14} />
                        {formatDelay(touchpoint)}
                      </span>
                    </div>
                  </div>

                  {/* Email Details */}
                  {isEmail && (
                    <div className="journey-print__email-details">
                      {content.subject && (
                        <div className="journey-print__field">
                          <label>Subject Line:</label>
                          <span className="journey-print__field-value">
                            {content.subject}
                          </span>
                        </div>
                      )}
                      {content.previewText && (
                        <div className="journey-print__field">
                          <label>Preview Text:</label>
                          <span className="journey-print__field-value">
                            {content.previewText}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Preview */}
                  <div className="journey-print__message-preview">
                    <label>
                      {isEmail ? 'Email Body:' : 'Message Content:'}
                    </label>
                    <div className="journey-print__message-content">
                      {content.body ? (
                        <div className="journey-print__rendered">
                          {stripHtml(content.body)}
                        </div>
                      ) : (
                        <span className="journey-print__empty">No content</span>
                      )}
                    </div>
                  </div>

                  {/* Notes Section for Each Touchpoint */}
                  <div className="journey-print__touchpoint-notes">
                    <label>Notes:</label>
                    <div className="journey-print__notes-lines">
                      <div className="journey-print__note-line" />
                      <div className="journey-print__note-line" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Review Notes Section */}
        <section className="journey-print__section journey-print__section--review">
          <h2 className="journey-print__section-title">
            General Review Notes
          </h2>
          <div className="journey-print__review-lines">
            <div className="journey-print__review-line" />
            <div className="journey-print__review-line" />
            <div className="journey-print__review-line" />
            <div className="journey-print__review-line" />
            <div className="journey-print__review-line" />
            <div className="journey-print__review-line" />
          </div>
        </section>

        {/* Approval Section */}
        <section className="journey-print__section journey-print__section--approval">
          <h2 className="journey-print__section-title">
            Approval
          </h2>
          <div className="journey-print__approval-grid">
            <div className="journey-print__approval-box">
              <label>Reviewer Name</label>
              <div className="journey-print__approval-line" />
            </div>
            <div className="journey-print__approval-box">
              <label>Signature</label>
              <div className="journey-print__approval-line" />
            </div>
            <div className="journey-print__approval-box">
              <label>Date</label>
              <div className="journey-print__approval-line" />
            </div>
          </div>
          
          <div className="journey-print__approval-checks">
            <div className="journey-print__check-item">
              <div className="journey-print__checkbox" />
              <span>Journey flow reviewed and approved</span>
            </div>
            <div className="journey-print__check-item">
              <div className="journey-print__checkbox" />
              <span>All content verified for accuracy</span>
            </div>
            <div className="journey-print__check-item">
              <div className="journey-print__checkbox" />
              <span>Timing and sequencing validated</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="journey-print__footer">
          <div className="journey-print__footer-content">
            <span>Journey Builder • Customer Journey Map</span>
            <span>{journey.name}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default JourneyPrintView;
