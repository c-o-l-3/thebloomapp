/**
 * VisualEmailEditor Component
 * WYSIWYG email editor with drag-and-drop using GrapesJS
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Copy, 
  Check, 
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  EyeOff,
  Layout
} from 'lucide-react';
import { getApiClient } from '../services/apiClient';
import './VisualEmailEditor.css';

const apiClient = getApiClient();

// LocalStorage key for drafts
const getDraftKey = (id) => `visual_editor_draft_${id}`;

/**
 * VisualEmailEditor - GrapesJS WYSIWYG email editor
 */
export function VisualEmailEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  
  const [touchpoint, setTouchpoint] = useState(null);
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  
  // UI states
  const [device, setDevice] = useState('desktop');
  const [showPreview, setShowPreview] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Initialize GrapesJS editor
  useEffect(() => {
    if (!editorRef.current || editorInstanceRef.current) return;
    
    // Define custom email blocks
    const blockManager = {
      blocks: [
        {
          id: 'text',
          label: 'Text',
          category: 'Basic',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 16px; color: #333333; line-height: 1.6;">
                  <p>Add your text here. Click to edit this text block.</p>
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'image',
          label: 'Image',
          category: 'Basic',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px;">
                  <img src="https://via.placeholder.com/600x300" alt="Image" style="max-width: 100%; height: auto; display: block;" />
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'button',
          label: 'Button',
          category: 'Basic',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px;">
                  <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; border-radius: 4px;">Click Here</a>
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'divider',
          label: 'Divider',
          category: 'Basic',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding: 20px;">
                  <hr style="border: none; border-top: 1px solid #dddddd; margin: 0;" />
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'columns-2',
          label: '2 Columns',
          category: 'Layout',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td width="50%" style="padding: 10px;" valign="top">
                  <p>Left column content</p>
                </td>
                <td width="50%" style="padding: 10px;" valign="top">
                  <p>Right column content</p>
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'columns-3',
          label: '3 Columns',
          category: 'Layout',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td width="33%" style="padding: 10px;" valign="top">
                  <p>Column 1</p>
                </td>
                <td width="34%" style="padding: 10px;" valign="top">
                  <p>Column 2</p>
                </td>
                <td width="33%" style="padding: 10px;" valign="top">
                  <p>Column 3</p>
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'social',
          label: 'Social Links',
          category: 'Basic',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px;">
                  <a href="#" style="display: inline-block; margin: 0 10px; color: #333333; text-decoration: none;">Facebook</a>
                  <a href="#" style="display: inline-block; margin: 0 10px; color: #333333; text-decoration: none;">Twitter</a>
                  <a href="#" style="display: inline-block; margin: 0 10px; color: #333333; text-decoration: none;">Instagram</a>
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'spacer',
          label: 'Spacer',
          category: 'Basic',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="height: 40px;"></td>
              </tr>
            </table>
          `
        },
        {
          id: 'header',
          label: 'Header',
          category: 'Layout',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa;">
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 28px; color: #333333;">Your Company Name</h1>
                </td>
              </tr>
            </table>
          `
        },
        {
          id: 'footer',
          label: 'Footer',
          category: 'Layout',
          content: `
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #333333;">
              <tr>
                <td align="center" style="padding: 30px 20px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">
                  <p style="margin: 0 0 10px;">© 2025 Your Company. All rights reserved.</p>
                  <p style="margin: 0;">123 Business Street, City, State 12345</p>
                </td>
              </tr>
            </table>
          `
        }
      ]
    };
    
    // Initialize GrapesJS
    const editor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: '100%',
      storageManager: false,
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '768px' },
          { name: 'Mobile', width: '320px' }
        ]
      },
      panels: { defaults: [] },
      blockManager,
      styleManager: {
        sectors: [
          {
            name: 'Typography',
            properties: [
              { type: 'font-family', name: 'Font Family' },
              { type: 'color', name: 'Color' },
              { type: 'font-size', name: 'Font Size' },
              { type: 'font-weight', name: 'Font Weight' },
              { type: 'line-height', name: 'Line Height' },
              { type: 'text-align', name: 'Text Align' }
            ]
          },
          {
            name: 'Background',
            properties: [
              { type: 'color', name: 'Background Color' },
              { type: 'image', name: 'Background Image' }
            ]
          },
          {
            name: 'Spacing',
            properties: [
              { type: 'padding', name: 'Padding' },
              { type: 'margin', name: 'Margin' }
            ]
          },
          {
            name: 'Border',
            properties: [
              { type: 'border', name: 'Border' },
              { type: 'border-radius', name: 'Border Radius' }
            ]
          }
        ]
      },
      traitManager: {
        traits: [
          { type: 'text', name: 'href', label: 'Link URL' },
          { type: 'text', name: 'src', label: 'Image Source' },
          { type: 'text', name: 'alt', label: 'Alt Text' },
          { type: 'text', name: 'target', label: 'Target' }
        ]
      },
      // Disable default panels - we'll create our own
      panels: {
        defaults: []
      }
    });
    
    editorInstanceRef.current = editor;
    
    // Set initial device
    editor.setDevice('Desktop');
    
    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, []);
  
  // Update device preview
  useEffect(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setDevice(device);
    }
  }, [device]);
  
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
          const shouldRestore = window.confirm(
            'A draft version was found. Would you like to restore it?\n\n' +
            'Click OK to restore the draft, or Cancel to use the saved version.'
          );
          if (editorInstanceRef.current) {
            editorInstanceRef.current.setComponents(shouldRestore ? draft : content);
          }
        } else if (content) {
          if (editorInstanceRef.current) {
            editorInstanceRef.current.setComponents(content);
          }
        } else {
          // Set default email template
          const defaultTemplate = `
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="background-color: #f8f9fa; padding: 40px 20px;">
                  <table width="600" border="0" cellspacing="0" cellpadding="0" align="center" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                      <td align="center" style="padding: 30px;">
                        <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 28px; color: #333333;">Welcome!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px; font-family: Arial, sans-serif; font-size: 16px; color: #333333; line-height: 1.6;">
                        <p>Start building your email by dragging blocks from the left panel.</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px;">
                        <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; border-radius: 4px;">Get Started</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px 40px; background-color: #333333; border-radius: 0 0 8px 8px;">
                        <p style="margin: 0; text-align: center; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">© 2025 Your Company. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `;
          editorInstanceRef.current?.setComponents(defaultTemplate);
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
  
  // Auto-save draft
  useEffect(() => {
    if (!editorInstanceRef.current || !originalContent) return;
    
    const checkForChanges = () => {
      const currentHtml = editorInstanceRef.current.getHtml();
      if (currentHtml !== originalContent) {
        const draftKey = getDraftKey(id);
        localStorage.setItem(draftKey, currentHtml);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    };
    
    const interval = setInterval(checkForChanges, 5000);
    return () => clearInterval(interval);
  }, [id, originalContent]);
  
  // Handle save
  const handleSave = useCallback(async () => {
    if (!touchpoint || !editorInstanceRef.current) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const htmlContent = editorInstanceRef.current.getHtml();
      const cssContent = editorInstanceRef.current.getCss();
      
      await apiClient.updateTouchpoint(id, {
        ...touchpoint,
        content: {
          ...touchpoint.content,
          body: htmlContent,
          styles: cssContent
        }
      });
      
      // Clear draft
      const draftKey = getDraftKey(id);
      localStorage.removeItem(draftKey);
      
      setOriginalContent(htmlContent);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save changes. Please try again.');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, [id, touchpoint]);
  
  // Handle back
  const handleBack = useCallback(() => {
    if (editorInstanceRef.current) {
      const currentHtml = editorInstanceRef.current.getHtml();
      if (currentHtml !== originalContent) {
        const shouldLeave = window.confirm(
          'You have unsaved changes.\n\n' +
          'Click OK to discard changes and leave, or Cancel to stay.'
        );
        if (!shouldLeave) return;
      }
    }
    navigate(-1);
  }, [navigate, originalContent]);
  
  // Handle export/download
  const handleExport = useCallback(() => {
    if (!editorInstanceRef.current) return;
    
    const html = editorInstanceRef.current.getHtml();
    const css = editorInstanceRef.current.getCss();
    
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${touchpoint?.name || 'Email'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    ${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${touchpoint?.name || 'email'}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [touchpoint]);
  
  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!editorInstanceRef.current) return;
    
    const html = editorInstanceRef.current.getHtml();
    const css = editorInstanceRef.current.getCss();
    
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${touchpoint?.name || 'Email'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    ${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
    
    try {
      await navigator.clipboard.writeText(fullHTML);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard.');
    }
  }, [touchpoint]);
  
  // Replace personalization tokens for preview
  const getPreviewContent = useCallback(() => {
    if (!editorInstanceRef.current) return '';
    
    let html = editorInstanceRef.current.getHtml();
    let css = editorInstanceRef.current.getCss();
    
    // Replace tokens
    html = html
      .replace(/{{first_name}}/g, 'Sarah')
      .replace(/{{last_name}}/g, 'Johnson')
      .replace(/{{full_name}}/g, 'Sarah Johnson')
      .replace(/{{venue_name}}/g, 'Mansion Estate')
      .replace(/{{event_date}}/g, 'June 15, 2025')
      .replace(/{{contact_email}}/g, 'sarah@example.com')
      .replace(/{{contact_phone}}/g, '(555) 123-4567')
      .replace(/{{planner_name}}/g, 'Jennifer');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    ${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }, []);
  
  // Get editor content for unsaved changes check
  const hasChanges = useCallback(() => {
    if (!editorInstanceRef.current) return false;
    const currentHtml = editorInstanceRef.current.getHtml();
    return currentHtml !== originalContent;
  }, [originalContent]);
  
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
    <div className="visual-editor">
      {/* Header */}
      <header className="visual-editor__header">
        <div className="visual-editor__header-left">
          <button 
            className="visual-editor__back"
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="visual-editor__info">
            <h1 className="visual-editor__title">
              <Layout size={18} />
              {touchpoint?.name || 'Visual Editor'}
            </h1>
            {touchpoint?.journey?.name && (
              <span className="visual-editor__journey">
                {touchpoint.journey.name}
              </span>
            )}
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="visual-editor__toolbar">
          {/* Device Preview */}
          <div className="visual-editor__toolbar-group">
            <button 
              className={`visual-editor__tool-btn ${device === 'desktop' ? 'visual-editor__tool-btn--active' : ''}`}
              onClick={() => setDevice('desktop')}
              title="Desktop"
            >
              <Monitor size={16} />
            </button>
            <button 
              className={`visual-editor__tool-btn ${device === 'tablet' ? 'visual-editor__tool-btn--active' : ''}`}
              onClick={() => setDevice('tablet')}
              title="Tablet"
            >
              <Tablet size={16} />
            </button>
            <button 
              className={`visual-editor__tool-btn ${device === 'mobile' ? 'visual-editor__tool-btn--active' : ''}`}
              onClick={() => setDevice('mobile')}
              title="Mobile"
            >
              <Smartphone size={16} />
            </button>
          </div>
          
          <div className="visual-editor__divider" />
          
          {/* Preview Toggle */}
          <div className="visual-editor__toolbar-group">
            <button 
              className="visual-editor__tool-btn"
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>Preview</span>
            </button>
          </div>
          
          <div className="visual-editor__divider" />
          
          {/* Export Actions */}
          <div className="visual-editor__toolbar-group">
            <button 
              className="visual-editor__tool-btn"
              onClick={handleExport}
              title="Download HTML"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            
            <button 
              className={`visual-editor__tool-btn ${copySuccess ? 'visual-editor__tool-btn--success' : ''}`}
              onClick={handleCopy}
              title="Copy to Clipboard"
            >
              {copySuccess ? <Check size={16} /> : <Copy size={16} />}
              <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          
          <div className="visual-editor__divider" />
          
          {/* Save Button */}
          <div className="visual-editor__toolbar-group">
            <button 
              className={`visual-editor__save-btn ${saving ? 'visual-editor__save-btn--saving' : ''} ${saveStatus === 'saved' ? 'visual-editor__save-btn--success' : ''}`}
              onClick={handleSave}
              disabled={saving || !hasChanges()}
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
      
      {/* Status Bar */}
      {hasChanges() && (
        <div className="visual-editor__status-bar">
          <span className="visual-editor__unsaved-indicator">
            <span className="visual-editor__unsaved-dot" />
            Unsaved changes
          </span>
          {saveStatus === 'saved' && (
            <span className="visual-editor__autosave-status">
              Draft saved
            </span>
          )}
        </div>
      )}
      
      {/* Error Banner */}
      {error && (
        <div className="visual-editor__error-banner">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      {/* Editor Container */}
      <div className="visual-editor__content">
        {/* GrapesJS Editor */}
        <div className="visual-editor__canvas" ref={editorRef} />
      </div>
    </div>
  );
}

export default VisualEmailEditor;
