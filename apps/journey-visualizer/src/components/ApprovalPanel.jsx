/**
 * ApprovalPanel Component
 * Enhanced approval workflow UI with editing, comments, version history, and deployment
 */

import React, { useState, useEffect } from 'react';
import { JOURNEY_STATUS } from '../types';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { 
  Edit2, 
  Eye, 
  MessageCircle, 
  History, 
  Printer, 
  Rocket, 
  ChevronDown,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  GitCompare,
  Download
} from 'lucide-react';
import './ApprovalPanel.css';

// Stub implementations - replace with actual imports when available
const generatePrintHtml = (options) => {
  const { clientName, journeyName, touchpoints, generatedAt, version, status } = options;
  return `<html>
    <head><title>${journeyName} - Print View</title></head>
    <body>
      <h1>${journeyName}</h1>
      <p>Client: ${clientName}</p>
      <p>Version: ${version} | Status: ${status}</p>
      <p>Generated: ${generatedAt}</p>
      <hr/>
      <h2>Touchpoints</h2>
      ${(touchpoints || []).map(t => `<p>${t.name} (${t.type})</p>`).join('')}
    </body>
  </html>`;
};

const printJourney = (options) => {
  console.log('Printing journey:', options?.journeyName);
  window.print();
};

const generateHtmlDiff = (oldContent, newContent) => {
  return `<div style="padding: 20px;">
    <div style="background: #ffe6e6; padding: 10px; margin-bottom: 10px;">
      <strong>Old:</strong> ${oldContent}
    </div>
    <div style="background: #e6ffe6; padding: 10px;">
      <strong>New:</strong> ${newContent}
    </div>
  </div>`;
};

const compareTouchpoints = (a, b) => {
  return {
    changes: [],
    added: [],
    removed: [],
    modified: []
  };
};

/**
 * ApprovalPanel component
 * @param {Object} props
 * @param {Object} props.journey - The journey being reviewed
 * @param {Array} props.approvalHistory - List of approval records
 * @param {Array} props.versions - List of version records
 * @param {Array} props.touchpoints - List of touchpoints for comments
 * @param {Function} props.onApprove - Callback when journey is approved
 * @param {Function} props.onReject - Callback when journey is rejected
 * @param {Function} props.onRequestApproval - Callback to request approval
 * @param {Function} props.onDeploy - Callback to deploy the journey
 * @param {Function} props.onPrint - Callback to print the journey
 * @param {Function} props.onEditModeChange - Callback when edit mode changes
 * @param {Function} props.onTouchpointComment - Callback when commenting on a touchpoint
 */
