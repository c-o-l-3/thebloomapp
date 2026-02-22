# Team Charter

> **TheBloomApp Development Team**  
> **Last Updated:** February 21, 2026  
> **Version:** 1.0

---

## Mission

Build the most intelligent and user-friendly customer journey platform for wedding venues and event planners, enabling them to create personalized, automated experiences that drive conversions and delight their clients.

---

## Vision

Become the industry-standard platform for journey automation in the wedding and events industry, known for our AI-powered insights, seamless integrations, and exceptional user experience.

---

## Core Values

1. **Customer Obsession** - We start with the customer and work backwards
2. **Bias for Action** - We prefer experimentation over extensive planning
3. **Ownership** - We think long-term and don't sacrifice long-term value for short-term results
4. **Dive Deep** - We operate at all levels, stay connected to the details, and audit frequently
5. **Learn and Be Curious** - We are never done learning and always seek to improve

---

## Team Structure

### Leadership

| Role | Name | Responsibilities |
|------|------|------------------|
| Tech Lead | @tech-lead | Architecture decisions, technical roadmap, code quality |
| Product Lead | @product-lead | Feature prioritization, user research, product strategy |
| Design Lead | @design-lead | UX/UI design, design system, user experience |

### Engineering Team

| Role | Name | Focus Area |
|------|------|------------|
| Frontend Lead | @frontend-lead | Journey Visualizer, React components |
| Backend Lead | @backend-lead | journey-api, database, integrations |
| AI Specialist | @ai-specialist | Knowledge Hub, AI features, LLM integration |
| DevOps Lead | @devops-lead | Deployment, infrastructure, CI/CD |
| Full-Stack Developer | @fullstack-dev | Cross-functional features |

### Support Roles

| Role | Name | Focus Area |
|------|------|------------|
| QA Lead | @qa-lead | Testing strategy, quality assurance |
| Technical Writer | @tech-writer | Documentation, guides, API docs |
| Scrum Master | @scrum-master | Process, sprint coordination |

---

## Responsibilities by Domain

### Journey Visualizer (apps/journey-visualizer)

**Owner:** @frontend-lead

**Responsibilities:**
- React component development
- UI/UX implementation
- State management
- Performance optimization
- Browser compatibility

**Key Files:**
- [`App.jsx`](../../apps/journey-visualizer/src/App.jsx)
- [`JourneyFlow.jsx`](../../apps/journey-visualizer/src/components/JourneyFlow.jsx)
- [`AIAssistantPanel.jsx`](../../apps/journey-visualizer/src/components/AIAssistantPanel.jsx)

---

### Journey API (apps/journey-api)

**Owner:** @backend-lead

**Responsibilities:**
- API endpoint development
- Database schema design
- Authentication/authorization
- Integration with external services
- API documentation

**Key Files:**
- [`index.js`](../../apps/journey-api/src/index.js)
- [`schema.prisma`](../../apps/journey-api/prisma/schema.prisma)
- [`journeys.js`](../../apps/journey-api/src/routes/journeys.js)

---

### Sync Engine (scripts/sync-engine)

**Owner:** @backend-lead

**Responsibilities:**
- GHL integration
- Data synchronization
- Workflow deployment
- Template management
- Error handling and retries

**Key Files:**
- [`cli.js`](../../scripts/sync-engine/src/cli.js)
- [`sync.js`](../../scripts/sync-engine/src/services/sync.js)
- [`ghl.js`](../../scripts/sync-engine/src/services/ghl.js)

---

### Knowledge Hub

**Owner:** @ai-specialist

**Responsibilities:**
- Vector embeddings
- Semantic search
- Brand voice analysis
- AI content generation
- Document processing

**Key Files:**
- [`knowledge-hub.js`](../../scripts/sync-engine/src/services/knowledge-hub.js)
- [`semantic-search.js`](../../scripts/sync-engine/src/services/semantic-search.js)
- [`ai-provider.js`](../../scripts/sync-engine/src/services/ai-provider.js)

---

### Client Onboarding

**Owner:** @product-lead

**Responsibilities:**
- Onboarding workflow design
- Client configuration management
- Setup validation
- Documentation

