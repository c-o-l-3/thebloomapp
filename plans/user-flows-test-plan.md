# User Flows Test Plan - BloomBuilder

## Overview

This document outlines all critical user flows in the BloomBuilder system that require testing. Based on analysis of the project documentation and codebase, we've identified 8 core user flows covering the complete journey lifecycle.

---

## System Architecture Context

```mermaid
flowchart TB
    subgraph Users
        Writer[Content Writer]
        Client[Client/Reviewer]
        Admin[Admin]
    end
    
    subgraph Layer1[Layer 1: Database]
        Airtable[(Airtable)]
        API[Journey API PostgreSQL]
    end
    
    subgraph Layer2[Layer 2: Visualizer]
        ReactApp[React Flow App]
    end
    
    subgraph Layer3[Layer 3: Execution]
        Sync[Sync Engine]
        GHL[GoHighLevel CRM]
    end
    
    Writer --> ReactApp
    Client --> ReactApp
    Admin --> ReactApp
    ReactApp --> API
    API --> Airtable
    Sync --> API
    Sync --> GHL
```

---

## User Flow 1: Authentication

### Description
Users must authenticate to access the Journey Builder system.

### Flow Steps
```mermaid
flowchart LR
    Start([Start]) --> Landing[Login Page]
    Landing --> EnterEmail[Enter Email]
    EnterEmail --> EnterName[Enter Name Optional]
    EnterName --> Submit[Submit]
    Submit --> Validate{Valid?}
    Validate -->|Yes| Success[Store JWT Token]
    Validate -->|No| Error[Show Error]
    Error --> Landing
    Success --> Dashboard[Journey Dashboard]
```

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| AUTH-001 | Valid email login | Token stored, redirected to dashboard |
| AUTH-002 | Invalid email format | Error message displayed |
| AUTH-003 | Empty email submission | Validation error |
| AUTH-004 | Token expiration handling | Redirect to login |
| AUTH-005 | Already logged in check | Auto-redirect to dashboard |

### Entry Points
- `/login` - Login page
- `/` - Auto-redirect if not authenticated

---

## User Flow 2: Journey Creation

### Description
Writers create new journeys and add touchpoints to define customer automation flows.

### Flow Steps
```mermaid
flowchart TD
    Start([Start]) --> Dashboard[Journey Dashboard]
    Dashboard --> SelectClient[Select Client]
    SelectClient --> ClickNew[Click New Journey]
    ClickNew --> FillDetails[Fill Journey Details]
    FillDetails --> SaveJourney[Save Journey]
    SaveJourney --> AddTouchpoint[Add Touchpoint]
    AddTouchpoint --> ConfigureType[Select Type]
    ConfigureType --> ConfigureContent[Configure Content]
    ConfigureContent --> SaveTouchpoint[Save Touchpoint]
    SaveTouchpoint --> More{More Touchpoints?}
    More -->|Yes| AddTouchpoint
    More -->|No| Done([Journey Created])
```

### Touchpoint Types
| Type | Configuration Required |
|------|----------------------|
| Email | Subject, HTML Body, From Address |
| SMS | Message Body, Character Count |
| Wait | Delay Amount (hours/days) |
| Condition | Branch Logic, Rules |
| Task | Title, Assignee, Due Date |
| Trigger | Event Type, Configuration |
| Form | Form Selection |
| Call | Call Script, Duration |

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| JC-001 | Create journey with valid data | Journey saved with Draft status |
| JC-002 | Create journey without name | Validation error |
| JC-003 | Add email touchpoint | Touchpoint linked to journey |
| JC-004 | Add SMS touchpoint | Character count displayed |
| JC-005 | Add wait step | Delay configured correctly |
| JC-006 | Reorder touchpoints | Order updated in database |
| JC-007 | Delete touchpoint | Removed from journey |

### API Endpoints Used
- `POST /api/journeys` - Create journey
- `POST /api/touchpoints` - Add touchpoint
- `PUT /api/touchpoints/reorder` - Reorder touchpoints
- `DELETE /api/touchpoints/:id` - Delete touchpoint

---

## User Flow 3: Client Review Workflow

### Description
Journey moves through approval states: Draft → Client Review → Approved/Rejected → Published.

