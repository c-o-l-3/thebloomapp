# On-Call Guide

Everything you need to know for your on-call rotation.

---

## On-Call Responsibilities

### What You're Responsible For

- [ ] **Respond to alerts** within defined SLAs (see below)
- [ ] **Acknowledge incidents** in PagerDuty/Opsgenie
- [ ] **Triage issues** - determine severity and response needed
- [ ] **Communicate** - keep #engineering updated during incidents
- [ ] **Document** - log incidents and actions taken
- [ ] **Hand off** - proper shift transition to next on-call

### What You're NOT Expected To Do

- Fix every issue alone (escalate when needed!)
- Work more than your scheduled hours (unless P0)
- Handle non-urgent feature requests
- Fix code bugs that can wait until business hours

### Response Time SLAs

| Severity | Response Time | Action Required |
|----------|---------------|-----------------|
| P0 - Critical | 5 minutes | Immediate response, page if needed |
| P1 - High | 30 minutes | Start investigating within SLA |
| P2 - Medium | 2 hours | Can wait unless P0/P1 blocker |

**Note:** Response time = time from alert to acknowledgment/start of work

---

## Alert Response Workflow

### Step 1: Acknowledge

```
Alert fires
    │
    ▼
[ACKNOWLEDGE] within SLA
- In PagerDuty/Opsgenie: Click "Acknowledge"
- In Slack: React with 👀 or reply "ack"
- Note the start time
```

**Why acknowledge?**
- Stops escalation to next person
- Lets team know you're on it
- Starts the response clock

### Step 2: Assess

Determine:
- [ ] **Real or false alarm?** (check dashboards/logs)
- [ ] **Severity level?** (P0/P1/P2 - see incident-response.md)
- [ ] **What service?** (journey-api, visualizer, sync-engine)
- [ ] **Need help?** (escalate early if unsure)

### Step 3: Respond

**If P0 (Critical):**
1. Drop what you're doing (if safe)
2. Start incident response immediately
3. Post in #engineering with details
4. Follow [incident-response.md](incident-response.md)

**If P1 (High):**
1. Start investigating within 30 min
2. Post in #engineering with findings
3. Fix if straightforward, escalate if complex

**If P2 (Medium):**
1. Create ticket for tracking
2. Address during business hours
3. Monitor to ensure it doesn't escalate

### Step 4: Resolve & Document

- [ ] Fix the issue or escalate appropriately
- [ ] Update alert/incident with resolution
- [ ] Document what happened in incident log
- [ ] If P0/P1, schedule post-incident review

---

## Monitoring Dashboards

### Primary Dashboards

| Dashboard | URL | What It Shows |
|-----------|-----|---------------|
| Zeabur Services | https://dash.zeabur.com | Container status, logs, metrics |
| API Health | https://journey-api.zeabur.app/health | API availability |
| Visualizer | https://journey-visualizer.zeabur.app | Visualizer UI status |

**Note:** Replace URLs with actual dashboard URLs once configured

### Key Metrics to Watch

**journey-api:**
- Response time (p50, p95, p99)
- Error rate (5xx responses)
- Request volume
- Database connection pool

**sync-engine:**
- Last sync timestamp per client
- Sync error rate
- Queue depth (if applicable)
- Log error count

**Database:**
- Connection count
- CPU/memory usage
- Disk space
- Slow query count

### Setting Up Notifications

