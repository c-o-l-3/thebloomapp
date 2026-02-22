# BLOOM-202: Resolve AI Assistant Panel Memory Leak

## Task Metadata

| Field | Value |
|-------|-------|
| **ID** | BLOOM-202 |
| **Title** | Resolve AI Assistant Panel Memory Leak |
| **Priority** | P0 (Critical) |
| **Points** | 8 |
| **Assignee** | @frontend-dev |
| **Status** | In Progress |
| **Created** | 2026-02-21 |
| **Sprint** | 2026 Q1 Sprint 1 |

---

## Problem Statement

The [`AIAssistantPanel`](apps/journey-visualizer/src/components/AIAssistantPanel.jsx:1) component is causing a significant memory leak that is directly impacting the Journey Visualizer application's uptime and reliability.

### Impact Metrics

| Metric | Current | Target |
|--------|---------|--------|
| **Application Uptime** | 97% | 99.5% |
| **Memory Growth Rate** | ~15MB/hour | <2MB/hour |
| **Browser Tab Crashes** | 3-4/day (production) | 0 |

### Symptoms

- Browser memory usage continuously increases while AI Assistant Panel is open
- Memory is not released when panel is closed/unmounted
- Long-running sessions (>30 minutes) cause tab crashes
- Performance degradation over time (increased lag in UI interactions)
- Chrome DevTools Memory tab shows retained detached DOM nodes

---

## Root Cause Analysis Guide

### 1. Check `useEffect` Cleanup Functions in AIAssistantPanel.jsx

Investigate all [`useEffect`](apps/journey-visualizer/src/components/AIAssistantPanel.jsx:1) hooks for missing or incomplete cleanup:

```javascript
// ❌ BAD: Missing cleanup
useEffect(() => {
  const subscription = knowledgeHub.subscribe(handleUpdate);
  // No cleanup returned!
}, []);

// ✅ GOOD: Proper cleanup
useEffect(() => {
  const subscription = knowledgeHub.subscribe(handleUpdate);
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Checklist for useEffect cleanup:**
- [ ] Identify all `useEffect` hooks in AIAssistantPanel.jsx (estimate: 8-12)
- [ ] Verify each returns a cleanup function where appropriate
- [ ] Check for async operations that may complete after unmount
- [ ] Look for state updates in async callbacks that need cancellation

### 2. Look for Event Listeners Not Being Removed

Search for `addEventListener` calls without corresponding `removeEventListener`:

**Common patterns to find:**
```javascript
// Window/document events
window.addEventListener('resize', handleResize);
document.addEventListener('keydown', handleKeydown);

// Custom events
emitter.on('knowledgeUpdate', handleUpdate);

// WebSocket message handlers
ws.addEventListener('message', handleMessage);
```

**Files to search:**
```bash
grep -n "addEventListener" apps/journey-visualizer/src/components/AIAssistantPanel.jsx
grep -n "\.on\(" apps/journey-visualizer/src/services/knowledgeHub.js
```

### 3. Check for Intervals/Timeouts Not Being Cleared

Look for `setInterval` and `setTimeout` without cleanup:

```javascript
// ❌ BAD: Interval not cleared
useEffect(() => {
  setInterval(() => {
    refreshData();
  }, 5000);
}, []);

// ✅ GOOD: Interval properly cleared
useEffect(() => {
  const intervalId = setInterval(() => {
    refreshData();
  }, 5000);
  return () => clearInterval(intervalId);
}, []);
```

**Search commands:**
```bash
grep -n "setInterval\|setTimeout" apps/journey-visualizer/src/components/AIAssistantPanel.jsx
grep -n "setInterval\|setTimeout" apps/journey-visualizer/src/services/knowledgeHub.js
```

### 4. Look for Knowledge Hub Context Subscriptions

The [`knowledgeHub.js`](apps/journey-visualizer/src/services/knowledgeHub.js:1) service likely maintains subscriptions that aren't being cleaned up.

**Key areas to investigate:**
- Observable pattern implementations
- Context provider subscriptions
- Event emitter listeners
- BroadcastChannel or SharedWorker connections

```javascript
// Check for patterns like:
knowledgeHub.subscribe(callback);
knowledgeHub.onUpdate(callback);
knowledgeHub.addListener(callback);
```

### 5. Review WebSocket Connections

If the AI Assistant uses WebSocket connections:

```javascript
// ❌ BAD: WebSocket not closed
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handleMessage;
  // Connection left open!
}, []);

