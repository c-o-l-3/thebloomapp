# Programmatic Airtable Configuration

This guide covers the remaining tasks that currently require manual work in Airtable UI, with details needed to automate them via API.

---

## 1. Adding Linked Fields

### What Needs to Be Done
Create bidirectional links between tables:
- Journeys → Clients
- Journeys → Pipelines
- Touchpoints → Journeys
- Versions → Touchpoints
- Approvals → Touchpoints
- Templates → Clients
- Templates → Touchpoints
- Sync History → Clients

### API Challenge

**Problem:** The Meta API for creating linked fields requires knowing the **table ID** and creating fields on **existing tables**.

**Current Limitation:** The Airtable Meta API can:
- ✅ Create new tables with fields
- ❌ Add fields to existing tables (not supported)

### How to Do It Programmatically

Option A: **Create all tables with links in one pass** (requires knowing all table IDs first)

Option B: **Use Airtable's Field Schema API** (if available in your plan)

Option C: **Scripted UI automation** (Selenium/Playwright)

### Support Question Template

> **Subject:** Adding fields to existing tables via API
>
> I'm using the Airtable Meta API (`POST /v0/meta/bases/{baseId}/tables`) to programmatically create a schema.
>
> **Success:** I can create new tables with fields.
> **Challenge:** I need to add fields to EXISTING tables.
>
> **Question:** Is there an API endpoint to add fields to an existing table?
>
> I've tried:
> - `PATCH /v0/meta/bases/{baseId}/tables/{tableId}` - Returns 404
> - `POST /v0/meta/bases/{baseId}/fields` - Returns 404
>
> **Desired Outcome:**
> ```json
> {
>   "fields": [
>     {
>       "name": "Client",
>       "type": "multipleRecordLinks",
>       "options": {
>         "linkedTableId": "tblClientsTableId"
>       }
>     }
>   ]
> }
> ```
>
> Is this possible via API, or must linked fields be created only during table creation?

---

## 2. Adding Select Options

### What Needs to Be Done

Add choices to single select and multiple select fields:

| Field | Current Type | Needs Options |
|-------|--------------|---------------|
| Status (Clients) | Single select | Active, Inactive, Onboarding, Archived |
| Type (Journeys) | Single select | Wedding, Corporate, Event, Inquiry, Nurture |
| Status (Journeys) | Single select | Draft, In Review, Active, Paused, Archived |
| Type (Touchpoints) | Single select | Email, SMS, Task, Wait, Condition, Trigger, Form, Call |
| Status (Touchpoints) | Single select | Draft, Client Review, Approved, Published, Needs Revision |

### API Challenge

**Problem:** Creating fields with options requires:
1. Knowing exact option format
2. Properly escaped choices

**Our Attempts:**
```bash
# Failed - missing options for singleSelect
curl -d '{"name":"Status","type":"singleSelect"}' ...

# Failed - format issue  
curl -d '{"name":"Status","type":"singleSelect","options":{"choices":[{"name":"Active"}]}}' ...
```

### Support Question Template

> **Subject:** Creating singleSelect fields with choices via Meta API
>
> I'm trying to create a table with a singleSelect field using the Meta API:
> ```
> POST /v0/meta/bases/{baseId}/tables
> ```
>
> **Payload:**
> ```json
> {
>   "name": "Journeys",
>   "fields": [
>     {
>       "name": "Type",
>       "type": "singleSelect",
>       "options": {
>         "choices": [
>           { "name": "Wedding" },
>           { "name": "Corporate" },
>           { "name": "Event" }
>         ]
>       }
>     }
>   ]
> }
> ```
>
> **Error:** `INVALID_FIELD_TYPE_OPTIONS_FOR_CREATE`
>
> **Questions:**
> 1. Is the `choices` array format correct?
> 2. Are there additional required fields in options?
> 3. Can you provide a working example of creating a singleSelect field?

---

## 3. Adding Sample Data

### What Needs to Be Done

Create a sample journey with touchpoints:

**Journeys Table (1 record):**
- Name: "Maison Albion Wedding Journey"
- Type: "Wedding"
- Status: "Draft"
- Description: "Standard wedding inquiry flow"

**Touchpoints Table (6+ records):**
- Day 0: Welcome email
- Day 1: Inquiry follow-up
- Day 3: Brochure SMS
- Day 7: Calendar invite
- Day 14: Proposal email
- Day 30: Final outreach

### API for Creating Records

This **IS** possible via API:

```bash
# Create a journey record
curl -X POST "https://api.airtable.com/v0/app66pKRuzhlUzy3b/Journeys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "Journey Name": "Maison Albion Wedding Journey",
      "Type": "Wedding",
      "Status": "Draft",
      "Description": "Standard wedding inquiry flow"
    }
  }'
```

### Support Question Template

> **Subject:** Creating linked records via API
>
> I'm creating a journey system where:
> - Journeys table links to Clients
> - Touchpoints table links to Journeys
>
> **Question:** How do I create a linked record?
>
> **My approach:**
> 1. Create Journey record (works)
> 2. Get Journey record ID
> 3. Create Touchpoint with `{"Journey": [recordId]}`
>
> **Error:** Unknown field name "Journey"
>
> **Context:** The linked field was created in the UI, not via API.
>
> **Is this the correct syntax for linked records?**
> ```json
> {
>   "fields": {
>     "Journey": ["recJourneyRecordId"]
>   }
> }
> ```

---

## Summary for Support Request

### Overall Challenge

The Airtable Meta API for schema creation has gaps:

| Operation | Supported? | Notes |
|-----------|------------|-------|
| Create base | ✅ | Via UI or POST /meta/bases |
| Create table with fields | ✅ | But complex fields fail |
| Add fields to existing table | ❌ | No endpoint found |
| Create linked records | ⚠️ | Requires linked field to exist |

### Desired End State

A fully automated setup script that:
1. Creates base
2. Creates all tables with correct fields (including selects)
3. Creates linked fields
4. Seeds sample data

### Current Blocker

The Meta API doesn't seem to support:
1. Adding fields to existing tables
2. Creating select fields with choices programmatically

### Alternative Approaches to Explore

1. **Airtable Automations** - Create setup automation in Airtable
2. **CSV Import** - Export schema as CSV, import via API
3. **Template Base** - Create once, duplicate via API
4. **Third-party tools** - Use Make.com or Zapier for setup

---

## Quick Reference: Table IDs

| Table | ID |
|-------|-----|
| Clients | `tblP62Y7hfmcbXMaV` |
| Pipelines | `tblvWvKDgJFdBkiWg` |
| Journeys | `tbln5pwbtnh6LR2bt` |
| Touchpoints | `tblzOaoLSX1la4gx3` |
| Versions | `tblZy8nRwZ5hpc9a6` |
| Approvals | `tblAh2bnS8k7AiCr2` |
| Templates | `tblS7cUS0rQ7c1FqC` |
| Sync History | `tblVndO0qmS8tsYfo` |

**Base ID:** `app66pKRuzhlUzy3j`
