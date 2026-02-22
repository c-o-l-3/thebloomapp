/**
 * HTMLEditor Component
 * Monaco Editor for HTML editing with side-by-side preview
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  Save, 
  RotateCcw, 
  AlignLeft, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2,
  ArrowLeft,
  Check,
  AlertCircle,
  Code,
  Monitor,
  Smartphone
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import './HTMLEditor.css';

const apiClient = getApiClient();

// LocalStorage keys
const getDraftKey = (id) => `html_editor_draft_${id}`;
const SETTINGS_KEY = 'html_editor_settings';

/**
 * HTMLEditor - Monaco Editor with live preview for HTML
 */
export function HTMLEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  
  const [touchpoint, setTouchpoint] = useState(null);
  const [originalContent, setOriginalContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saved, error
  
  // UI states
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // desktop, mobile
  const [activeTab, setActiveTab] = useState('edit'); // edit, preview
  const [editorTheme, setEditorTheme] = useState('vs');

  // Load settings from localStorage
  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (settings.showPreview !== undefined) setShowPreview(settings.showPreview);
      if (settings.editorTheme) setEditorTheme(settings.editorTheme);
    } catch (e) {
      console.error('Failed to load editor settings:', e);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings) => {
    try {
      const current = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
    } catch (e) {
      console.error('Failed to save editor settings:', e);
    }
  }, []);

  // Fetch touchpoint data
  useEffect(() => {
    const fetchTouchpoint = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await apiClient.getTouchpoint(id);
        setTouchpoint(data);
        
        const content = data.content?.body || '';
        setOriginalContent(content);
        
        // Check for draft in localStorage
        const draftKey = getDraftKey(id);
        const draft = localStorage.getItem(draftKey);
        
        if (draft && draft !== content) {
          // Ask user if they want to restore draft
          const shouldRestore = window.confirm(
            'A draft version was found. Would you like to restore it?\n\n' +
            'Click OK to restore the draft, or Cancel to use the saved version.'
          );
          setHtmlContent(shouldRestore ? draft : content);
        } else {
          setHtmlContent(content);
        }
      } catch (err) {
        console.error('Failed to fetch touchpoint:', err);
        setError('Failed to load touchpoint.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTouchpoint();
    }
  }, [id]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (htmlContent !== originalContent) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer
      autoSaveTimerRef.current = setTimeout(() => {
        const draftKey = getDraftKey(id);
        localStorage.setItem(draftKey, htmlContent);
        setSaveStatus('saved');
        
        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 2000);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [htmlContent, originalContent, id]);

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure HTML language support
    monaco.editor.setModelLanguage(editor.getModel(), 'html');
    
    // Add custom commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    // Add format command
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      handleFormat();
    });
  };

  // Handle content change
  const handleChange = useCallback((value) => {
    setHtmlContent(value || '');
    setSaveStatus('idle');
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!touchpoint) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await apiClient.updateTouchpoint(id, {
        ...touchpoint,
        content: {
          ...touchpoint.content,
          body: htmlContent
        }
      });
      
      // Clear draft after successful save
      const draftKey = getDraftKey(id);
      localStorage.removeItem(draftKey);
      
      setOriginalContent(htmlContent);
      setSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save changes. Please try again.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [id, touchpoint, htmlContent]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (htmlContent !== originalContent) {
      const shouldReset = window.confirm(
        'Are you sure you want to reset all changes?\n\n' +
        'This will discard your current edits and restore the last saved version.'
      );
      if (shouldReset) {
        setHtmlContent(originalContent);
        const draftKey = getDraftKey(id);
        localStorage.removeItem(draftKey);
      }
    }
  }, [htmlContent, originalContent, id]);

  // Handle format
  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const newValue = !prev;
      if (newValue) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      return newValue;
    });
  }, []);

  // Toggle preview
  const togglePreview = useCallback(() => {
    setShowPreview(prev => {
      const newValue = !prev;
      saveSettings({ showPreview: newValue });
      return newValue;
    });
  }, [saveSettings]);

  // Handle back
  const handleBack = useCallback(() => {
    // Check for unsaved changes
    if (htmlContent !== originalContent) {
      const shouldLeave = window.confirm(
        'You have unsaved changes.\n\n' +
        'Click OK to discard changes and leave, or Cancel to stay.'
      );
      if (!shouldLeave) return;
    }
    navigate(-1);
  }, [navigate, htmlContent, originalContent]);

  // Get preview styles based on mode
  const getPreviewStyles = () => {
    if (previewMode === 'mobile') {
      return {
        maxWidth: '375px',
        margin: '0 auto',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden'
      };
    }
    return {};
  };

  // Replace personalization tokens for preview
  const getPreviewContent = () => {
    return htmlContent
      .replace(/{{first_name}}/g, 'Sarah')
      .replace(/{{last_name}}/g, 'Johnson')
      .replace(/{{full_name}}/g, 'Sarah Johnson')
      .replace(/{{venue_name}}/g, 'Mansion Estate')
      .replace(/{{event_date}}/g, 'June 15, 2025')
      .replace(/{{contact_email}}/g, 'sarah@example.com')
      .replace(/{{contact_phone}}/g, '(555) 123-4567')
      .replace(/{{planner_name}}/g, 'Jennifer');
  };

  // Loading state
  if (loading) {
    return (
      <div className="html-editor__loading">
        <div className="html-editor__spinner" />
        <p>Loading editor...</p>
      </div>
    );
  }

  // Error state
  if (error && !touchpoint) {
    return (
      <div className="html-editor__error">
        <AlertCircle size={48} />
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleBack} className="html-editor__back-btn">
          Go Back
        </button>
      </div>
    );
  }

  const hasChanges = htmlContent !== originalContent;

  return (
    <div className={`html-editor ${isFullscreen ? 'html-editor--fullscreen' : ''}`}>
      {/* Header */}
      <header className="html-editor__header">
        <div className="html-editor__header-left">
          <button 
            className="html-editor__back"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="html-editor__info">
            <h1 className="html-editor__title">
              <Code size={18} />
              {touchpoint?.name || 'HTML Editor'}
            </h1>
            {touchpoint?.journey?.name && (
              <span className="html-editor__journey">
                {touchpoint.journey.name}
              </span>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="html-editor__toolbar">
          <div className="html-editor__toolbar-group">
            <button 
              className={`html-editor__tool-btn ${!showPreview ? 'html-editor__tool-btn--active' : ''}`}
              onClick={togglePreview}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>Preview</span>
            </button>
            
            {showPreview && (
              <>
                <button 
                  className={`html-editor__tool-btn ${previewMode === 'desktop' ? 'html-editor__tool-btn--active' : ''}`}
                  onClick={() => setPreviewMode('desktop')}
                  title="Desktop Preview"
                >
                  <Monitor size={16} />
                </button>
                <button 
                  className={`html-editor__tool-btn ${previewMode === 'mobile' ? 'html-editor__tool-btn--active' : ''}`}
                  onClick={() => setPreviewMode('mobile')}
                  title="Mobile Preview"
                >
                  <Smartphone size={16} />
                </button>
              </>
            )}
          </div>

          <div className="html-editor__divider" />

          <div className="html-editor__toolbar-group">
            <button 
              className="html-editor__tool-btn"
              onClick={handleFormat}
              title="Format HTML (Shift+Alt+F)"
            >
              <AlignLeft size={16} />
              <span>Format</span>
            </button>
            
            <button 
              className="html-editor__tool-btn"
              onClick={handleReset}
              disabled={!hasChanges}
              title="Reset Changes"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>

          <div className="html-editor__divider" />

          <div className="html-editor__toolbar-group">
            <button 
              className="html-editor__tool-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            
            <button 
              className={`html-editor__save-btn ${saving ? 'html-editor__save-btn--saving' : ''} ${saveStatus === 'saved' ? 'html-editor__save-btn--success' : ''}`}
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check size={16} />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Save Status Indicator */}
      {hasChanges && (
        <div className="html-editor__status-bar">
          <span className="html-editor__unsaved-indicator">
            <span className="html-editor__unsaved-dot" />
            Unsaved changes
          </span>
          {saveStatus === 'saved' && (
            <span className="html-editor__autosave-status">
              Draft saved
            </span>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="html-editor__error-banner">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Editor Content */}
      <div className={`html-editor__content ${showPreview ? 'html-editor__content--split' : ''}`}>
        {/* Editor Pane */}
        <div className="html-editor__editor-pane">
          <Editor
            height="100%"
            defaultLanguage="html"
            value={htmlContent}
            onChange={handleChange}
            onMount={handleEditorDidMount}
            theme={editorTheme}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: true,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
              insertSpaces: true,
              detectIndentation: true,
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
              unfoldOnClickAfterEndOfLine: true,
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              }
            }}
          />
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div className="html-editor__preview-pane">
            <div className="html-editor__preview-header">
              <span className="html-editor__preview-title">
                <Eye size={14} />
                Live Preview
              </span>
              <span className="html-editor__preview-mode">
                {previewMode === 'mobile' ? 'Mobile (375px)' : 'Desktop'}
              </span>
            </div>
            <div className="html-editor__preview-content" style={getPreviewStyles()}>
              <iframe
                srcDoc={getPreviewContent()}
                title="HTML Preview"
                className="html-editor__preview-frame"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Footer */}
      <footer className="html-editor__footer">
        <div className="html-editor__shortcuts">
          <span>Ctrl+S</span> Save
          <span className="html-editor__shortcut-divider">•</span>
          <span>Shift+Alt+F</span> Format
          <span className="html-editor__shortcut-divider">•</span>
          <span>F11</span> Fullscreen
        </div>
      </footer>
    </div>
  );
}

export default HTMLEditor;