// ✅ GOOD: WebSocket properly closed
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = handleMessage;
  return () => {
    ws.close();
  };
}, []);
```

---

## Files to Investigate/Modify

### Primary Files

| File | Size | Purpose | Priority |
|------|------|---------|----------|
| [`AIAssistantPanel.jsx`](apps/journey-visualizer/src/components/AIAssistantPanel.jsx:1) | 16KB | Main component - primary leak source | P0 |
| [`knowledgeHub.js`](apps/journey-visualizer/src/services/knowledgeHub.js:1) | 16KB | Knowledge Hub service - likely subscription issues | P0 |
| [`useApprovals.js`](apps/journey-visualizer/src/hooks/useApprovals.js:1) | ~6KB | Approvals hook - may have unclosed connections | P1 |

### Related Files (Secondary Investigation)

| File | Purpose |
|------|---------|
| [`useJourneys.js`](apps/journey-visualizer/src/hooks/useJourneys.js:1) | Journeys hook - check for subscription leaks |
| [`apiClient.js`](apps/journey-visualizer/src/services/apiClient.js:1) | API client - check for pending request cleanup |
| [`dataService.js`](apps/journey-visualizer/src/services/dataService.js:1) | Data service - check for cache retention |

---

## Debugging Steps

### Chrome DevTools Memory Tab Instructions

#### Step 1: Baseline Measurement
1. Open Journey Visualizer in Chrome
2. Open DevTools → Performance Monitor (for live memory tracking)
3. Open DevTools → Memory tab
4. Click "Take heap snapshot" (baseline)

#### Step 2: Reproduce the Leak
1. Open AI Assistant Panel
2. Interact with panel for 5 minutes (simulate typical usage)
3. Close AI Assistant Panel
4. Click "Collect garbage" (trash can icon)
5. Take another heap snapshot

#### Step 3: Compare Snapshots
1. Select "Comparison" view in the Memory tab
2. Compare Snapshot 2 to Snapshot 1
3. Look for:
   - Detached DOM trees
   - React Fiber nodes retained
   - Closure contexts not released
   - Array/Object growth in component-related code

#### Step 4: Identify Retainers
1. In the Comparison view, find objects with positive "Delta"
2. Click on suspicious objects
3. Follow the "Retainers" chain to identify what's holding the reference
4. Look for:
   - Event listeners in closure scope
   - uncleared intervals/timeouts
   - unsubscribed observables

#### Step 5: Component Mount/Unmount Test
```javascript
// Run in console to stress test
const mountUnmount = () => {
  // Simulate rapid open/close of AI Assistant Panel
  const event = new CustomEvent('toggleAIAssistant');
  for (let i = 0; i < 50; i++) {
    window.dispatchEvent(event);
  }
};
mountUnmount();
```

### Memory Profiling Checklist

- [ ] Capture baseline heap snapshot
- [ ] Capture snapshot after 5 minutes of AI Assistant usage
- [ ] Capture snapshot after closing panel + garbage collection
- [ ] Identify retained detached DOM nodes
- [ ] Identify retained React components/fibers
- [ ] Identify growth in closure contexts
- [ ] Document objects with largest retained size

---

## Solution Approaches

### 1. Proper `useEffect` Cleanup

Ensure all effects return cleanup functions:

```javascript
useEffect(() => {
  let isMounted = true;
  
  const fetchData = async () => {
    const result = await knowledgeHub.query(query);
    if (isMounted) {
      setData(result);
    }
  };
  
  fetchData();
  
  return () => {
    isMounted = false;
  };
}, [query]);
```

### 2. AbortController for Fetch Requests

Cancel in-flight requests on unmount:

```javascript
useEffect(() => {
  const controller = new AbortController();
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/ai-assistant', {
        signal: controller.signal
      });
      const data = await response.json();
      setData(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fetch error:', error);
      }
    }
  };
  
  fetchData();
  
  return () => {
    controller.abort();
  };
}, []);
```

### 3. Event Listener Cleanup

Remove all listeners in cleanup:

```javascript
useEffect(() => {
  const handleResize = () => setWindowSize(window.innerWidth);
  const handleKeydown = (e) => {
    if (e.key === 'Escape') closePanel();
  };
  
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', handleKeydown);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('keydown', handleKeydown);
  };
}, []);
```

### 4. Context Unsubscription

Implement proper unsubscribe patterns:

```javascript
// In knowledgeHub.js - ensure unsubscribe works
class KnowledgeHub {
  subscribers = new Set();
  
  subscribe(callback) {
    this.subscribers.add(callback);
    return {
      unsubscribe: () => this.subscribers.delete(callback)
    };
  }
}

// In component
useEffect(() => {
  const subscription = knowledgeHub.subscribe(handleUpdate);
  return () => subscription.unsubscribe();
}, []);
```

### 5. Custom Hook for Safe State Updates

Create a utility hook to prevent state updates after unmount:

```javascript
// hooks/useSafeState.js
import { useState, useEffect, useCallback } from 'react';

