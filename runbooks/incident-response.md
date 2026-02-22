# Incident Response Runbook

Step-by-step guide for responding to incidents and outages.

---

## Severity Levels

### P0 - Critical

**Definition:** Complete service outage or data loss affecting all users

**Examples:**
- API completely down (all endpoints returning 5xx)
- Database unavailable
- All sync jobs failing
- Data corruption affecting multiple clients
- Security breach

**Response Time:** Immediate (within 5 minutes)
**Communication:** Immediate Slack alert + status page update

### P1 - High

**Definition:** Major functionality impaired, significant user impact

**Examples:**
- Key API endpoints failing (e.g., `/api/journeys` down)
- sync-engine failing for specific clients
- Performance degraded (>5s response times)
- Visualizer not rendering
- Memory/CPU usage critically high

**Response Time:** Within 30 minutes
**Communication:** Slack notification to #engineering

### P2 - Medium

**Definition:** Partial functionality impaired, limited user impact

**Examples:**
- Non-critical endpoints returning errors
- Intermittent sync failures (retry succeeds)
- Minor UI issues in visualizer
- Warnings in logs (not affecting functionality)
- Single client experiencing issues

**Response Time:** Within 2 hours
**Communication:** Create ticket, address during business hours

---

## Incident Response Workflow

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ DETECT  │───→│ ASSESS   │───→│ RESPOND  │───→│ RESOLVE  │───→│  REVIEW  │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │              │               │               │               │
     ▼              ▼               ▼               ▼               ▼
  Alert         Determine      Execute fix     Verify fix      Document
  fires         severity       (see below)    is working       lessons
                and scope                                       learned
```

### 1. DETECT

**Sources:**
- PagerDuty/Opsgenie alerts
- Zeabur monitoring notifications
- Slack #alerts channel
- Customer reports
- Error logs

**Immediate Actions:**
- [ ] Acknowledge the alert (if using paging system)
- [ ] Note the timestamp
- [ ] Join #incident-response Slack channel

### 2. ASSESS

**Questions to Answer:**
- [ ] What service is affected? (journey-api, visualizer, sync-engine)
- [ ] How many users/clients affected?
- [ ] Is this P0, P1, or P2?
- [ ] Is this a new issue or related to previous incident?
- [ ] Any recent deployments? (check #deployments channel)

**Decision Matrix:**

| Question | If YES → |
|----------|----------|
| All users affected? | P0, escalate immediately |
| Recent deployment? | Consider rollback first |
| Database errors? | Check connection pool |
| Only one client? | Check client-specific config |

### 3. RESPOND

See specific incident types below for detailed response steps.

### 4. RESOLVE

- [ ] Confirm service is restored (run verification tests)
- [ ] Monitor for 15 minutes to ensure stability
- [ ] Update status page / communicate resolution
- [ ] Document timeline and root cause

### 5. REVIEW

- [ ] Schedule post-incident review within 48 hours
- [ ] Complete post-incident review template
- [ ] Create follow-up tickets for preventive measures

---

## Communication Templates

### Initial Alert (P0/P1)

```
🚨 INCIDENT ALERT

Severity: [P0/P1/P2]
Service: [journey-api/visualizer/sync-engine]
Started: [timestamp]
Impact: [description of user impact]

Symptoms:
- [symptom 1]
- [symptom 2]

Responding: @your-handle
Status: Investigating

Updates in this thread.
```

### Status Update

```
📋 INCIDENT UPDATE

Time: [timestamp]
Status: [Investigating/Identified/Monitoring/Resolved]

