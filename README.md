# Journey Builder Stack - Deployment Guide

A Headless CMS for GoHighLevel CRM operations. This three-layer system enables marketing teams to design, visualize, and sync automation journeys to GoHighLevel workflows.

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Quick Start](#4-quick-start)
5. [Airtable Setup](#5-airtable-setup)
6. [React Flow Visualizer Setup](#6-react-flow-visualizer-setup)
7. [Sync Engine Setup](#7-sync-engine-setup)
8. [Maison Albion Example](#8-maison-albion-example)
9. [Workflow Walkthrough](#9-workflow-walkthrough)
10. [Status Workflow](#10-status-workflow)
11. [Best Practices](#11-best-practices)
12. [Troubleshooting](#12-troubleshooting)
13. [API Reference](#13-api-reference)
14. [Contributing](#14-contributing)
15. [License and Support](#15-license-and-support)

---

## 1. Overview

### What is the Journey Builder Stack?

The Journey Builder Stack is a headless content management system designed to manage GoHighLevel CRM automation journeys. It separates the database layer (Airtable) from the visualization layer (React Flow) and the synchronization layer (Node.js), enabling:

- **Visual Journey Design**: Create marketing automation journeys in a user-friendly interface
- **Client Approval Workflows**: Review and approve journeys before publishing
- **Automated Sync**: Push approved journeys to GoHighLevel workflows
- **Version Control**: Track changes and maintain audit trails
- **Multi-Client Support**: Manage multiple GoHighLevel locations from one system

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Centralized Management** | All journey data stored in Airtable |
| **Visual Approval** | Clients see journeys as flow diagrams |
| **Automated Sync** | No manual workflow creation in GHL |
| **Version History** | Full audit trail of changes |
| **Conflict Detection** | Prevent overwriting external changes |
| **Template Reuse** | Standardize journeys across clients |

### Use Cases

- Wedding venue automation journeys
- Lead nurturing sequences
- Client onboarding workflows
- Marketing campaign automation
- Internal task assignments

---

## 2. Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JOURNEY BUILDER STACK                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   DATABASE      │     │   VISUALIZER     │     │   SYNC ENGINE   │       │
│  │   (Airtable)    │◄────│   (React Flow)   │     │   (Node.js)     │       │
│  │                 │     │                 │     │                 │       │
│  │ • Journeys      │     │ • Timeline View │     │ • API Bridge    │       │
│  │ • Touchpoints   │     │ • Drag & Drop   │     │ • GHL Sync      │       │
│  │ • Templates     │     │ • Approval UI   │     │ • Conflict Res. │       │
│  │ • Versions      │     │                 │     │                 │       │
│  │ • Approvals     │     │                 │     │                 │       │
│  │ └───────────────┘     │ └───────────────┘     │ └───────────────┘       │
│  └───────────┬───────────┘───────────┬───────────┘───────────┬─────────────┘
│              │                       │                       │
│              │                       │                       │
│              └───────────────────────┴───────────────────────┘
│                                      │
│                                      ▼
│                        ┌─────────────────────────┐
│                        │    GoHighLevel CRM      │
│                        │                         │
│                        │ • Workflows             │
│                        │ • Pipelines             │
│                        │ • Templates             │
│                        │ • Contacts              │
│                        └─────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           DATA FLOW SEQUENCE            │
                    └─────────────────────────────────────────┘
                    
    1. DESIGN           2. REVIEW            3. APPROVE           4. SYNC
    ┌─────────┐        ┌─────────┐          ┌─────────┐        ┌─────────┐
    │Airtable │        │React    │          │Airtable │        │Node.js  │
    │Journey  │───────►│Visualizer│────────►│Approval │──────►│Sync     │────► GHL
    │Created │        │View     │          │Updated  │        │Engine   │      Workflow
    └─────────┘        └─────────┘          └─────────┘        └─────────┘
    
    • Add touchpoints  • View flow          • Status change    • Create/Update
    • Set triggers     • Add comments       • Version bump     • Conflict check
    • Configure steps  • Request changes     • Record approval  • Log sync result
```

### Component Relationships

| Component | Role | Technology | Input | Output |
|-----------|------|------------|-------|--------|
| **Airtable** | Database & CMS | Airtable Base | Journey designs | Structured data |
| **React Flow** | Visualizer | React + Vite | Airtable data | Flow diagrams |
| **Sync Engine** | API Bridge | Node.js | Approved journeys | GHL workflows |

---

## 3. Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Runtime for sync engine |
| npm or yarn | Latest | Package management |
| Git | Latest | Version control |

### Required Accounts

| Account | Purpose |获取方式 |
|---------|---------|---------|
| **Airtable** | Database layer | [airtable.com](https://airtable.com) |
| **GoHighLevel** | CRM destination | [gohighlevel.com](https://gohighlevel.com) |

### API Keys Required

| API Key | Where to Find | Environment Variable |
|---------|---------------|---------------------|
| Airtable API Key | [Account Settings](https://airtable.com/account) | `AIRTABLE_API_KEY` |
| Airtable Base ID | Airtable Base URL | `AIRTABLE_BASE_ID` |
| GHL Private Integration Token | [Agency Settings](https://app.gohighlevel.com/agencies) | `GHL_API_KEY` |
| GHL Location ID | GHL Location Settings | `GHL_LOCATION_ID` |

### Rate Limiting Considerations

| API | Rate Limit | Notes |
|-----|------------|-------|
| Airtable | 5 requests/second/base | Design for 4 req/sec |
| GHL | 100 requests/hour/location | Batch operations recommended |

---

## 4. Quick Start

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/TheBloomApp.git
cd TheBloomApp

# Install dependencies for both components
cd apps/journey-visualizer && npm install
cd ../../scripts/sync-engine && npm install
```

### Environment Configuration

#### Airtable Environment

Create `.env` in [`apps/journey-visualizer/`](apps/journey-visualizer/):

```env
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_GHL_API_KEY=your_ghl_api_key
```

#### Sync Engine Environment

Create `.env` in [`scripts/sync-engine/`](scripts/sync-engine/):

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id

# GoHighLevel Configuration
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_ghl_location_id

# Sync Engine Configuration
SYNC_LOG_LEVEL=info
SYNC_DRY_RUN=false
SYNC_BATCH_SIZE=10
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY=5000

# Client Configuration
DEFAULT_CLIENT=maison-albion
```

### Running Each Component

#### React Flow Visualizer

```bash
cd apps/journey-visualizer
npm run dev
```

Open http://localhost:3000 to view the application.

#### Sync Engine

```bash
cd scripts/sync-engine

# Dry run (preview changes without executing)
npm run sync -- --dry-run

# Full sync of all published journeys
npm run sync

# Sync specific client only
npm run sync -- --client=maison-albion

# Test API connections
npm run sync -- --test
```

---

## 5. Airtable Setup

For complete schema documentation, see [`docs/airtable-schema.md`](docs/airtable-schema.md).

### Base Creation

1. **Create New Airtable Base**
   - Name: "Journey Builder Stack"
   - Workspace: Select appropriate workspace

2. **Create Tables in Order**
   ```
   1. Clients (create first - all other tables link to it)
   2. Pipelines
   3. Templates
   4. Journeys
   5. Touchpoints
   6. Versions
   7. Approvals
   8. Sync History
   ```

### Quick Field Reference

#### Journeys Table

| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Journey name |
| Status | Single select | Draft, Client Review, Approved, Published |
| Client | Link to Clients | Client relationship |
| Pipeline | Link to Pipelines | Pipeline relationship |
| GHL Workflow ID | Single line text | GHL workflow link |
| Current Version | Number | Version number |

#### Touchpoints Table

| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Touchpoint name |
| Type | Single select | Email, SMS, Wait, Condition, etc. |
| Journey | Link to Journeys | Journey relationship |
| Order | Number | Display order |
| Content | Long text | Message content |

### Automation Setup

Create Airtable automations for workflow:

1. **Auto-create Approval on Submit**
   ```
   Trigger: When Journey Status changes to "Client Review"
   Action: Create record in Approvals table
   ```

2. **Auto-update Journey on Approval**
   ```
   Trigger: When Approval Status changes to "Approved"
   Action: Update Journey Status to "Approved"
   ```

---

## 6. React Flow Visualizer Setup

For detailed documentation, see [`apps/journey-visualizer/README.md`](apps/journey-visualizer/README.md).

### Installation

```bash
cd apps/journey-visualizer
npm install
```

### Environment Variables

```env
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_GHL_API_KEY=your_ghl_api_key
```

### Running the App

```bash
# Development server
npm run dev

# Production build
npm run build
npm run preview
```

### Features Overview

| Feature | Description |
|---------|-------------|
| **Journey Visualization** | Render journeys as interactive timelines |
| **Custom Nodes** | Email, SMS, Wait, Condition, Task, Trigger, Form, Call |
| **Approval Workflow** | Status tracking with comments |
| **Client Management** | Multi-client support with dropdown |
| **Zoom & Pan** | Full canvas controls with minimap |

### Touchpoint Types

| Type | Icon | Color |
|------|------|-------|
| Email | 📧 | Blue |
| SMS | 💬 | Green |
| Wait | ⏱ | Yellow |
| Condition | ❓ | Orange |
| Task | ✓ | Purple |
| Trigger | ⚡ | Red |
| Form | 📝 | Cyan |
| Call | 📞 | Pink |

---

## 7. Sync Engine Setup

For detailed documentation, see [`scripts/sync-engine/README.md`](scripts/sync-engine/README.md).

### Installation

```bash
cd scripts/sync-engine
npm install
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id

# GoHighLevel Configuration
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_ghl_location_id

# Sync Engine Configuration
SYNC_LOG_LEVEL=info
SYNC_DRY_RUN=false
SYNC_BATCH_SIZE=10
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY=5000

# Client Configuration
DEFAULT_CLIENT=maison-albion
```

### CLI Commands Reference

| Command | Description |
|---------|-------------|
| `npm run sync` | Sync published journeys from Airtable to GHL |
| `npm run sync -- --dry-run` | Preview changes without executing |
| `npm run sync -- --client=<name>` | Sync specific client |
| `npm run sync -- --journey=<id>` | Sync specific journey |
| `npm run sync -- --history` | Show sync history |
| `npm run sync -- --test` | Test API connections |

### Shell Script Usage

```bash
# Make executable
chmod +x scripts/sync.sh

# Run sync
./scripts/sync.sh sync

# Test connections
./scripts/sync.sh test

# Show history
./scripts/sync.sh history

# Dry run
./scripts/sync.sh sync --dry-run
```

### Touchpoint Type Mapping

| Touchpoint Type | GHL Step Type |
|----------------|---------------|
| Email | email |
| SMS | sms |
| Task | task |
| Wait | delay |
| Condition | conditional |
| Trigger | trigger |
| Note | note |
| Call | call |

---

## 8. Maison Albion Example

Maison Albion is a wedding venue in Albion, NY, serving as the primary example client.

### Client Overview

| Field | Value |
|-------|-------|
| **Name** | Maison Albion |
| **Location ID** | `HzttFvMOh41pAjozlxkS` |
| **Website** | https://maisonalbion.com |
| **Address** | 13800 W County House Rd, Albion, NY 14411 |

### Data Extracted

| Resource | Status | Records |
|----------|--------|---------|
| Location Details | ✅ Complete | 1 |
| Pipelines | ✅ Complete | 4 |
| Contacts | ✅ Complete | 7,733 |
| Email Templates | ✅ Complete | 7 |
| SMS Templates | ✅ Complete | 29 |
| Workflows | ✅ Complete | 48 |

### Pipeline Structure

#### Wedding Venue Pipeline (Primary)
1. **00 - Inquiry** - Initial lead capture
2. **01 - Site Tour Booked** - Tour scheduled
3. **02 - Proposal Sent** - Quote delivered
4. **03 - Proposal NOT Requested** - Nurture sequence
5. **04 - Contract Signed** - Booking confirmed
6. **05 - Wedding Complete** - Post-wedding follow-up

### 48 Workflows by Category

| Category | Count | Examples |
|----------|-------|----------|
| Pipeline-Aligned | 6 | 00-Inquiry, 01-SiteTour, 02-ProposalSent |
| Marketing | 5 | Landing page variants (Garden, Goth, Lesbian, Victorian) |
| Integration | 4 | I Do Society, The Knot, Wedding Wire, PPC |
| Tracking | 7 | Google Ads, Analytics, Sheets sync |
| Communication | 8 | Customer reply, Missed call, IVR, Instagram |
| Internal | 8 | Tour complete notification, Appointment cancelled |
| Ghost | 3 | Yes/Maybe/No tag workflows |
| Draft | 7 | Various work-in-progress workflows |

### Sample Journey Walkthrough

#### 00 - Inquiry Workflow

| Property | Value |
|----------|-------|
| **Name** | 00 - Inquiry |
| **Status** | Published |
| **GHL Workflow ID** | `47930249-6a6e-4fbd-b720-b2858b3faaf7` |
| **GHL Version** | 72 |
| **Trigger** | Form Submission |

**Touchpoint Sequence:**

```
T1 - Hello Text & Brochure (SMS) ─► Wait 24 Hours ─► T2 - Email Follow-up ─► ...
```

### Testing the Sync

```bash
cd scripts/sync-engine

# Test with Maison Albion data
npm run sync -- --client=maison-albion --dry-run

# Expected output: Shows 48 workflows that would be synced
```

---

## 9. Workflow Walkthrough

### Complete Journey Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JOURNEY CREATION WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: CREATE JOURNEY IN AIRTABLE
├── Create new record in Journeys table
├── Set journey name (e.g., "Welcome Series")
├── Link to Client and Pipeline
└── Set Status to "Draft"

Step 2: ADD TOUCHPOINTS
├── Add Email touchpoint
│   ├── Set type: Email
│   ├── Add subject line
│   ├── Add HTML content
│   └── Set delay (immediately)
├── Add Wait/Delay touchpoint
│   ├── Set delay type: Hours/Days
│   └── Set delay value: 24
├── Add SMS touchpoint
│   ├── Set type: SMS
│   ├── Add message body
│   └── Set delay
└── Add more touchpoints as needed

Step 3: REQUEST CLIENT REVIEW
├── Change journey status to "Client Review"
├── Airtable automation creates Approval record
├── System sends notification to client
└── Client receives link to React Visualizer

Step 4: CLIENT APPROVES IN REACT VISUALIZER
├── Open React Flow visualizer
├── View journey as flow diagram
├── Review each touchpoint
├── Add comments if needed
└── Click "Approve" button

Step 5: SYNC TO GOHIGHLEVEL
├── Sync engine detects "Approved" status
├── Runs conflict detection
├── Creates/updates GHL workflow
├── Updates GHL Workflow ID in Airtable
└── Records sync in Sync History

Step 6: VERIFY IN GOHIGHLEVEL
├── Open GHL dashboard
├── Navigate to Workflows
├── Find synced workflow
├── Check status and steps
└── Activate if needed
```

### Step-by-Step Instructions

#### Step 1: Create Journey in Airtable

1. Open Airtable base
2. Navigate to **Journeys** table
3. Click **Add Record**
4. Fill in fields:
   - **Name**: "Welcome Series"
   - **Client**: Select client
   - **Pipeline**: Select pipeline
   - **Category**: Marketing
   - **Status**: Draft (default)
5. Click **Create**

#### Step 2: Add Touchpoints

1. Open **Touchpoints** table
2. Add records for each step:

| Order | Type | Name | Content |
|-------|------|------|---------|
| 1 | Email | Welcome Email | "Welcome to..." |
| 2 | Wait | Wait 24 Hours | delay: 24 hours |
| 3 | SMS | Check-in SMS | "Hi! Just checking in..." |
| 4 | Task | Personal Follow-up | Assign to team |

3. Link each touchpoint to the Journey

#### Step 3: Request Client Review

1. Open **Journeys** table
2. Find the journey
3. Change **Status** to "Client Review"
4. Add comment with review request
5. Notify client (email or Slack)

#### Step 4: Client Approves in Visualizer

1. Client opens React Visualizer
2. Selects the client/organization
3. Navigates to the journey
4. Reviews the flow diagram
5. Adds optional comments
6. Clicks **Approve**

#### Step 5: Sync to GoHighLevel

```bash
cd scripts/sync-engine
npm run sync
```

Sync engine will:
1. Fetch "Approved" journeys
2. Detect changes
3. Create/update GHL workflows
4. Update sync status in Airtable

#### Step 6: Verify in GoHighLevel

1. Open GoHighLevel dashboard
2. Navigate to **Automations** → **Workflows**
3. Search for the journey name
4. Verify steps match design
5. Activate workflow

---

## 10. Status Workflow

### Status Flow Diagram

```
                         ┌─────────────────┐
                         │     Draft       │
                         │  (Created)      │
                         └────────┬────────┘
                                  │
                                  │ Submit for Review
                                  ▼
                         ┌─────────────────┐
                         │  Client Review  │
                         │  (In Review)    │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │    Approved     │         │    Rejected     │
          │  (Approved)      │         │  (Rejected)     │
          └────────┬────────┘         └────────┬────────┘
                   │                           │
                   │ Publish to GHL            │ Request Changes
                   ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │    Published    │         │ Changes Request │
          │  (Live in GHL)  │         │  (Draft Again)  │
          └─────────────────┘         └────────┬────────┘
                                               │
                                               │ Revise
                                               ▼
                                      ┌─────────────────┐
                                      │     Draft       │
                                      │  (Updated)      │
                                      └─────────────────┘
```

### Status Descriptions

#### Journey Status (Journeys Table)

| Status | Color | Description | Allowed Transitions |
|--------|-------|-------------|-------------------|
| **Draft** | Gray | Initial state, work in progress | Submit for Review |
| **Client Review** | Yellow | Awaiting client review | Approved, Rejected |
| **Approved** | Green | Approved by client, ready to publish | Published |
| **Published** | Blue | Active in GoHighLevel | Draft (for updates) |

#### Approval Status (Approvals Table)

| Status | Color | Description | Actions |
|--------|-------|-------------|---------|
| **Pending** | Yellow | Awaiting review | Approve, Reject, Request Changes |
| **Approved** | Green | Approved | Sync to GHL |
| **Rejected** | Red | Rejected | Revise and resubmit |
| **Changes Requested** | Orange | Changes needed | Revise and resubmit |

### Who Performs Each Action

| Action | Who | Description |
|--------|-----|-------------|
| Create Journey | Admin/Marketer | Initial journey design |
| Add Touchpoints | Admin/Marketer | Define automation steps |
| Request Review | Admin/Marketer | Submit for client approval |
| Review Journey | Client | Visual inspection in React Flow |
| Approve/Reject | Client | Final decision on design |
| Sync to GHL | System | Automated sync engine |
| Activate in GHL | Admin | Make workflow live |

### Automatic Transitions

| Trigger | Condition | Action |
|---------|-----------|--------|
| Status → "Client Review" | Manual change | Auto-create Approval record |
| Approval → "Approved" | Manual change | Update Journey to "Approved" |
| Approval → "Published" | Manual change | Trigger Node.js sync |
| Sync Failed | Error | Send notification email |

---

## 11. Best Practices

### Naming Conventions

#### Journey Names

```
Format: [Category] - [Pipeline Stage] - [Description]

Examples:
- "Marketing - Welcome Email Series"
- "00 - Inquiry - Initial Response"
- "01 - Tour Booked - Confirmation SMS"
```

#### Touchpoint Names

```
Format: T[Order] - [Type] - [Description]

Examples:
- T1 - Email - Welcome Message
- T2 - Wait - 24 Hour Delay
- T3 - SMS - Follow-up Check-in
- T4 - Task - Personal Outreach
```

#### Template Names

```
Format: [Category] - [Type] - [Description]

Examples:
- Inquiry - SMS - Initial Response
- Tour - Email - Confirmation
- Proposal - Email - Cover Letter
```

### Version Control

1. **Always increment version**: Bump version number for any change
2. **Document changes**: Add notes in Versions table
3. **Keep snapshots**: Use Version records for rollback
4. **Review before publish**: Never skip client review

### Testing Strategies

#### Before Sync

- [ ] Review journey in React Flow visualizer
- [ ] Verify touchpoint order
- [ ] Check content for typos
- [ ] Confirm template links
- [ ] Test in dry-run mode

#### After Sync

- [ ] Verify GHL workflow created
- [ ] Check all steps present
- [ ] Test trigger conditions
- [ ] Confirm timing/delays
- [ ] Activate workflow

### Error Handling

1. **Use Dry Run**: Always test with `--dry-run` first
2. **Check Sync History**: Review failed syncs in Airtable
3. **Resolve Conflicts**: Manual intervention for conflicts
4. **Retry Failed**: Use built-in retry mechanism
5. **Log Everything**: Enable verbose logging for debugging

---

## 12. Troubleshooting

### Common Issues

#### API Key Errors

**Problem**: "Invalid API key" or authentication failures

**Solution**:
```bash
# Verify environment variables
echo $AIRTABLE_API_KEY
echo $GHL_API_KEY

# Check .env file exists
cat scripts/sync-engine/.env
```

#### Rate Limiting

**Problem**: "Too many requests" errors

**Solution**:
```env
# Increase retry delay in .env
SYNC_RETRY_DELAY=10000
# Or reduce batch size
SYNC_BATCH_SIZE=5
```

#### Missing Touchpoints

**Problem**: Journey synced but missing steps

**Solution**:
1. Check Airtable junction table configuration
2. Verify touchpoints are linked to journey
3. Run with debug logging:
```bash
SYNC_LOG_LEVEL=debug npm run sync
```

#### Sync Conflicts

**Problem**: "Conflict detected" status

**Resolution Options**:
```bash
# Overwrite GHL with Airtable data
npm run sync -- --journey=<id> --overwrite

# Skip this sync
npm run sync -- --journey=<id> --skip

# Manual resolution in GHL dashboard
```

#### Workflow Not Appearing in GHL

**Problem**: Journey approved but not in GHL

**Solution**:
1. Check sync status in Airtable
2. Verify GHL Location ID is correct
3. Check sync history for errors
4. Ensure GHL API token has required scopes

### Debug Steps

1. **Enable verbose logging**:
```bash
SYNC_LOG_LEVEL=debug npm run sync
```

2. **Test API connections**:
```bash
npm run sync -- --test
```

3. **Check Airtable records**:
```bash
# Verify records exist
# Check linked records
# Confirm field values
```

4. **Review sync history**:
```bash
npm run sync -- --history
```

### Log Locations

| Log Type | Location |
|----------|----------|
| Console Output | stdout (colored) |
| JSON Logs | `scripts/sync-engine/logs/` |
| Sync History | Airtable Sync History table |

### Support Resources

- [GoHighLevel API Documentation](https://marketplace.gohighlevel.com/docs/)
- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [React Flow Documentation](https://reactflow.dev/)
- Project Issues: GitHub Issues tab

---

## 13. API Reference

### Airtable API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v0/{baseId}/{tableId}` | GET | Fetch records |
| `/v0/{baseId}/{tableId}` | POST | Create record |
| `/v0/{baseId}/{tableId}/{recordId}` | PATCH | Update record |
| `/v0/{baseId}/{tableId}/{recordId}` | DELETE | Delete record |

### GoHighLevel API Endpoints

| Resource | Endpoint | Method | Purpose |
|----------|----------|--------|---------|
| Location | `/locations/{locationId}` | GET | Get location details |
| Pipelines | `/opportunities/pipelines` | GET | List pipelines |
| Workflows | `/workflows/` | GET | List workflows |
| Email Templates | `/emails/builder` | GET | List email templates |
| SMS Templates | `/locations/{id}/templates?type=sms` | GET | List SMS templates |

### Required Headers

```http
Authorization: Bearer <PIT_TOKEN>
Version: 2021-07-28
Accept: application/json
Content-Type: application/json
```

### Rate Limiting

| API | Limit | Recommended |
|-----|-------|-------------|
| Airtable | 5 req/sec/base | 4 req/sec |
| GHL | 100 req/hour/location | Batch operations |

### Authentication

#### Airtable
- API Key from Account Settings
- Format: `keyXXXXXXXXXXXXXX`

#### GoHighLevel
- Private Integration Token (PIT) from Agency Settings
- Required scopes: `workflows.readonly`, `locations.readonly`

---

## 14. Contributing

### How to Add New Touchpoint Types

1. **Update Airtable Schema**
   ```javascript
   // In docs/airtable-schema.md
   // Add to Touchpoints table Type single select
   NewType: 'New Type'
   ```

2. **Update Sync Engine Mapping**
   ```javascript
   // In scripts/sync-engine/src/utils/mapper.js
   const touchpointTypeMap = {
     'New Type': 'new_type_ghl_step'
   };
   ```

3. **Add React Flow Node**
   ```jsx
   // In apps/journey-visualizer/src/components/JourneyNode.jsx
   case 'NewType':
     return <CustomNewTypeNode data={data} />;
   ```

4. **Add Tests**
   ```javascript
   // test/touchpoint-mapping.test.js
   test('maps NewType correctly', () => {
     // Add test case
   });
   ```

### How to Extend the Visualizer

1. **Add New Node Type**
   - Create component in `src/components/`
   - Add to `NODE_TYPES` export
   - Update styling in CSS

2. **Add New Edge Type**
   - Create component in `src/components/`
   - Register with React Flow
   - Configure edge options

3. **Add New Panel**
   - Create component in `src/components/`
   - Add to main App layout
   - Connect to data hooks

### How to Add New Sync Destinations

1. **Create Destination Service**
   ```javascript
   // src/services/new-destination.js
   class NewDestinationService {
     constructor(config) { ... }
     async createWorkflow(data) { ... }
     async updateWorkflow(id, data) { ... }
     async deleteWorkflow(id) { ... }
   }
   ```

2. **Update Sync Orchestration**
   ```javascript
   // src/services/sync.js
   import NewDestinationService from './new-destination.js';
   
   // Add to destination selection
   const destinations = {
     'gohighlevel': new GHLService(),
     'new-destination': new NewDestinationService()
   };
   ```

3. **Add Configuration**
   ```env
   SYNC_DESTINATION=gohighlevel
   # or
   SYNC_DESTINATION=new-destination
   ```

### Coding Standards

#### JavaScript/Node.js

- Use ES modules (`import`/`export`)
- Follow Airbnb style guide
- Add JSDoc comments
- Write unit tests with Jest

#### React

- Use functional components with hooks
- Follow React patterns
- Use TypeScript for new components
- Test with React Testing Library

#### Git Commits

```
type(scope): subject

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Restructuring
- test: Testing
- chore: Maintenance
```

---

## 15. License and Support

### License

This project is licensed under the MIT License.

### Support

For issues and questions:

1. **Check Documentation**: Review this guide and component READMEs
2. **Search Issues**: Check existing GitHub issues
3. **Create Issue**: Open new issue with:
   - Description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details

### Project Structure

```
TheBloomApp/
├── apps/journey-visualizer/      # React Flow client-facing app
├── scripts/sync-engine/          # Node.js sync script
├── clients/                      # Client data (Maison Albion, etc.)
├── templates/                    # Standard client templates
├── docs/
│   ├── airtable-schema.md       # Airtable schema documentation
│   └── gohighlevel-api.md       # GHL API documentation
└── README.md                     # This deployment guide
```

---

## Quick Reference Commands

```bash
# Clone and setup
git clone <repo-url>
cd TheBloomApp
npm install (in both app directories)

# Run visualizer
cd apps/journey-visualizer && npm run dev

# Run sync engine
cd scripts/sync-engine && npm run sync

# Sync options
npm run sync -- --dry-run              # Preview
npm run sync -- --client=<name>         # Specific client
npm run sync -- --journey=<id>          # Specific journey
npm run sync -- --test                  # Test connections

# Environment files
apps/journey-visualizer/.env            # Visualizer config
scripts/sync-engine/.env                 # Sync engine config
```

---

*Last Updated: 2026-02-08*
*Version: 1.0.0*
