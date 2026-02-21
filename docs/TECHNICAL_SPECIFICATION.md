# Technical Specification: Headless CRM Content Engine

**Version:** 1.0  
**Last Updated:** 2026-02-08  
**Architecture:** Airtable → Sync Engine → GoHighLevel

---

## 1. Overview

This specification outlines the database structure, sync logic, and API payloads for managing Email and SMS templates programmatically using Airtable as the "Single Source of Truth" and GoHighLevel (GHL) as the execution layer.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Airtable (Content Layer)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Clients   │  │   Journeys   │  │  Touchpoints    │    │
│  │   (tbl)     │──│    (tbl)     │──│     (tbl)        │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└────────────────────────┬──────────────────────────────────┘
                         │ API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Sync Engine (Node.js/Python)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Fetch Approved Records                          │    │
│  │  2. Check GHL Template ID                           │    │
│  │  3. Create or Update (POST/PUT)                     │    │
│  │  4. Update Airtable with GHL ID                    │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────┬──────────────────────────────────┘
                         │ API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GoHighLevel (Execution Layer)                  │
│  ┌────────────────┐  ┌────────────────┐                     │
│  │ Email Templates│  │ SMS Templates  │                     │
│  └────────────────┘  └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Airtable Schema

### 3.1 Touchpoints Table (Primary)

**Table Name:** `Touchpoints`  
**API Field Names (Critical):**

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| **Internal Name** | Single Line Text | Unique name for GHL (e.g., `Maison - Day 01 - Intro Email`) | Yes |
| **Type** | Single Select | Options: `Email`, `SMS` | Yes |
| **Subject Line** | Single Line Text | Email subject (leave blank for SMS) | No |
| **Body Content** | Long Text (Rich Text) | Content in Markdown (devs convert to HTML) | Yes |
| **Status** | Single Select | Options: `Draft`, `Review`, `Approved` | Yes |
| **GHL Template ID** | Single Line Text | Stores GHL ID after sync (e.g., `email_abc123`) | No |
| **Last Synced** | Date/Time | Timestamp of last successful push | No |
| **Journey** | Link to Journeys | Linked record | No |
| **Client** | Link to Clients | Linked record | No |

### 3.2 Related Tables

**Clients Table:**
- Client Name
- GHL Location ID
- Industry
- Contact Email

**Journeys Table:**
- Journey Name
- Duration (days)
- Client (link)
- Touchpoints (link)
- Status

---

## 4. API Configuration

### 4.1 GoHighLevel API Settings

**Base URL:**
```
https://services.leadconnectorhq.com
```

**Required Headers:**
```json
{
  "Authorization": "Bearer <ACCESS_TOKEN>",
  "Version": "2021-07-28",
  "Content-Type": "application/json"
}
```

### 4.2 Environment Variables

```env
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here
AIRTABLE_API_KEY=your_airtable_key_here
AIRTABLE_BASE_ID=your_base_id_here
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY=5000
```

---

## 5. Sync Logic (The Engine)

### 5.1 Execution Flow

```
START: Status = "Approved"
    │
    ▼
┌─────────────────────┐
│ Fetch Record from   │
│ Airtable            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Check GHL Template  │
│ ID Field            │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
 Empty?      Exists?
    │           │
    │           ▼
    │     ┌──────────────────┐
    │     │ UPDATE Existing │
    │     │ Send PUT request│
    │     │ Log success     │
    │     └──────────────────┘
    │
    ▼
┌─────────────────────┐
│ CREATE New          │
│ Send POST request   │
│ Capture ID from     │
│ response            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Update Airtable     │
│ Write GHL ID back   │
│ to record           │
└─────────────────────┘
    │
    ▼
   END
```

### 5.2 Decision Logic (Pseudocode)

```javascript
async function syncTouchpoint(record) {
  const payload = formatPayload(record);
  
  if (record.ghlTemplateId) {
    // UPDATE existing template
    await ghlService.updateEmailTemplate(record.ghlTemplateId, payload);
    await airtable.update(record.id, { 
      'Last Synced': new Date() 
    });
  } else {
    // CREATE new template
    const response = await ghlService.createEmailTemplate(payload);
    await airtable.update(record.id, { 
      'GHL Template ID': response.id,
      'Last Synced': new Date()
    });
  }
}
```

---

## 6. API Payloads

### 6.1 Email Templates

**Create (POST):**
```
Endpoint: POST /emails/builder
```

