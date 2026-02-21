import mjml2html from 'mjml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MJML Compiler Service
 * Handles MJML template compilation and content injection
 */

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

/**
 * Load an MJML template file
 */
export function loadTemplate(templateName) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Compile MJML to HTML
 */
export function compileMjml(mjmlContent, options = {}) {
  try {
    const result = mjml2html(mjmlContent, {
      validationLevel: 'soft',
      ...options
    });

    return {
      success: true,
      html: result.html,
      errors: result.errors,
      warnings: result.warnings
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      html: null
    };
  }
}

/**
 * Inject content into master shell
 * Supports three content zones: openingContent (above gallery), gallery, content (below gallery)
 */
export function injectIntoShell(openingContent = '', gallery = '', content = '', data = {}) {
  const shell = loadTemplate('master-shell.mjml');

  let processed = shell;

  // Inject opening content
  processed = processed.replace('{{openingContent}}', openingContent);

  // Inject gallery
  processed = processed.replace('{{gallery}}', gallery);

  // Inject body content
  processed = processed.replace('{{content}}', content);

  // Inject preview text
  if (data.previewText) {
    processed = processed.replace('{{previewText}}', data.previewText);
  }

  // Inject other variables
  for (const [key, value] of Object.entries(data)) {
    if (!['content', 'openingContent', 'previewText', 'gallery'].includes(key)) {
      processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }

  return processed;
}

/**
 * Full build pipeline
 */
export function buildEmail(emailData) {
  const { openingContent, content, gallery, variables = {} } = emailData;

  try {
    // Inject into master shell with three content zones
    const fullMjml = injectIntoShell(openingContent || '', gallery || '', content || '', variables);

    // Compile to HTML
    const compileResult = compileMjml(fullMjml);

    if (!compileResult.success) {
      return {
        success: false,
        error: compileResult.error,
        mjml: fullMjml
      };
    }

    return {
      success: true,
      html: compileResult.html,
      mjml: fullMjml,
      errors: compileResult.errors
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  loadTemplate,
  compileMjml,
  injectIntoShell,
  buildEmail
};
