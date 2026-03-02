/**
 * Main App Component - Performance Optimized
 * Journey Builder Stack - Visualizer Layer with Writer Experience
 * 
 * Performance Optimizations Implemented:
 * - React.lazy() for code splitting on all routes
 * - Suspense boundaries with loading fallbacks
 * - Preload hints for critical components
 * - Dynamic imports for heavy components
 */

import React, { useState, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ClientSelector } from './components/ClientSelector';
import { StatusBadge } from './components/StatusBadge';
import { JOURNEY_STATUS } from './types';
import { useJourneys } from './hooks/useJourneys';
import { useApprovals } from './hooks/useApprovals';
import { isLocalMode } from './services/localJourneys';
import { Mail, LayoutDashboard, GitBranch, Building2, BarChart3, Webhook } from 'lucide-react';
import './App.css';

// Lazy load heavy components for code splitting
const JourneyFlow = lazy(() => import('./components/JourneyFlow'));
const MultiClientDashboard = lazy(() => import('./components/MultiClientDashboard'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const ApprovalPanel = lazy(() => import('./components/ApprovalPanel'));
const TouchpointList = lazy(() => import('./components/TouchpointList'));
const TouchpointPrintView = lazy(() => import('./components/TouchpointPrintView'));
const JourneyPrintView = lazy(() => import('./components/JourneyPrintView'));
const HTMLEditor = lazy(() => import('./components/HTMLEditor'));
const VisualEmailEditor = lazy(() => import('./components/VisualEmailEditor'));
const StandaloneEmailEditor = lazy(() => import('./components/StandaloneEmailEditor'));
const ClientSelfServicePortal = lazy(() => import('./components/ClientSelfServicePortal'));
const ClientLogin = lazy(() => import('./components/ClientLogin'));
const WebhookManager = lazy(() => import('./components/WebhookManager'));

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'airtable';
const DEFAULT_CLIENT_SLUG = import.meta.env.VITE_CLIENT_SLUG || 'promise-farm';

// Set default client based on mode
const getDefaultClient = () => {
  if (DATA_SOURCE === 'local') {
    return DEFAULT_CLIENT_SLUG;
  }
  return 'maison-albion';
};

// Loading fallback component
const PageLoader = () => (
  <div className="app__loading-container">
    <div className="app__loading-spinner"></div>
    <p>Loading...</p>
  </div>
);

/**
 * Navigation Component
 */
function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="app__nav">
      <Link
        to="/dashboard"
        className={`app__nav-link ${isActive('/dashboard') ? 'app__nav-link--active' : ''}`}
      >
        <Building2 size={18} />
        <span>Dashboard</span>
      </Link>
      <Link
        to="/"
        className={`app__nav-link ${isActive('/') && !isActive('/touchpoints') && !isActive('/analytics') ? 'app__nav-link--active' : ''}`}
      >
        <GitBranch size={18} />
        <span>Journeys</span>
      </Link>
      <Link
        to="/touchpoints"
        className={`app__nav-link ${isActive('/touchpoints') ? 'app__nav-link--active' : ''}`}
      >
        <Mail size={18} />
        <span>Touchpoints</span>
      </Link>
      <Link
        to="/analytics"
        className={`app__nav-link ${isActive('/analytics') ? 'app__nav-link--active' : ''}`}
      >
        <BarChart3 size={18} />
        <span>Analytics</span>
      </Link>
      <Link
        to="/webhooks"
        className={`app__nav-link ${isActive('/webhooks') ? 'app__nav-link--active' : ''}`}
      >
        <Webhook size={18} />
        <span>Webhooks</span>
      </Link>
    </nav>
  );
}

/**
 * Main Journey Builder View
 */
