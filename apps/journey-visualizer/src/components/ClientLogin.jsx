/**
 * ClientLogin Component
 * Login page for client portal users
 */

import React, { useState } from 'react';
import { Mail, Lock, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { getClientPortalApi } from '../services/clientPortalApi.js';
import './ClientLogin.css';

const portalApi = getClientPortalApi();

/**
 * ClientLogin - Login page for client self-service portal
 */
export function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientSlug, setClientSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await portalApi.login(email, password, clientSlug);
      // Redirect to portal dashboard on success
      window.location.href = '/portal';
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-login">
      <div className="client-login__container">
        <div className="client-login__header">
          <div className="client-login__logo">
            <Building2 size={40} />
            <span>Client Portal</span>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to access your journey management portal</p>
        </div>

        <form className="client-login__form" onSubmit={handleSubmit}>
          {error && (
            <div className="client-login__error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="client-login__field">
            <label htmlFor="clientSlug">
              <Building2 size={18} />
              Organization
            </label>
            <input
              type="text"
              id="clientSlug"
              value={clientSlug}
              onChange={(e) => setClientSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="your-organization"
              required
              disabled={loading}
            />
            <span className="client-login__hint">
              Your organization's unique identifier
            </span>
          </div>

          <div className="client-login__field">
            <label htmlFor="email">
              <Mail size={18} />
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={loading}
            />
          </div>

          <div className="client-login__field">
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <span className="client-login__hint">
              For demo: use your email as password
            </span>
          </div>

          <button
            type="submit"
            className="client-login__submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="client-login__spinner" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="client-login__footer">
          <p>Need help accessing your account?</p>
          <a href="mailto:support@bloombuilder.com">Contact Support</a>
        </div>
      </div>

      <div className="client-login__branding">
        <div className="client-login__branding-content">
          <h2>BloomBuilder</h2>
          <p>Client Self-Service Portal</p>
          <ul>
            <li>View and manage your customer journeys</li>
            <li>Request changes with approval workflow</li>
            <li>Access real-time analytics and reports</li>
            <li>Manage your brand voice settings</li>
            <li>Upload and organize assets</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ClientLogin;