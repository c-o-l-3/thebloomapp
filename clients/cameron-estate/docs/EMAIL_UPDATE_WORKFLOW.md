# Cameron Estate Email Update Workflow

This document outlines how to update Cameron Estate email templates in both GoHighLevel (GHL) and the Bloom system.

## Overview

Cameron Estate emails exist in two places:
1. **GoHighLevel (GHL)** - Email factory templates used in GHL automations
2. **Bloom** - Unlayer-based templates used in the Bloom visual editor

## System Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│  GoHighLevel        │     │  Bloom System       │
│  (Email Factory)    │     │  (Unlayer Editor)  │
│                     │     │                     │
│  ghl-imported-      │     │  journey-api DB     │
│  templates/         │     │                     │
└─────────┬───────────┘     └─────────┬───────────┘
          │                             │
          │ Export via REST API        │ import-cameron-emails.js
          │ (PIT token)                │ (via live API)
          │                             │
          ▼                             ▼
    Updated in GHL              Updated in Bloom DB
```

## Environment Variables

Credentials live in `apps/journey-api/.env`:

```bash
GHL_API_KEY="pit-eacd72c1-9df2-476f-8892-ab341d8f6d88"
GHL_LOCATION_ID="G7APqyfJ6lyi4l28noZj"
API_URL="https://bloom-backend.zeabur.app/api"  # or localhost
BLOOM_EMAIL="cole@bloom.com"
BLOOM_NAME="Cole"
```

## Workflow

### Step 1: Import GHL Templates (first time or to refresh)

```bash
cd clients/cameron-estate/email-factory
GHL_API_KEY="pit-eacd72c1-9df2-476f-8892-ab341d8f6d88" \
GHL_LOCATION_ID="G7APqyfJ6lyi4l28noZj" \
npm run ghl:import
```

This fetches all email templates from GHL and saves them to `clients/cameron-estate/ghl-imported-templates/` as both `.json` and `.html` files.

### Step 2: Edit the HTML Files

The **`.html` files are the source of truth** for email content. Edit them directly:

```
clients/cameron-estate/ghl-imported-templates/
  001_E_Day_1_-_Welcome.html         ← edit this
  001_E_Day_2_-_What_to_Look_For.html
  ...
```

Do not edit the `.json` files directly — they get overwritten in Step 3.

### Step 3: Sync HTML into individual JSON files

After editing `.html` files, run this to write the new HTML into the individual `.json` files:

```bash
python3 -c "
import json, os, glob

base = 'clients/cameron-estate/ghl-imported-templates'

for html_path in sorted(glob.glob(f'{base}/001_E_Day_*.html')):
    name = os.path.basename(html_path).replace('.html', '')
    json_path = f'{base}/{name}.json'
    if not os.path.exists(json_path): continue
    with open(html_path) as f:
        new_html = f.read()
    with open(json_path) as f:
        data = json.load(f)
    data['html'] = new_html
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f'Updated {name}.json')
"
```

### Step 4: Push to GHL (Bloom)

```bash
cd clients/cameron-estate/email-factory
GHL_API_KEY="pit-eacd72c1-9df2-476f-8892-ab341d8f6d88" \
GHL_LOCATION_ID="G7APqyfJ6lyi4l28noZj" \
node scripts/export-ghl-templates.js --all
```

This pushes the updated templates back to GHL via the REST API. All 10 templates are updated (8 nurture sequence + 2 quickstart).

### Step 4: Sync to Bloom Database

The Bloom system uses Unlayer designs stored in the database. To update these:

```bash
cd apps/journey-api
API_URL=https://bloom-backend.zeabur.app/api \
node src/import-cameron-emails.js
```

This script:
1. Authenticates with the Bloom API
2. Finds the Cameron Estate client and journey
3. Updates each touchpoint with the Unlayer design from `clients/cameron-estate/email-generation/emails/`

## Email File Mapping

The `import-cameron-emails.js` script maps files to touchpoint `orderIndex`:

| File | orderIndex | Subject |
|------|------------|---------|
| 01-welcome-email.json | 1 | Welcome to Cameron Estate Inn |
| 02-what-to-look-for.json | 4 | What to Look For When Touring a Venue |
| 03-real-stories.json | 5 | What Couples Are Saying About Cameron Estate |
| 04-vision.json | 8 | Your Wedding Vision — Let's Make It Real |
| 05-pinterest.json | 9 | Pinterest vs. Reality: What Actually Works |
| 06-inclusions.json | 11 | Everything Included — No Surprises |
| 07-faq.json | 13 | Your Questions, Answered |
| 08-last-chance.json | 16 | Still Thinking It Over? |

## Adding a "Schedule Tour" Button

To add a gold "Schedule Tour" button above pricing links in GHL templates:

```bash
cd apps/journey-api
node src/add-schedule-tour-button.js
```

Then re-export to GHL:
```bash
cd clients/cameron-estate/email-factory
GHL_API_KEY="..." GHL_LOCATION_ID="..." node scripts/export-ghl-templates.js --all
```

## Key Files

| Purpose | File |
|---------|------|
| GHL V2 API service | `clients/cameron-estate/email-factory/src/services/ghl-email-templates-v2.js` |
| Import from GHL | `clients/cameron-estate/email-factory/scripts/import-ghl-templates.js` |
| Export to GHL | `clients/cameron-estate/email-factory/scripts/export-ghl-templates.js` |
| Add Schedule Tour button | `apps/journey-api/src/add-schedule-tour-button.js` |
| Import to Bloom | `apps/journey-api/src/import-cameron-emails.js` |
| GHL imported templates | `clients/cameron-estate/ghl-imported-templates/` |
| Bloom email designs | `clients/cameron-estate/email-generation/emails/` |

## Changelog

### April 8, 2026 - Uniform Footer + Button Fix

Applied a uniform footer to all 8 nurture sequence emails:

**Bug fixed:** "View 2026 Pricing" button was invisible (black text on dark navy) — `<a>` tag had no inline styles.

**Changes:**
- All 4 footer buttons now use fully inline styles (no CSS `#id` dependencies)
- Consistent button order: Schedule a Private Tour (gold) → View 2026 Pricing (navy) → View 2027 Pricing (navy) → Visit our website (outlined)
- Gold divider + Lisa Pierson signature block standardized across all emails

**Also added (earlier same day):** Gold "Schedule Tour" button above pricing links in all 8 email templates, linking to `https://link.msndr.io/widget/bookings/cameron-estate-inn-tour`

### Templates (GHL IDs)
| Template | GHL ID |
|----------|--------|
| 001 E Day 1 - Welcome | 6989f3343f4660695176ab31 |
| 001 E Day 2 - What to Look For | 6989f336c528f4c2c8193535 |
| 001 E Day 3 - Stories | 6989f3391cf63d188e16bce0 |
| 001 E Day 5 - Vision | 6989f33b071827972b6f6708 |
| 001 E Day 7 - Pinterest | 6989f33e1cf63d439316bd6a |
| 001 E Day 10 - Inclusions | 6989f3413f466013e276ac1f |
| 001 E Day 12 - FAQ | 6989f34319a4a94f6d7061f9 |
| 001 E Day 14 - Close | 6989f34673c4ce69cc49fff6 |
