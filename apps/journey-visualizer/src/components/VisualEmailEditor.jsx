/**
 * VisualEmailEditor Component
 * WYSIWYG email editor with drag-and-drop using Unlayer
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmailEditor from 'react-email-editor';
import { ArrowLeft, Save, Check, AlertCircle, Upload, Copy, X } from 'lucide-react';
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

  // Import JSON modal state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(null);

  // Export HTML modal state
  const [showExport, setShowExport] = useState(false);
  const [exportHtml, setExportHtml] = useState('');
  const [copied, setCopied] = useState(false);

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
  }, []);

  // Fetch touchpoint
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

  // Handle import JSON from LLM
  const handleImport = useCallback(() => {
    setImportError(null);
    let parsed;
    try {
      parsed = JSON.parse(importText.trim());
    } catch {
      setImportError('Invalid JSON — check for syntax errors and try again.');
      return;
    }

    // Accept either a bare body object or a wrapped { body: ... } object
    const design = parsed.body ? parsed : { body: parsed };

    if (!design.body?.rows) {
      setImportError('JSON does not look like an Unlayer design. Make sure it has a "body" with "rows".');
      return;
    }

    editorRef.current.editor.loadDesign(design);
    setShowImport(false);
    setImportText('');
  }, [importText]);

  // Handle export HTML for copy/paste into GHL
  const handleExportHtml = useCallback(() => {
    if (!editorRef.current?.editor) return;
    editorRef.current.editor.exportHtml((data) => {
      setExportHtml(data.html);
      setShowExport(true);
    });
  }, []);

  const handleCopyHtml = useCallback(async () => {
    await navigator.clipboard.writeText(exportHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportHtml]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const btnStyle = (color = 'rgba(255,255,255,0.15)') => ({
    background: color,
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'white',
    padding: '8px 14px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
  });

  if (loading) {
    return (
      <div className="visual-editor__loading">
        <div className="visual-editor__spinner" />
        <p>Loading editor...</p>
      </div>
    );
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <button
          onClick={handleBack}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{touchpoint?.name || 'Email Editor'}</div>
          {touchpoint?.content?.subject && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              {touchpoint.content.subject}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => { setShowImport(true); setImportError(null); setImportText(''); }} style={btnStyle()}>
            <Upload size={14} />
            Import JSON
          </button>

          <button onClick={handleExportHtml} style={btnStyle()}>
            <Copy size={14} />
            Copy HTML
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...btnStyle(saveStatus === 'saved' ? '#27ae60' : '#3498db'),
              border: 'none',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saveStatus === 'saved' ? <Check size={14} /> : <Save size={14} />}
            {saveStatus === 'saved' ? 'Saved' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{ backgroundColor: '#e74c3c', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      {/* Unlayer Editor */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <EmailEditor
          ref={editorRef}
          onReady={onEditorReady}
          style={{ height: '100%', width: '100%' }}
          minHeight="100%"
          options={{
            displayMode: 'email',
            features: { textEditor: { spellChecker: true } },
          }}
        />
      </div>

      {/* Import JSON Modal */}
      {showImport && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '28px',
            width: '640px', maxWidth: '90vw', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>Import LLM Design JSON</h2>
              <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
              Paste the Unlayer design JSON generated by your LLM. Use the system prompt at{' '}
              <code style={{ fontSize: '12px', background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
                clients/cameron-estate/email-generation/system-prompt.md
              </code>
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{ "body": { "rows": [...] } }'
              style={{
                width: '100%', boxSizing: 'border-box',
                height: '280px', fontFamily: 'monospace', fontSize: '12px',
                border: '1px solid #ddd', borderRadius: '4px', padding: '12px',
                resize: 'vertical',
              }}
            />

            {importError && (
              <p style={{ margin: 0, color: '#e74c3c', fontSize: '13px' }}>{importError}</p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImport(false)} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                style={{ padding: '10px 20px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: importText.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', opacity: importText.trim() ? 1 : 0.5 }}
              >
                Load Design
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export HTML Modal */}
      {showExport && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '28px',
            width: '700px', maxWidth: '90vw', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>Copy HTML for GoHighLevel</h2>
              <button onClick={() => { setShowExport(false); setCopied(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <X size={20} />
              </button>
            </div>

            <textarea
              readOnly
              value={exportHtml}
              style={{
                width: '100%', boxSizing: 'border-box',
                height: '320px', fontFamily: 'monospace', fontSize: '11px',
                border: '1px solid #ddd', borderRadius: '4px', padding: '12px',
                resize: 'vertical', color: '#444',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowExport(false); setCopied(false); }} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '14px' }}>
                Close
              </button>
              <button
                onClick={handleCopyHtml}
                style={{ padding: '10px 24px', background: copied ? '#27ae60' : '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy HTML'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default VisualEmailEditor;
