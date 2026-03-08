# Cameron Estate Touchpoint Upload, Share & Edit Workflow

## Overview

Enable uploading HTML content for Cameron Estate touchpoints, sharing with clients for feedback (no login), and visual editing with save capability.

## Current Architecture Analysis

### How the Editor Works

**Loading Content** (VisualEmailEditor.jsx lines 55-64):
1. First checks for `content.unlayerDesign` (JSON) → loads as **fully editable**
2. Falls back to `content.body` (HTML) → loads as **limited editability**

**Saving Content** (lines 98-109):
- Always saves BOTH:
  - `content.body` = compiled HTML (for previews)
  - `content.unlayerDesign` = JSON design (for future editing)

### Existing Features

| Feature | Status | Location |
|---------|--------|----------|
| Touchpoint storage | ✅ | Database |
| VisualEditor (Unlayer) | ✅ | VisualEmailEditor.jsx |
| Code Editor (Monaco) | ✅ | HTMLEditor.jsx |
| Client Review Page | ✅ | /journeys/:id/client-review |
| Import JSON | ✅ | VisualEmailEditor "Import JSON" button |
| Export HTML | ✅ | VisualEmailEditor "Copy HTML" button |

### Missing Features

- ❌ Import raw HTML file directly (only JSON import exists)
- ❌ Import HTML via paste

## Implementation Plan

### Task 1: Validate Existing Workflow

1. Run import script to load Cameron Estate emails
2. Verify touchpoints created with Unlayer designs
3. Test VisualEmailEditor Save → compiles HTML
4. Test ClientReviewPage displays HTML correctly

**Files involved:**
- `apps/journey-api/src/import-cameron-emails.js`
- `apps/journey-visualizer/src/components/VisualEmailEditor.jsx`
- `apps/journey-visualizer/src/components/ClientReviewPage.jsx`

### Task 2: Add HTML Import Feature

Add ability to import raw HTML files directly into VisualEmailEditor:

1. Add "Import HTML" button in VisualEmailEditor header
2. Modal with file upload + paste textarea
3. On import: `editor.loadHtml(html)` → saves as JSON on next Save

**Changes:**
- Modify `apps/journey-visualizer/src/components/VisualEmailEditor.jsx`
- Add new modal for HTML import (similar to existing JSON import modal)

### Task 3: Test Full Workflow

End-to-end validation:
1. Import raw HTML → VisualEdit → Save → Client Review → Edit Again → Save

## Technical Details

### JSON Flow (Preferred)
```
JSON Design → VisualEditor (editable) → Save → JSON + HTML both saved
```

### HTML Flow (Limited)
```
Raw HTML → VisualEditor (loadHtml) → Save → Creates JSON from HTML
```
⚠️ Note: HTML imported this way has limited editability until you Save.

## Client Review Workflow

**Route:** `/journeys/{journeyId}/client-review`

**Features:**
- No login required
- Renders HTML in iframes
- Shows subject, preview text
- Client can add notes per touchpoint
- Submit saves to `touchpoint.config.clientNote`

**API:** `POST /api/touchpoints/:id/note`

## Files to Modify

| File | Changes |
|------|---------|
| `apps/journey-visualizer/src/components/VisualEmailEditor.jsx` | Add HTML import button and modal |
| `plans/cameron-estate-touchpoint-workflow.md` | Update with final implementation notes |

## Testing Checklist

- [ ] Run import script - 8 Cameron Estate emails load
- [ ] Open VisualEmailEditor - Unlayer design loads
- [ ] Click Save - HTML compiled to content.body
- [ ] Open ClientReviewPage - HTML renders correctly
- [ ] Add client note - saves to database
- [ ] Import raw HTML file - loads in editor
- [ ] After Save on HTML import - becomes fully editable
