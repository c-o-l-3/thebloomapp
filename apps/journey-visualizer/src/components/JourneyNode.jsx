/**
 * JourneyNode Component
 * Custom React Flow node for journey touchpoints
 */

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { TOUCHPOINT_TYPE } from '../types';
import './JourneyNode.css';

const nodeIcons = {
  [TOUCHPOINT_TYPE.EMAIL]: '📧',
  [TOUCHPOINT_TYPE.SMS]: '💬',
  [TOUCHPOINT_TYPE.TASK]: '✓',
  [TOUCHPOINT_TYPE.WAIT]: '⏱',
  [TOUCHPOINT_TYPE.CONDITION]: '?',
  [TOUCHPOINT_TYPE.TRIGGER]: '⚡',
  [TOUCHPOINT_TYPE.FORM]: '📝',
  [TOUCHPOINT_TYPE.CALL]: '📞',
  [TOUCHPOINT_TYPE.NOTE]: '📌'
};

const nodeColors = {
  [TOUCHPOINT_TYPE.EMAIL]: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  [TOUCHPOINT_TYPE.SMS]: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  [TOUCHPOINT_TYPE.TASK]: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  [TOUCHPOINT_TYPE.WAIT]: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  [TOUCHPOINT_TYPE.CONDITION]: { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  [TOUCHPOINT_TYPE.TRIGGER]: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  [TOUCHPOINT_TYPE.FORM]: { bg: '#ccfbf1', border: '#14b8a6', text: '#0f766e' },
  [TOUCHPOINT_TYPE.CALL]: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  [TOUCHPOINT_TYPE.NOTE]: { bg: '#f1f5f9', border: '#64748b', text: '#334155' }
};

/**
 * JourneyNode - Custom node component for React Flow
 */
export const JourneyNode = memo(({ data, selected }) => {
  const { label, touchpointType, content } = data;
  const icon = nodeIcons[touchpointType] || '📌';
  const colors = nodeColors[touchpointType] || nodeColors[TOUCHPOINT_TYPE.NOTE];

  const renderContentPreview = () => {
    switch (touchpointType) {
      case TOUCHPOINT_TYPE.EMAIL:
        return (
          <div className="journey-node__preview journey-node__preview--email">
            <span className="journey-node__preview-label">Subject:</span>
            <span className="journey-node__preview-value">
              {content?.subject || 'No subject'}
            </span>
            {content?.openRate && (
              <span className="journey-node__metric">
                Open rate: {content.openRate}%
              </span>
            )}
          </div>
        );

      case TOUCHPOINT_TYPE.SMS:
        return (
          <div className="journey-node__preview journey-node__preview--sms">
            <span className="journey-node__preview-value">
              {content?.body?.substring(0, 50)}
              {(content?.body?.length || 0) > 50 ? '...' : ''}
            </span>
            <span className="journey-node__metric">
              {content?.body?.length || 0} chars
            </span>
          </div>
        );

      case TOUCHPOINT_TYPE.WAIT:
        return (
          <div className="journey-node__preview journey-node__preview--wait">
            <span className="journey-node__preview-value">
              Wait {content?.duration || 1} {content?.unit || 'day'}{(content?.duration || 1) !== 1 ? 's' : ''}
            </span>
          </div>
        );

      case TOUCHPOINT_TYPE.CONDITION:
        return (
          <div className="journey-node__preview journey-node__preview--condition">
            <span className="journey-node__preview-value">
              {content?.condition || 'No condition set'}
            </span>
          </div>
        );

      case TOUCHPOINT_TYPE.TASK:
        return (
          <div className="journey-node__preview journey-node__preview--task">
            <span className="journey-node__preview-value">
              {content?.title || 'Untitled Task'}
            </span>
            {content?.assignee && (
              <span className="journey-node__meta">
                Assignee: {content.assignee}
              </span>
            )}
          </div>
        );

      case TOUCHPOINT_TYPE.TRIGGER:
        return (
          <div className="journey-node__preview journey-node__preview--trigger">
            <span className="journey-node__preview-value">
              {content?.triggerType || 'No trigger'}
            </span>
          </div>
        );

      case TOUCHPOINT_TYPE.FORM:
        return (
          <div className="journey-node__preview journey-node__preview--form">
            <span className="journey-node__preview-value">
              {content?.formName || 'Form Submission'}
            </span>
          </div>
        );

      case TOUCHPOINT_TYPE.CALL:
        return (
          <div className="journey-node__preview journey-node__preview--call">
            <span className="journey-node__preview-value">
              {content?.title || 'Phone Call'}
            </span>
          </div>
        );

      default:
        return (
          <div className="journey-node__preview">
            <span className="journey-node__preview-value">
              {content?.body || label}
            </span>
          </div>
        );
    }
  };

  return (
    <div
      className={`journey-node ${selected ? 'journey-node--selected' : ''}`}
      style={{
        '--node-bg': colors.bg,
        '--node-border': colors.border,
        '--node-text': colors.text
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="journey-node__handle journey-node__handle--input"
      />

      {/* Node Header */}
      <div className="journey-node__header">
        <span className="journey-node__icon">{icon}</span>
        <span className="journey-node__type">{touchpointType}</span>
      </div>

      {/* Node Content */}
      <div className="journey-node__content">
        <span className="journey-node__label">{label}</span>
        {renderContentPreview()}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="journey-node__handle journey-node__handle--output"
      />
    </div>
  );
});

JourneyNode.displayName = 'JourneyNode';

export default JourneyNode;
