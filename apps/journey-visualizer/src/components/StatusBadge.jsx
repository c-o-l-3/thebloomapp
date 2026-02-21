/**
 * StatusBadge Component
 * Color-coded badges for workflow status
 */

import React from 'react';
import { JOURNEY_STATUS } from '../types';
import './StatusBadge.css';

const statusConfig = {
  [JOURNEY_STATUS.DRAFT]: {
    color: '#f59e0b',
    bgColor: '#fef3c7',
    label: 'Draft',
    icon: '📝'
  },
  [JOURNEY_STATUS.CLIENT_REVIEW]: {
    color: '#3b82f6',
    bgColor: '#dbeafe',
    label: 'Client Review',
    icon: '👀'
  },
  [JOURNEY_STATUS.APPROVED]: {
    color: '#10b981',
    bgColor: '#d1fae5',
    label: 'Approved',
    icon: '✅'
  },
  [JOURNEY_STATUS.PUBLISHED]: {
    color: '#6b7280',
    bgColor: '#e5e7eb',
    label: 'Published',
    icon: '🚀'
  },
  [JOURNEY_STATUS.REJECTED]: {
    color: '#ef4444',
    bgColor: '#fee2e2',
    label: 'Rejected',
    icon: '❌'
  }
};

/**
 * StatusBadge component
 * @param {string} status - The journey status
 * @param {Object} props - Additional props
 */
export function StatusBadge({ status, size = 'medium', showIcon = true }) {
  const config = statusConfig[status] || statusConfig[JOURNEY_STATUS.DRAFT];

  const sizeClasses = {
    small: 'status-badge--small',
    medium: 'status-badge--medium',
    large: 'status-badge--large'
  };

  return (
    <span
      className={`status-badge ${sizeClasses[size] || sizeClasses.medium}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color
      }}
    >
      {showIcon && <span className="status-badge__icon">{config.icon}</span>}
      <span className="status-badge__label">{config.label}</span>
    </span>
  );
}

/**
 * StatusIndicator dot for use in lists
 */
export function StatusIndicator({ status, size = 'small' }) {
  const config = statusConfig[status] || statusConfig[JOURNEY_STATUS.DRAFT];

  const sizeClasses = {
    small: 'status-indicator--small',
    medium: 'status-indicator--medium'
  };

  return (
    <span
      className={`status-indicator ${sizeClasses[size] || sizeClasses.small}`}
      style={{ backgroundColor: config.color }}
      title={config.label}
    />
  );
}

export default StatusBadge;
