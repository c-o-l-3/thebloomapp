# GoHighLevel API v2 - Documentation

This document provides comprehensive guidance for accessing the GoHighLevel API v2 to extract and manage client data.

## Base Configuration

### API Base URL
```
https://services.leadconnectorhq.com
```

### Authentication
- **Method:** Bearer Token (Private Integration Token - PIT)
- **Header:** `Authorization: Bearer <YOUR_PIT_TOKEN>`

### Required Headers
```http
Authorization: Bearer <PIT_TOKEN>
Version: 2021-07-28
Accept: application/json
Content-Type: application/json
```

### Location ID
Most endpoints require the `locationId` as a **query parameter**, not in the URL path or body:
```
?locationId=<LOCATION_ID>
```

---

## Endpoints

### 1. Location Details

**Endpoint:**
```
GET /locations/{locationId}
```

**Example:**
```bash
curl -X GET "https://services.leadconnectorhq.com/locations/HzttFvMOh41pAjozlxkS" \
  -H "Authorization: Bearer $GHL_PIT" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

**Response:** Location details including address, website, email, phone, social media links.

---

### 2. Pipelines

**Endpoint:**
```
GET /opportunities/pipelines
```

**Example:**
```bash
curl -X GET "https://services.leadconnectorhq.com/opportunities/pipelines?locationId=HzttFvMOh41pAjozlxkS" \
  -H "Authorization: Bearer $GHL_PIT" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

**Note:** Requires `locationId` as query parameter.

**Response:** All pipelines with stages, categories, and metadata.

---

### 3. Contacts

**Endpoint:**
```
GET /contacts
```

**Parameters:**
- `locationId` (required)
- `limit` (optional, default 100)
- `startAfterId` (optional, for pagination)

**Example:**
```bash
curl -X GET "https://services.leadconnectorhq.com/contacts?locationId=HzttFvMOh41pAjozlxkS&limit=100" \
  -H "Authorization: Bearer $GHL_PIT" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

**Pagination:** Use `startAfterId` from the last response to get next page.

---

### 4. Email Templates

**Endpoint:**
```
GET /emails/builder
```

**Example:**
```bash
curl -X GET "https://services.leadconnectorhq.com/emails/builder?locationId=HzttFvMOh41pAjozlxkS" \
  -H "Authorization: Bearer $GHL_PIT" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

**Important:** Do NOT use `/emailing/templates` - use `/emails/builder` instead.

---

### 5. SMS Templates

**Endpoint:**
```
GET /locations/{locationId}/templates
```

**Parameters:**
- `type=sms` (required query parameter)

**Example:**
```bash
curl -X GET "https://services.leadconnectorhq.com/locations/HzttFvMOh41pAjozlxkS/templates?type=sms" \
  -H "Authorization: Bearer $GHL_PIT" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

---

### 6. Workflows

**Endpoint:**
```
GET /workflows/
```

**Critical Requirements:**
1. **Trailing slash is required** - `/workflows/` not `/workflows`
2. **locationId as query parameter**
3. Requires `workflows.readonly` scope on PIT token

**Example:**
```bash
curl -X GET "https://services.leadconnectorhq.com/workflows/?locationId=HzttFvMOh41pAjozlxkS" \
  -H "Authorization: Bearer $GHL_PIT" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

**Response:** Array of workflow objects with ID, name, status, version, and timestamps.

---

## Common Gotchas

### 1. Wrong Base URL
❌ **Don't use:** `rest.gohighlevel.com`  
✅ **Use:** `services.leadconnectorhq.com`

### 2. Missing Version Header
Without `Version: 2021-07-28`, requests may fail silently or return unexpected results.

### 3. Workflows 404 or Empty Response
- Check for trailing slash: `/workflows/` ✅
- Check `locationId` is passed as query parameter ✅
- Verify PIT token has `workflows.readonly` scope ✅

### 4. Email Templates Not Found
- Use `/emails/builder`, NOT `/emailing/templates`

### 5. SMS Templates Not Found
- Append `?type=sms` to the templates endpoint

### 6. Location ID Placement
| Endpoint | Where to put locationId |
|----------|------------------------|
| `/locations/{id}` | In URL path |
| `/workflows/` | As query param: `?locationId={id}` |
| `/contacts` | As query param: `?locationId={id}` |
| `/emails/builder` | As query param: `?locationId={id}` |

---

## API Limitations

### Cannot Do via API
- ❌ Create/modify workflow steps
- ❌ Update email template content directly
- ❌ Modify pipeline stages via API

### Workaround: Custom Values
Use Custom Values to dynamically update workflow content:

1. In workflow UI, use: `{{custom_values.my_dynamic_content}}`
2. Use API to update Custom Value:
   ```
   PATCH /locations/{id}/customValues
   ```

---

## Environment Setup

### Set Environment Variable
```bash
export GHL_PIT="pit-your-token-here"
```

### Quick Test Script (Node.js)
```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://services.leadconnectorhq.com/workflows/',
  params: { locationId: 'YOUR_LOCATION_ID' },
  headers: {
    Authorization: 'Bearer YOUR_PIT_TOKEN',
    Version: '2021-07-28',
    Accept: 'application/json'
  }
};

axios.request(options)
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error.response?.status, error.response?.data));
```

---

## Quick Reference

| Resource | Endpoint | Method | locationId |
|----------|----------|--------|------------|
| Location | `/locations/{id}` | GET | In path |
| Pipelines | `/opportunities/pipelines` | GET | Query param |
| Contacts | `/contacts` | GET | Query param |
| Email Templates | `/emails/builder` | GET | Query param |
| SMS Templates | `/locations/{id}/templates` | GET | In path + type=sms |
| Workflows | `/workflows/` | GET | Query param |

---

## Links
- [GoHighLevel API Documentation](https://marketplace.gohighlevel.com/docs/)
- [API Reference](https://public-api.wordpress.com/wp-json/gohighlevel/v2/)
