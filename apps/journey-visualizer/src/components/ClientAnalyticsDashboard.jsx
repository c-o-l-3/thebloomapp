/**
 * ClientAnalyticsDashboard Component
 * Client-specific analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Mail,
  MousePointer,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { getClientPortalApi } from '../services/clientPortalApi.js';
import './ClientAnalyticsDashboard.css';

const portalApi = getClientPortalApi();

const TIME_RANGES = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 }
];

/**
 * ClientAnalyticsDashboard - Analytics view for client portal
 */
export function ClientAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const analyticsData = await portalApi.getAnalyticsDashboard(timeRange);
      setData(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="client-analytics">
        <div className="client-analytics__loading">
          <Loader2 size={32} className="client-analytics__spinner" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-analytics">
        <div className="client-analytics__error">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button 
            className="portal-btn portal-btn--primary"
            onClick={loadAnalytics}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="client-analytics">
      <div className="client-analytics__header">
        <div>
          <h2>Analytics Dashboard</h2>
          <p>Track your journey performance and engagement</p>
        </div>
        <div className="client-analytics__time-range">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              className={`ca-time-btn ${timeRange === range.value ? 'ca-time-btn--active' : ''}`}
              onClick={() => setTimeRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="ca-stats-grid">
        <div className="ca-stat-card">
          <div className="ca-stat-card__icon ca-stat-card__icon--blue">
            <Users size={24} />
          </div>
          <div className="ca-stat-card__content">
            <span className="ca-stat-card__value">{formatNumber(summary.totalJourneyRuns || 0)}</span>
            <span className="ca-stat-card__label">Total Journey Runs</span>
          </div>
        </div>

        <div className="ca-stat-card">
          <div className="ca-stat-card__icon ca-stat-card__icon--green">
            <TrendingUp size={24} />
          </div>
          <div className="ca-stat-card__content">
            <span className="ca-stat-card__value">{(summary.conversionRate || 0).toFixed(1)}%</span>
            <span className="ca-stat-card__label">Conversion Rate</span>
          </div>
        </div>

        <div className="ca-stat-card">
          <div className="ca-stat-card__icon ca-stat-card__icon--purple">
            <Mail size={24} />
          </div>
          <div className="ca-stat-card__content">
            <span className="ca-stat-card__value">{formatNumber(summary.totalTouchpointsSent || 0)}</span>
            <span className="ca-stat-card__label">Touchpoints Sent</span>
          </div>
        </div>

        <div className="ca-stat-card">
          <div className="ca-stat-card__icon ca-stat-card__icon--orange">
            <MousePointer size={24} />
          </div>
          <div className="ca-stat-card__content">
            <span className="ca-stat-card__value">{(summary.clickRate || 0).toFixed(1)}%</span>
            <span className="ca-stat-card__label">Click Rate</span>
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="ca-section">
        <h3>Engagement Overview</h3>
        <div className="ca-engagement-grid">
          <div className="ca-engagement-item">
            <div className="ca-engagement-item__bar">
              <div 
                className="ca-engagement-item__fill ca-engagement-item__fill--blue"
                style={{ width: `${Math.min(summary.openRate || 0, 100)}%` }}
              />
            </div>
            <div className="ca-engagement-item__info">
              <span className="ca-engagement-item__label">Open Rate</span>
              <span className="ca-engagement-item__value">{(summary.openRate || 0).toFixed(1)}%</span>
            </div>
          </div>

          <div className="ca-engagement-item">
            <div className="ca-engagement-item__bar">
              <div 
                className="ca-engagement-item__fill ca-engagement-item__fill--green"
                style={{ width: `${Math.min(summary.clickRate || 0, 100)}%` }}
              />
            </div>
            <div className="ca-engagement-item__info">
              <span className="ca-engagement-item__label">Click Rate</span>
              <span className="ca-engagement-item__value">{(summary.clickRate || 0).toFixed(1)}%</span>
            </div>
          </div>

          <div className="ca-engagement-item">
            <div className="ca-engagement-item__bar">
              <div 
                className="ca-engagement-item__fill ca-engagement-item__fill--purple"
                style={{ width: `${Math.min(summary.conversionRate || 0, 100)}%` }}
              />
            </div>
            <div className="ca-engagement-item__info">
              <span className="ca-engagement-item__label">Conversion Rate</span>
              <span className="ca-engagement-item__value">{(summary.conversionRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Journeys */}
      {data?.topJourneys && data.topJourneys.length > 0 && (
        <div className="ca-section">
          <h3>Top Performing Journeys</h3>
          <div className="ca-journeys-list">
            {data.topJourneys.map((journey, index) => (
              <div key={journey.journeyId} className="ca-journey-item">
                <div className="ca-journey-item__rank">{index + 1}</div>
                <div className="ca-journey-item__info">
                  <h4>{journey.journeyName}</h4>
                  <span className="ca-journey-item__category">{journey.category}</span>
                </div>
                <div className="ca-journey-item__stats">
                  <div className="ca-journey-item__stat">
                    <span className="ca-journey-item__stat-value">{journey.conversions}</span>
                    <span className="ca-journey-item__stat-label">Conversions</span>
                  </div>
                  <div className="ca-journey-item__stat">
                    <span className="ca-journey-item__stat-value">
                      {parseFloat(journey.conversionRate).toFixed(1)}%
                    </span>
                    <span className="ca-journey-item__stat-label">Rate</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trends */}
      {data?.dailyBreakdown && data.dailyBreakdown.length > 0 && (
        <div className="ca-section">
          <h3>Daily Trends</h3>
          <div className="ca-trends-table">
            <div className="ca-trends-header">
              <span>Date</span>
              <span>Journey Runs</span>
              <span>Conversions</span>
              <span>Conversion Rate</span>
            </div>
            {data.dailyBreakdown.slice(-7).reverse().map(day => (
              <div key={day.date} className="ca-trends-row">
                <span>{format(new Date(day.date), 'MMM d')}</span>
                <span>{formatNumber(day.journeyRuns)}</span>
                <span>{day.conversions}</span>
                <span>{day.conversionRate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Range */}
      {data?.dateRange && (
        <div className="ca-date-range">
          <Calendar size={16} />
          <span>
            {format(new Date(data.dateRange.startDate), 'MMM d, yyyy')} - {' '}
            {format(new Date(data.dateRange.endDate), 'MMM d, yyyy')}
          </span>
        </div>
      )}
    </div>
  );
}

export default ClientAnalyticsDashboard;