### Flow Steps
```mermaid
flowchart TD
    Start([Draft Journey]) --> Submit[Submit for Review]
    Submit --> ReviewStatus[Status: Client Review]
    ReviewStatus --> ClientViews[Client Views Journey]
    ClientViews --> Decision{Decision?}
    Decision -->|Approve| Approved[Status: Approved]
    Decision -->|Reject| Rejected[Status: Needs Revision]
    Decision -->|Request Changes| Changes[Add Comments]
    Changes --> Rejected
    Rejected --> WriterRevises[Writer Revises]
    WriterRevises --> Submit
    Approved --> Publish[Publish to GHL]
    Publish --> Published[Status: Published]
```

### Status Values
| Status | Color | Who Can Transition |
|--------|-------|-------------------|
| Draft | Gray | Writer, Admin |
| Client Review | Yellow | Writer, Admin |
| Approved | Green | Client, Admin |
| Published | Blue | System (Sync) |
| Rejected | Red | Client |
| Needs Revision | Orange | Client |

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| RW-001 | Submit draft for review | Status changes to Client Review |
| RW-002 | Approve journey | Status changes to Approved |
| RW-003 | Reject journey with comments | Status changes to Needs Revision |
| RW-004 | Publish approved journey | Triggers sync to GHL |
| RW-005 | Edit published journey | Creates new version, returns to Draft |
| RW-006 | Cancel approval request | Returns to Draft status |

### UI Components
- ApprovalPanel.jsx - Main approval interface
- StatusBadge.jsx - Status indicators
- JourneyFlow.jsx - Visual journey display

---

## User Flow 4: Conflict Resolution

### Description
System detects and handles concurrent edits through optimistic locking with version checking.

### Flow Steps
```mermaid
flowchart TD
    Start([User A Loads Journey]) --> EditA[User A Edits]
    Start --> StartB[User B Loads Journey]
    StartB --> EditB[User B Edits]
    EditA --> SaveA[User A Saves]
    SaveB[User B Saves] --> CheckVersion{Version Match?}
    SaveA --> VersionBumped[Version Incremented]
    VersionBumped --> CheckVersion
    CheckVersion -->|Yes| Success[Save Success]
    CheckVersion -->|No| Conflict[Conflict Detected]
    Conflict --> ShowOptions[Show Resolution Options]
    ShowOptions --> OptionA[Accept Server Version]
    ShowOptions --> OptionB[Force Overwrite]
    ShowOptions --> OptionC[Merge Changes]
    OptionA --> Refresh[Refresh with Server Data]
    OptionB --> Overwrite[Save with Current Version]
    OptionC --> ManualMerge[Manual Merge UI]
```

### Conflict Scenarios
1. **Simultaneous Edit**: Two users edit same journey concurrently
2. **Stale Data**: User works on old version while newer exists
3. **Version Mismatch**: Server version ahead of submitted version

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| CR-001 | Concurrent edit by two users | Conflict dialog shown to second user |
| CR-002 | Accept server version | Local state updated to server data |
| CR-003 | Force overwrite | Changes saved, version incremented |
| CR-004 | Merge changes | Merged data saved with new version |
| CR-005 | Cancel conflict resolution | Changes preserved for manual editing |
| CR-006 | Rapid successive updates | Versions increment correctly |

### API Behavior
- Returns HTTP 409 on version mismatch
- Response includes server journey data
- Client must retry with correct version

---

## User Flow 5: Sync to GoHighLevel

### Description
Approved journeys are synchronized to GoHighLevel as workflows.

### Flow Steps
```mermaid
flowchart TD
    Start([Approved Journey]) --> CheckGHL{GHL ID Exists?}
    CheckGHL -->|No| Create[Create New Workflow]
    CheckGHL -->|Yes| CheckModified{Modified Since?}
    CheckModified -->|No| Skip[Skip Sync]
    CheckModified -->|Yes| Update[Update Workflow]
    Create --> MapTouchpoints[Map Touchpoints to Steps]
    Update --> MapTouchpoints
    MapTouchpoints --> Execute[Execute API Call]
    Execute --> Success{Success?}
    Success -->|Yes| LogSuccess[Log Success]
    Success -->|No| Retry{Retry?}
    Retry -->|Yes| Execute
    Retry -->|No| LogError[Log Error]
    LogSuccess --> UpdateAirtable[Update Airtable with GHL ID]
    UpdateAirtable --> Done([Done])
    LogError --> Alert[Alert Admin]
```

