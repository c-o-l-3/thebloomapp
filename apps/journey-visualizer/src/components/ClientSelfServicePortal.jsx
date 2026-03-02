/**
 * ClientSelfServicePortal Component
 * Main portal interface for client users to manage their journeys
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  FileEdit, 
  BarChart3, 
  Settings, 
  Image,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { getClientPortalApi } from '../services/clientPortalApi.js';
import { JourneyViewer } from './JourneyViewer.jsx';
import { ChangeRequestForm } from './ChangeRequestForm.jsx';
import { ClientAnalyticsDashboard } from './ClientAnalyticsDashboard.jsx';
import { BrandVoiceSettings } from './BrandVoiceSettings.jsx';
import { AssetManager } from './AssetManager.jsx';
import './ClientSelfServicePortal.css';

const portalApi = getClientPortalApi();

const TABS = {
  DASHBOARD: 'dashboard',
  JOURNEYS: 'journeys',
  CHANGE_REQUESTS: 'change-requests',
  ANALYTICS: 'analytics',
  BRAND_VOICE: 'brand-voice',
  ASSETS: 'assets'
};

/**
 * ClientSelfServicePortal - Main client portal interface
 */
export function ClientSelfServicePortal() {
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [clientInfo, setClientInfo] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [stats, setStats] = useState({
    totalJourneys: 0,
    activeJourneys: 0,
    pendingRequests: 0,
    approvedRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const currentUser = portalApi.getStoredUser();
      if (!currentUser) {
        window.location.href = '/portal/login';
        return;
      }
      setUser(currentUser);

      // Load client info, journeys, and change requests in parallel
      const [clientData, journeysData, requestsData] = await Promise.all([
        portalApi.getClientInfo(),
        portalApi.getJourneys(),
        portalApi.getChangeRequests()
      ]);

      setClientInfo(clientData);
      setJourneys(journeysData);
      setChangeRequests(requestsData);

      // Calculate stats
      setStats({
        totalJourneys: journeysData.length,
        activeJourneys: journeysData.filter(j => j.status === 'published').length,
        pendingRequests: requestsData.filter(r => r.status === 'pending_review' || r.status === 'in_review').length,
        approvedRequests: requestsData.filter(r => r.status === 'approved').length
      });
    } catch (err) {
      console.error('Error loading portal data:', err);
      setError('Failed to load portal data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await portalApi.logout();
    window.location.href = '/portal/login';
  };

  const handleJourneySelect = (journey) => {
    setSelectedJourney(journey);
    setActiveTab(TABS.JOURNEYS);
  };

  const handleCreateChangeRequest = (journey = null) => {
    setSelectedJourney(journey);
    setShowChangeRequestForm(true);
  };

  const handleChangeRequestSubmit = async (data) => {
    try {
      await portalApi.createChangeRequest(data);
      setShowChangeRequestForm(false);
      // Refresh change requests
      const requestsData = await portalApi.getChangeRequests();
      setChangeRequests(requestsData);
      setStats(prev => ({
        ...prev,
        pendingRequests: requestsData.filter(r => r.status === 'pending_review' || r.status === 'in_review').length
      }));
    } catch (err) {
      console.error('Error creating change request:', err);
      throw err;
    }
  };

  const renderDashboard = () => (
    <div className="portal-dashboard">
      <div className="portal-dashboard__header">
        <h1>Welcome back, {user?.name}</h1>
        <p className="portal-dashboard__subtitle">
          Here's what's happening with your journeys
        </p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-card__icon portal-stat-card__icon--blue">
            <Map size={24} />
          </div>
          <div className="portal-stat-card__content">
            <span className="portal-stat-card__value">{stats.totalJourneys}</span>
            <span className="portal-stat-card__label">Total Journeys</span>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-card__icon portal-stat-card__icon--green">
            <CheckCircle size={24} />
          </div>
          <div className="portal-stat-card__content">
            <span className="portal-stat-card__value">{stats.activeJourneys}</span>
            <span className="portal-stat-card__label">Active Journeys</span>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-card__icon portal-stat-card__icon--orange">
            <Clock size={24} />
          </div>
          <div className="portal-stat-card__content">
            <span className="portal-stat-card__value">{stats.pendingRequests}</span>
            <span className="portal-stat-card__label">Pending Requests</span>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-card__icon portal-stat-card__icon--purple">
            <CheckCircle size={24} />
          </div>
          <div className="portal-stat-card__content">
            <span className="portal-stat-card__value">{stats.approvedRequests}</span>
            <span className="portal-stat-card__label">Approved Changes</span>
          </div>
        </div>
      </div>

      <div className="portal-dashboard__grid">
        <div className="portal-dashboard__section">
          <div className="portal-section-header">
            <h2>Recent Journeys</h2>
            <button 
              className="portal-link-btn"
              onClick={() => setActiveTab(TABS.JOURNEYS)}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="portal-journeys-list">
            {journeys.slice(0, 5).map(journey => (
              <div 
                key={journey.id} 
                className="portal-journey-item"
                onClick={() => handleJourneySelect(journey)}
              >
                <div className="portal-journey-item__info">
                  <h3>{journey.name}</h3>
                  <span className={`portal-status-badge portal-status-badge--${journey.status}`}>
                    {journey.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="portal-journey-item__meta">
                  <span>{journey.touchpointCount} touchpoints</span>
                  <span>Updated {format(new Date(journey.updatedAt), 'MMM d')}</span>
                </div>
              </div>
            ))}
            {journeys.length === 0 && (
              <p className="portal-empty-state">No journeys found</p>
            )}
          </div>
        </div>

        <div className="portal-dashboard__section">
          <div className="portal-section-header">
            <h2>Recent Change Requests</h2>
            <button 
              className="portal-link-btn"
              onClick={() => setActiveTab(TABS.CHANGE_REQUESTS)}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="portal-requests-list">
            {changeRequests.slice(0, 5).map(request => (
              <div key={request.id} className="portal-request-item">
                <div className="portal-request-item__header">
                  <h3>{request.title}</h3>
                  <span className={`portal-status-badge portal-status-badge--${request.status}`}>
                    {request.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="portal-request-item__description">
                  {request.description.substring(0, 100)}...
                </p>
                <div className="portal-request-item__meta">
                  <span>{format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
                  {request.journey && (
                    <span>• {request.journey.name}</span>
                  )}
                </div>
              </div>
            ))}
            {changeRequests.length === 0 && (
              <p className="portal-empty-state">No change requests yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="portal-quick-actions">
        <h3>Quick Actions</h3>
        <div className="portal-quick-actions__grid">
          <button 
            className="portal-quick-action"
            onClick={() => handleCreateChangeRequest()}
          >
            <FileEdit size={24} />
            <span>Request Change</span>
          </button>
          <button 
            className="portal-quick-action"
            onClick={() => setActiveTab(TABS.ANALYTICS)}
          >
            <BarChart3 size={24} />
            <span>View Analytics</span>
          </button>
          <button 
            className="portal-quick-action"
            onClick={() => setActiveTab(TABS.BRAND_VOICE)}
          >
            <Settings size={24} />
            <span>Brand Settings</span>
          </button>
          <button 
            className="portal-quick-action"
            onClick={() => setActiveTab(TABS.ASSETS)}
          >
            <Image size={24} />
            <span>Upload Assets</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case TABS.DASHBOARD:
        return renderDashboard();
      case TABS.JOURNEYS:
        return (
          <JourneyViewer 
            journeys={journeys}
            selectedJourney={selectedJourney}
            onSelectJourney={setSelectedJourney}
            onCreateChangeRequest={handleCreateChangeRequest}
          />
        );
      case TABS.CHANGE_REQUESTS:
        return (
          <div className="portal-content-section">
            <div className="portal-section-header">
              <h2>Change Requests</h2>
              <button 
                className="portal-btn portal-btn--primary"
                onClick={() => handleCreateChangeRequest()}
              >
                <FileEdit size={18} />
                New Request
              </button>
            </div>
            <div className="portal-requests-list">
              {changeRequests.map(request => (
                <div key={request.id} className="portal-request-card">
                  <div className="portal-request-card__header">
                    <h3>{request.title}</h3>
                    <span className={`portal-status-badge portal-status-badge--${request.status}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="portal-request-card__description">{request.description}</p>
                  <div className="portal-request-card__meta">
                    <span>Type: {request.type.replace('_', ' ')}</span>
                    <span>Priority: {request.priority}</span>
                    <span>Created: {format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  {request.journey && (
                    <div className="portal-request-card__journey">
                      Journey: {request.journey.name}
                    </div>
                  )}
                </div>
              ))}
              {changeRequests.length === 0 && (
                <div className="portal-empty-state">
                  <FileEdit size={48} />
                  <p>No change requests yet</p>
                  <button 
                    className="portal-btn portal-btn--primary"
                    onClick={() => handleCreateChangeRequest()}
                  >
                    Create your first request
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case TABS.ANALYTICS:
        return <ClientAnalyticsDashboard />;
      case TABS.BRAND_VOICE:
        return <BrandVoiceSettings />;
      case TABS.ASSETS:
        return <AssetManager />;
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <div className="client-self-service-portal client-self-service-portal--loading">
        <div className="portal-loading">
          <div className="portal-loading__spinner" />
          <p>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-self-service-portal client-self-service-portal--error">
        <div className="portal-error">
          <AlertCircle size={48} />
          <p>{error}</p>
          <button className="portal-btn portal-btn--primary" onClick={loadInitialData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-self-service-portal">
      {/* Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'portal-sidebar--open' : 'portal-sidebar--closed'}`}>
        <div className="portal-sidebar__header">
          <div className="portal-logo">
            <LayoutDashboard size={28} />
            <span>Client Portal</span>
          </div>
          <button 
            className="portal-sidebar__toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="portal-sidebar__nav">
          <button
            className={`portal-nav-item ${activeTab === TABS.DASHBOARD ? 'portal-nav-item--active' : ''}`}
            onClick={() => setActiveTab(TABS.DASHBOARD)}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`portal-nav-item ${activeTab === TABS.JOURNEYS ? 'portal-nav-item--active' : ''}`}
            onClick={() => setActiveTab(TABS.JOURNEYS)}
          >
            <Map size={20} />
            <span>Journeys</span>
          </button>
          <button
            className={`portal-nav-item ${activeTab === TABS.CHANGE_REQUESTS ? 'portal-nav-item--active' : ''}`}
            onClick={() => setActiveTab(TABS.CHANGE_REQUESTS)}
          >
            <FileEdit size={20} />
            <span>Change Requests</span>
            {stats.pendingRequests > 0 && (
              <span className="portal-nav-badge">{stats.pendingRequests}</span>
            )}
          </button>
          <button
            className={`portal-nav-item ${activeTab === TABS.ANALYTICS ? 'portal-nav-item--active' : ''}`}
            onClick={() => setActiveTab(TABS.ANALYTICS)}
          >
            <BarChart3 size={20} />
            <span>Analytics</span>
          </button>
          <button
            className={`portal-nav-item ${activeTab === TABS.BRAND_VOICE ? 'portal-nav-item--active' : ''}`}
            onClick={() => setActiveTab(TABS.BRAND_VOICE)}
          >
            <Settings size={20} />
            <span>Brand Voice</span>
          </button>
          <button
            className={`portal-nav-item ${activeTab === TABS.ASSETS ? 'portal-nav-item--active' : ''}`}
            onClick={() => setActiveTab(TABS.ASSETS)}
          >
            <Image size={20} />
            <span>Assets</span>
          </button>
        </nav>

        <div className="portal-sidebar__footer">
          <div className="portal-user-info">
            <div className="portal-user-info__avatar">
              <User size={20} />
            </div>
            <div className="portal-user-info__details">
              <span className="portal-user-info__name">{user?.name}</span>
              <span className="portal-user-info__client">{clientInfo?.name}</span>
            </div>
          </div>
          <button className="portal-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="portal-main">
        <header className="portal-header">
          <button 
            className="portal-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <div className="portal-header__actions">
            <button className="portal-header__btn">
              <Bell size={20} />
              {stats.pendingRequests > 0 && (
                <span className="portal-header__badge">{stats.pendingRequests}</span>
              )}
            </button>
          </div>
        </header>

        <div className="portal-content">
          {renderContent()}
        </div>
      </main>

      {/* Change Request Form Modal */}
      {showChangeRequestForm && (
        <ChangeRequestForm
          journey={selectedJourney}
          journeys={journeys}
          onSubmit={handleChangeRequestSubmit}
          onClose={() => {
            setShowChangeRequestForm(false);
            setSelectedJourney(null);
          }}
        />
      )}
    </div>
  );
}

export default ClientSelfServicePortal;