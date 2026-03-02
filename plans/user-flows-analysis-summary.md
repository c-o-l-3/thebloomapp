# User Flows Analysis Summary - BloomBuilder

**Date:** 2026-02-22  
**Analyst:** Architect Mode  
**Project:** TheBloomApp - Journey Builder Stack

---

## Executive Summary

I have completed a comprehensive analysis of the BloomBuilder project's user flows. The system is a three-layer headless CMS for GoHighLevel CRM operations, consisting of:

1. **Database Layer** (Airtable + PostgreSQL API)
2. **Visualizer Layer** (React Flow application)
3. **Sync Engine** (Node.js CLI tool)

A detailed test plan has been created at [`plans/user-flows-test-plan.md`](plans/user-flows-test-plan.md:1).

---

## Identified User Flows

### Flow 1: Authentication
**Entry Points:**
- `/login` - Login page ([`App.jsx:252-335`](apps/journey-visualizer/src/App.jsx:252))
- `/` - Auto-redirect if not authenticated

**Flow:**
1. User enters email (and optional name)
2. Form validation
3. JWT token stored in localStorage
4. Redirect to Journey Dashboard

**Key Components:**
- [`LoginPage`](apps/journey-visualizer/src/App.jsx:252) component
- [`apiClient.login()`](apps/journey-visualizer/src/services/apiClient.js:1)

---

### Flow 2: Journey Creation
**Entry Points:**
- Journey Dashboard → Click "New Journey"
- React Flow canvas → "Add Node" button

**Flow:**
1. Select client from dropdown ([`ClientSelector.jsx`](apps/journey-visualizer/src/components/ClientSelector.jsx:1))
2. Create journey with name/description
3. Add touchpoints:
   - Email ([`TOUCHPOINT_TYPE.EMAIL`](apps/journey-visualizer/src/types/index.js:1))
   - SMS ([`TOUCHPOINT_TYPE.SMS`](apps/journey-visualizer/src/types/index.js:1))
   - Wait ([`TOUCHPOINT_TYPE.WAIT`](apps/journey-visualizer/src/types/index.js:1))
   - Condition ([`TOUCHPOINT_TYPE.CONDITION`](apps/journey-visualizer/src/types/index.js:1))
   - Task ([`TOUCHPOINT_TYPE.TASK`](apps/journey-visualizer/src/types/index.js:1))
   - Trigger ([`TOUCHPOINT_TYPE.TRIGGER`](apps/journey-visualizer/src/types/index.js:1))
   - Form ([`TOUCHPOINT_TYPE.FORM`](apps/journey-visualizer/src/types/index.js:1))
   - Call ([`TOUCHPOINT_TYPE.CALL`](apps/journey-visualizer/src/types/index.js:1))
4. Position nodes on canvas (drag & drop)
5. Connect nodes with edges
6. Save journey

**Key Components:**
- [`JourneyFlow.jsx`](apps/journey-visualizer/src/components/JourneyFlow.jsx:1) - Main canvas
- [`JourneyNode.jsx`](apps/journey-visualizer/src/components/JourneyNode.jsx:1) - Node rendering
- [`TouchpointEditor.jsx`](apps/journey-visualizer/src/components/TouchpointEditor.jsx:1) - Edit interface
- [`TemplateLibrary.jsx`](apps/journey-visualizer/src/components/TemplateLibrary.jsx:1) - Template selection

**API Endpoints:**
- `POST /api/journeys` - Create journey
- `POST /api/touchpoints` - Add touchpoint
- `PUT /api/touchpoints/reorder` - Reorder

---

### Flow 3: Client Review Workflow
**Entry Points:**
- Approval Panel in sidebar ([`ApprovalPanel.jsx`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:1))

**Status Flow:**
```
Draft → Client Review → Approved → Published
  ↑         ↓              ↓
  └─ Needs Revision ← Rejected
```

**Flow:**
1. Writer submits journey for review ([`handleRequestApproval()`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:146))
2. Status changes to "Client Review"
3. Client reviews in visualizer
4. Client can:
   - Approve ([`handleApprove()`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:122))
   - Reject with comments ([`handleReject()`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:133))
   - Add touchpoint comments ([`handleAddTouchpointComment()`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:212))
5. If approved, can be deployed ([`handleDeploy()`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:156))

**Key Features:**
- Version history dropdown
- Comments per touchpoint
- Print/Export functionality
- Approval history log

---

