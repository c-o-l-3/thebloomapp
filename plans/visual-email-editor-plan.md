# Visual Email Editor — Implementation Notes

> **Status: Implemented.** This document reflects what was built. The original plan proposed GrapesJS; we switched to Unlayer during implementation.

## What Was Built

A WYSIWYG email editor integrated into the journey-visualizer app using **Unlayer** (`react-email-editor`).

**Component:** `apps/journey-visualizer/src/components/VisualEmailEditor.jsx`
**Route:** `/touchpoints/:id/visual-edit`

### Features

- Drag-and-drop email editing via Unlayer
- **Import JSON** — paste LLM-generated Unlayer design JSON to load a design
- **Copy HTML** — export compiled HTML for pasting into GoHighLevel
- **Save** — persists both the Unlayer design JSON and compiled HTML to the database
- Loads existing design from `touchpoint.content.unlayerDesign` on open

## Why Unlayer Instead of GrapesJS

GrapesJS was the original plan. We switched to Unlayer because:

- Unlayer is purpose-built for email (handles table-based layouts, inline styles, email client compatibility automatically)
- GrapesJS requires significant custom work to produce email-safe HTML
- Unlayer's design JSON is a clean, structured format that LLMs can generate directly
- `react-email-editor` is the official React wrapper with a stable API

## The LLM → Edit → Export Workflow

The key insight that shaped this implementation:

1. **LLM generates Unlayer JSON** using the system prompt in `clients/{client}/email-generation/system-prompt.md`
2. **Human imports JSON** via the "Import JSON" button in the editor
3. **Human edits visually** — text, images, layout — without touching code
4. **Export HTML** via "Copy HTML" → paste into GoHighLevel

This replaces the previous MJML pipeline, which produced HTML that couldn't be round-tripped through a visual editor.

## Data Model

Touchpoint `content` object:

```json
{
  "subject": "Email subject line",
  "body": "<compiled HTML string>",
  "unlayerDesign": { "body": { "rows": [...] } }
}
```

Both `body` (compiled HTML) and `unlayerDesign` (editable source) are saved on every Save action.
