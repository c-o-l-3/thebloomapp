/**
 * StandaloneEmailEditor Component
 * Simple WYSIWYG email editor - just import, edit, export
 * No touchpoint ID required
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { 
  ArrowLeft,
  Download, 
  Copy, 
  Check,
  Monitor,
  Tablet,
  Smartphone,
  Upload,
  FileText,
  Layout,
  Palette,
  Box
} from 'lucide-react';
import './VisualEmailEditor.css';

const DEFAULT_EMAIL_TEMPLATE = `
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
            <p>Click any element to edit it. Drag blocks from the left panel to add more content.</p>
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

/**
 * StandaloneEmailEditor - Simple import, edit, export workflow
 */
export function StandaloneEmailEditor() {
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [mode, setMode] = useState('landing'); // landing, editor
  const [importMethod, setImportMethod] = useState('paste'); // paste, upload
  const [htmlInput, setHtmlInput] = useState('');
  const [device, setDevice] = useState('desktop');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showBlocks, setShowBlocks] = useState(true);
  
  // Initialize GrapesJS editor
  useEffect(() => {
    if (mode !== 'editor' || !editorRef.current || editorInstanceRef.current) return;
    
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
      panels: {
        defaults: []
      }
    });
    
    editorInstanceRef.current = editor;
    editor.setDevice('Desktop');
    
    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
    };
  }, [mode]);
  
  // Update device preview
  useEffect(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setDevice(device);
    }
  }, [device]);
  
  // Load content when entering editor mode
  useEffect(() => {
    if (mode === 'editor' && editorInstanceRef.current) {
      const content = htmlInput || DEFAULT_EMAIL_TEMPLATE;
      editorInstanceRef.current.setComponents(content);
    }
  }, [mode, htmlInput]);
  
  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setHtmlInput(event.target.result);
    };
    reader.readAsText(file);
  };
  
  // Start editing
  const handleStartEditing = () => {
    if (importMethod === 'upload' && fileInputRef.current?.files?.length > 0) {
      const file = fileInputRef.current.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setHtmlInput(event.target.result);
        setMode('editor');
      };
      reader.readAsText(file);
    } else {
      setMode('editor');
    }
  };
  
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
  <title>Email</title>
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
    a.download = `email-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
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
  <title>Email</title>
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
    }
  }, []);
  
  // Handle back to landing
  const handleBack = () => {
    setMode('landing');
    setHtmlInput('');
  };
  
  // Landing/Import Mode
  if (mode === 'landing') {
    return (
      <div className="standalone-editor">
        <div className="standalone-editor__landing">
          <div className="standalone-editor__landing-content">
            <div className="standalone-editor__logo">
              <Layout size={48} />
            </div>
            <h1>Visual Email Editor</h1>
            <p className="standalone-editor__subtitle">
              Import your HTML, edit visually, and export
            </p>
            
            <div className="standalone-editor__import-options">
              <div className="standalone-editor__import-tabs">
                <button 
                  className={`standalone-editor__import-tab ${importMethod === 'paste' ? 'standalone-editor__import-tab--active' : ''}`}
                  onClick={() => setImportMethod('paste')}
                >
                  <FileText size={18} />
                  Paste HTML
                </button>
                <button 
                  className={`standalone-editor__import-tab ${importMethod === 'upload' ? 'standalone-editor__import-tab--active' : ''}`}
                  onClick={() => setImportMethod('upload')}
                >
                  <Upload size={18} />
                  Upload File
                </button>
              </div>
              
              {importMethod === 'paste' ? (
                <div className="standalone-editor__paste-area">
                  <textarea
                    value={htmlInput}
                    onChange={(e) => setHtmlInput(e.target.value)}
                    placeholder="Paste your HTML here..."
                    className="standalone-editor__html-input"
                  />
                </div>
              ) : (
                <div className="standalone-editor__upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="standalone-editor__file-input"
                  />
                  <div className="standalone-editor__upload-box">
                    <Upload size={32} />
                    <p>Click to select an HTML file</p>
                    <span>or drag and drop</span>
                  </div>
                </div>
              )}
              
              <button 
                className="standalone-editor__start-btn"
                onClick={handleStartEditing}
              >
                <Palette size={20} />
                Start Editing
              </button>
              
              <p className="standalone-editor__hint">
                Don't have HTML? Start with a blank template
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Editor Mode
  return (
    <div className="visual-editor">
      {/* Header */}
      <header className="visual-editor__header">
        <div className="visual-editor__header-left">
          <button 
            className="visual-editor__back"
            onClick={handleBack}
            title="Back to import"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="visual-editor__info">
            <h1 className="visual-editor__title">
              <Layout size={18} />
              Visual Email Editor
            </h1>
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
          
          {/* Toggle Blocks Panel */}
          <div className="visual-editor__toolbar-group">
            <button 
              className={`visual-editor__tool-btn ${showBlocks ? 'visual-editor__tool-btn--active' : ''}`}
              onClick={() => setShowBlocks(!showBlocks)}
              title="Toggle Blocks"
            >
              <Box size={16} />
              <span>Blocks</span>
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
        </div>
      </header>
      
      {/* Editor Container */}
      <div className="visual-editor__content">
        {/* GrapesJS Editor */}
        <div className="visual-editor__canvas" ref={editorRef} />
      </div>
    </div>
  );
}

export default StandaloneEmailEditor;
