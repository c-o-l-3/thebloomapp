# BloomBuilder Airtable Schema

**Base Name:** Bloom Builder  
**Base ID:** `app66pKRuzhlUzy3j`

---

## Tables Created ✅

| # | Table | Fields |
|---|-------|--------|
| 1 | Clients | 6 fields |
| 2 | Pipelines | 4 fields |
| 3 | Journeys | 5 fields |
| 4 | Touchpoints | 7 fields |
| 5 | Versions | 4 fields |
| 6 | Approvals | 2 fields |
| 7 | Templates | 4 fields |
| 8 | Sync History | 4 fields |

---

## Field Details

### Clients Table (`tblP62Y7hfmcbXMaV`)
| Field | Type |
|-------|------|
| Name | Single line text |
| Location ID | Single line text |
| PIT Token | Single line text |
| Website | URL |
| Status | Single select (Active, Inactive, Onboarding, Archived) |
| Notes | Multiline text |

### Pipelines Table (`tblvWvKDgJFdBkiWg`)
| Field | Type |
|-------|------|
| Pipeline Name | Single line text |
| Pipeline ID | Single line text |
| Stages | Multiline text |
| Is Default | Checkbox |

### Journeys Table (`tbln5pwbtnh6LR2bt`)
| Field | Type |
|-------|------|
| Journey Name | Single line text |
| Type | Single select (Wedding, Corporate, Event, Inquiry, Nurture) |
| Status | Single select (Draft, In Review, Active, Paused, Archived) |
| Description | Multiline text |
| Tags | Multiple select (Onboarding, Retention, Reactivation) |

### Touchpoints Table (`tblzOaoLSX1la4gx3`)
| Field | Type |
|-------|------|
| Day | Number |
| Type | Single line text (Email, SMS, Task, etc.) |
| Internal Name | Single line text |
| Subject | Single line text |
| Body Content | Multiline text |
| GHL Template ID | Single line text |
| Status | Single line text (Draft, Approved, etc.) |

### Versions Table (`tblZy8nRwZ5hpc9a6`)
| Field | Type |
|-------|------|
| Version Number | Number |
| Subject | Single line text |
| Body Content | Multiline text |
| Change Notes | Multiline text |

### Approvals Table (`tblAh2bnS8k7AiCr2`)
| Field | Type |
|-------|------|
| Status | Single line text |
| Comments | Multiline text |

### Templates Table (`tblS7cUS0rQ7c1FqC`)
| Field | Type |
|-------|------|
| GHL Template ID | Single line text |
| Template Type | Single line text |
| Last Synced | Single line text |
| Sync Status | Single line text |

### Sync History Table (`tblVndO0qmS8tsYfo`)
| Field | Type |
|-------|------|
| Operation | Single line text |
| Status | Single line text |
| Items Synced | Number |
| Errors | Multiline text |

---

## Current Data

### Clients Table
| Name | Location ID | Website | Status |
|------|-------------|---------|--------|
| Maison Albion | HzttFvMOh41pAjozlxkS | https://maisonalbion.com | Active |

Record ID: `recw8H9wtRUkd984Q`

---

## Next Steps

1. **Add linked fields** manually in Airtable UI
2. **Add select options** for fields that need them
3. **Add a sample journey** with touchpoints
4. **Test the sync engine**

### Linking Tables
Add these linked fields in Airtable UI:

- **Journeys → Clients** (link to Clients table)
- **Journeys → Pipelines** (link to Pipelines table)
- **Touchpoints → Journeys** (link to Journeys table)
- **Versions → Touchpoints** (link to Touchpoints table)
- **Approvals → Touchpoints** (link to Touchpoints table)
- **Templates → Clients** (link to Clients table)
- **Templates → Touchpoints** (link to Touchpoints table)
- **Sync History → Clients** (link to Clients table)