export function useSafeState(initialValue) {
  const [state, setState] = useState(initialValue);
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const safeSetState = useCallback((value) => {
    if (isMounted.current) {
      setState(value);
    }
  }, []);
  
  return [state, safeSetState];
}
```

---

## Testing Requirements

### 1. Memory Profiling Before/After

**Before Fix:**
- [ ] Document baseline memory usage
- [ ] Document memory growth rate (MB/hour)
- [ ] Identify top retained object types
- [ ] Record detached DOM node count

**After Fix:**
- [ ] Compare memory growth rate (should be <2MB/hour)
- [ ] Verify detached DOM nodes are released
- [ ] Confirm no React component retention
- [ ] Validate all subscriptions cleaned up

### 2. Long-Running Session Test (30+ minutes)

**Test Procedure:**
1. Open Journey Visualizer
2. Open AI Assistant Panel
3. Keep panel open for 30 minutes
4. Perform typical interactions every 5 minutes
5. Monitor memory usage via Performance Monitor

**Expected Results:**
- [ ] Memory growth <1MB for final 15 minutes
- [ ] No tab crashes
- [ ] UI remains responsive
- [ ] No console errors about memory

**Automated Test Script:**
```javascript
// tests/memory/long-running.test.js
describe('AI Assistant Memory - Long Running', () => {
  it('should not leak memory over 30 minutes', async () => {
    const initialMemory = await getMemoryUsage();
    
    await simulateAIAssistantUsage(30 * 60 * 1000); // 30 minutes
    
    const finalMemory = await getMemoryUsage();
    const growthMB = (finalMemory - initialMemory) / 1024 / 1024;
    
    expect(growthMB).toBeLessThan(2); // Less than 2MB growth
  });
});
```

### 3. Component Mount/Unmount Stress Test

**Test Procedure:**
1. Mount and unmount AIAssistantPanel 100 times
2. Measure memory before and after

**Expected Results:**
- [ ] Memory returns to baseline after garbage collection
- [ ] No retained component instances
- [ ] No event listener accumulation

**Test Script:**
```javascript
// tests/memory/stress-test.test.js
describe('AI Assistant Memory - Stress Test', () => {
  it('should clean up after 100 mount/unmount cycles', async () => {
    const baseline = await getMemoryUsage();
    
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<AIAssistantPanel />);
      await waitFor(() => screen.getByTestId('ai-panel'));
      unmount();
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const afterCleanup = await getMemoryUsage();
    const diffMB = (afterCleanup - baseline) / 1024 / 1024;
    
    expect(diffMB).toBeLessThan(5); // Less than 5MB retained
  });
});
```

---

## Acceptance Criteria

### Must Have (P0)

- [ ] Memory leak root cause identified and documented
- [ ] All `useEffect` hooks in AIAssistantPanel.jsx have proper cleanup
- [ ] All event listeners are removed on component unmount
- [ ] All intervals/timeouts are cleared on component unmount
- [ ] Knowledge Hub subscriptions are properly unsubscribed
- [ ] Memory growth rate reduced to <2MB/hour
- [ ] No detached DOM nodes retained after panel close
- [ ] Application uptime target of 99.5% is achievable

### Should Have (P1)

- [ ] AbortController implemented for all fetch requests
- [ ] Custom `useSafeState` hook implemented and used
- [ ] Unit tests added for cleanup functions
- [ ] Memory profiling documentation added to team wiki
- [ ] Chrome DevTools Memory tab guide updated

### Nice to Have (P2)

- [ ] ESLint rule added to enforce effect cleanup
- [ ] Automated memory regression test in CI/CD
- [ ] Performance budget for memory usage established
- [ ] Memory monitoring dashboard widget added

### Verification Checklist

Before marking complete, verify:

- [ ] Chrome DevTools Memory tab shows no retained AIAssistantPanel instances
- [ ] 30-minute long-running test passes
- [ ] 100-cycle mount/unmount stress test passes
- [ ] Journey Visualizer uptime monitoring shows improvement
- [ ] No new memory-related console warnings
- [ ] Code review approved with focus on cleanup patterns
- [ ] QA sign-off on memory performance

---

## Related Tasks

- BLOOM-203: Knowledge Hub Integration Optimization
- BLOOM-208: Journey Visualizer Performance Improvements

## References

- [React useEffect Cleanup Documentation](https://react.dev/reference/react/useEffect#parameters)
- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory/)
- [Knowledge Hub Architecture](plans/knowledge-hub-architecture.md)
