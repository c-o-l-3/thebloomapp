/**
 * A/B Test Results
 * Component for viewing detailed test results and statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '../services/apiClient';

const apiClient = getApiClient();

const CONFIDENCE_LEVELS = {
  low: { label: 'Low', color: '#ef4444', icon: '⚠️' },
  medium: { label: 'Medium', color: '#f59e0b', icon: '⚡' },
  high: { label: 'High', color: '#22c55e', icon: '✓' }
};

export default function ABTestResults({ test, onBack, onStop }) {
  const [results, setResults] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const [resultsData, statsData] = await Promise.all([
        apiClient.getABTestResults(test.id),
        apiClient.getABTestDailyStats(test.id, { days: 30 })
      ]);
      setResults(resultsData);
      setDailyStats(statsData.stats || []);
      setError(null);
    } catch (err) {
      setError('Failed to load results: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [test.id]);

  useEffect(() => {
    fetchResults();
    // Refresh every 30 seconds if test is running
    const interval = setInterval(() => {
      if (test.status === 'running') {
        fetchResults();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchResults, test.status]);

  const handleDeclareWinner = () => {
    if (!selectedWinner) {
      alert('Please select a winning variant');
      return;
    }
    onStop(selectedWinner);
  };

  const handleStopWithoutWinner = () => {
    onStop(null);
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.95) return CONFIDENCE_LEVELS.high;
    if (confidence >= 0.8) return CONFIDENCE_LEVELS.medium;
    return CONFIDENCE_LEVELS.low;
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  const formatPercentage = (num, decimals = 2) => {
    if (num === null || num === undefined) return '0%';
    return num.toFixed(decimals) + '%';
  };

  if (loading) {
    return (
      <div className="ab-test-results">
        <div className="results-loading">
          <div className="spinner"></div>
          <p>Loading test results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ab-test-results">
        <div className="results-error">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchResults}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const { test: testInfo, summary, control, variants, statistics, recommendation } = results;
  const confidenceConfig = getConfidenceLevel(summary.hasSignificantResult ? 0.95 : 0);

  return (
    <div className="ab-test-results">
      {/* Header */}
      <div className="results-header">
        <button className="btn btn-ghost back-btn" onClick={onBack}>
          ← Back to Tests
        </button>
        <div className="header-content">
          <h2>{testInfo.name}</h2>
          <span className={`status-badge ${testInfo.status}`}>
            {testInfo.status === 'running' ? '▶️ Running' : 
             testInfo.status === 'completed' ? '✅ Completed' : testInfo.status}
          </span>
        </div>
        {testInfo.status === 'running' && (
          <button 
            className="btn btn-danger"
            onClick={() => setShowConfirmStop(true)}
          >
            Stop Test
          </button>
        )}
      </div>

      {/* Recommendation Banner */}
      <div className={`recommendation-banner ${recommendation.action}`}>
        <div className="recommendation-icon">
          {recommendation.action === 'declare_winner' ? '🏆' : 
           recommendation.action === 'continue' ? '⏳' : '⚠️'}
        </div>
        <div className="recommendation-content">
          <h4>
            {recommendation.action === 'declare_winner' ? 'Winner Recommended' : 
             recommendation.action === 'continue' ? 'Continue Testing' : 
             'Consider Stopping'}
          </h4>
          <p>{recommendation.message}</p>
        </div>
        {recommendation.winnerName && (
          <div className="recommended-winner">
            <span className="winner-label">Recommended Winner</span>
            <span className="winner-name">{recommendation.winnerName}</span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <div className="metric-card">
          <span className="metric-value">{formatNumber(summary.totalParticipants)}</span>
          <span className="metric-label">Total Participants</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">
            {summary.hasEnoughSample ? '✓' : '⏳'}
          </span>
          <span className="metric-label">
            {summary.hasEnoughSample ? 'Sample Size Reached' : 'Gathering Sample'}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-value" style={{ color: confidenceConfig.color }}>
            {confidenceConfig.icon} {confidenceConfig.label}
          </span>
          <span className="metric-label">Confidence Level</span>
        </div>
        {summary.daysToSignificance && (
          <div className="metric-card">
            <span className="metric-value">~{summary.daysToSignificance} days</span>
            <span className="metric-label">Est. to Significance</span>
          </div>
        )}
      </div>

      {/* Variants Comparison Table */}
      <div className="variants-comparison">
        <h3>Variant Performance</h3>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Participants</th>
                <th>Conversions</th>
                <th>Conversion Rate</th>
                <th>vs Control</th>
                <th>Confidence</th>
                {testInfo.status === 'running' && <th>Select Winner</th>}
              </tr>
            </thead>
            <tbody>
              {/* Control Row */}
              <tr className="control-row">
                <td>
                  <div className="variant-info">
                    <span className="control-badge">Control</span>
                    <span className="variant-name">{control.name}</span>
                  </div>
                </td>
                <td>{formatNumber(control.participants)}</td>
                <td>{formatNumber(control.conversions)}</td>
                <td>
                  <div className="rate-cell">
                    <span className="rate-value">{formatPercentage(control.rate * 100)}</span>
                  </div>
                </td>
                <td>—</td>
                <td>—</td>
                {testInfo.status === 'running' && (
                  <td>
                    <input
                      type="radio"
                      name="winner"
                      checked={selectedWinner === control.id}
                      onChange={() => setSelectedWinner(control.id)}
                    />
                  </td>
                )}
              </tr>

              {/* Treatment Rows */}
              {variants.filter(v => !v.isControl).map((variant) => {
                const stats = statistics.find(s => s.variantId === variant.id);
                const isWinner = variant.status === 'winner';
                
                return (
                  <tr key={variant.id} className={`${isWinner ? 'winner-row' : ''} ${stats?.isSignificant ? 'significant' : ''}`}>
                    <td>
                      <div className="variant-info">
                        <span className="variant-name">{variant.name}</span>
                        {isWinner && <span className="winner-badge">🏆 Winner</span>}
                      </div>
                    </td>
                    <td>{formatNumber(variant.participants)}</td>
                    <td>{formatNumber(variant.conversions)}</td>
                    <td>
                      <div className="rate-cell">
                        <span className="rate-value">{formatPercentage(variant.rate * 100)}</span>
                        {stats && (
                          <div className="confidence-interval">
                            {formatPercentage(stats.treatmentCI.lower * 100, 1)} - {formatPercentage(stats.treatmentCI.upper * 100, 1)}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {stats && (
                        <div className={`improvement ${stats.relativeImprovement > 0 ? 'positive' : 'negative'}`}>
                          {stats.relativeImprovement > 0 ? '+' : ''}
                          {formatPercentage(stats.relativeImprovement, 1)}
                        </div>
                      )}
                    </td>
                    <td>
                      {stats && (
                        <div className={`confidence-cell ${stats.isSignificant ? 'significant' : ''}`}>
                          {formatPercentage(stats.confidenceLevel * 100, 1)}
                          {stats.isSignificant && <span className="significant-badge">✓</span>}
                        </div>
                      )}
                    </td>
                    {testInfo.status === 'running' && (
                      <td>
                        <input
                          type="radio"
                          name="winner"
                          checked={selectedWinner === variant.id}
                          onChange={() => setSelectedWinner(variant.id)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistical Details */}
      {statistics.length > 0 && (
        <div className="statistical-details">
          <h3>Statistical Analysis</h3>
          <div className="stats-grid">
            {statistics.map((stat) => (
              <div key={stat.variantId} className="stat-card-detailed">
                <h4>{stat.variantName} vs Control</h4>
                <div className="stat-row">
                  <span className="stat-label">Z-Score:</span>
                  <span className="stat-value">{stat.zScore?.toFixed(3) || 'N/A'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">P-Value:</span>
                  <span className="stat-value">{stat.pValue?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Confidence:</span>
                  <span className={`stat-value ${stat.isSignificant ? 'significant' : ''}`}>
                    {(stat.confidenceLevel * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Absolute Difference:</span>
                  <span className={`stat-value ${stat.absoluteDifference > 0 ? 'positive' : 'negative'}`}>
                    {(stat.absoluteDifference * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Relative Improvement:</span>
                  <span className={`stat-value ${stat.relativeImprovement > 0 ? 'positive' : 'negative'}`}>
                    {stat.relativeImprovement > 0 ? '+' : ''}
                    {stat.relativeImprovement?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trends Chart */}
      {dailyStats.length > 0 && (
        <div className="daily-trends">
          <h3>Daily Performance Trends</h3>
          <div className="trends-chart">
            {/* Simple bar chart visualization */}
            <div className="chart-container">
              {dailyStats.slice(-14).map((day, index) => (
                <div key={index} className="chart-bar-group">
                  <div className="chart-label">{new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                  <div className="chart-bars">
                    <div 
                      className="chart-bar participants"
                      style={{ height: `${Math.min(100, (day.participantsNew / Math.max(...dailyStats.map(d => d.participantsNew))) * 100)}%` }}
                      title={`${day.participantsNew} participants`}
                    />
                    <div 
                      className="chart-bar conversions"
                      style={{ height: `${Math.min(100, (day.conversionsNew / Math.max(...dailyStats.map(d => d.conversionsNew || 1))) * 100)}%` }}
                      title={`${day.conversionsNew} conversions`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color participants"></div>
                <span>Participants</span>
              </div>
              <div className="legend-item">
                <div className="legend-color conversions"></div>
                <span>Conversions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      {testInfo.status === 'running' && (
        <div className="results-footer">
          <div className="footer-content">
            <div className="footer-info">
              <h4>Ready to declare a winner?</h4>
              <p>Select a variant above and click "Declare Winner" to stop the test and implement the winning variation.</p>
            </div>
            <div className="footer-actions">
              <button
                className="btn btn-secondary"
                onClick={handleStopWithoutWinner}
              >
                Stop Without Winner
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleDeclareWinner}
                disabled={!selectedWinner}
              >
                Declare Winner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Stop Modal */}
      {showConfirmStop && (
        <div className="modal-overlay" onClick={() => setShowConfirmStop(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Stop A/B Test?</h3>
            <p>Are you sure you want to stop this test?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmStop(false)}>
                Continue Testing
              </button>
              <button className="btn btn-danger" onClick={handleStopWithoutWinner}>
                Stop Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