function JourneyBuilder() {
  const [selectedClientId, setSelectedClientId] = useState(getDefaultClient());
  const [selectedJourneyId, setSelectedJourneyId] = useState('journey-1');
  const [showApprovalPanel, setShowApprovalPanel] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize hooks (will use mock data if no API key provided)
  const { journeys, loading: journeysLoading, updateJourney } = useJourneys(null, selectedClientId);
  const { approvals, requestApproval, approveJourney, rejectJourney } = useApprovals(null);

  // Get selected journey
  const selectedJourney = useMemo(() => 
    journeys.find(j => j.id === selectedJourneyId),
    [journeys, selectedJourneyId]
  );

  // Get approval history for selected journey
  const journeyApprovals = useMemo(() => 
    approvals.filter(a => a.journeyId === selectedJourneyId),
    [approvals, selectedJourneyId]
  );

  // Get journeys for selected client
  const clientJourneys = useMemo(() => 
    journeys.filter(j => j.clientId === selectedClientId),
    [journeys, selectedClientId]
  );

  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId);
    // Select first journey for the client
    const firstJourney = journeys.find(j => j.clientId === clientId);
    if (firstJourney) {
      setSelectedJourneyId(firstJourney.id);
    }
  };

  const handleApprove = async (journeyId, comment) => {
    await approveJourney(journeyId, journeyApprovals[0]?.id || 'mock-approval', comment);
    await updateJourney(journeyId, { status: JOURNEY_STATUS.APPROVED });
  };

  const handleReject = async (journeyId, comment) => {
    await rejectJourney(journeyId, journeyApprovals[0]?.id || 'mock-approval', comment);
    await updateJourney(journeyId, { status: JOURNEY_STATUS.REJECTED });
  };

  const handleRequestApproval = async (journeyId) => {
    await requestApproval(journeyId, 1);
    await updateJourney(journeyId, { status: JOURNEY_STATUS.CLIENT_REVIEW });
  };

  const handleDeploy = async (journeyId) => {
    await updateJourney(journeyId, { 
      status: JOURNEY_STATUS.PUBLISHED,
      publishedAt: new Date().toISOString()
    });
    alert('Journey deployed successfully!');
  };

  const handleUpdateJourney = (updatedJourney) => {
    updateJourney(updatedJourney.id, updatedJourney);
  };

  const handleEditModeChange = (editMode) => {
    setIsEditMode(editMode);
  };

  return (
    <div className="app__container">
      {/* Header */}
      <header className="app__header">
        <div className="app__header-left">
          <div className="app__logo">
            <span className="app__logo-icon">🌸</span>
            <h1 className="app__title">Journey Builder</h1>
            {isEditMode && (
              <span className="app__edit-indicator">Editing</span>
            )}
          </div>
          <Navigation />
        </div>
        <div className="app__header-right">
          <ClientSelector
            onClientChange={handleClientChange}
            selectedClientId={selectedClientId}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="app__main">
        {/* Sidebar - Journey List */}
        <aside className="app__sidebar">
          <div className="app__sidebar-header">
            <h2 className="app__sidebar-title">Journeys</h2>
            <span className="app__sidebar-count">{clientJourneys.length}</span>
          </div>
          <ul className="app__journey-list">
            {journeysLoading ? (
              <li className="app__loading">Loading journeys...</li>
            ) : (
              clientJourneys.map((journey) => (
                <li
                  key={journey.id}
                  className={`app__journey-item ${journey.id === selectedJourneyId ? 'app__journey-item--selected' : ''}`}
                  onClick={() => setSelectedJourneyId(journey.id)}
                >
                  <div className="app__journey-info">
                    <h3 className="app__journey-name">{journey.name}</h3>
                    <p className="app__journey-description">{journey.description}</p>
                  </div>
                  <StatusBadge status={journey.status} size="small" />
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Main Canvas Area */}
        <section className="app__canvas">
          {selectedJourney && (
            <>
              <div className="app__canvas-header">
                <div className="app__canvas-info">
                  <h2 className="app__canvas-title">{selectedJourney.name}</h2>
                  <p className="app__canvas-meta">
                    Version {selectedJourney.version} • Last updated {new Date(selectedJourney.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="app__canvas-actions">
                  <button
                    className="app__toggle-panel"
                    onClick={() => setShowApprovalPanel(!showApprovalPanel)}
                  >
                    {showApprovalPanel ? 'Hide' : 'Show'} Approval Panel
                  </button>
                </div>
              </div>
              <div className={`app__flow-wrapper ${showApprovalPanel ? 'app__flow-wrapper--with-panel' : ''}`}>
                <Suspense fallback={<PageLoader />}>
                  <JourneyFlow 
                    journey={selectedJourney} 
                    clientSlug={selectedClientId}
                    onUpdateJourney={handleUpdateJourney}
                  />
                </Suspense>
              </div>
            </>
          )}
        </section>

        {/* Approval Panel Sidebar */}
        {showApprovalPanel && selectedJourney && (
          <aside className="app__approval-sidebar">
            <Suspense fallback={<PageLoader />}>
              <ApprovalPanel
                journey={selectedJourney}
                approvalHistory={journeyApprovals}
                touchpoints={selectedJourney.touchpoints || []}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestApproval={handleRequestApproval}
                onDeploy={handleDeploy}
                onEditModeChange={handleEditModeChange}
              />
            </Suspense>
          </aside>
        )}
      </main>

      {/* Footer */}
      <footer className="app__footer">
        <p>
          Journey Builder Stack • Writer Experience • Connected to Knowledge Hub
          {DATA_SOURCE === 'local' && (
            <span className="app__mode-indicator"> • 📁 Local Mode</span>
          )}
        </p>
      </footer>
    </div>
  );
}

/**
 * Login Page
 */
function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check if already logged in
  React.useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { getApiClient } = await import('./services/apiClient');
      const apiClient = getApiClient();
      await apiClient.login(email, name || email.split('@')[0]);
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app__login">
      <div className="app__login-card">
        <div className="app__login-logo">
          <span>🌸</span>
          <h1>Journey Builder</h1>
        </div>
        <p className="app__login-subtitle">Sign in to manage your journeys and touchpoints</p>
        
        {error && (
          <div className="app__login-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="app__login-form">
          <div className="app__login-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="app__login-field">
            <label htmlFor="name">Name (optional)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
            />
          </div>
          
          <button 
            type="submit" 
            className="app__login-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Webhook Manager Page Wrapper
 */
function WebhookManagerPage() {
  const [selectedClientId, setSelectedClientId] = useState(getDefaultClient());
  const [clientName, setClientName] = useState('');

  // Fetch client name when client changes
  React.useEffect(() => {
    const fetchClientName = async () => {
      try {
        const { getApiClient } = await import('./services/apiClient');
        const apiClient = getApiClient();
        const client = await apiClient.getClient(selectedClientId);
        setClientName(client.name);
      } catch (err) {
        console.error('Failed to fetch client name:', err);
        setClientName(selectedClientId);
      }
    };
    fetchClientName();
  }, [selectedClientId]);

  return (
    <div className="app__container">
      <header className="app__header">
        <div className="app__header-left">
          <div className="app__logo">
            <span className="app__logo-icon">🌸</span>
            <h1 className="app__title">Journey Builder</h1>
          </div>
          <Navigation />
        </div>
        <div className="app__header-right">
          <ClientSelector
            onClientChange={setSelectedClientId}
            selectedClientId={selectedClientId}
          />
        </div>
      </header>
      <main className="app__main app__main--fullwidth">
        <Suspense fallback={<PageLoader />}>
          <WebhookManager clientId={selectedClientId} clientName={clientName} />
        </Suspense>
      </main>
    </div>
  );
}

/**
 * Main App with Routing - Performance Optimized with Lazy Loading
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <Suspense fallback={<PageLoader />}>
            <MultiClientDashboard />
          </Suspense>
        } />
        <Route path="/analytics" element={
          <Suspense fallback={<PageLoader />}>
            <AnalyticsDashboard />
          </Suspense>
        } />
        <Route path="/webhooks" element={<WebhookManagerPage />} />
        <Route path="/" element={<JourneyBuilder />} />
        <Route path="/touchpoints" element={
          <Suspense fallback={<PageLoader />}>
            <TouchpointList />
          </Suspense>
        } />
        <Route path="/touchpoints/:id/print" element={
          <Suspense fallback={<PageLoader />}>
            <TouchpointPrintView />
          </Suspense>
        } />
        <Route path="/journeys/:id/print" element={
          <Suspense fallback={<PageLoader />}>
            <JourneyPrintView />
          </Suspense>
        } />
        <Route path="/touchpoints/:id/edit" element={
          <Suspense fallback={<PageLoader />}>
            <HTMLEditor />
          </Suspense>
        } />
        <Route path="/touchpoints/:id/visual-edit" element={
          <Suspense fallback={<PageLoader />}>
            <VisualEmailEditor />
          </Suspense>
        } />
        <Route path="/email-editor" element={
          <Suspense fallback={<PageLoader />}>
            <StandaloneEmailEditor />
          </Suspense>
        } />
        {/* Client Self-Service Portal Routes */}
        <Route path="/portal/login" element={
          <Suspense fallback={<PageLoader />}>
            <ClientLogin />
          </Suspense>
        } />
        <Route path="/portal/*" element={
          <Suspense fallback={<PageLoader />}>
            <ClientSelfServicePortal />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
