/**
 * VisualEmailEditor Component
 * WYSIWYG email editor with drag-and-drop using Unlayer
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import { ArrowLeft, Save, Check, AlertCircle } from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import './VisualEmailEditor.css';

const apiClient = getApiClient();

/**
 * VisualEmailEditor - Unlayer WYSIWYG email editor
 */
export function VisualEmailEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  const [touchpoint, setTouchpoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [editorReady, setEditorReady] = useState(false);

  // Load content into Unlayer — called whenever both editor and touchpoint are ready
  const loadContent = useCallback((tp) => {
    if (!editorRef.current?.editor || !tp) return;
    const unlayerDesign = tp.content?.unlayerDesign;
    const bodyHtml = tp.content?.body || '';
    if (unlayerDesign) {
      editorRef.current.editor.loadDesign(unlayerDesign);
    } else if (bodyHtml) {
      editorRef.current.editor.loadHtml(bodyHtml);
    }
    // else leave blank canvas as-is
  }, []);

  // Fetch touchpoint — once loaded, load into editor if it's already ready
  useEffect(() => {
    const fetchTouchpoint = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getTouchpoint(id);
        setTouchpoint(data);
        if (editorReady) loadContent(data);
      } catch (err) {
        console.error('Failed to fetch touchpoint:', err);
        setError('Failed to load touchpoint.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTouchpoint();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when Unlayer signals ready — load content if touchpoint already fetched
  const onEditorReady = useCallback(() => {
    setEditorReady(true);
    if (touchpoint) loadContent(touchpoint);
  }, [touchpoint, loadContent]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!touchpoint || !editorRef.current?.editor) return;

    try {
      setSaving(true);
      setError(null);

      editorRef.current.editor.exportHtml(async (data) => {
        const { html, design } = data;

        try {
          await apiClient.updateTouchpoint(id, {
            ...touchpoint,
            content: {
              ...touchpoint.content,
              body: html,
              unlayerDesign: design,
            },
          });

          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
          console.error('Failed to save:', err);
          setError('Failed to save changes. Please try again.');
          setSaveStatus('error');
        } finally {
          setSaving(false);
        }
      });
    } catch (err) {
      console.error('Failed to export HTML:', err);
      setError('Failed to export email content.');
      setSaving(false);
    }
  }, [id, touchpoint]);

  // Handle back
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="visual-editor__loading">
        <div className="visual-editor__spinner" />
        <p>Loading editor...</p>
      </div>
    );
  }

  // Error state
  if (error && !touchpoint) {
    return (
      <div className="visual-editor__error">
        <AlertCircle size={48} />
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleBack} className="visual-editor__back-btn">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div
      className="visual-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Back Button */}
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Title - Centered */}
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
            }}
          >
            {touchpoint?.name || 'Email Editor'}
          </h1>
          {touchpoint?.content?.subject && (
            <span
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.7)',
                marginTop: '4px',
              }}
            >
              {touchpoint.content.subject}
            </span>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saveStatus === 'saved' ? '#27ae60' : '#3498db',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
            opacity: saving ? 0.7 : 1,
            transition: 'background-color 0.2s',
          }}
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
      </header>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Editor Container */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <EmailEditor
          ref={editorRef}
          onReady={onEditorReady}
          style={{
            height: '100%',
            width: '100%',
          }}
          minHeight="100%"
          options={{
            displayMode: 'email',
            features: {
              textEditor: {
                spellChecker: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
}

export default VisualEmailEditor;
