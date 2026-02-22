/**
 * TouchpointEditor Component
 * WYSIWYG email/SMS editor with live preview and AI assistance
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TOUCHPOINT_TYPE } from '../types';
import { AIAssistantPanel } from './AIAssistantPanel';
import { 
  X, 
  Save, 
  Eye, 
  Code, 
  Sparkles, 
  ChevronDown, 
  Type,
  Image as ImageIcon,
  Square,
  Minus,
  User,
  Building,
  Calendar,
  Mail,
  Download
} from 'lucide-react';
import './TouchpointEditor.css';

// Personalization tokens available
const PERSONALIZATION_TOKENS = [
  { token: '{{first_name}}', label: 'First Name', icon: User },
  { token: '{{last_name}}', label: 'Last Name', icon: User },
  { token: '{{full_name}}', label: 'Full Name', icon: User },
  { token: '{{venue_name}}', label: 'Venue Name', icon: Building },
  { token: '{{event_date}}', label: 'Event Date', icon: Calendar },
  { token: '{{contact_email}}', label: 'Contact Email', icon: Mail },
  { token: '{{contact_phone}}', label: 'Contact Phone', icon: PhoneIcon },
  { token: '{{planner_name}}', label: 'Planner Name', icon: User },
];

function PhoneIcon(props) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/**
 * TouchpointEditor - Visual editor for email and SMS touchpoints
 */
