# Maison Albion - GoHighLevel Client Configuration

## Overview

Maison Albion is a wedding venue in Albion, NY. This folder contains the complete GoHighLevel configuration extracted via API v2.

**Location ID:** `HzttFvMOh41pAjozlxkS`

**Website:** https://maisonalbion.com

**Address:** 13800 W County House Rd, Albion, NY 14411

---

## Data Extraction Status

| Resource | Status | Records | File |
|----------|--------|---------|------|
| Location Details | ✅ Complete | 1 | `location-config.json` |
| Pipelines | ✅ Complete | 4 | `opportunities/pipelines.json` |
| Contacts | ✅ Complete | 7,733 | `api-responses/contacts-data.json` |
| Email Templates | ✅ Complete | 7 | `emails/email-templates.json` |
| SMS Templates | ✅ Complete | 29 | `api-responses/sms-templates| **Workflows** | ✅ Complete | 48 |-data.json` |
 `workflows/workflow-templates.json` |
| Custom Fields | ⏳ Pending | - | `contacts/custom-fields.json` |
| Forms | ⏳ Pending | - | `forms/form-configurations.json` |
| Calendars | ⏳ Pending | - | `calendars/calendar-config.json` |

---

## Pipeline Structure

### Wedding Venue Pipeline (Primary)
1. **00 - Inquiry** - Initial lead capture
2. **01 - Site Tour Booked** - Tour scheduled
3. **02 - Proposal Sent** - Quote delivered
4. **03 - Proposal NOT Requested** - Nurture sequence
5. **04 - Contract Signed** - Booking confirmed
6. **05 - Wedding Complete** - Post-wedding follow-up

### Additional Pipelines
- Cleaning/Maintenance
- Vendor/Partner Management
- Internal Tasks

---

## Workflow Categories

### Pipeline-Aligned Workflows (48 Total)
- **00- Inquiry** - Published, v72
- **01 - Site Tour Booked** - Published, v43
- **02 - Proposal Sent** - Published, v34
- **03 - Proposal NOT Requested** - Published, v20
- **04 - Contract Signed!** - 3 variants (published/draft)
- **05 - Wedding Complete** - Published, v10

### Marketing Workflows
- Landing page workflows (Garden, Goth, Lesbian, Victorian themes)
- General landing page workflow

### Integration Workflows
- I Do Society integration
- The Knot leads
- Wedding Wire leads
- PPC leads via Pipedream

### Tracking & Analytics
- Google Ads conversions
- Google Analytics conversions
- Booking window calculations
- Speed to booking metrics
- Google Sheets sync

### Communication
- Customer reply handling
- Missed call text back
- IVR call flow
- Instagram/Facebook comment automation
- Text promos (Sip & Celebrate)

### Ghost/Lead Nurturing
- Yes/Maybe/No tag workflows

---

## Email Templates

7 templates extracted via Email Builder API:
- Radiance Beauty
- A Wedding Present
- (5 additional templates)

---

## SMS Templates

29 SMS templates organized by pipeline stage:
- Stage 00 - Inquiry (5 templates)
- Stage 01 - Site Tour Booked (5 templates)
- Stage 02 - Proposal Sent (5 templates)
- Stage 03 - Proposal NOT Requested (5 templates)
- Stage 04 - Contract Signed (5 templates)
- Stage 05 - Wedding Complete (4 templates)

---

## Next Steps

### Manual Exports Needed
1. **Custom Fields** - Export from GoHighLevel dashboard
   - Location > Settings > Custom Fields
2. **Forms** - Export from GoHighLevel dashboard
   - Location > Forms & Conversations > Forms
3. **Calendars** - Export from GoHighLevel dashboard
   - Location > Calendars

### API Limitations
- **Workflows:** Can list/get but cannot modify workflow steps via API
- **Solution:** Use Custom Values to dynamically update workflow content

---

## API Configuration

**Base URL:** `https://services.leadconnectorhq.com`

**Required Headers:**
```
Authorization: Bearer <PIT_TOKEN>
Version: 2021-07-28
Accept: application/json
```

**Key Endpoints:**
- `/locations/{id}` - Location details
- `/opportunities/pipelines` - Pipeline definitions
- `/workflows/?locationId={id}` - Workflow list
- `/emails/builder?locationId={id}` - Email templates
- `/locations/{id}/templates?type=sms` - SMS templates

---

## Contact

For questions about this configuration, refer to the GoHighLevel API documentation:
https://marketplace.gohighlevel.com/docs/