Update:
[What you've found or done]

Next Step:
[What you're doing next]

ETA:
[Estimated time to resolution or next update]
```

### Resolution Notice

```
✅ INCIDENT RESOLVED

Time Resolved: [timestamp]
Duration: [X minutes]

Summary:
[Brief description of what happened]

Resolution:
[How it was fixed]

Post-incident review: [Scheduled for when]
```

### Customer-Facing Update (via Product/CS)

```
We are currently investigating reports of [issue]. 
Our engineering team is working to resolve this as quickly as possible.
We will provide updates every [30 minutes/hour].
```

---

## Investigation Steps

### API Downtime

**Quick Checks:**
```bash
# 1. Is the service running?
curl https://journey-api.zeabur.app/health

# 2. Check Zeabur status
# Visit: https://dash.zeabur.com

# 3. Check recent logs (if available)
# Zeabur dashboard → Service → Logs
```

**Diagnosis Flow:**
```
Health check fails?
│
├─→ YES → Check Zeabur dashboard
│         │
│         ├─→ Container crashed? → Check logs, restart
│         ├─→ Build failed? → See deployment runbook
│         └─→ Resource limits? → Scale up
│
└─→ NO → Check specific endpoints
          │
          ├─→ All endpoints fail? → Database issue?
          └─→ One endpoint fails? → Code bug, check logs
```

**Common Causes:**
1. **Database connection pool exhausted** → Restart service, increase pool size
2. **Out of memory** → Scale container resources
3. **Unhandled exception** → Check logs, deploy fix
4. **Zeabur infrastructure issue** → Wait for platform fix, communicate

---

### Database Connection Issues

**Symptoms:**
- API returning 500s with database errors
- "Connection refused" or "timeout" errors
- Slow queries in logs

**Investigation:**
```bash
# 1. Check connection string
echo $DATABASE_URL

# 2. Test direct connection
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 4. Check for locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

**Solutions:**
1. **Connection pool exhausted:**
   - Restart API service (temporary fix)
   - Increase `connection_limit` in connection string
   - Add connection pooling (PgBouncer)

2. **Database unresponsive:**
   - Check database provider status page
   - Contact provider support if needed
   - Consider failover to replica (if configured)

3. **Query hanging:**
   - Identify slow query: `pg_stat_activity`
   - Kill blocking query if safe: `SELECT pg_terminate_backend(pid)`
   - Optimize query or add index

---

### sync-engine Failures

**Symptoms:**
- Client data not updating
- sync-engine logs showing errors
- Missing records in database

**Investigation:**
```bash
# 1. Check sync logs
tail -n 500 logs/sync-$(date +%Y-%m-%d).log | grep -i error

# 2. Run sync in verbose mode for specific client
cd scripts/sync-engine
node src/cli.js sync --client <client-slug> --verbose

# 3. Check GHL API status
# Test GHL connection:
node src/cli.js test-ghl --client <client-slug>

# 4. Check Airtable connection (if still using)
node src/cli.js test-airtable --client <client-slug>
```

**Common Issues:**

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Refresh GHL token |
| `429 Too Many Requests` | Rate limit hit | Wait 60s, reduce sync frequency |
| `Validation Error` | Data format issue | Check client config, fix data |
| `ETIMEDOUT` | Network issue | Retry, check firewall/DNS |
| `PrismaClientKnownRequestError` | Database constraint | Check schema, fix data |

**Immediate Fixes:**
```bash
# Restart sync for specific client
node src/cli.js sync --client <client> --force

# Clear sync state and re-sync
node src/cli.js sync --client <client> --reset

# Skip problematic records
node src/cli.js sync --client <client> --skip-errors
```

---

### Memory/Performance Issues

**Symptoms:**
- High memory usage alerts
- Slow API responses
- Timeouts
- Container restarts (OOM)

**Investigation:**
```bash
# 1. Check current memory usage
# Zeabur dashboard → Metrics

# 2. If running locally or on server:
ps aux --sort=-%mem | head -10

# 3. Check for memory leaks (Node.js)
# Add to code temporarily:
# setInterval(() => console.log(process.memoryUsage()), 5000);

# 4. Check database query times
# Look for slow queries in logs
```

**Solutions:**

**Immediate (stop the bleeding):**
1. Restart the service
2. Scale up container resources (if possible)
3. Enable request caching temporarily

**Short-term:**
1. Identify and fix memory leak
2. Add database indexes for slow queries
3. Implement pagination for large responses
4. Add request rate limiting

**Long-term:**
1. Code optimization
2. Database query optimization
3. Caching layer (Redis)
4. Horizontal scaling

---

## Escalation Procedures

### When to Escalate

| Situation | Escalate To | When |
|-----------|-------------|------|
| P0 incident | @eng-manager + @backend-lead | Immediately |
| Database corruption | @backend-lead + @devops-lead | Immediately |
| Security breach | @eng-manager + Security team | Immediately |
| Can't resolve in 30 min | Relevant team lead | At 30 min mark |
| Customer escalation | @product-lead + @eng-manager | When notified |
| Infrastructure issue | @devops-lead | If Zeabur/DB provider issue |

### Escalation Template

```
🚨 ESCALATION NEEDED

Incident: [link to incident thread]
Severity: [P0/P1]
Duration: [X minutes so far]

Issue:
[What's happening]

Tried:
- [what you tried]
- [what you tried]

Need:
[Specific help needed]

Please respond if you can assist.
```

---

## Post-Incident Review Template

### Meeting Details

- **Date:** YYYY-MM-DD
- **Incident:** [Brief description]
- **Severity:** P0/P1/P2
- **Duration:** X minutes
- **Attendees:** @handles

### Timeline

| Time | Event |
|------|-------|
| HH:MM | Incident detected (by who/how) |
| HH:MM | Response started |
| HH:MM | Issue identified |
| HH:MM | Fix implemented |
| HH:MM | Service restored |
| HH:MM | Monitoring period ended |

### Root Cause Analysis

**What happened?**
[Detailed technical description]

**Why did it happen?**
[Underlying cause - 5 Whys]

**Why wasn't it caught earlier?**
[Gap in monitoring/tests/process]

### Impact Assessment

- **Users affected:** [number/description]
- **Clients affected:** [list]
- **Data loss:** [Y/N, details if yes]
- **Revenue impact:** [if applicable]

### Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Fix/preventive action] | @handle | YYYY-MM-DD | High/Med/Low |
| [Monitoring improvement] | @handle | YYYY-MM-DD | High/Med/Low |
| [Documentation update] | @handle | YYYY-MM-DD | High/Med/Low |

### Lessons Learned

**What went well?**
- [item]
- [item]

**What could be improved?**
- [item]
- [item]

**What should we do differently next time?**
- [item]
- [item]

---

## Emergency Contacts

| Role | Handle | Contact For |
|------|--------|-------------|
| Backend Lead | @backend-lead | API, database, sync-engine |
| Frontend Lead | @frontend-dev | Visualizer, UI issues |
| DevOps Lead | @devops-lead | Infrastructure, Zeabur |
| Engineering Manager | @eng-manager | Escalations, staffing |
| Product Lead | @product-lead | Customer communication |

---

## Useful Commands

```bash
# Quick health checks
curl -s https://journey-api.zeabur.app/health | jq .

# Check sync-engine logs
tail -f logs/sync-$(date +%Y-%m-%d).log

# Database connection test
psql $DATABASE_URL -c "SELECT version();"

# Check for recent errors
grep -i error logs/*.log | tail -20
```

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-21 | @backend-lead | Initial incident response runbook |
