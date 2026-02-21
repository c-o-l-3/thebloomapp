/**
 * ClientReviewPortal Component
 * Simplified read-only view for client review and approval
 */

import React, { useState, useCallback } from 'react';
import { JOURNEY_STATUS, TOUCHPOINT_TYPE } from '../types';
import { format } from 'date-fns';
import { 
  MessageCircle, 
  Printer, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  FileText,
  Mail,
  MessageSquare,
  Clock,
  Send,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import './ClientReviewPortal.css';

/**
 * ClientReviewPortal - Client-facing review interface
 * @param {Object} props
 * @param {Object} props.journey - The journey being reviewed
 * @param {Array} props.touchpoints - List of touchpoints
 * @param {Array} props.comments - Existing comments
 * @param {Function} props.onAddComment - Callback for adding comment
 * @param {Function} props.onApprove - Callback for approval
 * @param {Function} props.onReject - Callback for rejection
 * @param {Function} props.onPrint - Callback for print view
 * @param {Function} props.onBack - Callback for back navigation
 * @param {string} props.clientName - Client/venue name
 */
export function ClientReviewPortal({
  journey,
  touchpoints = [],
  comments = [],
  onAddComment,
  onApprove,
  onReject,
  onPrint,
  onBack,
  clientName = 'Client'
}) {
  const [expandedTouchpoint, setExpandedTouchpoint] = useState(null);
  const [activeCommentTouchpoint, setActiveCommentTouchpoint] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStatus = journey?.status || JOURNEY_STATUS.DRAFT;
  const canApprove = currentStatus === JOURNEY_STATUS.CLIENT_REVIEW;
  const totalComments = comments.length;
  const unresolvedComments = comments.filter(c => c.status === 'open').length;

  const handleTouchpointExpand = useCallback((touchpointId) => {
    setExpandedTouchpoint(prev => prev === touchpointId ? null : touchpointId);
  }, []);

  const handleAddComment = useCallback(async (touchpointId) => {
    if (!commentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment?.(touchpointId, commentText);
      setCommentText('');
      setActiveCommentTouchpoint(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [commentText, onAddComment]);

  const handleApprove = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onApprove?.(journey.id);
      setShowApproveConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [journey?.id, onApprove]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onReject?.(journey.id, rejectReason);
      setShowRejectForm(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  }, [journey?.id, rejectReason, onReject]);

  const getTouchpointComments = useCallback((touchpointId) => {
    return comments.filter(c => c.touchpointId === touchpointId);
  }, [comments]);

  const getTouchpointIcon = (type) => {
    switch (type) {
      case TOUCHPOINT_TYPE.EMAIL:
        return <Mail size={18} />;
      case TOUCHPOINT_TYPE.SMS:
        return <MessageSquare size={18} />;
      case TOUCHPOINT_TYPE.TASK:
        return <CheckCircle size={18} />;
      case TOUCHPOINT_TYPE.WAIT:
        return <Clock size={18} />;
      default:
        return <FileText size={18} />;
    }
  };

  return (
    <div className="client-review-portal">
      {/* Header */}
      <header className="crp-header">
        <div className="crp-header__brand">
          {onBack && (
            <button className="crp-header__back" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="crp-header__logo">
            <span className="crp-header__logo-text">BloomBuilder</span>
          </div>
        </div>
        <div className="crp-header__meta">
          <span className="crp-header__client">{clientName}</span>
          <span className="crp-header__divider">|</span>
          <span className="crp-header__date">
            {format(new Date(), 'MMMM d, yyyy')}
          </span>
        </div>
      </header>

      {/* Journey Info */}
      <section className="crp-journey-info">
        <h1 className="crp-journey-info__title">{journey?.name || 'Untitled Journey'}</h1>
        {journey?.description && (
          <p className="crp-journey-info__description">{journey.description}</p>
        )}
        
        <div className="crp-journey-info__stats">
          <div className="crp-stat">
            <span className="crp-stat__value">{touchpoints.length}</span>
            <span className="crp-stat__label">Touchpoints</span>
          </div>
          <div className="crp-stat">
            <span className="crp-stat__value">{totalComments}</span>
            <span className="crp-stat__label">Comments</span>
          </div>
          {unresolvedComments > 0 && (
            <div className="crp-stat crp-stat--warning">
              <span className="crp-stat__value">{unresolvedComments}</span>
              <span className="crp-stat__label">Unresolved</span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className={`crp-status crp-status--${currentStatus.toLowerCase().replace(' ', '-')}`}>
          {currentStatus === JOURNEY_STATUS.CLIENT_REVIEW && 'Pending Your Review'}
          {currentStatus === JOURNEY_STATUS.APPROVED && 'Approved'}
          {currentStatus === JOURNEY_STATUS.PUBLISHED && 'Published'}
          {currentStatus === JOURNEY_STATUS.REJECTED && 'Changes Requested'}
          {currentStatus === JOURNEY_STATUS.DRAFT && 'In Progress'}
        </div>
      </section>

      {/* Actions Bar */}
      <section className="crp-actions">
        <button className="crp-btn crp-btn--secondary" onClick={onPrint}>
          <Printer size={18} />
          Print Review
        </button>
        
        {canApprove && (
          <div className="crp-actions__approval">
            <button 
              className="crp-btn crp-btn--reject"
              onClick={() => setShowRejectForm(true)}
              disabled={isSubmitting}
            >
              <XCircle size={18} />
              Request Changes
            </button>
            <button 
              className="crp-btn crp-btn--approve"
              onClick={() => setShowApproveConfirm(true)}
              disabled={isSubmitting}
            >
              <CheckCircle size={18} />
              Approve Journey
            </button>
          </div>
        )}
      </section>

      {/* Touchpoints List */}
      <section className="crp-touchpoints">
        <h2 className="crp-section-title">Touchpoints</h2>
        
        <div className="crp-touchpoints__list">
          {touchpoints.map((touchpoint, index) => {
            const isExpanded = expandedTouchpoint === touchpoint.id;
            const tpComments = getTouchpointComments(touchpoint.id);
            const hasComments = tpComments.length > 0;

            return (
              <div 
                key={touchpoint.id} 
                className={`crp-touchpoint ${isExpanded ? 'crp-touchpoint--expanded' : ''}`}
              >
                {/* Touchpoint Header */}
                <div 
                  className="crp-touchpoint__header"
                  onClick={() => handleTouchpointExpand(touchpoint.id)}
                >
                  <div className="crp-touchpoint__number">{index + 1}</div>
                  <div className="crp-touchpoint__icon">
                    {getTouchpointIcon(touchpoint.type)}
                  </div>
                  <div className="crp-touchpoint__info">
                    <h3 className="crp-touchpoint__name">{touchpoint.name}</h3>
                    <span className="crp-touchpoint__type">{touchpoint.type || 'Email'}</span>
                    {touchpoint.delay && (
                      <span className="crp-touchpoint__delay">
                        <Clock size={12} />
                        {touchpoint.delay} {touchpoint.delayUnit || 'hours'}
                      </span>
                    )}
                  </div>
                  <div className="crp-touchpoint__actions">
                    {hasComments && (
                      <span className="crp-touchpoint__comment-count">
                        <MessageCircle size={14} />
                        {tpComments.length}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Touchpoint Content */}
                {isExpanded && (
                  <div className="crp-touchpoint__content">
                    {/* Email Preview */}
                    {(touchpoint.type === 'Email' || !touchpoint.type) && (
                      <div className="crp-email-preview">
                        <div className="crp-email-preview__field">
                          <span className="crp-email-preview__label">Subject:</span>
                          <span className="crp-email-preview__value">
                            {touchpoint.content?.subject || 'No subject'}
                          </span>
                        </div>
                        {touchpoint.content?.previewText && (
                          <div className="crp-email-preview__field">
                            <span className="crp-email-preview__label">Preview:</span>
                            <span className="crp-email-preview__value crp-email-preview__value--muted">
                              {touchpoint.content.previewText}
                            </span>
                          </div>
                        )}
                        <div className="crp-email-preview__body">
                          {touchpoint.content?.body ? (
                            <div 
                              className="crp-email-content"
                              dangerouslySetInnerHTML={{ __html: touchpoint.content.body }}
                            />
                          ) : (
                            <p className="crp-email-preview__empty">No content available</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SMS Preview */}
                    {touchpoint.type === 'SMS' && (
                      <div className="crp-sms-preview">
                        <div className="crp-sms-bubble">
                          {touchpoint.content?.body || touchpoint.content?.message || 'No message content'}
                        </div>
                        <p className="crp-sms-meta">
                          {(touchpoint.content?.body || touchpoint.content?.message || '').length} characters
                        </p>
                      </div>
                    )}

                    {/* Generic Preview */}
                    {touchpoint.type !== 'Email' && touchpoint.type !== 'SMS' && touchpoint.type && (
                      <div className="crp-generic-preview">
                        {touchpoint.content?.description || touchpoint.content?.body || 'No details available'}
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="crp-comments-section">
                      <h4 className="crp-comments-section__title">
                        <MessageCircle size={16} />
                        Comments
                        {hasComments && <span className="crp-badge">{tpComments.length}</span>}
                      </h4>

                      {/* Existing Comments */}
                      {tpComments.length > 0 && (
                        <div className="crp-comments__list">
                          {tpComments.map(comment => (
                            <div 
                              key={comment.id} 
                              className={`crp-comment ${comment.status === 'resolved' ? 'crp-comment--resolved' : ''}`}
                            >
                              <div className="crp-comment__header">
                                <span className="crp-comment__author">{comment.user}</span>
                                <span className="crp-comment__time">
                                  {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <p className="crp-comment__text">{comment.text}</p>
                              {comment.status === 'resolved' && (
                                <span className="crp-comment__resolved-badge">
                                  <CheckCircle size={12} />
                                  Resolved
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      {canApprove && (
                        <div className="crp-comment-form">
                          {activeCommentTouchpoint === touchpoint.id ? (
                            <div className="crp-comment-input__wrapper">
                              <textarea
                                className="crp-comment-input"
                                placeholder="Add your comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={3}
                                disabled={isSubmitting}
                              />
                              <div className="crp-comment-input__actions">
                                <button
                                  className="crp-btn crp-btn--small crp-btn--secondary"
                                  onClick={() => {
                                    setActiveCommentTouchpoint(null);
                                    setCommentText('');
                                  }}
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="crp-btn crp-btn--small crp-btn--primary"
                                  onClick={() => handleAddComment(touchpoint.id)}
                                  disabled={!commentText.trim() || isSubmitting}
                                >
                                  <Send size={14} />
                                  {isSubmitting ? 'Sending...' : 'Add Comment'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="crp-btn crp-btn--ghost"
                              onClick={() => setActiveCommentTouchpoint(touchpoint.id)}
                            >
                              <MessageCircle size={16} />
                              Add Comment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Approval Confirmation Modal */}
      {showApproveConfirm && (
        <div className="crp-modal">
          <div className="crp-modal__overlay" onClick={() => setShowApproveConfirm(false)} />
          <div className="crp-modal__content">
            <div className="crp-modal__header">
              <CheckCircle size={24} className="crp-modal__icon crp-modal__icon--success" />
              <h3>Approve Journey</h3>
            </div>
            <div className="crp-modal__body">
              <p>Are you sure you want to approve <strong>{journey?.name}</strong>?</p>
              <p className="crp-modal__hint">
                Once approved, the journey will be ready for deployment to your system.
              </p>
            </div>
            <div className="crp-modal__footer">
              <button
                className="crp-btn crp-btn--secondary"
                onClick={() => setShowApproveConfirm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="crp-btn crp-btn--approve"
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Approving...' : 'Yes, Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Form Modal */}
      {showRejectForm && (
        <div className="crp-modal">
          <div className="crp-modal__overlay" onClick={() => setShowRejectForm(false)} />
          <div className="crp-modal__content">
            <div className="crp-modal__header">
              <XCircle size={24} className="crp-modal__icon crp-modal__icon--error" />
              <h3>Request Changes</h3>
            </div>
            <div className="crp-modal__body">
              <p>Please describe what changes you would like to see:</p>
              <textarea
                className="crp-modal__textarea"
                placeholder="e.g., The subject line on Day 3 email needs to be more friendly..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                disabled={isSubmitting}
              />
            </div>
            <div className="crp-modal__footer">
              <button
                className="crp-btn crp-btn--secondary"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="crp-btn crp-btn--reject"
                onClick={handleReject}
                disabled={!rejectReason.trim() || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="crp-footer">
        <p>Powered by <strong>BloomBuilder</strong></p>
        <p className="crp-footer__help">
          Need help? Contact your account manager
        </p>
      </footer>
    </div>
  );
}

export default ClientReviewPortal;