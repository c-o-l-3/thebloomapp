/**
 * BrandVoiceSettings Component
 * Client interface for managing brand voice settings
 */

import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Plus,
  X,
  Lightbulb
} from 'lucide-react';
import { getClientPortalApi } from '../services/clientPortalApi.js';
import './BrandVoiceSettings.css';

const portalApi = getClientPortalApi();

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal, authoritative, and business-focused' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, conversational, and approachable' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, welcoming, and personable' },
  { value: 'formal', label: 'Formal', description: 'Traditional, respectful, and structured' },
  { value: 'playful', label: 'Playful', description: 'Fun, energetic, and creative' },
  { value: 'luxury', label: 'Luxury', description: 'Sophisticated, elegant, and premium' }
];

/**
 * BrandVoiceSettings - Client brand voice management
 */
export function BrandVoiceSettings() {
  const [settings, setSettings] = useState({
    tone: 'professional',
    personalityTraits: [],
    voiceGuidelines: '',
    writingStyle: '',
    preferredPhrases: [],
    avoidedPhrases: [],
    targetAudience: '',
    audienceToneNotes: '',
    goodExamples: [],
    badExamples: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Temporary state for adding new items
  const [newTrait, setNewTrait] = useState('');
  const [newPreferredPhrase, setNewPreferredPhrase] = useState('');
  const [newAvoidedPhrase, setNewAvoidedPhrase] = useState('');
  const [newGoodExample, setNewGoodExample] = useState('');
  const [newBadExample, setNewBadExample] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await portalApi.getBrandVoiceSettings();
      setSettings({
        tone: data.tone || 'professional',
        personalityTraits: data.personalityTraits || [],
        voiceGuidelines: data.voiceGuidelines || '',
        writingStyle: data.writingStyle || '',
        preferredPhrases: data.preferredPhrases || [],
        avoidedPhrases: data.avoidedPhrases || [],
        targetAudience: data.targetAudience || '',
        audienceToneNotes: data.audienceToneNotes || '',
        goodExamples: data.goodExamples || [],
        badExamples: data.badExamples || []
      });
    } catch (err) {
      console.error('Error loading brand voice settings:', err);
      setError('Failed to load brand voice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await portalApi.updateBrandVoiceSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving brand voice settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const addItem = (field, value, setValue) => {
    if (!value.trim()) return;
    setSettings(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    setValue('');
  };

  const removeItem = (field, index) => {
    setSettings(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="brand-voice">
        <div className="brand-voice__loading">
          <Loader2 size={32} className="brand-voice__spinner" />
          <p>Loading brand voice settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-voice">
      <div className="brand-voice__header">
        <div>
          <h2>Brand Voice Settings</h2>
          <p>Define how your brand communicates with customers</p>
        </div>
        <button 
          className="portal-btn portal-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="portal-btn__spinner" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="brand-voice__error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="brand-voice__success">
          <CheckCircle size={20} />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div className="brand-voice__content">
        {/* Tone Selection */}
        <div className="bv-section">
          <h3>Brand Tone</h3>
          <p className="bv-section__description">
            Select the primary tone for your brand communications
          </p>
          <div className="bv-tone-grid">
            {TONE_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`bv-tone-btn ${settings.tone === option.value ? 'bv-tone-btn--active' : ''}`}
                onClick={() => handleChange('tone', option.value)}
              >
                <span className="bv-tone-btn__label">{option.label}</span>
                <span className="bv-tone-btn__desc">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Personality Traits */}
        <div className="bv-section">
          <h3>Personality Traits</h3>
          <p className="bv-section__description">
            Add key personality traits that define your brand
          </p>
          <div className="bv-tag-list">
            {settings.personalityTraits.map((trait, index) => (
              <span key={index} className="bv-tag">
                {trait}
                <button onClick={() => removeItem('personalityTraits', index)}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="bv-add-input">
            <input
              type="text"
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              placeholder="e.g., Trustworthy, Innovative"
              onKeyPress={(e) => e.key === 'Enter' && addItem('personalityTraits', newTrait, setNewTrait)}
            />
            <button 
              className="portal-btn portal-btn--secondary"
              onClick={() => addItem('personalityTraits', newTrait, setNewTrait)}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        {/* Voice Guidelines */}
        <div className="bv-section">
          <h3>Voice Guidelines</h3>
          <p className="bv-section__description">
            Describe your brand voice and how it should be used
          </p>
          <textarea
            value={settings.voiceGuidelines}
            onChange={(e) => handleChange('voiceGuidelines', e.target.value)}
            placeholder="e.g., We speak with confidence but never arrogance. We're knowledgeable guides, not lecturers..."
            rows={4}
          />
        </div>

        {/* Writing Style */}
        <div className="bv-section">
          <h3>Writing Style</h3>
          <p className="bv-section__description">
            Define specific writing conventions and preferences
          </p>
          <textarea
            value={settings.writingStyle}
            onChange={(e) => handleChange('writingStyle', e.target.value)}
            placeholder="e.g., Use active voice. Keep sentences short and punchy. Avoid jargon unless necessary..."
            rows={4}
          />
        </div>

        {/* Preferred Phrases */}
        <div className="bv-section">
          <h3>Preferred Phrases</h3>
          <p className="bv-section__description">
            Words and phrases to use frequently
          </p>
          <div className="bv-phrase-list bv-phrase-list--preferred">
            {settings.preferredPhrases.map((phrase, index) => (
              <span key={index} className="bv-phrase">
                {phrase}
                <button onClick={() => removeItem('preferredPhrases', index)}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="bv-add-input">
            <input
              type="text"
              value={newPreferredPhrase}
              onChange={(e) => setNewPreferredPhrase(e.target.value)}
              placeholder="Add a preferred phrase..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('preferredPhrases', newPreferredPhrase, setNewPreferredPhrase)}
            />
            <button 
              className="portal-btn portal-btn--secondary"
              onClick={() => addItem('preferredPhrases', newPreferredPhrase, setNewPreferredPhrase)}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        {/* Avoided Phrases */}
        <div className="bv-section">
          <h3>Phrases to Avoid</h3>
          <p className="bv-section__description">
            Words and phrases that don't align with your brand
          </p>
          <div className="bv-phrase-list bv-phrase-list--avoided">
            {settings.avoidedPhrases.map((phrase, index) => (
              <span key={index} className="bv-phrase">
                {phrase}
                <button onClick={() => removeItem('avoidedPhrases', index)}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="bv-add-input">
            <input
              type="text"
              value={newAvoidedPhrase}
              onChange={(e) => setNewAvoidedPhrase(e.target.value)}
              placeholder="Add a phrase to avoid..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('avoidedPhrases', newAvoidedPhrase, setNewAvoidedPhrase)}
            />
            <button 
              className="portal-btn portal-btn--secondary"
              onClick={() => addItem('avoidedPhrases', newAvoidedPhrase, setNewAvoidedPhrase)}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        {/* Target Audience */}
        <div className="bv-section">
          <h3>Target Audience</h3>
          <p className="bv-section__description">
            Describe your primary audience and how to address them
          </p>
          <input
            type="text"
            value={settings.targetAudience}
            onChange={(e) => handleChange('targetAudience', e.target.value)}
            placeholder="e.g., Busy professionals aged 30-50 who value quality and efficiency"
          />
        </div>

        {/* Good Examples */}
        <div className="bv-section">
          <h3>Good Examples</h3>
          <p className="bv-section__description">
            Examples of on-brand messaging
          </p>
          <div className="bv-examples-list">
            {settings.goodExamples.map((example, index) => (
              <div key={index} className="bv-example bv-example--good">
                <Lightbulb size={16} />
                <p>{example}</p>
                <button onClick={() => removeItem('goodExamples', index)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="bv-add-input">
            <input
              type="text"
              value={newGoodExample}
              onChange={(e) => setNewGoodExample(e.target.value)}
              placeholder="Add a good example..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('goodExamples', newGoodExample, setNewGoodExample)}
            />
            <button 
              className="portal-btn portal-btn--secondary"
              onClick={() => addItem('goodExamples', newGoodExample, setNewGoodExample)}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandVoiceSettings;