# BLOOM-203: Fix Sync Conflicts on Simultaneous Edits

## Task Metadata

| Field | Value |
|-------|-------|
| **ID** | BLOOM-203 |
| **Title** | Fix Sync Conflicts on Simultaneous Edits |
| **Priority** | P0 (Critical) |
| **Story Points** | 5 |
| **Assignee** | @backend-lead |
| **Sprint** | 2026 Q1 Sprint 1 |
| **Status** | In Progress |

---

## Problem Statement

Multiple users editing journeys simultaneously causes **data corruption** and **silent overwrites**. When two or more team members edit the same journey concurrently (e.g., planner updating touchpoints while designer modifies styling), the last save overwrites previous changes without warning, resulting in:

- Loss of work for one or more editors
- Inconsistent journey states
- Missing touchpoints or configuration changes
- Difficult-to-debug data inconsistencies

### Impact

- **Severity**: Critical - Data loss affecting production client journeys
- **Frequency**: Increasing as team scales - occurring 3-5x per week
- **Affected Users**: All journey editors (planners, designers, strategists)

---

## Root Cause Analysis

> **Note:** This section to be completed after investigation. Initial findings below.

### Current System Behavior

The current implementation uses a **last-write-wins** strategy:

1. Client fetches journey data
2. User makes edits locally
3. On save, client sends complete journey payload
4. Server overwrites existing record without version checking
5. Concurrent edits result in whichever save happens last persisting

### Investigation Checklist

- [ ] Analyze current `PUT /api/journeys/:id` implementation
- [ ] Review database transaction boundaries
- [ ] Check for existing version/timestamp fields in schema
- [ ] Audit frontend state management for edit sessions
- [ ] Identify race conditions in save operations

---

## Solution Approach

### Primary Solution: Optimistic Locking

Implement **optimistic concurrency control** using version numbers:

1. Add a `version` field to the Journey model
2. Include version in read responses
3. Require version in update requests
4. Reject updates with stale versions (409 Conflict)
5. Frontend handles conflicts with user-friendly resolution UI

### Alternative Solution: Operational Transformation

For real-time collaborative editing (future consideration):
- Use OT algorithms for concurrent text editing
- Implement WebSocket-based real-time sync
- Consider CRDTs for conflict-free data types

### Decision

Proceed with **Optimistic Locking** for immediate fix. OT/CRDTs to be evaluated for future real-time collaboration features.

---

## Files to Modify

### Backend Changes

#### 1. `apps/journey-api/src/routes/journeys.js`
Add version checking to PUT endpoints:

```javascript
// Current implementation (problematic)
router.put('/:id', async (req, res) => {
  const journey = await prisma.journey.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(journey);
});

// New implementation (with optimistic locking)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { version, ...updateData } = req.body;
  
  try {
    const journey = await prisma.$transaction(async (tx) => {
      // Verify version matches
      const current = await tx.journey.findUnique({
        where: { id },
        select: { version: true }
      });
      
      if (!current) {
        throw new Error('Journey not found');
      }
      
      if (current.version !== version) {
        const error = new Error('Conflict detected');
        error.code = 'CONFLICT';
        error.status = 409;
        throw error;
      }
      
      // Increment version on update
      return tx.journey.update({
        where: { id },
        data: {
          ...updateData,
          version: { increment: 1 },
          updatedAt: new Date()
        }
      });
    });
    
    res.json(journey);
  } catch (error) {
    if (error.code === 'CONFLICT') {
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This journey was modified by another user. Please refresh and retry.',
        code: 'VERSION_CONFLICT'
      });
    }
    throw error;
  }
});
```

#### 2. `apps/journey-api/prisma/schema.prisma`
Add version field to Journey model:

```prisma
model Journey {
  id          String   @id @default(cuid())
  name        String
  description String?
  clientId    String
  stages      Json     // Journey stages configuration
  status      String   @default("draft") // draft, active, archived
  
  // Optimistic locking field
  version     Int      @default(1)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  client      Client   @relation(fields: [clientId], references: [id])
  touchpoints Touchpoint[]
  
  @@index([clientId])
  @@index([status])
}
```

Migration script:
```sql
-- Add version column with default value
ALTER TABLE "Journey" ADD COLUMN "version" INTEGER DEFAULT 1;

-- Update existing records
UPDATE "Journey" SET "version" = 1 WHERE "version" IS NULL;

-- Make column non-nullable
ALTER TABLE "Journey" ALTER COLUMN "version" SET NOT NULL;
```

### Frontend Changes

#### 3. `apps/journey-visualizer/src/hooks/useJourneys.js`
Handle conflict errors in UI:

```javascript
// Add to useJourneys hook
const updateJourney = async (journeyId, updates) => {
  try {
    const response = await apiClient.put(`/journeys/${journeyId}`, {
      ...updates,
      version: currentJourney.version
    });
    
    // Update local state with new version
    setCurrentJourney(response.data);
    showToast('Journey saved successfully', 'success');
    
  } catch (error) {
    if (error.response?.status === 409) {
      // Conflict detected - show resolution dialog
      setConflictDialog({
        open: true,
        serverVersion: error.response.data.serverVersion,
        clientVersion: currentJourney,
        pendingChanges: updates
      });
    } else {
      showToast('Failed to save journey', 'error');
      throw error;
    }
  }
};

// Conflict resolution handler
const resolveConflict = async (strategy, mergedData) => {
  switch (strategy) {
    case 'overwrite':
      // Force update with latest version from server
      await apiClient.put(`/journeys/${journeyId}`, {
        ...mergedData,
        version: conflictDialog.serverVersion.version
      });
      break;
      
    case 'refresh':
      // Discard local changes and reload
      await loadJourney(journeyId);
      break;
      
    case 'merge':
      // Apply user-resolved merge
      await apiClient.put(`/journeys/${journeyId}`, {
        ...mergedData,
        version: conflictDialog.serverVersion.version
      });
      break;
  }
  
  setConflictDialog({ open: false });
};
```

