# Cameron Estate Email Factory

A comprehensive "Headless Email Factory" using Node.js and MJML that generates high-fidelity, brand-compliant emails for Cameron Estate Inn and pushes them to the GoHighLevel (GHL) API.

## 🎯 Overview

This system compiles beautiful, marketing-focused MJML email templates and publishes them directly to GoHighLevel, featuring:

- **Master Shell Template** - High-end wedding stationery design with Cameron Estate branding
- **Smart Gallery Component** - Responsive image galleries with multiple layout options
- **Automated Trigger Links** - Safe link replacement with GHL API integration
- **Content Compliance** - Automatic text replacements for legal requirements
- **7 Complete Email Campaigns** - Ready-to-use nurture sequence

---

## 📧 Email Campaigns

### Campaign: 14-Day Nurture Sequence

| Day | Touchpoint | Name | Category | Layout |
|-----|------------|------|----------|--------|
| 1 | 1A | **Day 1 - Welcome** | welcome | 1-2-1 Gallery |
| 2 | 2B | **Day 2 - What to Look For** | education | 1-2-1 Gallery |
| 3 | 3A | **Day 3 - Stories** | social_proof | 1-2-1 Gallery |
| 5 | 5 | **Day 5 - Vision** | emotional | 1-2-1 Gallery |
| 7 | 6 | **Day 7 - Pinterest** | inspiration | Single Image |
| 10 | 6 | **Day 10 - Inclusions** | value | 1-2-1 Gallery |
| 12 | 8 | **Day 12 - FAQ** | objection_handling | Single Image |
| 14 | 10 | **Day 14 - Close** | close | No Gallery |

---

## 🚀 Quick Start

### Installation

```bash
cd clients/cameron-estate/email-factory
npm install
```

### Configuration

Set up your `.env` file:

```env
# GoHighLevel API
GHL_API_KEY=your_api_key
GHL_LOCATION_ID=your_location_id

# Optional: Push to GHL automatically
PUSH_TO_GHL=false

# Airtable (for preview sync)
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=your_base_id
```

### Build Commands

```bash
# Build all emails
npm run build

# Build specific email
npm run build -- --email day1_welcome

# Build by category
npm run build -- --category social_proof

# Dry run (no file output)
npm run build -- --dry-run

# Build and push to GHL
npm run build -- --push
```

### Preview Emails

```bash
# Generate HTML previews
npm run preview

# Sync previews to Airtable
npm run sync:airtable
```

### Sync GHL Links

```bash
# Fetch trigger links from GHL
node scripts/sync-links.js
```

---

## 📁 Project Structure

```
email-factory/
├── templates/
│   ├── master-shell.mjml      # Master template with branding
│   └── gallery-1-2-1.mjml      # 4-image gallery layout
├── src/
│   ├── build.js                # Main build script
│   ├── emails-config.js        # All email configurations
│   ├── services/
│   │   ├── mjml-compiler.js    # MJML compilation service
│   │   └── ghl-publisher.js    # GHL API integration
│   └── utils/
│       ├── content-compliance.js # Legal text replacements
│       └── link-replacer.js    # Link mapping & validation
├── scripts/
│   ├── sync-links.js           # Sync GHL trigger links
│   ├── preview.js              # Generate email previews
│   └── sync-airtable.js        # Airtable preview sync
├── output/
│   └── compiled-emails/        # Generated HTML files
└── package.json
```

---

## 🎨 Master Shell Template

The master template provides consistent Cameron Estate branding:

### Visual Design
- **Background:** `#FAFAFA` (Cream/Off-White)
- **Container:** `#FFFFFF` (White Paper) with `border-radius="4px"`
- **Primary Color:** `#2C3E50` (Deep Navy)
- **Accent Color:** `#D4AF37` (Gold)

### Typography
- **Headings:** Cormorant Garamond, serif
- **Body:** Poppins, sans-serif
- **Size:** 16px base, 1.6 line-height

### Footer
- Gold divider line
- Lisa Pierson - Wedding Sales
- Contact: 717-725-4831
- Team info: Cathi Tokle, Alison Kreider

---

## 🖼️ Smart Gallery Component

### Layout Options

