# Cameron Estate Email Workflow

This is the active workflow for creating and editing Cameron Estate emails. It replaces the MJML email-factory pipeline.

## Overview

Emails are authored as **Unlayer design JSON** (not raw HTML or MJML). This means:
- An LLM generates the initial design as Unlayer JSON
- A human edits it visually in the Bloom app's built-in WYSIWYG editor
- The editor exports clean HTML for pasting into GoHighLevel

---

## Step-by-Step Workflow

### 1. Generate Email JSON with an LLM

Open `system-prompt.md` and copy its full contents into any LLM (Claude, ChatGPT, etc.).

Append a per-email brief at the bottom describing:
- Email name and number in the sequence
- Subject line and preheader
- Key message / theme
- Content sections
- CTA and images to use

The LLM will return a complete Unlayer design JSON object.

### 2. Import into the Visual Editor

1. Open the Bloom app and navigate to the Cameron Estate journey
2. Click the touchpoint you want to edit
3. Click **"Edit Visually"** to open the Unlayer editor
4. Click **"Import JSON"** in the editor toolbar
5. Paste the LLM-generated JSON and click **"Load Design"**

The email renders immediately in the WYSIWYG canvas.

### 3. Edit Visually

Use the Unlayer editor to:
- Click any text block to edit copy directly
- Drag in new blocks from the left panel
- Swap images
- Adjust padding, colors, and layout

For major structural changes (new sections, layout overhauls), go back to the LLM with revised instructions rather than fighting the drag-and-drop.

### 4. Save

Click **"Save"** in the editor toolbar. This saves both the Unlayer design JSON and the compiled HTML to the database, so the visual editor can reload the design next time.

### 5. Export HTML for GoHighLevel

1. Click **"Copy HTML"** in the editor toolbar
2. The compiled HTML appears in a modal — click **"Copy HTML"** to copy to clipboard
3. Paste into the GoHighLevel email template editor

---

## File Reference

```
clients/cameron-estate/email-generation/
├── system-prompt.md              # LLM system prompt — copy into any AI chat
├── AGENT-CONVERSION-PROMPT.md   # Prompt for converting batches of emails
├── WORKFLOW.md                   # This file
├── emails/                       # Unlayer design JSON files (source of truth)
│   ├── 01-welcome-email.json
│   ├── 02-what-to-look-for.json
│   ├── 03-real-stories.json
│   ├── 04-vision.json
│   ├── 05-pinterest.json
│   ├── 06-inclusions.json
│   ├── 07-faq.json
│   └── 08-last-chance.json
└── html-source/                  # Original HTML files (legacy reference only)
    └── *.html
```

The JSON files in `emails/` are the source of truth. The `html-source/` files are the original MJML-compiled HTML kept for reference — do not edit them.

---

## Email Sequence

| # | Day | Theme | File |
|---|-----|-------|------|
| 1 | 0   | Welcome | `01-welcome-email.json` |
| 2 | 2   | What to Look For | `02-what-to-look-for.json` |
| 3 | 3   | Real Couple Stories | `03-real-stories.json` |
| 4 | 5   | Your Wedding Vision | `04-vision.json` |
| 5 | 7   | Pinterest vs. Reality | `05-pinterest.json` |
| 6 | 10  | Everything Included | `06-inclusions.json` |
| 7 | 12  | FAQ | `07-faq.json` |
| 8 | 14  | Last Chance | `08-last-chance.json` |

---

## GHL Merge Tags

Always preserve these in email copy — they are replaced at send time by GoHighLevel:

| Tag | Value |
|-----|-------|
| `{{contact.first_name}}` | Recipient's first name |
| `{{links.book_tour}}` | Tour booking calendar link |
| `{{links.unsubscribe}}` | Unsubscribe link (required) |

---

## Legacy: MJML Email Factory

The `email-factory/` directory contains the original MJML pipeline. It is no longer the active workflow. The compiled HTML files in `output/compiled-emails/` were used as reference source when building the Unlayer JSON files.
