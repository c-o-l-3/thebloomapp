/**
 * JourneyViewer Component
 * Displays journey details and touchpoints for client portal
 */

import React, { useState, useEffect } from 'react';
import { 
  Map, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
  Send,
  Calendar,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { getClientPortalApi } from '../services/clientPortalApi.js';
import './JourneyViewer.css';

const portalApi = getClientPortalApi();

const TOUCHPOINT_ICONS = {
  Email: Mail,
  SMS: MessageSquare,
  Task: CheckCircle,
  Wait: Clock,
  default: FileText
};

/**
 * JourneyViewer - Client view of journey details
 */
export function JourneyViewer({ 
  journeys, 
  selectedJourney, 
  onSelectJourney, 
  onCreateChangeRequest 
}) {
  const [journey, setJourney] = useState(null);
  const [touchpoints, setTouchpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTouchpoint, setExpandedTouchpoint] = useState(null);

  useEffect(() => {
    if (selectedJourney) {
      loadJourneyDetails(selectedJourney.id);
    }
  }, [selectedJourney]);

  const loadJourneyDetails = async (journeyId) => {
    try {
      setLoading(true);
      setError(null);
      const data = await portalApi.getJourney(journeyId);
      setJourney(data);
      setTouchpoints(data.touchpoints || []);
    } catch (err) {
      console.error('Error loading journey details:', err);
      setError('Failed to load journey details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    onSelectJourney(null);
    setJourney(null);
    setTouchpoints([]);
  };

  const getTouchpointIcon = (type) => {
    const IconComponent = TOUCHPOINT_ICONS[type] || TOUCHPOINT_ICONS.default;
    return <IconComponent size={18} />;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      draft: 'jv-status--draft',
      client_review: 'jv-status--review',
      approved: 'jv-status--approved',
      published: 'jv-status--published',
      rejected: 'jv-status--rejected'
    };
    return statusClasses[status] || 'jv-status--draft';
  };

  // Journey List View
  if (!selectedJourney || !journey) {
    return (
      <div className="journey-viewer">
        <div className="journey-viewer__header">
          <h2>Your Journeys</h2>
          <p>View and request changes to your customer journeys</p>
        </div>

        <div className="journey-viewer__list">
          {journeys.map(j => (
            <div 
              key={j.id} 
              className="journey-card"
              onClick={() => onSelectJourney(j)}
            >
              <div className="journey-card__header">
                <h3>{j.name}</h3>
                <span className={`jv-status-badge ${getStatusBadge(j.status)}`}>
                  {j.status.replace('_', ' ')}
                </span>
              </div>
              
              {j.description && (
                <p className="journey-card__description">{j.description}</p>
              )}

              <div className="journey-card__meta">
                <span>
                  <Map size={14} />
                  {j.touchpointCount} touchpoints
                </span>
                <span>
                  <Calendar size={14} />
                  Updated {format(new Date(j.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>

              {j.goal && (
                <div className="journey-card__goal">
                  <strong>Goal:</strong> {j.goal}
                </div>
              )}

              <button 
                className="journey-card__action"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChangeRequest(j);
                }}
              >
                Request Changes
                <ArrowRight size={16} />
              </button>
            </div>
          ))}

          {journeys.length === 0 && (
            <div className="journey-viewer__empty">
              <Map size={48} />
              <p>No journeys found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Journey Detail View
  return (
    <div className="journey-viewer">
      <div className="journey-viewer__nav">
        <button 
          className="journey-viewer__back"
          onClick={handleBackToList}
        >
          <ChevronLeft size={20} />
          Back to Journeys
        </button>
      </div>

      {loading ? (
        <div className="journey-viewer__loading">
          <Loader2 size={32} className="journey-viewer__spinner" />
          <p>Loading journey details...</p>
        </div>
      ) : error ? (
        <div className="journey-viewer__error">
          <p>{error}</p>
          <button 
            className="portal-btn portal-btn--primary"
            onClick={() => loadJourneyDetails(journey.id)}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="journey-detail__header">
            <div className="journey-detail__title">
              <h1>{journey.name}</h1>
              <span className={`jv-status-badge ${getStatusBadge(journey.status)}`}>
                {journey.status.replace('_', ' ')}
              </span>
            </div>
            
            {journey.description && (
              <p className="journey-detail__description">{journey.description}</p>
            )}

            <div className="journey-detail__meta">
              <span>
                <Map size={16} />
                {touchpoints.length} touchpoints
              </span>
              <span>
                <Calendar size={16} />
                Last updated {format(new Date(journey.updatedAt), 'MMM d, yyyy')}
              </span>
              {journey.category && (
                <span className="journey-detail__category">
                  {journey.category}
                </span>
              )}
            </div>

            <button 
              className="portal-btn portal-btn--primary journey-detail__action"
              onClick={() => onCreateChangeRequest(journey)}
            >
              <Send size={18} />
              Request Changes
            </button>
          </div>

          <div className="journey-touchpoints">
            <h2>Touchpoints</h2>
            
            <div className="journey-touchpoints__list">
              {touchpoints.map((touchpoint, index) => {
                const isExpanded = expandedTouchpoint === touchpoint.id;
                
                return (
                  <div 
                    key={touchpoint.id}
                    className={`journey-touchpoint ${isExpanded ? 'journey-touchpoint--expanded' : ''}`}
                  >
                    <div 
                      className="journey-touchpoint__header"
                      onClick={() => setExpandedTouchpoint(isExpanded ? null : touchpoint.id)}
                    >
                      <div className="journey-touchpoint__number">{index + 1}</div>
                      <div className="journey-touchpoint__icon">
                        {getTouchpointIcon(touchpoint.type)}
                      </div>
                      <div className="journey-touchpoint__info">
                        <h3>{touchpoint.name}</h3>
                        <span className="journey-touchpoint__type">
                          {touchpoint.type || 'Email'}
                        </span>
                        {touchpoint.delay && (
                          <span className="journey-touchpoint__delay">
                            <Clock size={12} />
                            {touchpoint.delay} {touchpoint.delayUnit || 'hours'} delay
                          </span>
                        )}
                      </div>
                      <button 
                        className="journey-touchpoint__request-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateChangeRequest(journey);
                        }}
                      >
                        Request Change
                      </button>
                      {isExpanded ? <ChevronRight size={20} className="journey-touchpoint__chevron journey-touchpoint__chevron--up" /> : <ChevronRight size={20} className="journey-touchpoint__chevron" />}
                    </div>

                    {isExpanded && (
                      <div className="journey-touchpoint__content">
                        {/* Email Content Preview */}
                        {(touchpoint.type === 'Email' || !touchpoint.type) && touchpoint.content && (
                          <div className="journey-touchpoint__email-preview">
                            {touchpoint.content.subject && (
                              <div className="journey-touchpoint__field">
                                <label>Subject:</label>
                                <span>{touchpoint.content.subject}</span>
                              </div>
                            )}
                            {touchpoint.content.previewText && (
                              <div className="journey-touchpoint__field">
                                <label>Preview Text:</label>
                                <span className="journey-touchpoint__preview-text">
                                  {touchpoint.content.previewText}
                                </span>
                              </div>
                            )}
                            {touchpoint.content.body && (
                              <div className="journey-touchpoint__body">
                                <label>Content:</label>
                                <div 
                                  className="journey-touchpoint__html-content"
                                  dangerouslySetInnerHTML={{ __html: touchpoint.content.body }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* SMS Content Preview */}
                        {touchpoint.type === 'SMS' && touchpoint.content && (
                          <div className="journey-touchpoint__sms-preview">
                            <div className="journey-touchpoint__sms-bubble">
                              {touchpoint.content.body || touchpoint.content.message || 'No message content'}
                            </div>
                            <p className="journey-touchpoint__sms-meta">
                              {(touchpoint.content.body || touchpoint.content.message || '').length} characters
                            </p>
                          </div>
                        )}

                        {/* Generic Content */}
                        {touchpoint.type !== 'Email' && touchpoint.type !== 'SMS' && (
                          <div className="journey-touchpoint__generic-content">
                            {touchpoint.content?.description || touchpoint.content?.body || 'No content available'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default JourneyViewer;