#### 1-2-1 Layout (4-5 Images)
```
┌─────────────────────┐
│     Hero Image      │ ← Full width (600px)
└─────────────────────┘
┌─────────┬─────────┐
│ Image 1 │ Image 2 │ ← 2-column grid
└─────────┴─────────┘
┌─────────┬─────────┐
│ Image 3 │ Image 4 │ ← 2-column grid
└─────────┴─────────┘
```

#### Single Layout (1 Image)
```
┌─────────────────────┐
│    Hero Image       │ ← Full width
└─────────────────────┘
```

#### No Gallery
For emails without images

### Usage

```javascript
// In emails-config.js
{
  gallery: {
    layout: '1-2-1',
    images: [
      { src: 'url1', alt: 'Description', fullWidth: true },
      { src: 'url2', alt: 'Description' },
      { src: 'url3', alt: 'Description' },
      { src: 'url4', alt: 'Description' }
    ]
  }
}
```

---

## 🔗 Automated Trigger Links

### Link Syntax

Use `{{links.key}}` in your content to reference GHL trigger links:

```html
<mj-button href="{{links.book_tour}}">
  Schedule Your Tour
</mj-button>
```

### Available Link Keys

Configure in `src/data/links.json`:

```json
{
  "book_tour": "https://api.ghl.com/...",
  "view_pricing": "https://api.ghl.com/...",
  "calendar": "https://api.ghl.com/...",
  "pinterest": "https://pinterest.com/..."
}
```

### Sync GHL Links

```bash
# Fetch links from GHL API
node scripts/sync-links.js
```

**Safety:** Build fails if referenced link doesn't exist in JSON.

---

## ✅ Content Compliance Rules

The system automatically applies these legal text replacements:

| Original | Replaced With |
|----------|---------------|
| Champagne toast | Champagne toast (included in select packages) |
| Rentals & Décor | Event Inclusions |
| Bridal Suite | Two private changing spaces provided for the couple |

### Validation

The system validates content for:
- Prohibited claims (unlimited alcohol, free wedding)
- Missing compliance replacements
- Broken link references

---

## 📝 Email Configuration

Each email in `emails-config.js` includes:

```javascript
{
  name: 'Email Name',
  subject: 'Subject line with {{first_name}}',
  previewText: 'Preview text for inbox',
  category: 'category_name',
  gallery: {
    layout: '1-2-1',  // or 'single', 'none'
    images: [
      { src: 'url', alt: 'description', fullWidth: true }
    ]
  },
  content: `
    <mj-section>
      <mj-column>
        <mj-text>Your content here</mj-text>
      </mj-column>
    </mj-section>
  `
}
```

---

## 🔧 GHL API Integration

### Publishing Emails

```javascript
import ghlPublisher from './services/ghl-publisher.js';

// Connect to GHL
ghlPublisher.connect(apiKey, locationId);

// Push email
const result = await ghlPublisher.pushEmail({
  name: 'Email Name',
  subject: 'Subject line',
  html: '<html>...</html>'
});
```

### Supported Operations
- Create new email template
- Update existing template
- Sync email assets
- Fetch trigger links

---

## 🎯 Workflow Integration

The emails are designed for use with the 14-day customer journey workflow:

- **Day 1:** Welcome email → Instant
- **Day 2:** What to Look For → 24 hours
- **Day 3:** Stories → 24 hours
- **Day 5:** Vision → 48 hours
- **Day 7:** Pinterest → 48 hours
- **Day 10:** Inclusions → 72 hours
- **Day 12:** FAQ → 48 hours
- **Day 14:** Close → 48 hours

---

## 📊 Build Output

Each build generates:

```
output/
└── compiled-emails/
    ├── day1_welcome/
    │   ├── day1_welcome.html    # Final HTML
    │   └── day1_welcome.mjml    # Source MJML
    └── ...
```

---

## 🛠️ Development

### Adding New Emails

1. Add config to `src/emails-config.js`
2. Run `npm run build -- --email email_id`
3. Review output in `output/compiled-emails/`
4. Push with `npm run build -- --email email_id --push`

### Customizing Templates

Edit `templates/master-shell.mjml` for:
- Header/logo
- Footer content
- Typography
- Color scheme

### Adding Compliance Rules

Edit `src/utils/content-compliance.js`:

```javascript
{
  pattern: /old text/gi,
  replacement: 'New text',
  description: 'What this rule does'
}
```

---

## 📄 License

Part of TheBloomApp project - Internal use only.
