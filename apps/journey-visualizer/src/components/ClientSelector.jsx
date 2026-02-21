/**
 * ClientSelector Component
 * Dropdown for selecting which client's journeys to view
 * Supports both local file mode and Airtable mode
 */

import React, { useState, useEffect } from 'react';
import { isLocalMode, getLocalClients } from '../services/localJourneys';
import './ClientSelector.css';

// Default mock clients (fallback)
const mockClients = [
  { id: 'maison-albion', name: 'Maison Albion', pipelines: 4, workflows: 48 },
  { id: 'cameron-estate', name: 'Cameron Estate', pipelines: 3, workflows: 32 },
  { id: 'maravilla-gardens', name: 'Maravilla Gardens', pipelines: 3, workflows: 36 },
  { id: 'maui-pineapple-chapel', name: 'Maui Pineapple Chapel', pipelines: 2, workflows: 24 }
];

/**
 * ClientSelector component
 * @param {Function} onClientChange - Callback when client selection changes
 * @param {string} selectedClientId - Currently selected client ID
 */
export function ClientSelector({ onClientChange, selectedClientId, clients: propClients }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localClients, setLocalClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const usingLocalMode = isLocalMode();

  // Load clients based on mode
  useEffect(() => {
    async function loadClients() {
      if (usingLocalMode) {
        try {
          setLoading(true);
          const clients = await getLocalClients();
          setLocalClients(clients);
        } catch (error) {
          console.error('Error loading local clients:', error);
          setLocalClients(mockClients);
        } finally {
          setLoading(false);
        }
      } else {
        // Airtable mode - use provided clients or mock
        setLocalClients(propClients || mockClients);
        setLoading(false);
      }
    }

    loadClients();
  }, [usingLocalMode, propClients]);

  // Use prop clients if provided (Airtable mode), otherwise use local clients
  const clients = propClients || localClients || mockClients;

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (clientId) => {
    onClientChange(clientId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClickOutside = (event) => {
    if (!event.target.closest('.client-selector')) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="client-selector">
      <button
        className="client-selector__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={loading}
      >
        <span className="client-selector__icon">🏢</span>
        <span className="client-selector__name">
          {selectedClient?.name || (loading ? 'Loading...' : 'Select Client')}
        </span>
        {usingLocalMode && (
          <span className="client-selector__mode-badge" title="Local file mode">
            📁
          </span>
        )}
        <span className={`client-selector__arrow ${isOpen ? 'client-selector__arrow--open' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="client-selector__dropdown" role="listbox">
          <div className="client-selector__search">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="client-selector__search-input"
              autoFocus
            />
          </div>
          <ul className="client-selector__list">
            {filteredClients.map((client) => (
              <li
                key={client.id}
                className={`client-selector__option ${client.id === selectedClientId ? 'client-selector__option--selected' : ''}`}
                onClick={() => handleSelect(client.id)}
                role="option"
                aria-selected={client.id === selectedClientId}
              >
                <div className="client-selector__option-content">
                  <span className="client-selector__option-name">{client.name}</span>
                  <span className="client-selector__option-meta">
                    {client.pipelines} pipelines · {client.workflows} workflows
                  </span>
                </div>
                {client.id === selectedClientId && (
                  <span className="client-selector__check">✓</span>
                )}
              </li>
            ))}
            {filteredClients.length === 0 && (
              <li className="client-selector__no-results">
                No clients found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ClientSelector;