### Touchpoint to GHL Mapping
| Touchpoint | GHL Step Type | API Endpoint |
|------------|---------------|--------------|
| Email | email | POST /workflows/ |
| SMS | sms | POST /workflows/ |
| Wait | delay | POST /workflows/ |
| Task | task | POST /workflows/ |
| Condition | conditional | POST /workflows/ |

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| SYNC-001 | New journey sync | Workflow created in GHL |
| SYNC-002 | Update existing journey | Workflow updated, version incremented |
| SYNC-003 | Conflict detection | Sync paused, conflict logged |
| SYNC-004 | Rate limiting | Retry with backoff |
| SYNC-005 | Invalid GHL credentials | Error logged, sync aborted |
| SYNC-006 | Dry run mode | Preview changes without execution |

### CLI Commands
```bash
npm run sync                    # Full sync
npm run sync -- --dry-run       # Preview only
npm run sync -- --client=name   # Specific client
npm run sync -- --journey=id    # Specific journey
```

---

## User Flow 6: Touchpoint Management

### Description
CRUD operations for touchpoints within a journey.

### Flow Steps
```mermaid
flowchart TD
    Start([Open Journey]) --> ViewTouchpoints[View Touchpoint List]
    ViewTouchpoints --> Action{Action}
    Action -->|Create| Create[Create Touchpoint]
    Action -->|Edit| Edit[Edit Touchpoint]
    Action -->|Delete| Delete[Delete Touchpoint]
    Action -->|Reorder| Reorder[Reorder Touchpoints]
    Create --> SelectType[Select Type]
    SelectType --> Configure[Configure Details]
    Configure --> Save[Save]
    Edit --> LoadData[Load Current Data]
    LoadData --> Modify[Modify]
    Modify --> Save
    Save --> UpdateVersion[Increment Journey Version]
    Delete --> Confirm[Confirm Delete]
    Confirm --> Remove[Remove from Journey]
    Remove --> UpdateVersion
    Reorder --> DragDrop[Drag & Drop]
    DragDrop --> UpdateOrder[Update Order Field]
    UpdateOrder --> SaveOrder[Save Order]
```

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TM-001 | Create email touchpoint | Saved with correct configuration |
| TM-002 | Edit touchpoint content | Changes saved, version bumped |
| TM-003 | Delete touchpoint | Removed, order adjusted |
| TM-004 | Reorder touchpoints | New order persisted |
| TM-005 | Bulk reorder | All orders updated |
| TM-006 | Touchpoint validation | Errors shown for invalid data |
| TM-007 | Preview touchpoint | Content preview displayed |

### UI Components
- TouchpointList.jsx - List view
- TouchpointEditor.jsx - Edit interface
- HTMLEditor.jsx - Rich text editing
- JourneyFlow.jsx - Visual reordering

---

## User Flow 7: Multi-Client Support

### Description
System supports multiple clients with data isolation and switching.

### Flow Steps
```mermaid
flowchart TD
    Start([Login]) --> LoadClients[Load Client List]
    LoadClients --> SelectClient[Select Client]
    SelectClient --> LoadJourneys[Load Client Journeys]
    LoadJourneys --> DisplayJourneys[Display Journeys]
    DisplayJourneys --> Filter{Filter?}
    Filter -->|By Pipeline| PipelineFilter[Filter by Pipeline]
    Filter -->|By Status| StatusFilter[Filter by Status]
    Filter -->|By Tag| TagFilter[Filter by Tag]
    PipelineFilter --> DisplayJourneys
    StatusFilter --> DisplayJourneys
    TagFilter --> DisplayJourneys
    DisplayJourneys --> SwitchClient{Switch Client?}
    SwitchClient -->|Yes| SelectClient
    SwitchClient -->|No| Continue[Continue Working]
```

### Clients in System
| Client | Slug | Location ID |
|--------|------|-------------|
| Maison Albion | maison-albion | HzttFvMOh41pAjozlxkS |
| Cameron Estate | cameron-estate | TBD |
| Maravilla Gardens | maravilla-gardens | TBD |
| Maui Pineapple Chapel | maui-pineapple-chapel | TBD |

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| MC-001 | Switch between clients | Journey list updates |
| MC-002 | Client data isolation | Only see current client journeys |
| MC-003 | Default client on login | Correct client loaded |
| MC-004 | URL with client slug | Direct navigation to client |
| MC-005 | Client filter persistence | Filter remembered per session |

---

## User Flow 8: Template Library

### Description
Browse and apply pre-built journey templates.

### Flow Steps
```mermaid
flowchart TD
    Start([Open Template Library]) --> Browse[Browse Templates]
    Browse --> Filter{Filter}
    Filter -->|By Industry| Industry[Filter by Industry]
    Filter -->|By Type| Type[Filter by Type]
    Filter -->|By Goal| Goal[Filter by Goal]
    Industry --> Preview[Preview Template]
    Type --> Preview
    Goal --> Preview
    Preview --> Details[View Details]
    Details --> Apply[Apply Template]
    Apply --> SelectClient[Select Target Client]
    SelectClient --> Customize[Customize Journey]
    Customize --> Save[Save as New Journey]
```

### Template Categories
| Category | Description | Examples |
|----------|-------------|----------|
| Wedding | Wedding venue workflows | Welcome series, tour follow-up |
| Corporate | Business event workflows | Proposal, contract signing |
| Nurture | Lead nurturing sequences | Re-engagement, win-back |
| Onboarding | New client onboarding | Welcome, setup guide |

### Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| TL-001 | Browse all templates | Templates displayed with previews |
| TL-002 | Filter by category | Only matching templates shown |
| TL-003 | Preview template | Full journey preview displayed |
| TL-004 | Apply template | New journey created from template |
| TL-005 | Customize applied template | Changes saved to new journey |
| TL-006 | Search templates | Matching templates found |

---

## Test Environment Setup

### Prerequisites
```bash
# Start database services
docker-compose up -d postgres redis

# Start Journey API
cd apps/journey-api
npm install
npm run dev  # Runs on :3001

# Start Visualizer
cd apps/journey-visualizer
npm install
npm run dev  # Runs on :5173
```

### Environment Variables
```env
# apps/journey-visualizer/.env
VITE_API_URL=http://localhost:3001
VITE_DATA_SOURCE=local

# apps/journey-api/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/journeydb
PORT=3001
JWT_SECRET=test-secret
```

### Test Data
- Maison Albion client with sample journeys
- 4+ touchpoint types configured
- Multiple journey statuses represented

---

## Testing Checklist

### Pre-Test Setup
- [ ] Database migrated and seeded
- [ ] API server running on :3001
- [ ] Visualizer running on :5173
- [ ] Test data loaded
- [ ] Browser console open for errors

### Per-Flow Testing
- [ ] Navigate to entry point
- [ ] Execute each step in flow
- [ ] Verify UI updates correctly
- [ ] Check network requests/responses
- [ ] Verify database state changes
- [ ] Test error scenarios
- [ ] Test edge cases

### Post-Test
- [ ] Document any bugs found
- [ ] Screenshot issues
- [ ] Note performance concerns
- [ ] Verify all flows complete successfully

---

## Success Criteria

| Flow | Success Metric |
|------|----------------|
| Authentication | < 2 second login, token persists correctly |
| Journey Creation | Journey created with all touchpoints in < 30 seconds |
| Client Review | Status transitions work without errors |
| Conflict Resolution | Conflicts detected and resolved correctly |
| Sync to GHL | Sync completes with < 5% error rate |
| Touchpoint Management | All CRUD operations work smoothly |
| Multi-Client | Client switching < 1 second |
| Template Library | Templates load and apply correctly |

---

## Known Issues / Watch Points

1. **Version Conflicts**: Ensure version numbers increment correctly
2. **Rate Limiting**: GHL API has strict rate limits (100/hour)
3. **Linked Records**: Airtable linked fields can be slow to update
4. **Workflow Endpoint**: GHL requires trailing slash `/workflows/`
5. **Template IDs**: Email templates use `/emails/builder` not `/emailing/templates`

---

*Document Version: 1.0*
*Last Updated: 2026-02-22*
*Author: Architect Mode Analysis*