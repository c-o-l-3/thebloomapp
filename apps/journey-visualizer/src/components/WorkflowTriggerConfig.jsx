import React, { useState, useEffect } from 'react';
import './WorkflowTriggerConfig.css';

// Trigger type definitions matching the API
const TRIGGER_TYPES = {
  contactCreated: {
    label: 'Contact Created',
    description: 'Triggered when a new contact is created',
    icon: '👤',
    configFields: [
      { name: 'source', type: 'string', label: 'Source', optional: true, placeholder: 'e.g., website, referral' },
      { name: 'tags', type: 'array', label: 'Initial Tags', optional: true, placeholder: 'Comma-separated tags' }
    ]
  },
  stageChanged: {
    label: 'Stage Changed',
    description: 'Triggered when an opportunity moves to a different stage',
    icon: '📊',
    configFields: [
      { name: 'pipelineId', type: 'string', label: 'Pipeline', optional: true, placeholder: 'Pipeline ID' },
      { name: 'fromStage', type: 'string', label: 'From Stage', optional: true, placeholder: 'Current stage name' },
      { name: 'toStage', type: 'string', label: 'To Stage', optional: false, placeholder: 'Target stage name' }
    ]
  },
  emailOpened: {
    label: 'Email Opened',
    description: 'Triggered when a contact opens an email',
    icon: '📧',
    configFields: [
      { name: 'templateId', type: 'string', label: 'Email Template', optional: true, placeholder: 'Template ID' },
      { name: 'minOpens', type: 'number', label: 'Minimum Opens', optional: true, default: 1, placeholder: '1' }
    ]
  },
  linkClicked: {
    label: 'Link Clicked',
    description: 'Triggered when a contact clicks a link in an email',
    icon: '🔗',
    configFields: [
      { name: 'templateId', type: 'string', label: 'Email Template', optional: true, placeholder: 'Template ID' },
      { name: 'linkUrl', type: 'string', label: 'Link URL Pattern', optional: true, placeholder: 'URL or pattern to match' },
      { name: 'minClicks', type: 'number', label: 'Minimum Clicks', optional: true, default: 1, placeholder: '1' }
    ]
  },
  formSubmitted: {
    label: 'Form Submitted',
    description: 'Triggered when a contact submits a form',
    icon: '📝',
    configFields: [
      { name: 'formId', type: 'string', label: 'Form ID', optional: false, placeholder: 'Form ID' }
    ]
  },
  appointmentBooked: {
    label: 'Appointment Booked',
    description: 'Triggered when an appointment is scheduled',
    icon: '📅',
    configFields: [
      { name: 'calendarId', type: 'string', label: 'Calendar', optional: true, placeholder: 'Calendar ID' },
      { name: 'appointmentType', type: 'string', label: 'Appointment Type', optional: true, placeholder: 'e.g., tour, consultation' }
    ]
  }
};

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'greaterOrEqual', label: 'Greater or equal' },
  { value: 'lessOrEqual', label: 'Less or equal' },
  { value: 'in', label: 'Is in list' },
  { value: 'notIn', label: 'Is not in list' },
  { value: 'exists', label: 'Exists' },
  { value: 'notExists', label: 'Does not exist' },
  { value: 'matchesRegex', label: 'Matches regex' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const WorkflowTriggerConfig = ({ 
  workflowId, 
  clientId, 
  trigger = null, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'active',
    config: {},
    conditions: [],
    conditionLogic: 'and',
    timeDelay: 0,
    timeDelayType: 'immediate',
    scheduleWindow: null,
    maxExecutions: null,
    executionCooldown: null,
    dedupWindow: 1440,
    dedupKey: 'contactId'
  });
  
  const [showScheduleWindow, setShowScheduleWindow] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (trigger) {
      setFormData({
        name: trigger.name || '',
        type: trigger.type || '',
        status: trigger.status || 'active',
        config: trigger.config || {},
        conditions: trigger.conditions || [],
        conditionLogic: trigger.conditionLogic || 'and',
        timeDelay: trigger.timeDelay || 0,
        timeDelayType: trigger.timeDelayType || 'immediate',
        scheduleWindow: trigger.scheduleWindow || null,
        maxExecutions: trigger.maxExecutions || null,
        executionCooldown: trigger.executionCooldown || null,
        dedupWindow: trigger.dedupWindow || 1440,
        dedupKey: trigger.dedupKey || 'contactId'
      });
      setShowScheduleWindow(!!trigger.scheduleWindow);
    }
  }, [trigger]);

  const handleTypeSelect = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      config: {} // Reset config when type changes
    }));
  };

  const handleConfigChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [fieldName]: value
      }
    }));
  };

  const addConditionGroup = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { conditions: [], logic: 'and' }
      ]
    }));
  };

  const removeConditionGroup = (groupIndex) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== groupIndex)
    }));
  };

  const addCondition = (groupIndex) => {
    setFormData(prev => {
      const newConditions = [...prev.conditions];
      newConditions[groupIndex].conditions.push({
        field: '',
        operator: 'equals',
        value: '',
        fieldType: 'string'
      });
      return { ...prev, conditions: newConditions };
    });
  };

  const updateCondition = (groupIndex, conditionIndex, updates) => {
    setFormData(prev => {
      const newConditions = [...prev.conditions];
      newConditions[groupIndex].conditions[conditionIndex] = {
        ...newConditions[groupIndex].conditions[conditionIndex],
        ...updates
      };
      return { ...prev, conditions: newConditions };
    });
  };

  const removeCondition = (groupIndex, conditionIndex) => {
    setFormData(prev => {
      const newConditions = [...prev.conditions];
      newConditions[groupIndex].conditions = newConditions[groupIndex].conditions.filter((_, i) => i !== conditionIndex);
      return { ...prev, conditions: newConditions };
    });
  };

  const handleBusinessDayToggle = (day) => {
    setFormData(prev => {
      const currentDays = prev.scheduleWindow?.businessDays || [1, 2, 3, 4, 5];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      
      return {
        ...prev,
        scheduleWindow: {
          ...prev.scheduleWindow,
          businessDays: newDays
        }
      };
    });
  };

  const handleTest = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call the API
      // const response = await fetch(`/api/workflow-triggers/${trigger?.id}/test`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ eventData: generateTestEventData() })
      // });
      // const results = await response.json();
      
      // Mock test results for now
      const mockResults = {
        triggerId: trigger?.id || 'new',
        triggerName: formData.name,
        triggerType: formData.type,
        conditionResult: {
          matched: true,
          matchedConditions: [0]
        },
        configMatch: true,
        wouldExecute: true,
        calculatedExecutionTime: new Date().toISOString()
      };
      
      setTestResults(mockResults);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      workflowId,
      clientId
    };
    
    if (!showScheduleWindow) {
      delete dataToSave.scheduleWindow;
    }
    
    onSave(dataToSave);
  };

  const selectedType = TRIGGER_TYPES[formData.type];

  return (
    <div className="workflow-trigger-config">
      <div className="trigger-config-header">
        <h2>{trigger ? 'Edit Trigger' : 'Create New Trigger'}</h2>
        <p>Configure when this workflow should be triggered based on events and conditions</p>
      </div>

      {/* Trigger Name */}
      <div className="config-section">
        <div className="config-field">
          <label htmlFor="trigger-name">Trigger Name *</label>
          <input
            type="text"
            id="trigger-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., New Lead Welcome"
            required
          />
        </div>
      </div>

      {/* Trigger Type Selection */}
      <div className="trigger-type-section">
        <h3>Trigger Type *</h3>
        <div className="trigger-type-grid">
          {Object.entries(TRIGGER_TYPES).map(([type, config]) => (
            <div
              key={type}
              className={`trigger-type-card ${formData.type === type ? 'selected' : ''}`}
              onClick={() => handleTypeSelect(type)}
            >
              <h4>{config.icon} {config.label}</h4>
              <p>{config.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Type-Specific Configuration */}
      {selectedType && (
        <div className="config-section">
          <h3>Configuration</h3>
          {selectedType.configFields.map(field => (
            <div key={field.name} className="config-field">
              <label htmlFor={field.name}>
                {field.label}
                {field.optional && <span className="optional-badge">Optional</span>}
              </label>
              {field.type === 'number' ? (
                <input
                  type="number"
                  id={field.name}
                  value={formData.config[field.name] || field.default || ''}
                  onChange={(e) => handleConfigChange(field.name, parseInt(e.target.value))}
                  placeholder={field.placeholder}
                />
              ) : field.type === 'array' ? (
                <input
                  type="text"
                  id={field.name}
                  value={(formData.config[field.name] || []).join(', ')}
                  onChange={(e) => handleConfigChange(field.name, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type="text"
                  id={field.name}
                  value={formData.config[field.name] || ''}
                  onChange={(e) => handleConfigChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Conditions Section */}
      <div className="conditions-section">
        <div className="conditions-header">
          <h3>Conditions</h3>
          {formData.conditions.length > 0 && (
            <div className="condition-logic-toggle">
              <span>Match:</span>
              <select
                value={formData.conditionLogic}
                onChange={(e) => setFormData(prev => ({ ...prev, conditionLogic: e.target.value }))}
              >
                <option value="and">All groups</option>
                <option value="or">Any group</option>
              </select>
            </div>
          )}
        </div>

        {formData.conditions.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            No conditions set. The trigger will fire for all events of this type.
          </p>
        ) : (
          formData.conditions.map((group, groupIndex) => (
            <div key={groupIndex} className="condition-group">
              <div className="condition-group-header">
                <span>Condition Group {groupIndex + 1}</span>
                <button
                  className="btn-remove-condition"
                  onClick={() => removeConditionGroup(groupIndex)}
                >
                  Remove Group
                </button>
              </div>
              
              {group.conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="condition-row">
                  <input
                    type="text"
                    placeholder="Field (e.g., email, source)"
                    value={condition.field}
                    onChange={(e) => updateCondition(groupIndex, conditionIndex, { field: e.target.value })}
                  />
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(groupIndex, conditionIndex, { operator: e.target.value })}
                  >
                    {CONDITION_OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  {!['exists', 'notExists'].includes(condition.operator) && (
                    <input
                      type="text"
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(groupIndex, conditionIndex, { value: e.target.value })}
                    />
                  )}
                  <button
                    className="btn-remove-condition"
                    onClick={() => removeCondition(groupIndex, conditionIndex)}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <button
                className="btn-add-condition"
                onClick={() => addCondition(groupIndex)}
              >
                + Add Condition
              </button>
            </div>
          ))
        )}
        
        <button className="btn-add-group" onClick={addConditionGroup}>
          + Add Condition Group
        </button>
      </div>

      {/* Time Delay Section */}
      <div className="time-delay-section">
        <h3>Time Delay</h3>
        <div className="time-delay-row">
          <input
            type="number"
            min="0"
            value={formData.timeDelay}
            onChange={(e) => setFormData(prev => ({ ...prev, timeDelay: parseInt(e.target.value) || 0 }))}
            disabled={formData.timeDelayType === 'immediate'}
          />
          <select
            value={formData.timeDelayType}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              timeDelayType: e.target.value,
              timeDelay: e.target.value === 'immediate' ? 0 : prev.timeDelay
            }))}
          >
            <option value="immediate">Immediate</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
          <span>before executing workflow</span>
        </div>

        <div className="schedule-window-toggle">
          <label>
            <input
              type="checkbox"
              checked={showScheduleWindow}
              onChange={(e) => setShowScheduleWindow(e.target.checked)}
            />
            Only execute during business hours
          </label>
        </div>

        {showScheduleWindow && (
          <div className="schedule-window-config">
            <div className="business-hours-row">
              <label>Business Hours:</label>
              <select
                value={formData.scheduleWindow?.businessHoursStart || 9}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  scheduleWindow: {
                    ...prev.scheduleWindow,
                    businessHoursStart: parseInt(e.target.value)
                  }
                }))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
              <span>to</span>
              <select
                value={formData.scheduleWindow?.businessHoursEnd || 17}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  scheduleWindow: {
                    ...prev.scheduleWindow,
                    businessHoursEnd: parseInt(e.target.value)
                  }
                }))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
            </div>
            
            <div className="business-days-row">
              <label>Business Days:</label>
              {DAYS_OF_WEEK.map(day => (
                <label
                  key={day.value}
                  className={`day-checkbox ${(formData.scheduleWindow?.businessDays || [1,2,3,4,5]).includes(day.value) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={(formData.scheduleWindow?.businessDays || [1,2,3,4,5]).includes(day.value)}
                    onChange={() => handleBusinessDayToggle(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="advanced-section">
        <h3>Advanced Options</h3>
        <div className="advanced-grid">
          <div className="advanced-field">
            <label>Max Executions per Contact</label>
            <input
              type="number"
              min="1"
              value={formData.maxExecutions || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxExecutions: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Unlimited"
            />
            <p className="help-text">Maximum times this trigger can fire for a single contact</p>
          </div>
          
          <div className="advanced-field">
            <label>Execution Cooldown (minutes)</label>
            <input
              type="number"
              min="1"
              value={formData.executionCooldown || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                executionCooldown: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="No cooldown"
            />
            <p className="help-text">Minimum time between executions for the same contact</p>
          </div>
          
          <div className="advanced-field">
            <label>Deduplication Window (minutes)</label>
            <input
              type="number"
              min="1"
              value={formData.dedupWindow}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                dedupWindow: parseInt(e.target.value) || 1440 
              }))}
            />
            <p className="help-text">Time window to prevent duplicate executions (default: 24h)</p>
          </div>
          
          <div className="advanced-field">
            <label>Deduplication Key</label>
            <input
              type="text"
              value={formData.dedupKey}
              onChange={(e) => setFormData(prev => ({ ...prev, dedupKey: e.target.value }))}
              placeholder="contactId"
            />
            <p className="help-text">Field(s) used to identify duplicates (comma-separated)</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="trigger-actions">
        <button className="btn-test" onClick={handleTest} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Test Trigger'}
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button 
          className="btn-save" 
          onClick={handleSave}
          disabled={!formData.name || !formData.type}
        >
          {trigger ? 'Update Trigger' : 'Create Trigger'}
        </button>
      </div>

      {/* Test Results Modal */}
      {testResults && (
        <div className="test-results-modal" onClick={() => setTestResults(null)}>
          <div className="test-results-content" onClick={(e) => e.stopPropagation()}>
            <h3>Test Results</h3>
            <div className="test-result-item">
              <span className="test-result-label">Trigger:</span>
              <span className="test-result-value">{testResults.triggerName}</span>
            </div>
            <div className="test-result-item">
              <span className="test-result-label">Type:</span>
              <span className="test-result-value">{testResults.triggerType}</span>
            </div>
            <div className="test-result-item">
              <span className="test-result-label">Config Match:</span>
              <span className={`test-result-value ${testResults.configMatch ? 'success' : 'error'}`}>
                {testResults.configMatch ? '✓ Pass' : '✗ Fail'}
              </span>
            </div>
            <div className="test-result-item">
              <span className="test-result-label">Conditions Met:</span>
              <span className={`test-result-value ${testResults.conditionResult.matched ? 'success' : 'error'}`}>
                {testResults.conditionResult.matched ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="test-result-item">
              <span className="test-result-label">Would Execute:</span>
              <span className={`test-result-value ${testResults.wouldExecute ? 'success' : 'warning'}`}>
                {testResults.wouldExecute ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="test-result-item">
              <span className="test-result-label">Execution Time:</span>
              <span className="test-result-value">
                {new Date(testResults.calculatedExecutionTime).toLocaleString()}
              </span>
            </div>
            <button className="btn-close-modal" onClick={() => setTestResults(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTriggerConfig;