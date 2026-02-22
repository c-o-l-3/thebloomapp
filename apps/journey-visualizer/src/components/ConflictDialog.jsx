/**
 * ConflictDialog Component
 * Displays when optimistic locking detects a conflict
 * Allows users to: retry with merge, force overwrite, or accept server version
 */
import React from 'react';
import './ConflictDialog.css';

/**
 * ConflictDialog - UI for resolving optimistic locking conflicts
 * @param {Object} props
 * @param {Object} props.conflict - Conflict state from useJourneys
 * @param {Object} props.pendingChanges - User's pending changes
 * @param {Function} props.onRetryMerge - Retry with merged data
 * @param {Function} props.onForceOverwrite - Force overwrite server data
 * @param {Function} props.onAcceptServer - Accept server version
 * @param {Function} props.onCancel - Cancel and discard changes
 */
export function ConflictDialog({
  conflict,
  pendingChanges,
  onRetryMerge,
  onForceOverwrite,
  onAcceptServer,
  onCancel
}) {
  if (!conflict) return null;

  const { serverData, currentVersion, submittedVersion } = conflict;

  // Helper to render diff between versions
  const renderDiff = (field) => {
    const serverValue = serverData[field];
    const localValue = pendingChanges?.[field];

    if (serverValue === localValue) {
      return <span className="conflict-same">{String(serverValue)}</span>;
    }

    return (
      <div className="conflict-diff">
        <div className="conflict-server-value">
          <span className="conflict-label">Server:</span>
          <span className="conflict-value">{String(serverValue) || '(empty)'}</span>
        </div>
        <div className="conflict-local-value">
          <span className="conflict-label">Yours:</span>
          <span className="conflict-value">{String(localValue) || '(empty)'}</span>
        </div>
      </div>
    );
  };

  const handleRetryWithMerge = () => {
    // Simple merge: prefer local changes, but use server version for conflict resolution
    const mergedData = {
      ...serverData,
      ...pendingChanges,
      // Remove internal fields
      id: undefined,
      version: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
    delete mergedData.id;
    delete mergedData.version;
    
    onRetryMerge(mergedData);
  };

  return (
    <div className="conflict-dialog-overlay">
      <div className="conflict-dialog">
        <div className="conflict-dialog-header">
          <h2>⚠️ Sync Conflict Detected</h2>
          <p className="conflict-subtitle">
            Another user has modified this journey while you were editing.
          </p>
        </div>

        <div className="conflict-dialog-content">
          <div className="conflict-version-info">
            <span className="version-badge server">
              Server Version: {currentVersion}
            </span>
            <span className="version-badge local">
              Your Version: {submittedVersion}
            </span>
          </div>

          <div className="conflict-fields">
            <h3>Changed Fields:</h3>
            {pendingChanges && Object.keys(pendingChanges)
              .filter(key => !['id', 'version', 'createdAt', 'updatedAt'].includes(key))
              .map(key => (
                <div key={key} className="conflict-field">
                  <span className="field-name">{key}:</span>
                  {renderDiff(key)}
                </div>
              ))}
          </div>

          <div className="conflict-warning">
            <strong>Warning:</strong> Choosing "Force Overwrite" will discard 
            the other user's changes.
          </div>
        </div>

        <div className="conflict-dialog-actions">
          <button
            className="conflict-btn conflict-btn-secondary"
            onClick={onCancel}
          >
            Cancel (Keep Editing)
          </button>
          
          <button
            className="conflict-btn conflict-btn-secondary"
            onClick={onAcceptServer}
          >
            Accept Server Version
          </button>
          
          <button
            className="conflict-btn conflict-btn-primary"
            onClick={handleRetryWithMerge}
          >
            Retry with My Changes
          </button>
          
          <button
            className="conflict-btn conflict-btn-danger"
            onClick={onForceOverwrite}
          >
            Force Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConflictDialog;