**Key Files:**
- [`cli-onboarding.js`](../../scripts/sync-engine/src/cli-onboarding.js)
- [`onboarding-report.js`](../../scripts/sync-engine/src/utils/onboarding-report.js)
- [`ONBOARDING_GUIDE.md`](../ONBOARDING_GUIDE.md)

---

## Communication Guidelines

### Daily Standups

- **Time:** 9:30 AM ET
- **Duration:** 15 minutes
- **Format:**
  1. What I completed yesterday
  2. What I'm working on today
  3. Any blockers or help needed

### Weekly Meetings

| Meeting | Day | Time | Duration | Attendees |
|---------|-----|------|----------|-----------|
| Sprint Planning | Monday | 10:00 AM | 1 hour | Full team |
| Backlog Grooming | Wednesday | 2:00 PM | 30 min | Product, Tech Lead |
| Sprint Review | Friday | 3:00 PM | 30 min | Full team |
| Retrospective | Bi-weekly Friday | 4:00 PM | 1 hour | Full team |

### Communication Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| #dev-general | General discussion | Same day |
| #dev-standup | Daily standup updates | Immediate |
| #dev-urgent | Critical issues | Immediate |
| #dev-frontend | Frontend-specific | Same day |
| #dev-backend | Backend-specific | Same day |
| #dev-ai | AI/ML-specific | Same day |
| #releases | Release coordination | Same day |

---

## Decision Making

### Decision Levels

| Level | Type | Approver |
|-------|------|----------|
| L1 | Technical implementation details | Individual engineer |
| L2 | Feature scope changes | Feature owner + Tech Lead |
| L3 | Architecture decisions | Tech Lead (with ADR) |
| L4 | Product strategy | Product Lead |
| L5 | Major architectural changes | Full team consensus |

### Escalation Path

1. **Issue identified** → Discuss with direct teammates
2. **No resolution** → Escalate to domain lead
3. **Still blocked** → Escalate to Tech/Product Lead
4. **Strategic impact** → Full team discussion

---

## Working Agreements

### Code

- All code must be reviewed before merging
- Write tests for new features
- Follow existing code style and patterns
- Document complex logic

### Documentation

- Update READMEs when making structural changes
- Add ADRs for architectural decisions
- Keep API documentation current
- Write clear commit messages

### Meetings

- Start and end on time
- Come prepared with agenda
- Take notes and share action items
- Respect when someone declines

### Communication

- Assume positive intent
- Give constructive feedback
- Respond to messages within 24 hours
- Use appropriate channels for communication type

---

## Onboarding New Team Members

### Week 1: Foundation

- [ ] Setup development environment
- [ ] Review [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [ ] Complete first code review
- [ ] Pair with buddy on small bug fix

### Week 2: Context

- [ ] Review all major components
- [ ] Attend sprint ceremonies
- [ ] Take ownership of first feature
- [ ] Schedule 1:1s with team members

### Week 3-4: Integration

- [ ] Deliver first feature independently
- [ ] Participate in technical discussion
- [ ] Update onboarding docs with feedback
- [ ] Present work at sprint review

---

## Performance Expectations

### Individual Contributors

- Deliver assigned work on time
- Participate actively in team ceremonies
- Help unblock teammates
- Continuously improve skills
- Contribute to documentation

### Leads

- Provide technical guidance
- Make timely decisions
- Mentor team members
- Represent team to stakeholders
- Drive process improvements

---

## Conflict Resolution

1. **Direct Conversation** - Address issues directly with the person involved
2. **Mediation** - Involve team lead if unresolved
3. **Team Discussion** - Escalate to full team for major conflicts
4. **External Support** - Involve HR/management if needed

---

## Recognition

We celebrate wins through:
- Shoutouts in retrospectives
- #dev-wins channel
- Quarterly team awards
- Public recognition in company meetings

---

## Charter Maintenance

This charter is a living document. Propose changes through:
1. Draft change in a PR
2. Discuss in team meeting
3. Update with team consensus

---

**Questions or suggestions?** Open a discussion in #dev-general or speak with @tech-lead.