export function ApprovalPanel({
  journey,
  approvalHistory = [],
  versions = [],
  touchpoints = [],
  onApprove,
  onReject,
  onRequestApproval,
  onDeploy,
  onPrint,
  onEditModeChange,
  onTouchpointComment,
  disabled = false
}) {
  const [comment, setComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [touchpointComments, setTouchpointComments] = useState({});
  const [activeCommentTouchpoint, setActiveCommentTouchpoint] = useState(null);
  const [newComment, setNewComment] = useState('');

  const currentStatus = journey?.status || JOURNEY_STATUS.DRAFT;
  const canApprove = currentStatus === JOURNEY_STATUS.CLIENT_REVIEW;
  const canRequestApproval = currentStatus === JOURNEY_STATUS.DRAFT;
  const canDeploy = currentStatus === JOURNEY_STATUS.APPROVED;

  // Toggle edit mode
  const toggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    onEditModeChange?.(newMode);
  };

  const handleApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onApprove?.(journey.id, comment);
      setComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onReject?.(journey.id, comment);
      setComment('');
      setShowRejectForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestApproval = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRequestApproval?.(journey.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeploy = async () => {
    if (isSubmitting) return;
    if (!confirm('Are you sure you want to deploy this journey? It will go live immediately.')) return;
    setIsSubmitting(true);
    try {
      await onDeploy?.(journey.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    onPrint?.(journey);
    // Use enhanced print styles
    const printOptions = {
      clientName: journey?.clientName || 'Client',
      journeyName: journey?.name || 'Untitled Journey',
      touchpoints: touchpoints,
      generatedAt: new Date().toISOString(),
      version: journey?.version || 1,
      status: currentStatus,
      comments: Object.values(touchpointComments).flat()
    };
    printJourney(printOptions);
  };

  const handleExportPrint = () => {
    // Export print-ready HTML
    const printOptions = {
      clientName: journey?.clientName || 'Client',
      journeyName: journey?.name || 'Untitled Journey',
      touchpoints: touchpoints,
      generatedAt: new Date().toISOString(),
      version: journey?.version || 1,
      status: currentStatus,
      comments: Object.values(touchpointComments).flat()
    };
    
    const html = generatePrintHtml(printOptions);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${journey?.name?.replace(/\s+/g, '-').toLowerCase() || 'journey'}-print.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setShowVersionHistory(false);
    // Trigger version restore callback
  };

  const handleAddTouchpointComment = (touchpointId) => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: `comment-${Date.now()}`,
      touchpointId,
      text: newComment,
      author: 'Current User',
      timestamp: new Date().toISOString()
    };
    
    setTouchpointComments(prev => ({
      ...prev,
      [touchpointId]: [...(prev[touchpointId] || []), comment]
    }));
    
    onTouchpointComment?.(touchpointId, comment);
    setNewComment('');
    setActiveCommentTouchpoint(null);
  };

  const getTotalComments = () => {
    return Object.values(touchpointComments).reduce((sum, comments) => sum + comments.length, 0);
  };

  return (
    <div className="approval-panel">
      {/* Header */}
      <div className="approval-panel__header">
        <div className="approval-panel__header-left">
          <h3 className="approval-panel__title">Approval Workflow</h3>
          <StatusBadge status={currentStatus} size="large" />
        </div>
        
        {/* Edit/View Mode Toggle */}
        <button 
          className={`approval-panel__mode-toggle ${isEditMode ? 'approval-panel__mode-toggle--edit' : ''}`}
          onClick={toggleEditMode}
          title={isEditMode ? 'Switch to view mode' : 'Switch to edit mode'}
        >
          {isEditMode ? <Edit2 size={16} /> : <Eye size={16} />}
          {isEditMode ? 'Editing' : 'Viewing'}
        </button>
      </div>

      {/* Current Status Section */}
      <div className="approval-panel__section">
        <div className="approval-panel__status-row">
          <div className="approval-panel__status-info">
            <span className="approval-panel__status-label">Current Status:</span>
            <span className="approval-panel__status-text">{currentStatus}</span>
          </div>
          
          {/* Version History Dropdown */}
          <div className="approval-panel__version-dropdown">
            <button 
              className="approval-panel__version-btn"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
            >
              <History size={14} />
              Version {journey?.version || 1}
              <ChevronDown size={14} className={showVersionHistory ? 'approval-panel__chevron--up' : ''} />
            </button>
            
            {showVersionHistory && (
              <div className="approval-panel__version-menu">
                <div className="approval-panel__version-header">
                  <span>Version History</span>
                </div>
                {versions.length > 0 ? (
                  versions.map((version) => (
                    <button
                      key={version.id}
                      className={`approval-panel__version-item ${selectedVersion?.id === version.id ? 'approval-panel__version-item--selected' : ''}`}
                      onClick={() => handleVersionSelect(version)}
                    >
                      <div className="approval-panel__version-info">
                        <span className="approval-panel__version-number">v{version.version}</span>
                        <span className="approval-panel__version-date">
                          {format(new Date(version.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <span className="approval-panel__version-author">{version.createdBy}</span>
                    </button>
                  ))
                ) : (
                  <div className="approval-panel__version-empty">
                    No version history available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar Actions */}
      <div className="approval-panel__toolbar">
        {/* Comments Button */}
        <button 
          className={`approval-panel__toolbar-btn ${showComments ? 'approval-panel__toolbar-btn--active' : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle size={16} />
          Comments
          {getTotalComments() > 0 && (
            <span className="approval-panel__badge">{getTotalComments()}</span>
          )}
        </button>

        {/* Print Button */}
        <button 
          className="approval-panel__toolbar-btn"
          onClick={handlePrint}
          title="Print journey for review"
        >
          <Printer size={16} />
          Print
        </button>

        {/* Export Button */}
        <button 
          className="approval-panel__toolbar-btn"
          onClick={handleExportPrint}
          title="Export print-ready HTML"
        >
          <Download size={16} />
          Export
        </button>

        {/* Version Compare Button */}
        {versions.length > 0 && (
          <button 
            className="approval-panel__toolbar-btn"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            title="Compare versions"
          >
            <GitCompare size={16} />
            Compare
          </button>
        )}

        {/* Deploy Button (only when approved) */}
        {canDeploy && (
          <button 
            className="approval-panel__toolbar-btn approval-panel__toolbar-btn--deploy"
            onClick={handleDeploy}
            disabled={disabled || isSubmitting}
          >
            <Rocket size={16} />
            Deploy
          </button>
        )}
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div className="approval-panel__comments-section">
          <h4 className="approval-panel__comments-title">
            <MessageCircle size={16} />
            Touchpoint Comments
          </h4>
          
          {touchpoints.length === 0 ? (
            <p className="approval-panel__comments-empty">No touchpoints to comment on</p>
          ) : (
            <div className="approval-panel__touchpoint-list">
              {touchpoints.map((touchpoint) => (
                <div key={touchpoint.id} className="approval-panel__touchpoint-item">
                  <div 
                    className="approval-panel__touchpoint-header"
                    onClick={() => setActiveCommentTouchpoint(
                      activeCommentTouchpoint === touchpoint.id ? null : touchpoint.id
                    )}
                  >
                    <span className="approval-panel__touchpoint-name">{touchpoint.name}</span>
                    <span className="approval-panel__touchpoint-type">({touchpoint.type})</span>
                    {(touchpointComments[touchpoint.id] || []).length > 0 && (
                      <span className="approval-panel__comment-count">
                        {touchpointComments[touchpoint.id].length}
                      </span>
                    )}
                  </div>
                  
                  {activeCommentTouchpoint === touchpoint.id && (
                    <div className="approval-panel__comment-box">
                      {/* Existing Comments */}
                      {(touchpointComments[touchpoint.id] || []).map((comment) => (
                        <div key={comment.id} className="approval-panel__comment">
                          <div className="approval-panel__comment-header">
                            <User size={12} />
                            <span className="approval-panel__comment-author">{comment.author}</span>
                            <span className="approval-panel__comment-time">
                              {format(new Date(comment.timestamp), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="approval-panel__comment-text">{comment.text}</p>
                        </div>
                      ))}
                      
                      {/* Add Comment */}
                      <div className="approval-panel__comment-input-box">
                        <textarea
                          className="approval-panel__comment-input"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                        />
                        <button
                          className="approval-panel__comment-submit"
                          onClick={() => handleAddTouchpointComment(touchpoint.id)}
                          disabled={!newComment.trim()}
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="approval-panel__actions">
        {canRequestApproval && (
          <button
            className="approval-panel__button approval-panel__button--request"
            onClick={handleRequestApproval}
            disabled={disabled || isSubmitting}
          >
            <Clock size={18} />
            Request Client Review
          </button>
        )}

        {canApprove && (
          <>
            <div className="approval-panel__review-form">
              <textarea
                className="approval-panel__comment-input"
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={disabled || isSubmitting}
                rows={3}
              />
            </div>
            <div className="approval-panel__button-group">
              <button
                className="approval-panel__button approval-panel__button--approve"
                onClick={handleApprove}
                disabled={disabled || isSubmitting}
              >
                <CheckCircle size={18} />
                Approve
              </button>
              <button
                className="approval-panel__button approval-panel__button--reject"
                onClick={() => setShowRejectForm(true)}
                disabled={disabled || isSubmitting}
              >
                <XCircle size={18} />
                Reject
              </button>
            </div>
          </>
        )}

        {showRejectForm && (
          <div className="approval-panel__reject-form">
            <label className="approval-panel__reject-label">
              Please provide a reason for rejection:
            </label>
            <textarea
              className="approval-panel__comment-input approval-panel__comment-input--reject"
              placeholder="Explain what needs to be changed..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={disabled || isSubmitting}
              rows={4}
              required
            />
            <div className="approval-panel__button-group">
              <button
                className="approval-panel__button approval-panel__button--cancel"
                onClick={() => {
                  setShowRejectForm(false);
                  setComment('');
                }}
                disabled={disabled || isSubmitting}
              >
                Cancel
              </button>
              <button
                className="approval-panel__button approval-panel__button--confirm-reject"
                onClick={handleReject}
                disabled={disabled || isSubmitting || !comment.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {currentStatus === JOURNEY_STATUS.APPROVED && (
          <div className="approval-panel__success">
            <CheckCircle size={24} />
            <div>
              <strong>Approved!</strong>
              <p>This journey has been approved and is ready for publication.</p>
            </div>
          </div>
        )}

        {currentStatus === JOURNEY_STATUS.PUBLISHED && (
          <div className="approval-panel__published">
            <Rocket size={24} />
            <div>
              <strong>Published!</strong>
              <p>This journey is live and active.</p>
            </div>
          </div>
        )}
      </div>

      {/* Approval History */}
      {approvalHistory.length > 0 && (
        <div className="approval-panel__history">
          <h4 className="approval-panel__history-title">Approval History</h4>
          <ul className="approval-panel__history-list">
            {approvalHistory.map((approval, index) => (
              <li key={approval.id || index} className="approval-panel__history-item">
                <div className="approval-panel__history-header">
                  <StatusBadge
                    status={approval.status}
                    size="small"
                    showIcon={false}
                  />
                  <span className="approval-panel__history-date">
                    {format(new Date(approval.reviewedAt || approval.requestedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {approval.comments && (
                  <p className="approval-panel__history-comment">
                    "{approval.comments}"
                  </p>
                )}
                <div className="approval-panel__history-meta">
                  {approval.reviewedBy && (
                    <span>
                      <User size={12} />
                      {approval.reviewedBy}
                    </span>
                  )}
                  {approval.version && (
                    <span className="approval-panel__history-version">
                      v{approval.version}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ApprovalPanel;
