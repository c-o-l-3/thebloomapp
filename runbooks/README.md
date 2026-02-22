# Runbooks

Operational documentation for the dev team. Follow these guides when deploying, responding to incidents, or handling on-call duties.

---

## What Are Runbooks?

Runbooks are step-by-step guides for performing operational tasks and responding to incidents. They exist so that anyone on the team can:

- **Deploy confidently** - Follow tested procedures to avoid mistakes
- **Respond to incidents** - Know exactly what to do when things break
- **Handle on-call** - Understand responsibilities and escalation paths

### When to Use Runbooks

| Situation | Use This Runbook |
|-----------|------------------|
| Deploying to production | [`deployment.md`](deployment.md) |
| Service is down / alerts firing | [`incident-response.md`](incident-response.md) |
| You're on-call this week | [`on-call.md`](on-call.md) |
| Post-incident review needed | [`incident-response.md#post-incident-review`](incident-response.md#post-incident-review) |

---

## Emergency Contacts

### Team Roles

| Role | Slack Handle | Responsibilities |
|------|--------------|------------------|
| Backend Lead | @backend-lead | API, database, sync-engine issues |
| Frontend Lead | @frontend-dev | Visualizer UI, dashboard issues |
| DevOps/Infra | @devops-lead | Infrastructure, Zeabur, deployments |
| Product Lead | @product-lead | Client communication, business decisions |
| Engineering Manager | @eng-manager | Escalations, staffing decisions |

### Escalation Path

```
1. Try to resolve using runbook
2. Slack #engineering channel
3. Tag relevant lead (@backend-lead / @frontend-dev)
4. Escalate to @eng-manager
5. Page on-call engineer if defined
```

---

## Quick Links

### Runbooks
- [📦 Deployment Runbook](deployment.md) - Deploy journey-api, journey-visualizer, sync-engine
- [🚨 Incident Response Runbook](incident-response.md) - Handle outages, errors, and incidents
- [📱 On-Call Guide](on-call.md) - On-call responsibilities and procedures

### External Resources
- [Zeabur Dashboard](https://dash.zeabur.com) - Container orchestration
- [GoHighLevel API Docs](https://developers.gohighlevel.com) - GHL integration reference
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM reference

---

## How to Update Runbooks

### When to Update

- [ ] **After every incident** - Add new scenarios, fix incorrect steps
- [ ] **After process changes** - Update deployment procedures when they change
- [ ] **When new alerts are added** - Document them in the on-call guide
- [ ] **Quarterly review** - Schedule 30 min to review and refresh all runbooks

### How to Contribute

1. **Edit directly** - All runbooks are Markdown files in this directory
2. **Submit PR** - Changes should go through normal code review
3. **Test changes** - If you modify deployment steps, test them on next deploy
4. **Update date** - Add your change to the "Last Updated" section

### Update Template

```markdown
## Change Log

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | @your-handle | Description of change |
```

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-21 | @backend-lead | Initial runbooks creation |

---

## Need Help?

If you're unsure which runbook to use or the runbook doesn't cover your situation:

1. Post in #engineering with context
2. Tag @backend-lead for technical issues
3. Tag @eng-manager for process questions