### Flow 4: Conflict Resolution
**Mechanism:** Optimistic Locking with Version Numbers

**Flow:**
1. User loads journey (gets version N)
2. User makes edits
3. User saves (sends version N)
4. Server checks: Is current version still N?
   - **Yes:** Update succeeds, version becomes N+1
   - **No:** Conflict detected (HTTP 409)
5. On conflict, user sees dialog with options:
   - Accept server version ([`refreshAndAcceptServerVersion()`](apps/journey-visualizer/src/hooks/useJourneys.js:1))
   - Force overwrite ([`forceOverwrite()`](apps/journey-visualizer/src/hooks/useJourneys.js:1))
   - Merge changes ([`retryUpdateWithMerge()`](apps/journey-visualizer/src/hooks/useJourneys.js:1))

**Test Coverage:**
- [`journeys.test.js`](apps/journey-api/src/routes/journeys.test.js:1) - API tests
- [`useJourneys.test.js`](apps/journey-visualizer/src/hooks/useJourneys.test.js:1) - Hook tests

---

### Flow 5: Sync to GoHighLevel
**Entry Point:**
- CLI: `npm run sync` in [`scripts/sync-engine/`](scripts/sync-engine/)

**Flow:**
1. Fetch "Approved" journeys from Airtable/API
2. For each journey:
   - Check if GHL workflow ID exists
   - If no: Create new workflow ([`ghl.createWorkflow()`](scripts/sync-engine/src/services/ghl.js:1))
   - If yes: Update existing ([`ghl.updateWorkflow()`](scripts/sync-engine/src/services/ghl.js:1))
3. Map touchpoints to GHL steps
4. Execute API calls with rate limiting
5. Log results to Sync History table

**Touchpoint Mapping:**
| Touchpoint | GHL Step |
|------------|----------|
| Email | email |
| SMS | sms |
| Wait | delay |
| Task | task |
| Condition | conditional |

**CLI Options:**
```bash
npm run sync                    # Full sync
npm run sync -- --dry-run       # Preview
npm run sync -- --client=name   # Specific client
npm run sync -- --journey=id    # Specific journey
```

---

### Flow 6: Touchpoint Management
**Operations:**
1. **Create:** Add from template library or blank
2. **Read:** View in list or flow canvas
3. **Update:** Edit via [`TouchpointEditor`](apps/journey-visualizer/src/components/TouchpointEditor.jsx:1)
4. **Delete:** Remove with confirmation
5. **Reorder:** Drag & drop in canvas or bulk reorder API

**Key Features:**
- HTML editor for email content ([`HTMLEditor.jsx`](apps/journey-visualizer/src/components/HTMLEditor.jsx:1))
- Character count for SMS
- Delay configuration for Wait nodes
- Condition builder for branching

---

### Flow 7: Multi-Client Support
**Clients in System:**
| Client | Slug | Pipelines | Workflows |
|--------|------|-----------|-----------|
| Maison Albion | maison-albion | 4 | 48 |
| Cameron Estate | cameron-estate | 3 | 32 |
| Maravilla Gardens | maravilla-gardens | 3 | 36 |
| Maui Pineapple Chapel | maui-pineapple-chapel | 2 | 24 |

**Features:**
- Client dropdown selector ([`ClientSelector.jsx`](apps/journey-visualizer/src/components/ClientSelector.jsx:1))
- Search/filter clients
- Local file mode support (📁 badge)
- Data isolation per client

---

### Flow 8: Template Library
**Entry Point:**
- "Add Node" button → Template Library modal ([`TemplateLibrary.jsx`](apps/journey-visualizer/src/components/TemplateLibrary.jsx:1))

**Flow:**
1. Browse templates by category
2. Preview template details
3. Select template
4. Customize for journey
5. Apply (creates touchpoint from template)

---

## Key Files Analyzed

### Documentation
- [`README.md`](README.md:1) - Main project documentation
- [`docs/PROJECT_HANDBOOK.md`](docs/PROJECT_HANDBOOK.md:1) - Lessons learned, troubleshooting
- [`docs/TECHNICAL_SPECIFICATION.md`](docs/TECHNICAL_SPECIFICATION.md:1) - API specs, sync logic
- [`docs/ONBOARDING_GUIDE.md`](docs/ONBOARDING_GUIDE.md:1) - Workflow walkthrough
- [`docs/PROGRAMMATIC_SETUP.md`](docs/PROGRAMMATIC_SETUP.md:1) - API configuration

