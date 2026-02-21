# BloomBuilder Onboarding Guide

## Overview

This guide covers the complete workflow for creating customer journeys and publishing them to clients in TheBloomApp (GoHighLevel).

---

## The Journey Builder Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         JOURNEY BUILDER WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │   DESIGN    │ ──▶ │   CREATE    │ ──▶ │   APPROVE   │ ──▶ │   SYNC      │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
  Airtable            Airtable            Airtable            GoHighLevel
  (Strategy)         (Content)           (Review)            (Live)

```

---

## Step 1: Design the Journey

Before creating anything, plan your journey:

### Questions to Answer

1. **What is the goal?**
   - Wedding inquiry conversion
   - Corporate event booking
   - Lead nurturing
   - Re-engagement

2. **Who is the audience?**
   - Newly engaged couples
   - Corporate planners
   - Past clients
   - Website visitors

3. **What channels?**
   - Email (for detailed content)
   - SMS (for urgent/promotional)
   - Tasks (for internal follow-up)

4. **What timeline?**
   - Days from initial contact
   - Wedding date milestones
   - Seasonal campaigns

### Example: Wedding Inquiry Journey

| Day | Channel | Purpose |
|-----|---------|---------|
| 0 | Email | Welcome + brochure |
| 1 | Email | Personal follow-up |
| 3 | SMS | Timely reminder |
| 7 | Email | Case study |
| 14 | Task | Sales call |
| 30 | Email | Final offer |

---

## Step 2: Create in Airtable

### Adding a New Client

1. **Add to Clients table:**
   ```
   Name:        [Venue Name]
   Location ID: [From GoHighLevel]
   PIT Token:   [From GoHighLevel]
   Website:     https://...
   Status:      Active
   ```

### Adding a New Journey

1. Go to **Journeys** table
2. Click **+ Add record**
3. Fill in:

| Field | Value |
|-------|-------|
| Journey Name | Wedding Inquiry Flow |
| Type | Wedding |
| Status | Draft |
| Description | Standard journey for wedding leads |
| Tags | Onboarding |

### Adding Touchpoints

For each step in your journey, add a record in **Touchpoints**:

| Field | Example |
|-------|---------|
| Day | 0 |
| Type | Email |
| Internal Name | Welcome Email |
| Subject | Welcome to [Venue Name]! |
| Body Content | Your HTML/Markdown content |
| Status | Draft |
| Order | 1 |

#### Email Template Structure

```markdown
## Hi {{contact.firstName}},

Thank you for your interest in [Venue Name]!

[Your content here - venue description, amenities, etc.]

Best,
The [Venue Name] Team

---
{{footer}}
```

#### SMS Template Structure

```
Hi {{contact.firstName}}! Thanks for checking out [Venue Name]. 
Here's our tour calendar: [link]
```

---

## Step 3: Approval Workflow

### Status Progression

```
Draft ──▶ Client Review ──▶ Approved ──▶ Published
  │            │                │            │
  │            │                │            │
  ▼            ▼                ▼            ▼
 Writer     Client/Manager    Final       Synced to
 edits      reviews           sign-off    GoHighLevel
```

### How Approval Works

1. **Writer** creates touchpoints as "Draft"
2. **Writer** changes status to "Client Review"
3. **Client/Manager** reviews in Airtable or Visualizer
4. **Client/Manager**:
   - Approves (changes to "Approved")
   - Requests changes (changes to "Needs Revision")
5. **Admin** changes to "Published" when ready to sync

### Using the Visualizer

The React Flow visualizer shows:
- Timeline view of all touchpoints
- Click to preview content
- Approve/reject buttons
- Version history

---

## Step 4: Sync to GoHighLevel

### What the Sync Does

1. **Fetches** all "Published" touchpoints from Airtable
2. **Converts** Markdown to HTML for emails
3. **Checks** if template exists in GoHighLevel
4. **Creates or Updates** templates in GoHighLevel
5. **Logs** sync history

### Running the Sync

```bash
cd scripts/sync-engine
npm install  # First time only
npm run sync
```

### Sync Output Example

```
Starting Sync for Maison Albion...
✅ Created: Day 0 - Welcome Email (template_123)
✅ Updated: Day 1 - Inquiry Follow-up (template_456)
❌ Failed: Day 3 - Brochure SMS (invalid content)
✅ Synced 2/3 items
```

### After Sync

Templates are now live in GoHighLevel:
- Email templates appear in Template Builder
- SMS templates appear in Conversations
- Workflows can reference template IDs

---

## Step 5: Connect to Workflows

In GoHighLevel, connect templates to workflows:

### Email Workflow Setup

1. Go to **Automations > Workflows**
2. Open your workflow (e.g., "00 - Inquiry")
3. Add action: **Send Email**
4. Select: **Use Template**
5. Choose: **"[API] Day X - Template Name"**

### SMS Workflow Setup

1. Open workflow
2. Add action: **Send SMS**
3. Select: **Use Template**
4. Choose: **"[API] Day X - SMS Name"**

---

## Quick Reference

### Airtable Tables

| Table | Purpose |
|-------|---------|
| Clients | Client accounts |
| Journeys | Journey definitions |
| Touchpoints | Individual communications |
| Versions | Content history |
| Approvals | Approval records |
| Templates | GHL template mapping |
| Sync History | Sync logs |

### Status Values

| Status | Meaning |
|--------|---------|
| Draft | Writer creating content |
| Client Review | Client reviewing |
| Approved | Ready to publish |
| Published | Synced to GHL |
| Needs Revision | Changes requested |

### Common Tasks

| Task | Location |
|------|----------|
| Add client | Clients table |
| Create journey | Journeys table |
| Add email | Touchpoints table |
| Review/approve | Visualizer or Airtable |
| Sync to GHL | Run `npm run sync` |

---

## Troubleshooting

### Touchpoint Won't Sync

**Check:**
- Status is "Published"
- Required fields filled (Day, Type, Subject, Body)
- No invalid characters in content

### Template Not Appearing in GHL

**Check:**
- Sync completed successfully (check Sync History)
- Template Type correctly set (Email/SMS)
- GHL account has template access

### Linked Fields Not Working

**Check:**
- Journey linked to Client
- Touchpoint linked to Journey
- Record IDs correct

---

## Support

For issues:
1. Check Sync History for errors
2. Verify GHL API credentials
3. Review Airtable field values
4. Run with `--verbose` flag for detailed logs
