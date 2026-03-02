import React, { useState, useEffect } from 'react';
import './WorkflowTriggerConfig.css';

const TRIGGER_TYPE_LABELS = {
  contactCreated: { label: 'Contact Created', icon: '👤' },
  stageChanged: { label: 'Stage Changed', icon: '📊' },
  emailOpened: { label: 'Email Opened', icon: '📧' },
  linkClicked: { label: 'Link Clicked', icon: '🔗' },
  formSubmitted: { label: 'Form Submitted', icon: '📝' },
  appointmentBooked: { label: 'Appointment Booked', icon: '📅' }
};

const WorkflowTriggerList = ({ 
  workflowId, 
  clientId, 
  onCreateTrigger, 
  onEditTrigger,
  onBack 
}) => {
  const [triggers, setTriggers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, paused

  useEffect(() => {
    loadTriggers();
  }, [workflowId, clientId]);

  const loadTriggers = async () => {
    setIsLoading(true);
    try {
      // In production, this would call the API
      // const response = await fetch(`/api/workflow-triggers?workflowId=${workflowId}&clientId=${clientId}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockTriggers = [
        {
          id: '1',
          name: 'New Lead Welcome',
          type: 'contactCreated',
          status: 'active',
          _count: { executions: 156 },
          createdAt: '2026-02-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Post-Tour Follow-up',
          type: 'appointmentBooked',
          status: 'active',
          config: { appointmentType: 'tour' },
          _count: { executions: 89 },
          createdAt: '2026-02-10T14:30:00Z'
        },
        {
          id: '3',
          name: 'Booking Confirmation',
          type: 'stageChanged',
          status: 'paused',
          config: { toStage: 'Booked' },
          _count: { executions: 42 },
          createdAt: '2026-01-20T09:15:00Z'
        }
      ];
      
      setTriggers(mockTriggers);
    } catch (err) {
      setError('Failed to load triggers');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (triggerId, currentStatus) => {
    try {
      // In production: await fetch(`/api/workflow-triggers/${triggerId}/toggle`, { method: 'POST' });
      
      setTriggers(prev => prev.map(t => 
        t.id === triggerId 
          ? { ...t, status: currentStatus === 'active' ? 'paused' : 'active' }
          : t
      ));
    } catch (err) {
      console.error('Failed to toggle trigger:', err);
    }
  };

  const handleDuplicate = async (trigger) => {
    try {
      // In production: await fetch(`/api/workflow-triggers/${trigger.id}/duplicate`, { method: 'POST' });
      
      const newTrigger = {
        ...trigger,
        id: `new-${Date.now()}`,
        name: `${trigger.name} (Copy)`,
        status: 'paused',
        _count: { executions: 0 },
        createdAt: new Date().toISOString()
      };
      
      setTriggers(prev => [newTrigger, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate trigger:', err);
    }
  };

  const handleDelete = async (triggerId) => {
    if (!window.confirm('Are you sure you want to delete this trigger?')) return;
    
    try {
      // In production: await fetch(`/api/workflow-triggers/${triggerId}`, { method: 'DELETE' });
      
      setTriggers(prev => prev.filter(t => t.id !== triggerId));
    } catch (err) {
      console.error('Failed to delete trigger:', err);
    }
  };

  const filteredTriggers = triggers.filter(trigger => {
    if (filter === 'all') return true;
    return trigger.status === filter;
  });

  if (isLoading) {
    return (
      <div className="trigger-list">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>Loading triggers...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trigger-list">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <h3>Error loading triggers</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trigger-list">
      <div className="trigger-list-header">
        <div>
          <h2>Workflow Triggers</h2>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Manage automation triggers for this workflow
          </p>
        </div>
        <button className="btn-create-trigger" onClick={onCreateTrigger}>
          <span>+</span> Create Trigger
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'active', 'paused'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: filter === status ? '#3b82f6' : 'white',
              color: filter === status ? 'white' : '#374151',
              fontSize: '13px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {status} ({status === 'all' ? triggers.length : triggers.filter(t => t.status === status).length})
          </button>
        ))}
      </div>

      {filteredTriggers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3>No triggers found</h3>
          <p>
            {filter === 'all' 
              ? 'Create your first trigger to automate this workflow.' 
              : `No ${filter} triggers found.`}
          </p>
        </div>
      ) : (
        <div className="trigger-list-grid">
          {filteredTriggers.map(trigger => {
            const typeInfo = TRIGGER_TYPE_LABELS[trigger.type] || { label: trigger.type, icon: '⚡' };
            
            return (
              <div 
                key={trigger.id} 
                className={`trigger-list-item ${trigger.status !== 'active' ? 'inactive' : ''}`}
              >
                <div className="trigger-info">
                  <h4>{trigger.name}</h4>
                  <div className="trigger-meta">
                    <span className="trigger-type-badge">
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                    <span className={`trigger-status-badge ${trigger.status}`}>
                      {trigger.status}
                    </span>
                    <span>• {trigger._count?.executions || 0} executions</span>
                    <span>• Created {new Date(trigger.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="trigger-actions-list">
                  <button
                    className="btn-icon"
                    onClick={() => handleToggleStatus(trigger.id, trigger.status)}
                    title={trigger.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    {trigger.status === 'active' ? '⏸️' : '▶️'}
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => onEditTrigger(trigger)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDuplicate(trigger)}
                    title="Duplicate"
                  >
                    📋
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(trigger.id)}
                    title="Delete"
                    style={{ color: '#ef4444' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button className="btn-cancel" onClick={onBack}>
          ← Back to Workflow
        </button>
      </div>
    </div>
  );
};

export default WorkflowTriggerList;