### Application Code
- [`apps/journey-visualizer/src/App.jsx`](apps/journey-visualizer/src/App.jsx:1) - Main app with routing
- [`apps/journey-visualizer/src/components/ApprovalPanel.jsx`](apps/journey-visualizer/src/components/ApprovalPanel.jsx:1) - Approval workflow UI
- [`apps/journey-visualizer/src/components/JourneyFlow.jsx`](apps/journey-visualizer/src/components/JourneyFlow.jsx:1) - React Flow canvas
- [`apps/journey-visualizer/src/components/ClientSelector.jsx`](apps/journey-visualizer/src/components/ClientSelector.jsx:1) - Client switching

### API & Sync
- [`apps/journey-api/src/routes/journeys.js`](apps/journey-api/src/routes/journeys.js:1) - Journey CRUD
- [`scripts/sync-engine/src/services/ghl.js`](scripts/sync-engine/src/services/ghl.js:1) - GHL API client
- [`scripts/sync-engine/src/services/sync.js`](scripts/sync-engine/src/services/sync.js:1) - Sync orchestration

### Tests
- [`apps/journey-api/src/routes/journeys.test.js`](apps/journey-api/src/routes/journeys.test.js:1) - Optimistic locking tests
- [`apps/journey-visualizer/src/hooks/useJourneys.test.js`](apps/journey-visualizer/src/hooks/useJourneys.test.js:1) - Conflict resolution tests

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                     │
│  Writer        Client           Admin                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              JOURNEY VISUALIZER (React Flow)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐     │
│  │ JourneyFlow │  │ApprovalPanel │  │   ClientSelector    │     │
│  │  (Canvas)   │  │  (Sidebar)   │  │    (Header)         │     │
│  └─────────────┘  └──────────────┘  └─────────────────────┘     │
└────────────────────┬────────────────────────────────────────────┘
                     │ API (REST)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              JOURNEY API (Node.js + Prisma)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐     │
│  │  /journeys  │  │ /touchpoints │  │  /auth (JWT)        │     │
│  └─────────────┘  └──────────────┘  └─────────────────────┘     │
└────────────────────┬────────────────────────────────────────────┘
                     │ PostgreSQL
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              SYNC ENGINE (Node.js CLI)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐     │
│  │  Airtable   │──│   Conflict   │──│  GoHighLevel API    │     │
│  │   Client    │  │  Detection   │  │   Integration       │     │
│  └─────────────┘  └──────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommendations

### 1. High Priority Tests
Focus on these critical paths:
- **Conflict Resolution** - Already has unit tests, needs E2E testing
- **Approval Workflow** - Core business logic, test all status transitions
- **Sync Engine** - Test with real GHL sandbox environment

### 2. Test Environment Setup
```bash
# Start infrastructure
docker-compose up -d postgres redis

# Start API
cd apps/journey-api && npm run dev

# Start Visualizer
cd apps/journey-visualizer && npm run dev

# Run sync (dry-run mode)
cd scripts/sync-engine && npm run sync -- --dry-run
```

### 3. Known Watch Points
1. **GHL API Rate Limits** - 100 requests/hour/location
2. **Workflow Endpoint** - Requires trailing slash `/workflows/`
3. **Email Templates** - Use `/emails/builder` not `/emailing/templates`
4. **Version Conflicts** - Ensure version numbers increment atomically
5. **Linked Records** - Airtable linked fields have API limitations

### 4. Testing Approach
1. **Unit Tests** - Already present for conflict resolution
2. **Integration Tests** - API routes tested
3. **E2E Tests** - Need to implement with running dev servers
4. **Manual Testing** - Use the test plan document for systematic testing

---

## Deliverables Created

1. **[`plans/user-flows-test-plan.md`](plans/user-flows-test-plan.md:1)** - Comprehensive test plan with:
   - 8 user flows documented
   - Mermaid diagrams for each flow
   - Test cases with IDs
   - Environment setup instructions
   - Success criteria

2. **[`plans/user-flows-analysis-summary.md`](plans/user-flows-analysis-summary.md:1)** - This summary document

---

## Next Steps

1. **Start dev servers** using commands in test plan
2. **Execute manual tests** following the test plan
3. **Document any issues** found during testing
4. **Create automated E2E tests** using a framework like Playwright
5. **Set up CI/CD** to run tests on each commit

---

*Analysis Complete*  
*Cost: $0.13*