Ensure you receive alerts via:
- [ ] Slack (#alerts channel)
- [ ] Email (backup)
- [ ] SMS/Phone (P0 only, optional)

---

## Common Alerts & What They Mean

### API Alerts

| Alert | Meaning | Typical Cause | First Action |
|-------|---------|---------------|--------------|
| `API 5xx rate > 1%` | API returning errors | DB issue, bug, overload | Check Zeabur logs |
| `API latency p95 > 2s` | Slow responses | Slow query, high load | Check DB, restart if needed |
| `API health check failed` | API down | Crash, deploy fail, DB | Check Zeabur dashboard |
| `API error rate spike` | Sudden errors | Deploy issue, upstream fail | Check recent deploys |

### Database Alerts

| Alert | Meaning | Typical Cause | First Action |
|-------|---------|---------------|--------------|
| `DB connections > 80%` | Near connection limit | Connection leak, high load | Restart API service |
| `DB CPU > 80%` | Database overloaded | Slow queries, high traffic | Identify slow queries |
| `DB disk > 85%` | Running out of space | Logs, data growth | Check disk usage |
| `DB down` | Can't connect to DB | Provider issue, network | Check provider status |

### sync-engine Alerts

| Alert | Meaning | Typical Cause | First Action |
|-------|---------|---------------|--------------|
| `Sync failed for client X` | Client sync error | API error, bad data | Check sync logs |
| `No sync in 2 hours` | Sync stuck/crashed | Process died, hung | Restart sync job |
| `Sync error rate > 10%` | Multiple sync failures | API rate limit, schema | Check GHL API status |
| `Sync queue backlog` | Jobs piling up | Slow processing, stuck | Check worker status |

### Infrastructure Alerts

| Alert | Meaning | Typical Cause | First Action |
|-------|---------|---------------|--------------|
| `Memory usage > 90%` | Container OOM risk | Memory leak, high load | Restart service |
| `CPU usage > 90%` | Container overloaded | High traffic, inefficient code | Scale up or investigate |
| `Disk usage > 85%` | Running out of disk | Logs, temp files | Clear logs, expand disk |
| `Container restarted` | Crash/OOM | Bug, memory issue | Check logs for crash |

---

## Emergency Procedures for P0 Incidents

### Step 1: Acknowledge & Alert

- [ ] Acknowledge alert in PagerDuty/Opsgenie
- [ ] Post in #engineering: `🚨 P0 incident: [brief description]`
- [ ] Tag @backend-lead and @eng-manager if not already alerted

### Step 2: Quick Assessment (2 minutes)

```bash
# 1. Is the API up?
curl https://journey-api.zeabur.app/health

# 2. Check Zeabur status
curl https://dash.zeabur.com

# 3. Check recent deployments
# Look in #deployments Slack channel
```

### Step 3: Immediate Actions

**If API is down:**
- [ ] Check Zeabur dashboard for crash/restart
- [ ] Try restarting service from dashboard
- [ ] If recent deploy, consider rollback (see deployment.md)
- [ ] Check database connectivity

**If Database down:**
- [ ] Check provider status page
- [ ] Verify connection string/env vars
- [ ] Try connecting manually: `psql $DATABASE_URL`
- [ ] Contact provider support if widespread issue

**If sync-engine down:**
- [ ] Check logs: `tail -f logs/sync-$(date +%Y-%m-%d).log`
- [ ] Restart sync process if hung
- [ ] Check GHL API status

### Step 4: Communication

**Initial (within 5 min):**
```
🚨 P0 INCIDENT - [Service] Down

Started: [timestamp]
Impact: [all users/specific clients]
Symptoms: [what's broken]
Actions: [what you're doing]
ETA: [initial estimate or "investigating"]
```

**Updates (every 15-30 min):**
```
📋 P0 UPDATE

Status: [Investigating/Identified/Fixing]
Progress: [what you've found/done]
ETA: [updated estimate]
```

**Resolution:**
```
✅ P0 RESOLVED

Duration: X minutes
Cause: [root cause]
Fix: [what fixed it]
Post-mortem: [scheduled for when]
```

### Step 5: Post-Incident

- [ ] Monitor for 30 minutes to ensure stability
- [ ] Schedule post-incident review (within 48 hours)
- [ ] Document timeline and lessons learned
- [ ] Create tickets for preventive measures

---

## Handoff Procedures

### Before Your Shift Ends

- [ ] **Review open incidents** - ensure all are resolved or handed off
- [ ] **Check alert backlog** - any unacknowledged alerts?
- [ ] **Document ongoing issues** - anything the next person should know?
- [ ] **Update runbooks** - did you learn something new?

### Handoff Meeting/Thread (5 min)

```
🔄 On-call handoff: [Your Name] → [Next Person]

Period: [dates/times]

Incidents during shift:
- [List with links to threads]

Ongoing issues to watch:
- [Any known issues that might flare up]

Alerts that need tuning:
- [Too noisy? Not noisy enough?]

Runbook updates needed:
- [What was missing or wrong?]
```

### Handoff Checklist

Outgoing on-call:
- [ ] Completed incident documentation
- [ ] Posted handoff message
- [ ] Confirmed next on-call is aware
- [ ] Transferred any PagerDuty/Opsgenie shifts

Incoming on-call:
- [ ] Read handoff message
- [ ] Checked dashboard health
- [ ] Verified alert notifications working
- [ ] Confirmed runbook access

---

## On-Call Tools & Access

### Required Access

Ensure you have access to:
- [ ] Zeabur dashboard (production services)
- [ ] Database (read-only at minimum)
- [ ] PagerDuty/Opsgenie (alerts)
- [ ] Slack #engineering, #alerts, #incident-response
- [ ] GitHub repo (to check recent changes)
- [ ] Log aggregation (if used)

### Essential Commands

```bash
# SSH into server (if applicable)
ssh user@server

# View logs
tail -f /var/log/app.log
tail -n 1000 logs/sync-2026-02-21.log

# Check processes
ps aux | grep node

# Check resource usage
top
htop
df -h

# Database queries
psql $DATABASE_URL -c "SELECT count(*) FROM journeys;"

# Restart services
# (via Zeabur dashboard or pm2)
pm2 restart journey-api
pm2 restart sync-engine

# Test endpoints
curl -s https://journey-api.zeabur.app/health | jq .
```

---

## Escalation Quick Reference

### Who to Contact When

| Situation | Contact | How |
|-----------|---------|-----|
| Can't resolve in 30 min | @backend-lead | Slack DM |
| Infrastructure issue | @devops-lead | Slack DM |
| Customer impact unclear | @product-lead | Slack DM |
| Need additional resources | @eng-manager | Slack DM or phone |
| Database corruption | @backend-lead + @devops-lead | Group DM |
| Security incident | @eng-manager + security team | Group DM |

### After-Hours Escalation

If on-call during off-hours and need help:

1. **Slack @backend-lead** - may be online
2. **Slack #engineering** - broader visibility
3. **Page if configured** - use PagerDuty escalation
4. **Emergency phone** - if truly critical (P0)

---

## On-Call Best Practices

### Do's

- ✅ Acknowledge alerts promptly
- ✅ Communicate early and often during incidents
- ✅ Escalate when stuck (don't struggle alone)
- ✅ Document what you do
- ✅ Update runbooks when you find gaps
- ✅ Take notes for handoff
- ✅ Prioritize sleep during quiet periods

### Don'ts

- ❌ Ignore alerts (even if they seem false)
- ❌ Make untested changes in production
- ❌ Deploy major changes during on-call
- ❌ Hesitate to wake someone up for P0
- ❌ Skip post-incident documentation
- ❌ Assume someone else will handle it

### Self-Care

- Keep your laptop/phone charged
- Have reliable internet (backup: mobile hotspot)
- Take breaks when possible
- Don't skip meals during long incidents
- Swap shifts if you're sick/unavailable

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-21 | @backend-lead | Initial on-call guide |

---

## Questions?

If something isn't covered here:
1. Check [incident-response.md](incident-response.md)
2. Check [deployment.md](deployment.md)
3. Ask in #engineering
4. Contact @backend-lead
