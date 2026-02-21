# BloomBuilder Project Handbook

A comprehensive guide for the BloomBuilder system, documenting lessons learned, best practices, and troubleshooting knowledge.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Airtable Setup Guide](#airtable-setup-guide)
4. [GoHighLevel Integration](#gohighlevel-integration)
5. [Lessons Learned](#lessons-learned)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Quick Reference](#quick-reference)
8. [Common Tasks](#common-tasks)

---

## System Overview

### Purpose
BloomBuilder is a "Headless CMS" for GoHighLevel CRM operations, separating:
- **Content Creation** (Airtable) - Copywriters create journeys
- **Visualization** (React Flow) - Clients review/approve
- **Execution** (GoHighLevel) - Automated workflows

### Components
```
BloomBuilder/
├── docs/                    # Documentation
├── apps/journey-visualizer/ # React Flow UI
├── scripts/sync-engine/     # Airtable → GHL sync
├── clients/                 # Client configurations
└── templates/               # Reusable templates
```

---

## Architecture

### Layer 1: Database (Airtable)
Structured database for journey content with approval workflows.

**Tables:**
- `Clients` - GoHighLevel client accounts
- `Journeys` - Customer journey definitions
- `Touchpoints` - Individual communications
- `Versions` - Version history
- `Approvals` - Approval workflow
- `Templates` - GHL template mapping
- `Sync History` - Sync operation logs

### Layer 2: Visualizer (React Flow)
Client-facing web app showing journey timeline.

### Layer 3: Sync Engine (Node.js)
API bridge that syncs approved content to GoHighLevel.

---

## Airtable Setup Guide

### Creating a New Base via API

#### Step 1: Generate Token
1. Go to https://airtable.com/create/tokens
2. Create token with scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:write`
3. Save the token immediately (shown only once)

#### Step 2: Create Base
```bash
# Create base
curl -X POST "https://api.airtable.com/v0/meta/bases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"YourBaseName"}'
```

#### Step 3: Create Tables
```bash
# Create a table with basic fields
curl -X POST "https://api.airtable.com/v0/meta/bases/{baseId}/tables" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"TableName",
    "fields":[
      {"name":"Field1","type":"singleLineText"},
      {"name":"Field2","type":"multilineText"}
    ]
  }'
```

### Field Type Requirements ⚠️

**CRITICAL:** Some field types REQUIRE an options object:

| Type | Requires Options? | Example |
|------|-------------------|---------|
| `singleLineText` | No | `{"name":"Title","type":"singleLineText"}` |
| `multilineText` | No | `{"name":"Notes","type":"multilineText"}` |
| `number` | **YES** | `{"name":"Day","type":"number","options":{"precision":0}}` |
| `checkbox` | **YES** | `{"name":"Active","type":"checkbox","options":{"color":{"name":"gray"},"icon":"check"}}` |
| `dateTime` | **YES** | Must use UI or provide proper options |
| `singleSelect` | **YES** | `{"name":"Status","type":"singleSelect","options":{"choices":[{"name":"Active"}]}}` |
| `multipleSelects` | **YES** | `{"name":"Tags","type":"multipleSelects","options":{"choices":[{"name":"Tag1"}]}}` |

**Lesson Learned:** Always test field types individually. When in doubt, use `singleLineText` and convert to proper type in Airtable UI later.

### Linking Tables

To create linked fields, you need the **table ID** (not name):

```bash
# First, get table ID from creation response or list
curl "https://api.airtable.com/v0/meta/bases/{baseId}/tables" \
  -H "Authorization: Bearer $TOKEN"

# Then create linked field
curl -X POST "https://api.airtable.com/v0/meta/bases/{baseId}/tables" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"ChildTable",
    "fields":[
      {
        "name":"Parent",
        "type":"multipleRecordLinks",
        "options":{"linkedTableId":"tblParentTableId"}
      }
    ]
  }'
```

---

## GoHighLevel Integration

### API Configuration

**Base URL:** `https://services.leadconnectorhq.com`

**Required Headers:**
```http
Authorization: Bearer <PIT_TOKEN>
Version: 2021-07-28
Accept: application/json
```

### Key Endpoints

| Resource | Endpoint | Notes |
|----------|----------|-------|
| Location | `/locations/{id}` | ID in URL path |
| Pipelines | `/opportunities/pipelines` | locationId as query param |
| Contacts | `/contacts` | locationId as query param |
| Email Templates | `/emails/builder` | locationId as query param |
| SMS Templates | `/locations/{id}/templates?type=sms` | |
| **Workflows** | `/workflows/` | ⚠️ Trailing slash required! |

### Workflow Endpoint Critical Details

**Common Mistake:** Missing trailing slash

❌ `GET /workflows` → 404 or empty  
✅ `GET /workflows/` → Works!

**Required:**
- Trailing slash: `/workflows/`
- locationId as query parameter: `?locationId={id}`
- `workflows.readonly` scope on PIT token

### Email Templates Endpoint

**Common Mistake:** Using wrong endpoint

❌ `/emailing/templates` → Empty response  
✅ `/emails/builder` → Returns templates

### SMS Templates Endpoint

**Common Mistake:** Missing type parameter

❌ `/locations/{id}/templates` → All templates  
✅ `/locations/{id}/templates?type=sms` → SMS only

---

## Lessons Learned

### 1. Airtable Field Options
**Problem:** `INVALID_FIELD_TYPE_OPTIONS_FOR_CREATE` error

**Root Cause:** Some field types require an options object, even when empty options would work in the UI.

**Solution:** For complex types, either:
- Create basic `singleLineText` fields first
- Convert types manually in Airtable UI
- Research exact options format for each type

**Lesson:** Start simple. Add complexity after basic structure works.

### 2. GoHighLevel Workflows API
**Problem:** Empty response or 404 from `/workflows` endpoint

**Root Cause:** Missing trailing slash and incorrect locationId placement.

**Solution:** Use exact format:
```
https://services.leadconnectorhq.com/workflows/?locationId={id}
```

**Lesson:** Always check API docs for exact URL formatting. Small differences matter.

### 3. Email Templates Endpoint
**Problem:** No templates returned

**Root Cause:** Wrong endpoint (`/emailing/templates` vs `/emails/builder`)

**Solution:** Use `/emails/builder` for email templates.

**Lesson:** When API returns unexpected results, check for alternative endpoints.

### 4. Token Permissions
**Problem:** API calls fail with permission errors

**Solution:**
- Verify token has correct scopes
- For creating bases/tables: `schema.bases:write`
- For reading data: `data.records:read`
- For writing data: `data.records:write`

**Lesson:** Document required scopes before starting integration.

### 5. Linked Table References
**Problem:** Can't link tables programmatically

**Root Cause:** Need table ID, not table name.

**Solution:** 
1. Create parent table first
2. Get table ID from response
3. Use ID when creating linked fields

**Lesson:** API operations are order-dependent. Plan sequence.

---

## Troubleshooting Guide

### Airtable Issues

#### "Invalid options for {field}"
**Cause:** Field type requires options but none provided.

**Fix:** 
- For `number`: Add `{"precision":0}`
- For `singleSelect`: Add choices array
- Use `singleLineText` for simple fields

#### "Server error" on base creation
**Cause:** Token may lack `schema.bases:write` scope.

**Fix:** 
1. Go to https://airtable.com/create/tokens
2. Ensure `schema.bases:write` is enabled
3. Save changes and regenerate token if needed

#### Can't access base metadata
**Cause:** Token may only have record permissions.

**Fix:** Use token with schema permissions for metadata operations.

### GoHighLevel Issues

#### Empty workflows response
**Checklist:**
1. ✅ Trailing slash in URL?
2. ✅ locationId as query param?
3. ✅ Version header present?
4. ✅ Token has `workflows.readonly` scope?

#### Email templates not found
**Check:** Using `/emails/builder` not `/emailing/templates`

#### Contacts not returning
**Fix:** Add pagination with `startAfterId` for large datasets.

---

## Quick Reference

### Airtable API Endpoints
```
List bases:           GET /v0/meta/bases
Create base:          POST /v0/meta/bases
List tables:          GET /v0/meta/bases/{baseId}/tables
Create table:         POST /v0/meta/bases/{baseId}/tables
Create record:        POST /v0/{baseId}/{tableId}
List records:         GET /v0/{baseId}/{tableId}
```

### GoHighLevel API Endpoints
```
Locations:          GET /locations/{id}
Pipelines:          GET /opportunities/pipelines?locationId={id}
Contacts:           GET /contacts?locationId={id}&limit=100
Email Templates:   GET /emails/builder?locationId={id}
SMS Templates:      GET /locations/{id}/templates?type=sms
Workflows:          GET /workflows/?locationId={id}
```

### Current Configuration
```
Airtable Base ID:   app66pKRuzhlUzy3j
Maison Albion GHL:  HzttFvMOh41pAjozlxkS
```

---

## Common Tasks

### Adding a New Client

1. **Airtable:** Add record to Clients table
   - Name, Location ID, PIT Token, Website, Status

2. **GoHighLevel:** Extract data
   ```bash
   curl "https://services.leadconnectorhq.com/locations/{locationId}" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Version: 2021-07-28"
   ```

3. **Repository:** Copy template to `clients/{client-name}/`
4. **Documentation:** Update client list in README

### Syncing a New Journey

1. Create journey in Airtable (Journeys table)
2. Add touchpoints (Touchpoints table)
3. Set status to "Approved"
4. Run sync engine:
   ```bash
   cd scripts/sync-engine && npm run sync
   ```

### Extracting Workflows

```bash
curl "https://services.leadconnectorhq.com/workflows/?locationId={id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Version: 2021-07-28" \
  -H "Accept: application/json"
```

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-08 | Initial documentation | BloomBuilder |
| 2026-02-08 | Added field type requirements | BloomBuilder |
| 2026-02-08 | Added GHL workflow endpoint details | BloomBuilder |

---

## References

- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [GoHighLevel API Documentation](https://marketplace.gohighlevel.com/docs/)
- [React Flow Documentation](https://reactflow.dev/docs)
