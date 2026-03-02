/**
 * A/B Testing Panel
 * P1 Q3 2026 - Comprehensive A/B Testing UI
 * 
 * Features:
 * - List all A/B tests for a journey/client
 * - Create new A/B tests
 * - View test results and statistics
 * - Start/pause/stop tests
 * - Declare winners
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ABTestingPanel.css';
import { getApiClient } from '../services/apiClient';
import ABTestCreator from './ABTestCreator';
import ABTestResults from './ABTestResults';
import SampleSizeCalculator from './SampleSizeCalculator';

const apiClient = getApiClient();

const TEST_STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'status-draft', icon: '📝' },
  running: { label: 'Running', className: 'status-running', icon: '▶️' },
  paused: { label: 'Paused', className: 'status-paused', icon: '⏸️' },
  completed: { label: 'Completed', className: 'status-completed', icon: '✅' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled', icon: '❌' }
};

const TARGET_METRIC_LABELS = {
  conversion: 'Conversion Rate',
  click_rate: 'Click Rate',
  open_rate: 'Open Rate',
  reply_rate: 'Reply Rate'
};

export default function ABTestingPanel({ clientId, journeyId, journey }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getABTests(clientId, { journeyId });
      setTests(response.tests || []);
      setError(null);
    } catch (err) {
      setError('Failed to load A/B tests: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId, journeyId]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleCreateTest = async (testData) => {
    try {
      await apiClient.createABTest({
        ...testData,
        clientId,
        journeyId
      });
      setShowCreator(false);
      fetchTests();
    } catch (err) {
      alert('Failed to create test: ' + err.message);
    }
  };

  const handleStartTest = async (testId) => {
    try {
      setActionLoading(prev => ({ ...prev, [testId]: 'starting' }));
      await apiClient.startABTest(testId);
      fetchTests();
    } catch (err) {
      alert('Failed to start test: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [testId]: null }));
    }
  };

  const handlePauseTest = async (testId) => {
    try {
      setActionLoading(prev => ({ ...prev, [testId]: 'pausing' }));
      await apiClient.pauseABTest(testId);
      fetchTests();
    } catch (err) {
      alert('Failed to pause test: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [testId]: null }));
    }
  };

  const handleStopTest = async (testId, winnerVariantId = null) => {
    try {
      if (!winnerVariantId) {
        const confirmStop = window.confirm(
          'Are you sure you want to stop this test without declaring a winner?'
        );
        if (!confirmStop) return;
      }
      setActionLoading(prev => ({ ...prev, [testId]: 'stopping' }));
      await apiClient.stopABTest(testId, winnerVariantId);
      fetchTests();
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
      }
    } catch (err) {
      alert('Failed to stop test: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [testId]: null }));
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }
    try {
      await apiClient.deleteABTest(testId);
      fetchTests();
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
      }
    } catch (err) {
      alert('Failed to delete test: ' + err.message);
    }
  };

  const filteredTests = tests.filter(test => {
    if (filter === 'all') return true;
    if (filter === 'active') return test.status === 'running';
    if (filter === 'completed') return test.status === 'completed';
    if (filter === 'draft') return test.status === 'draft';
    return true;
  });

  const getTotalStats = () => {
    return tests.reduce((acc, test) => {
      const participants = test.variants?.reduce((sum, v) => sum + (v.participantsCount || 0), 0) || 0;
      const conversions = test.variants?.reduce((sum, v) => sum + (v.conversionsCount || 0), 0) || 0;
      return {
        totalTests: acc.totalTests + 1,
        activeTests: acc.activeTests + (test.status === 'running' ? 1 : 0),
        totalParticipants: acc.totalParticipants + participants,
        totalConversions: acc.totalConversions + conversions
      };
    }, { totalTests: 0, activeTests: 0, totalParticipants: 0, totalConversions: 0 });
  };

  const stats = getTotalStats();

  if (selectedTest) {
    return (
      <ABTestResults
        test={selectedTest}
        onBack={() => setSelectedTest(null)}
        onStop={(winnerId) => handleStopTest(selectedTest.id, winnerId)}
      />
    );
  }

  if (showCreator) {
    return (
      <ABTestCreator
        journey={journey}
        onCancel={() => setShowCreator(false)}
        onCreate={handleCreateTest}
      />
    );
  }

  return (
    <div className="ab-testing-panel">
      <div className="panel-header">
        <div className="header-left">
          <h2>🧪 A/B Testing</h2>
          <p className="subtitle">Test different journey variations to optimize performance</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowCalculator(true)}
          >
            📊 Sample Size Calculator
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreator(true)}
          >
            + Create New Test
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-value">{stats.totalTests}</div>
          <div className="stat-label">Total Tests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeTests}</div>
          <div className="stat-label">Active Tests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalParticipants.toLocaleString()}</div>
          <div className="stat-label">Total Participants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats.totalParticipants > 0
              ? ((stats.totalConversions / stats.totalParticipants) * 100).toFixed(1) + '%'
              : '0%'}
          </div>
          <div className="stat-label">Avg. Conversion Rate</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'active', 'completed', 'draft'].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' && <span className="count">({tests.length})</span>}
            {f === 'active' && <span className="count">({tests.filter(t => t.status === 'running').length})</span>}
            {f === 'completed' && <span className="count">({tests.filter(t => t.status === 'completed').length})</span>}
            {f === 'draft' && <span className="count">({tests.filter(t => t.status === 'draft').length})</span>}
          </button>
        ))}
      </div>

      {/* Tests List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading A/B tests...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchTests}>
            Try Again
          </button>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧪</div>
          <h3>No A/B Tests Found</h3>
          <p>
            {filter === 'all'
              ? "You haven't created any A/B tests yet."
              : `No ${filter} tests found.`}
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreator(true)}>
            Create Your First Test
          </button>
        </div>
      ) : (
        <div className="tests-list">
          {filteredTests.map((test) => {
            const statusConfig = TEST_STATUS_CONFIG[test.status] || TEST_STATUS_CONFIG.draft;
            const totalParticipants = test.variants?.reduce((sum, v) => sum + (v.participantsCount || 0), 0) || 0;
            const totalConversions = test.variants?.reduce((sum, v) => sum + (v.conversionsCount || 0), 0) || 0;
            const conversionRate = totalParticipants > 0 ? (totalConversions / totalParticipants) * 100 : 0;

            return (
              <div key={test.id} className={`test-card ${test.status}`}>
                <div className="test-header">
                  <div className="test-title-section">
                    <h3 className="test-name">{test.name}</h3>
                    <span className={`status-badge ${statusConfig.className}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </div>
                  <div className="test-actions">
                    {test.status === 'draft' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStartTest(test.id)}
                        disabled={actionLoading[test.id]}
                      >
                        {actionLoading[test.id] === 'starting' ? 'Starting...' : '▶️ Start'}
                      </button>
                    )}
                    {test.status === 'running' && (
                      <>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handlePauseTest(test.id)}
                          disabled={actionLoading[test.id]}
                        >
                          {actionLoading[test.id] === 'pausing' ? 'Pausing...' : '⏸️ Pause'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleStopTest(test.id)}
                          disabled={actionLoading[test.id]}
                        >
                          {actionLoading[test.id] === 'stopping' ? 'Stopping...' : '⏹️ Stop'}
                        </button>
                      </>
                    )}
                    {test.status === 'paused' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStartTest(test.id)}
                          disabled={actionLoading[test.id]}
                        >
                          {actionLoading[test.id] === 'starting' ? 'Starting...' : '▶️ Resume'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleStopTest(test.id)}
                          disabled={actionLoading[test.id]}
                        >
                          {actionLoading[test.id] === 'stopping' ? 'Stopping...' : '⏹️ Stop'}
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedTest(test)}
                    >
                      📊 Results
                    </button>
                    {(test.status === 'draft' || test.status === 'cancelled') && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {test.description && (
                  <p className="test-description">{test.description}</p>
                )}

                <div className="test-details">
                  <div className="detail-item">
                    <span className="detail-label">Target Metric:</span>
                    <span className="detail-value">
                      {TARGET_METRIC_LABELS[test.targetMetric] || test.targetMetric}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Test Type:</span>
                    <span className="detail-value">
                      {test.testType === 'journey' ? 'Full Journey' : test.testType}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Variants:</span>
                    <span className="detail-value">{test.variants?.length || 0}</span>
                  </div>
                  {test.startDate && (
                    <div className="detail-item">
                      <span className="detail-label">Started:</span>
                      <span className="detail-value">
                        {new Date(test.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Variant Progress */}
                <div className="variant-progress">
                  <h4>Variant Performance</h4>
                  <div className="variants-list">
                    {test.variants?.map((variant) => {
                      const variantRate = variant.participantsCount > 0
                        ? (variant.conversionsCount / variant.participantsCount) * 100
                        : 0;
                      return (
                        <div key={variant.id} className={`variant-item ${variant.isControl ? 'control' : ''}`}>
                          <div className="variant-info">
                            <span className="variant-name">
                              {variant.isControl && <span className="control-badge">Control</span>}
                              {variant.name}
                            </span>
                            <span className="variant-traffic">{variant.trafficPercentage}% traffic</span>
                          </div>
                          <div className="variant-stats">
                            <div className="stat">
                              <span className="stat-value">{variant.participantsCount || 0}</span>
                              <span className="stat-label">participants</span>
                            </div>
                            <div className="stat">
                              <span className="stat-value">{variantRate.toFixed(1)}%</span>
                              <span className="stat-label">conversion</span>
                            </div>
                          </div>
                          {variant.status === 'winner' && (
                            <span className="winner-badge">🏆 Winner</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Stats */}
                <div className="overall-stats">
                  <div className="stat-item">
                    <span className="stat-number">{totalParticipants.toLocaleString()}</span>
                    <span className="stat-label">Total Participants</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{totalConversions.toLocaleString()}</span>
                    <span className="stat-label">Conversions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{conversionRate.toFixed(2)}%</span>
                    <span className="stat-label">Overall Rate</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sample Size Calculator Modal */}
      {showCalculator && (
        <div className="modal-overlay" onClick={() => setShowCalculator(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Sample Size Calculator</h3>
              <button className="btn-close" onClick={() => setShowCalculator(false)}>×</button>
            </div>
            <SampleSizeCalculator />
          </div>
        </div>
      )}
    </div>
  );
}
