/**
 * Sample Size Calculator
 * Utility component for calculating required sample sizes for A/B tests
 */

import React, { useState, useEffect } from 'react';
import { getApiClient } from '../services/apiClient';

const apiClient = getApiClient();

export default function SampleSizeCalculator() {
  const [params, setParams] = useState({
    baselineRate: 10, // 10%
    minimumDetectableEffect: 20, // 20% relative
    confidenceLevel: 0.95,
    power: 0.8
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateSampleSize();
  }, []);

  const calculateSampleSize = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSampleSizeCalculator({
        baselineRate: params.baselineRate / 100,
        minimumDetectableEffect: params.minimumDetectableEffect / 100,
        confidenceLevel: params.confidenceLevel,
        power: params.power
      });
      setResult(data);
    } catch (err) {
      console.error('Failed to calculate sample size:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  const formatNumber = (num) => num?.toLocaleString() || '0';

  return (
    <div className="sample-size-calculator">
      <div className="calculator-inputs">
        <div className="input-group">
          <label>Baseline Conversion Rate (%)</label>
          <input
            type="number"
            min="0.1"
            max="99"
            step="0.1"
            value={params.baselineRate}
            onChange={(e) => handleParamChange('baselineRate', e.target.value)}
            className="form-input"
          />
          <span className="input-hint">
            Your current conversion rate (e.g., 10%)
          </span>
        </div>

        <div className="input-group">
          <label>Minimum Detectable Effect (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={params.minimumDetectableEffect}
            onChange={(e) => handleParamChange('minimumDetectableEffect', e.target.value)}
            className="form-input"
          />
          <span className="input-hint">
            Relative improvement you want to detect (e.g., 20% = 12% absolute)
          </span>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Confidence Level</label>
            <select
              value={params.confidenceLevel}
              onChange={(e) => handleParamChange('confidenceLevel', e.target.value)}
              className="form-select"
            >
              <option value={0.9}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </div>

          <div className="input-group">
            <label>Statistical Power</label>
            <select
              value={params.power}
              onChange={(e) => handleParamChange('power', e.target.value)}
              className="form-select"
            >
              <option value={0.8}>80%</option>
              <option value={0.85}>85%</option>
              <option value={0.9}>90%</option>
              <option value={0.95}>95%</option>
            </select>
          </div>
        </div>

        <button 
          className="btn btn-primary"
          onClick={calculateSampleSize}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {result && (
        <div className="calculator-results">
          <div className="result-highlight">
            <div className="result-main">
              <span className="result-number">{formatNumber(result.perVariant)}</span>
              <span className="result-label">participants per variant</span>
            </div>
            <div className="result-total">
              Total: {formatNumber(result.totalRequired)} participants
            </div>
          </div>

          <div className="result-details">
            <h4>Sample Size Table</h4>
            <p>Required sample size for different minimum detectable effects:</p>
            
            <table className="sample-size-table">
              <thead>
                <tr>
                  <th>MDE</th>
                  <th>Sample Size (per variant)</th>
                  <th>Total Required</th>
                </tr>
              </thead>
              <tbody>
                {result.table?.map((row, index) => (
                  <tr 
                    key={index} 
                    className={row.mde === `${params.minimumDetectableEffect}%` ? 'current' : ''}
                  >
                    <td>{row.mde}</td>
                    <td>{formatNumber(row.sampleSize)}</td>
                    <td>{formatNumber(row.sampleSize * 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="calculator-tips">
            <h4>💡 Tips</h4>
            <ul>
              <li>Higher confidence levels require larger sample sizes</li>
              <li>Smaller detectable effects require more participants</li>
              <li>Run tests for at least 1-2 full business cycles</li>
              <li>Consider segmenting results by traffic source or device</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