export function TouchpointEditor({ 
  touchpoint, 
  clientSlug,
  onSave, 
  onClose,
  onInsertTemplate
}) {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    previewText: '',
    body: '',
    type: TOUCHPOINT_TYPE.EMAIL
  });
  
  const [showPreview, setShowPreview] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content'); // content, ai, settings

  // Initialize form data from touchpoint
  useEffect(() => {
    if (touchpoint) {
      setFormData({
        name: touchpoint.name || '',
        subject: touchpoint.content?.subject || '',
        previewText: touchpoint.content?.previewText || '',
        body: touchpoint.content?.body || '',
        type: touchpoint.type || TOUCHPOINT_TYPE.EMAIL
      });
    }
  }, [touchpoint]);

  // Handle form field changes
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle rich text editor changes
  const handleBodyChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, body: value }));
  }, []);

  // Insert personalization token at cursor position
  const insertToken = useCallback((token) => {
    const quill = document.querySelector('.ql-editor');
    if (quill) {
      // Simple insertion - in production, use Quill's API
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode(token);
      range.insertNode(textNode);
      range.collapse(false);
    }
    setShowTokenDropdown(false);
  }, []);

  // Insert content block
  const insertBlock = useCallback((type) => {
    const blocks = {
      text: '<p>Add your text here...</p>',
      image: '<div class="content-block-image"><img src="https://via.placeholder.com/600x300" alt="Insert image" /></div>',
      button: '<div class="content-block-button" style="text-align: center; margin: 20px 0;"><a href="#" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Click Here</a></div>',
      divider: '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />'
    };
    
    const currentBody = formData.body || '';
    handleBodyChange(currentBody + blocks[type]);
  }, [formData.body, handleBodyChange]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updatedTouchpoint = {
        ...touchpoint,
        name: formData.name,
        content: {
          ...touchpoint?.content,
          subject: formData.subject,
          previewText: formData.previewText,
          body: formData.body
        }
      };
      await onSave?.(updatedTouchpoint);
    } finally {
      setIsSaving(false);
    }
  }, [formData, touchpoint, onSave]);

  // Export as HTML file
  const handleExportHtml = useCallback(() => {
    const content = formData.body || '';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const typeLabel = isEmail ? 'email' : 'sms';
    const name = formData.name?.replace(/\s+/g, '-').toLowerCase() || 'touchpoint';
    a.download = `${name}-${typeLabel}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [formData.body, formData.name, isEmail]);

  // Export as plain text file
  const handleExportText = useCallback(() => {
    // Strip HTML tags for plain text
    const content = (formData.body || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const typeLabel = isSMS ? 'sms' : 'text';
    const name = formData.name?.replace(/\s+/g, '-').toLowerCase() || 'touchpoint';
    a.download = `${name}-${typeLabel}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [formData.body, formData.name, isSMS]);

  // Render preview with personalization tokens replaced
  const renderPreview = () => {
    let preview = formData.body || '';
    // Replace tokens with sample data
    preview = preview
      .replace(/{{first_name}}/g, 'Sarah')
      .replace(/{{last_name}}/g, 'Johnson')
      .replace(/{{full_name}}/g, 'Sarah Johnson')
      .replace(/{{venue_name}}/g, 'Mansion Estate')
      .replace(/{{event_date}}/g, 'June 15, 2025')
      .replace(/{{contact_email}}/g, 'sarah@example.com')
      .replace(/{{contact_phone}}/g, '(555) 123-4567')
      .replace(/{{planner_name}}/g, 'Jennifer');
    return preview;
  };

  // Quill editor modules and formats
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  if (!touchpoint) return null;

  const isEmail = formData.type === TOUCHPOINT_TYPE.EMAIL;
  const isSMS = formData.type === TOUCHPOINT_TYPE.SMS;

  return (
    <div className="touchpoint-editor">
      {/* Header */}
      <div className="touchpoint-editor__header">
        <div className="touchpoint-editor__header-left">
          <h2 className="touchpoint-editor__title">
            {isEmail ? '📧' : '💬'} Edit {isEmail ? 'Email' : 'SMS'}
          </h2>
          <input
            type="text"
            className="touchpoint-editor__name-input"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Touchpoint name..."
          />
        </div>
        <div className="touchpoint-editor__header-actions">
          <button
            className={`touchpoint-editor__tab ${activeTab === 'ai' ? 'touchpoint-editor__tab--active' : ''}`}
            onClick={() => setActiveTab(activeTab === 'ai' ? 'content' : 'ai')}
          >
            <Sparkles size={16} />
            AI Assist
          </button>
          <button
            className="touchpoint-editor__button touchpoint-editor__button--secondary"
            onClick={onClose}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            className="touchpoint-editor__button touchpoint-editor__button--primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="touchpoint-editor__content">
        {/* Left Panel - Editor */}
        <div className={`touchpoint-editor__editor-panel ${activeTab === 'ai' ? 'touchpoint-editor__editor-panel--with-ai' : ''}`}>
          {isEmail && (
            <div className="touchpoint-editor__fields">
              <div className="touchpoint-editor__field">
                <label className="touchpoint-editor__label">Subject Line</label>
                <input
                  type="text"
                  className="touchpoint-editor__input"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="Enter subject line..."
                />
                <span className="touchpoint-editor__char-count">
                  {formData.subject.length} chars
                </span>
              </div>
              
              <div className="touchpoint-editor__field">
                <label className="touchpoint-editor__label">Preview Text</label>
                <input
                  type="text"
                  className="touchpoint-editor__input"
                  value={formData.previewText}
                  onChange={(e) => handleChange('previewText', e.target.value)}
                  placeholder="Text that appears after subject in inbox..."
                />
                <span className="touchpoint-editor__char-count">
                  {formData.previewText.length} chars
                </span>
              </div>
            </div>
          )}

          {isSMS && (
            <div className="touchpoint-editor__field">
              <label className="touchpoint-editor__label">Message</label>
              <span className="touchpoint-editor__char-count touchpoint-editor__char-count--sms">
                {formData.body.replace(/<[^>]*>/g, '').length} / 160 chars
                {formData.body.replace(/<[^>]*>/g, '').length > 160 && (
                  <span className="touchpoint-editor__sms-warning"> (SMS will be split)</span>
                )}
              </span>
            </div>
          )}

          {/* Content Blocks Toolbar */}
          <div className="touchpoint-editor__toolbar">
            <div className="touchpoint-editor__toolbar-section">
              <span className="touchpoint-editor__toolbar-label">Insert:</span>
              <button 
                className="touchpoint-editor__toolbar-btn"
                onClick={() => insertBlock('text')}
                title="Text Block"
              >
                <Type size={16} />
                Text
              </button>
              <button 
                className="touchpoint-editor__toolbar-btn"
                onClick={() => insertBlock('image')}
                title="Image Block"
              >
                <ImageIcon size={16} />
                Image
              </button>
              <button 
                className="touchpoint-editor__toolbar-btn"
                onClick={() => insertBlock('button')}
                title="Button Block"
              >
                <Square size={16} />
                Button
              </button>
              <button 
                className="touchpoint-editor__toolbar-btn"
                onClick={() => insertBlock('divider')}
                title="Divider"
              >
                <Minus size={16} />
                Divider
              </button>
            </div>

            <div className="touchpoint-editor__toolbar-section">
              <div className="touchpoint-editor__token-dropdown">
                <button 
                  className="touchpoint-editor__toolbar-btn"
                  onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                >
                  <User size={16} />
                  Personalize
                  <ChevronDown size={14} />
                </button>
                {showTokenDropdown && (
                  <div className="touchpoint-editor__token-menu">
                    {PERSONALIZATION_TOKENS.map(({ token, label, icon: Icon }) => (
                      <button
                        key={token}
                        className="touchpoint-editor__token-item"
                        onClick={() => insertToken(token)}
                      >
                        <Icon size={14} />
                        <span>{label}</span>
                        <code className="touchpoint-editor__token-code">{token}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="touchpoint-editor__editor">
            {showSource ? (
              <textarea
                className="touchpoint-editor__source"
                value={formData.body}
                onChange={(e) => handleChange('body', e.target.value)}
                rows={20}
              />
            ) : (
              <ReactQuill
                theme="snow"
                value={formData.body}
                onChange={handleBodyChange}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start writing your message here..."
              />
            )}
          </div>

          {/* View Toggle & Export */}
          <div className="touchpoint-editor__view-toggle">
            <button
              className={`touchpoint-editor__view-btn ${!showSource ? 'touchpoint-editor__view-btn--active' : ''}`}
              onClick={() => setShowSource(false)}
            >
              <Eye size={14} />
              Visual
            </button>
            <button
              className={`touchpoint-editor__view-btn ${showSource ? 'touchpoint-editor__view-btn--active' : ''}`}
              onClick={() => setShowSource(true)}
            >
              <Code size={14} />
              Source
            </button>
            <div className="touchpoint-editor__export-group">
              <button
                className="touchpoint-editor__view-btn"
                onClick={handleExportHtml}
                title="Export as HTML file"
              >
                <Download size={14} />
                Export HTML
              </button>
              <button
                className="touchpoint-editor__view-btn"
                onClick={handleExportText}
                title="Export as plain text file"
              >
                <Download size={14} />
                Export Text
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        {showPreview && activeTab !== 'ai' && (
          <div className="touchpoint-editor__preview-panel">
            <div className="touchpoint-editor__preview-header">
              <span className="touchpoint-editor__preview-title">
                <Eye size={16} />
                Live Preview
              </span>
            </div>
            
            <div className="touchpoint-editor__preview-content">
              {isEmail ? (
                <div className="touchpoint-editor__email-preview">
                  <div className="touchpoint-editor__email-header">
                    <div className="touchpoint-editor__email-field">
                      <strong>Subject:</strong> {formData.subject || '(No subject)'}
                    </div>
                    <div className="touchpoint-editor__email-field">
                      <strong>Preview:</strong> {formData.previewText || '(No preview text)'}
                    </div>
                  </div>
                  <div 
                    className="touchpoint-editor__email-body"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                  />
                </div>
              ) : (
                <div className="touchpoint-editor__sms-preview">
                  <div className="touchpoint-editor__sms-phone">
                    <div className="touchpoint-editor__sms-message">
                      {renderPreview().replace(/<[^>]*>/g, '') || 'Your message will appear here...'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Assistant Panel */}
        {activeTab === 'ai' && (
          <AIAssistantPanel
            clientSlug={clientSlug}
            currentContent={formData.body}
            onInsertSuggestion={(text) => {
              handleBodyChange(formData.body + text);
            }}
            onReplaceContent={(text) => {
              handleBodyChange(text);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default TouchpointEditor;
