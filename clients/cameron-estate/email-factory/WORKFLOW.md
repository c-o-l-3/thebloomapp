# The Bloom App - Golden Workflow

This document outlines the standard process for creating, building, and delivering customer journey emails using the Email Factory.

## The Workflow

### 1. Import Brand
**Goal:** Configure fonts, colors, and logo from the client's website.
*   **Action:** Update `src/brand-config.js` (if available) or `templates/master-shell.mjml` directly.
*   **Key Assets:**
    *   Primary Color (Headings, Buttons)
    *   Secondary Color (Backgrounds, Accents)
    *   Fonts (Heading Font, Body Font)
    *   Logo URL

### 2. Select Templates
**Goal:** Choose the journey structure.
*   **Action:** Review `src/emails-config.js` to define the sequence (e.g., 14-day nurture).
*   **Current State:** We use a standard 8-email nurture sequence defined in `emailConfigs`.

### 3. Review Assets
**Goal:** Gather photos and links.
*   **Action:** Update `assetPool` in `src/emails-config.js` with client-specific image URLs and links.
*   **Validation:** Ensure all links are active and images are hosted (e.g., GHL Media Library).

### 4. Build Emails
**Goal:** Compile templates into HTML.
*   **Command:** `npm run build`
*   **Details:** This combines `master-shell.mjml` with content from `emails-config.js` to produce full HTML files in `output/compiled-emails/`.

### 5. Admin Review
**Goal:** Internal quality control.
*   **Command:** `npm run review` (Generates .eml files)
*   **Details:** Opens generated `.eml` files in your local email client to check rendering, mobile responsiveness, and "dark mode" (if supported).

### 6. Generate Client Previews ("Push Button")
**Goal:** Create files for client feedback.
*   **Command:** `npm run workflow generate-previews`
*   **Output:** `.eml` files in `output/client-review-export/`.
*   **Features:**
    *   Synthetic data replacement (Jane Doe, etc.)
    *   Review Header (Subject/Preview Text visible)
    *   Ready to attach to an email.

### 7. Client Feedback Loop
**Goal:** Ingest feedback and refine.
*   **Action:**
    *   Client opens `.eml` files and replies with notes.
    *   Developer updates `src/emails-config.js` or `templates/master-shell.mjml`.
    *   Re-run Step 4 and 6.

### 8. Final Export
**Goal:** Delivery to CRM (Bloom/HighLevel).
*   **Command:** `npm run push` (if API connected) or use the HTML files in `output/compiled-emails/`.

---

## Quick Start
Run the interactive workflow tool:
```bash
npm run workflow
```
