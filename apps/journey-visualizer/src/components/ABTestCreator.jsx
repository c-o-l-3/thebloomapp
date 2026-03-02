/**
 * A/B Test Creator
 * Component for creating new A/B tests with variants
 */

import React, { useState, useEffect } from 'react';
import { getApiClient } from '../services/apiClient';

const apiClient = getApiClient();

const TEST_TYPES = [
  { value: 'journey', label: 'Full Journey', description: 'Test entirely different journey flows' },
  { value: 'touchpoint', label: 'Single Touchpoint', description: 'Test variations of a single touchpoint' },
  { value: 'subject_line', label: 'Subject Line', description: 'Test different email subject lines' },
  { value: 'content', label: 'Content Variations', description: 'Test different content within the same structure' }
];

const TARGET_METRICS = [
  { value: 'conversion', label: 'Conversion Rate', description: 'Primary conversion goal' },
  { value: 'click_rate', label: 'Click Rate', description: 'Email/SMS click-through rate' },
  { value: 'open_rate', label: 'Open Rate', description: 'Email open rate' },
  { value: 'reply_rate', label: 'Reply Rate', description: 'Response rate to messages' }
];

const TRAFFIC_SPLITS = [
  { label: '50/50', value: [50, 50] },
  { label: '60/40', value: [60, 40] },
  { label: '70/30', value: [70, 30] },
  { label: '80/20', value: [80, 20] },
  { label: 'Custom', value: null }
];