```json
{
  "locationId": "YOUR_LOCATION_ID",
  "title": "{{Internal Name}}",
  "name": "{{Internal Name}}",
  "type": "html",
  "subject": "{{Subject Line}}",
  "body": "<html><body>{{Converted HTML Content}}</body></html>"
}
```

**Update (PUT):**
```
Endpoint: PUT /emails/builder/{templateId}
```

```json
{
  "locationId": "YOUR_LOCATION_ID",
  "title": "{{Internal Name}}",
  "name": "{{Internal Name}}",
  "type": "html",
  "subject": "{{Subject Line}}",
  "body": "<html><body>{{Converted HTML Content}}</body></html>"
}
```

**Response:**
```json
{
  "id": "email_template_abc123",
  "name": "Maison - Day 01 - Intro Email",
  "subject": "Welcome to Maison Albion",
  "createdAt": "2026-02-08T10:00:00Z"
}
```

### 6.2 SMS Templates

**Create (POST):**
```
Endpoint: POST /locations/{locationId}/templates
```

```json
{
  "name": "{{Internal Name}}",
  "type": "sms",
  "templateType": "sms",
  "body": "{{Body Content}}",
  "attachments": []
}
```

**Update (PUT):**
```
Endpoint: PUT /locations/{locationId}/templates/{templateId}
```

```json
{
  "name": "{{Internal Name}}",
  "type": "sms",
  "templateType": "sms",
  "body": "{{Body Content}}",
  "attachments": []
}
```

---

## 7. Markdown to HTML Conversion

**Library:** Use `marked` or `showdown`

```javascript
import { marked } from 'marked';

function convertMarkdownToHtml(markdown) {
  return marked(markdown);
}

// Example conversion
const markdown = `
# Welcome to Maison Albion

We're thrilled to have you here!

**What to expect:**
- Personalized service
- Stunning venue views
- Expert planning

Best,
The Bloom Team
`;

const html = convertMarkdownToHtml(markdown);
```

---

## 8. GHL Workflow Setup (One-Time)

### 8.1 Create Workflow

1. Open GHL Workflow Builder
2. Create new workflow "Nurture Sequence"
3. Add "Send Email" step
4. Select template by **Internal Name** (exact match)

### 8.2 Template Linking

```
Workflow Step → Action: "Send Email"
    │
    ▼
Select Template: "Maison - Day 01 - Intro Email"
    │
    ▼
Save Workflow
```

### 8.3 Future Updates

When copywriter changes text in Airtable:
1. Update content
2. Change status to "Approved"
3. Run sync script
4. Script updates template at GHL ID
5. Workflow automatically sends updated version

---

## 9. Rate Limiting

- **Default:** 4 requests/second (250ms delay)
- **Retry:** 3 attempts on 429 (rate limit)
- **Backoff:** Exponential (5s, 10s, 15s)

```javascript
// Rate limit configuration
this.rateLimitDelay = 250;
this.maxRetries = 3;
this.retryDelay = 5000;
```

---

## 10. Error Handling

| Error Code | Handling |
|------------|----------|
| 400 | Log error, skip record |
| 401 | Invalid API key - abort |
| 404 | Record not found - skip |
| 429 | Retry with backoff (max 3x) |
| 500+ | Log error, notify admin |

---

## 11. File Structure

```
scripts/sync-engine/
├── src/
│   ├── services/
│   │   ├── ghl.js          ← Updated with spec endpoints
│   │   └── airtable.js
│   ├── utils/
│   │   └── logger.js
│   └── index.js            ← Entry point
├── config/
│   └── .env.example
└── package.json
```

---

## 12. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp config/.env.example config/.env
# Edit config/.env with your API keys

# 3. Run sync
npm start

# 4. View logs
npm run logs
```

---

## 13. Testing

### Test Email Template
```bash
npm run test:email -- --name="Test Email"
```

### Test SMS Template
```bash
npm run test:sms -- --name="Test SMS"
```

### Dry Run
```bash
npm run sync:dry -- --status=Approved
```

---

## 14. Monitoring

- **Logs:** `./logs/sync.log`
- **Metrics:** Records processed, errors, duration
- **Alerts:** Failed syncs > 5%

---

## 15. Support

For technical issues:
1. Check `logs/sync.log`
2. Verify Airtable field names match spec
3. Confirm GHL API version is `2021-07-28`
4. Review API response codes

See [`docs/PROGRAMMATIC_SETUP.md`](PROGRAMMATIC_SETUP.md) for detailed troubleshooting.