#### 4. `apps/journey-visualizer/src/services/apiClient.js`
Add conflict detection:

```javascript
// Enhanced error handling for 409 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 409) {
      // Log conflict for analytics
      analytics.track('journey_conflict_detected', {
        journeyId: error.config.url,
        timestamp: new Date().toISOString()
      });
      
      // Enhance error with user-friendly message
      error.userMessage = 'Someone else edited this journey while you were working. Please review the changes.';
    }
    return Promise.reject(error);
  }
);

// Add retry logic for transient failures (not 409s)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

apiClient.interceptors.response.use(
  null,
  async (error) => {
    const { config } = error;
    
    // Don't retry on conflicts
    if (error.response?.status === 409) {
      return Promise.reject(error);
    }
    
    config.retryCount = config.retryCount || 0;
    
    if (config.retryCount < MAX_RETRIES) {
      config.retryCount++;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.retryCount));
      return apiClient(config);
    }
    
    return Promise.reject(error);
  }
);
```

---

## Implementation Steps

### Phase 1: Backend (Day 1-2)

- [ ] Create Prisma migration for `version` field
- [ ] Run migration on dev database
- [ ] Update `PUT /api/journeys/:id` endpoint with version checking
- [ ] Add version to response payloads (GET endpoints)
- [ ] Write unit tests for version conflict scenarios

### Phase 2: Frontend (Day 3-4)

- [ ] Update `useJourneys` hook to track and send version
- [ ] Create `ConflictDialog` component for resolution UI
- [ ] Implement conflict resolution strategies (overwrite/refresh/merge)
- [ ] Add visual indicator for unsaved changes
- [ ] Auto-save with debounce to reduce conflict frequency

### Phase 3: Integration & Testing (Day 5)

- [ ] End-to-end testing of conflict scenarios
- [ ] Load testing concurrent edits
- [ ] Update API documentation
- [ ] Deploy to staging environment

---

## Testing Requirements

### Unit Tests

```javascript
// Backend: Version conflict detection
describe('Journey Update', () => {
  it('should reject update with stale version', async () => {
    const journey = await createJourney({ version: 1 });
    
    const response = await request(app)
      .put(`/api/journeys/${journey.id}`)
      .send({ name: 'Updated', version: 0 }); // stale version
      
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('VERSION_CONFLICT');
  });
  
  it('should increment version on successful update', async () => {
    const journey = await createJourney({ version: 1 });
    
    const response = await request(app)
      .put(`/api/journeys/${journey.id}`)
      .send({ name: 'Updated', version: 1 });
      
    expect(response.body.version).toBe(2);
  });
});
```

### Integration Tests

- [ ] Concurrent edit simulation with two browser sessions
- [ ] Network latency simulation for race conditions
- [ ] Database transaction rollback verification

### Concurrent Edit Simulation Script

```javascript
// test/concurrent-edits.test.js
describe('Concurrent Edit Scenarios', () => {
  it('should handle two simultaneous edits', async () => {
    const journey = await createJourney();
    
    // User A fetches journey (version 1)
    const userA = await fetchJourney(journey.id);
    
    // User B fetches journey (version 1)
    const userB = await fetchJourney(journey.id);
    
    // User A saves (succeeds, version becomes 2)
    const saveA = await updateJourney(journey.id, {
      name: 'User A Edit',
      version: userA.version
    });
    expect(saveA.status).toBe(200);
    
    // User B saves (fails with 409, version is now 2)
    const saveB = await updateJourney(journey.id, {
      name: 'User B Edit',
      version: userB.version // still 1, stale
    });
    expect(saveB.status).toBe(409);
  });
});
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC-1:** System detects when two users edit the same journey concurrently
- [ ] **AC-2:** Server rejects updates with stale version numbers (HTTP 409)
- [ ] **AC-3:** Version increments atomically on each successful save
- [ ] **AC-4:** Frontend displays conflict resolution dialog with options:
  - Refresh and lose local changes
  - Overwrite with local changes (force update)
  - Merge changes manually (if applicable)
- [ ] **AC-5:** Conflict resolution preserves data integrity

### Non-Functional Requirements

- [ ] **AC-6:** Conflict detection adds <50ms latency to save operations
- [ ] **AC-7:** No data loss occurs when conflicts are properly handled
- [ ] **AC-8:** Conflict events are logged for analytics
- [ ] **AC-9:** Solution works with existing journey data (backward compatible)

### Edge Cases

- [ ] **AC-10:** Handles rapid successive edits from same user
- [ ] **AC-11:** Handles network failures mid-save gracefully
- [ ] **AC-12:** Handles deleted journeys (404 vs 409 distinction)

---

## Related Tasks

- BLOOM-204: Implement WebSocket notifications for real-time updates
- BLOOM-205: Add edit session locking for long-running edits
- BLOOM-206: Journey audit log for change tracking

---

## Notes

- Consider implementing soft locks for UX improvement ("Someone is editing this journey")
- Evaluate need for admin override to resolve conflicts
- Document conflict resolution workflow for team training