export default function ABTestCreator({ journey, onCancel, onCreate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sampleSizeData, setSampleSizeData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    testType: 'journey',
    targetMetric: 'conversion',
    minConfidenceLevel: 0.95,
    minSampleSize: 100,
    autoWinnerSelection: false,
    trafficSplit: '50/50',
    customTraffic: [50, 50],
    variants: [
      {
        name: 'Control',
        description: 'Current journey version',
        trafficPercentage: 50,
        isControl: true,
        journeySnapshot: null
      },
      {
        name: 'Variant A',
        description: 'Test variation',
        trafficPercentage: 50,
        isControl: false,
        journeySnapshot: null
      }
    ]
  });

  // Calculate sample size when relevant parameters change
  useEffect(() => {
    calculateSampleSize();
  }, [formData.targetMetric]);

  const calculateSampleSize = async () => {
    try {
      // Get baseline rate from journey analytics if available
      const baselineRate = 0.1; // Default 10%
      const minimumDetectableEffect = 0.2; // 20% relative improvement
      
      const result = await apiClient.getSampleSizeCalculator({
        baselineRate,
        minimumDetectableEffect,
        confidenceLevel: formData.minConfidenceLevel,
        power: 0.8
      });
      
      setSampleSizeData(result);
      setFormData(prev => ({
        ...prev,
        minSampleSize: result.perVariant
      }));
    } catch (err) {
      console.error('Failed to calculate sample size:', err);
    }
  };

  const handleTrafficSplitChange = (split) => {
    if (split.value) {
      const [controlPercent, ...variantPercents] = split.value;
      setFormData(prev => ({
        ...prev,
        trafficSplit: split.label,
        customTraffic: split.value,
        variants: prev.variants.map((v, i) => ({
          ...v,
          trafficPercentage: i === 0 ? controlPercent : variantPercents[i - 1] || 0
        }))
      }));
    } else {
      setFormData(prev => ({ ...prev, trafficSplit: split.label }));
    }
  };

  const handleAddVariant = () => {
    if (formData.variants.length >= 5) {
      alert('Maximum 5 variants allowed');
      return;
    }
    
    const newVariantIndex = formData.variants.length;
    const equalTraffic = Math.floor(100 / (newVariantIndex + 1));
    const remainder = 100 - (equalTraffic * (newVariantIndex + 1));
    
    setFormData(prev => {
      const newVariants = [...prev.variants];
      newVariants.push({
        name: `Variant ${String.fromCharCode(65 + newVariantIndex - 1)}`,
        description: '',
        trafficPercentage: equalTraffic + (newVariantIndex === 1 ? remainder : 0),
        isControl: false,
        journeySnapshot: null
      });
      
      // Redistribute traffic
      newVariants.forEach((v, i) => {
        v.trafficPercentage = equalTraffic + (i === 0 ? remainder : 0);
      });
      
      return { ...prev, variants: newVariants };
    });
  };

  const handleRemoveVariant = (index) => {
    if (formData.variants.length <= 2) {
      alert('Minimum 2 variants required');
      return;
    }
    
    setFormData(prev => {
      const newVariants = prev.variants.filter((_, i) => i !== index);
      const equalTraffic = Math.floor(100 / newVariants.length);
      const remainder = 100 - (equalTraffic * newVariants.length);
      
      newVariants.forEach((v, i) => {
        v.trafficPercentage = equalTraffic + (i === 0 ? remainder : 0);
      });
      
      return { ...prev, variants: newVariants };
    });
  };

  const handleVariantChange = (index, field, value) => {
    setFormData(prev => {
      const newVariants = [...prev.variants];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const handleTrafficPercentageChange = (index, value) => {
    const percentage = parseInt(value) || 0;
    setFormData(prev => {
      const newVariants = [...prev.variants];
      newVariants[index].trafficPercentage = percentage;
      return { ...prev, variants: newVariants };
    });
  };

  const validateTrafficAllocation = () => {
    const total = formData.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    return Math.abs(total - 100) < 0.01;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a test name');
      return;
    }

    if (!formData.hypothesis.trim()) {
      alert('Please enter a hypothesis');
      return;
    }

    if (!validateTrafficAllocation()) {
      const total = formData.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
      alert(`Traffic allocation must equal 100%. Current total: ${total}%`);
      return;
    }

    setLoading(true);
    
    try {
      // Prepare journey snapshots for each variant
      const variantsWithSnapshots = formData.variants.map(variant => ({
        ...variant,
        journeySnapshot: journey || {}
      }));

      await onCreate({
        name: formData.name,
        description: formData.description,
        hypothesis: formData.hypothesis,
        testType: formData.testType,
        targetMetric: formData.targetMetric,
        minConfidenceLevel: formData.minConfidenceLevel,
        minSampleSize: formData.minSampleSize,
        autoWinnerSelection: formData.autoWinnerSelection,
        variants: variantsWithSnapshots
      });
    } catch (err) {
      alert('Failed to create test: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="creator-step">
      <h3>Step 1: Test Configuration</h3>
      
      <div className="form-group">
        <label>Test Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Welcome Email Subject Line Test"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what you're testing and why"
          className="form-textarea"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Hypothesis *</label>
        <textarea
          value={formData.hypothesis}
          onChange={(e) => setFormData(prev => ({ ...prev, hypothesis: e.target.value }))}
          placeholder="e.g., Changing the subject line to include the contact's first name will increase open rates by 15%"
          className="form-textarea"
          rows={2}
        />
        <span className="form-hint">What do you expect to happen and why?</span>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Test Type</label>
          <select
            value={formData.testType}
            onChange={(e) => setFormData(prev => ({ ...prev, testType: e.target.value }))}
            className="form-select"
          >
            {TEST_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <span className="form-hint">
            {TEST_TYPES.find(t => t.value === formData.testType)?.description}
          </span>
        </div>

        <div className="form-group">
          <label>Target Metric</label>
          <select
            value={formData.targetMetric}
            onChange={(e) => setFormData(prev => ({ ...prev, targetMetric: e.target.value }))}
            className="form-select"
          >
            {TARGET_METRICS.map(metric => (
              <option key={metric.value} value={metric.value}>{metric.label}</option>
            ))}
          </select>
          <span className="form-hint">
            {TARGET_METRICS.find(m => m.value === formData.targetMetric)?.description}
          </span>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => setStep(2)}>
          Next: Configure Variants →
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="creator-step">
      <h3>Step 2: Configure Variants</h3>
      
      <div className="traffic-split-section">
        <label>Traffic Split</label>
        <div className="traffic-split-options">
          {TRAFFIC_SPLITS.map(split => (
            <button
              key={split.label}
              className={`split-option ${formData.trafficSplit === split.label ? 'active' : ''}`}
              onClick={() => handleTrafficSplitChange(split)}
            >
              {split.label}
            </button>
          ))}
        </div>
      </div>

      <div className="variants-list">
        {formData.variants.map((variant, index) => (
          <div key={index} className={`variant-card ${variant.isControl ? 'control' : ''}`}>
            <div className="variant-header">
              <div className="variant-title">
                {variant.isControl && <span className="control-badge">Control</span>}
                <span className="variant-number">{variant.isControl ? 'Control' : `Variant ${String.fromCharCode(64 + index)}`}</span>
              </div>
              {!variant.isControl && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleRemoveVariant(index)}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="form-row">
              <div className="form-group flex-grow">
                <label>Variant Name</label>
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                  className="form-input"
                  placeholder={variant.isControl ? 'Control' : `Variant ${String.fromCharCode(64 + index)}`}
                />
              </div>
              <div className="form-group traffic-input">
                <label>Traffic %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={variant.trafficPercentage}
                  onChange={(e) => handleTrafficPercentageChange(index, e.target.value)}
                  className="form-input"
                  disabled={formData.trafficSplit !== 'Custom'}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={variant.description}
                onChange={(e) => handleVariantChange(index, 'description', e.target.value)}
                className="form-input"
                placeholder={variant.isControl ? 'Current version' : 'What makes this different?'}
              />
            </div>
          </div>
        ))}
      </div>

      {formData.variants.length < 5 && (
        <button className="btn btn-secondary btn-add-variant" onClick={handleAddVariant}>
          + Add Variant
        </button>
      )}

      <div className="traffic-validation">
        Total Traffic: {formData.variants.reduce((sum, v) => sum + v.trafficPercentage, 0)}%
        {!validateTrafficAllocation() && (
          <span className="validation-error">Must equal 100%</span>
        )}
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => setStep(1)}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={() => setStep(3)}>
          Next: Review Settings →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="creator-step">
      <h3>Step 3: Review Settings</h3>

      <div className="review-section">
        <h4>Sample Size & Significance</h4>
        
        {sampleSizeData && (
          <div className="sample-size-info">
            <div className="info-row">
              <span className="info-label">Recommended Sample Size:</span>
              <span className="info-value">{sampleSizeData.perVariant.toLocaleString()} per variant</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Required:</span>
              <span className="info-value">{sampleSizeData.totalRequired.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Minimum Sample Size per Variant</label>
            <input
              type="number"
              value={formData.minSampleSize}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                minSampleSize: parseInt(e.target.value) || 100 
              }))}
              className="form-input"
              min="10"
            />
          </div>

          <div className="form-group">
            <label>Confidence Level</label>
            <select
              value={formData.minConfidenceLevel}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                minConfidenceLevel: parseFloat(e.target.value) 
              }))}
              className="form-select"
            >
              <option value={0.9}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.autoWinnerSelection}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                autoWinnerSelection: e.target.checked 
              }))}
            />
            <span>Automatically select winner when significance is reached</span>
          </label>
          <span className="form-hint">
            If enabled, the test will automatically stop and declare a winner when statistical 
            significance is achieved with the minimum sample size.
          </span>
        </div>
      </div>

      <div className="review-section">
        <h4>Summary</h4>
        <div className="summary-list">
          <div className="summary-item">
            <span className="summary-label">Test Name:</span>
            <span className="summary-value">{formData.name}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Test Type:</span>
            <span className="summary-value">
              {TEST_TYPES.find(t => t.value === formData.testType)?.label}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Target Metric:</span>
            <span className="summary-value">
              {TARGET_METRICS.find(m => m.value === formData.targetMetric)?.label}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Variants:</span>
            <span className="summary-value">{formData.variants.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Traffic Split:</span>
            <span className="summary-value">
              {formData.variants.map(v => `${v.name} (${v.trafficPercentage}%)`).join(', ')}
            </span>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => setStep(2)}>
          ← Back
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={loading || !validateTrafficAllocation()}
        >
          {loading ? 'Creating...' : 'Create A/B Test'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="ab-test-creator">
      <div className="creator-header">
        <h2>Create New A/B Test</h2>
        <p>Test different variations of your journey to find what works best</p>
      </div>

      <div className="step-indicator">
        {[1, 2, 3].map(s => (
          <div key={s} className={`step ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
            <div className="step-number">{s}</div>
            <div className="step-label">
              {s === 1 ? 'Configuration' : s === 2 ? 'Variants' : 'Review'}
            </div>
          </div>
        ))}
      </div>

      <div className="creator-content">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
