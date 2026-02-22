# Project Management

This directory contains all project management documentation for TheBloomApp, including sprint plans, roadmaps, and architectural decision records.

---

## Directory Structure

```
pm/
├── README.md                      # This file
├── sprints/                       # Sprint documentation
│   ├── template/                  # Sprint template for new sprints
│   │   ├── goals.md              # Sprint goals and objectives
│   │   ├── backlog.md            # Sprint backlog items
│   │   └── retro.md              # Sprint retrospective
│   └── 2026-q1-sprint-1/         # Current sprint
│       ├── goals.md
│       ├── backlog.md
│       └── retro.md
├── roadmap/                       # Roadmap and planning
│   └── features-backlog.md       # Prioritized feature backlog
└── decisions/                     # Architecture Decision Records
    └── decision-log.md           # ADR registry and log
```

---

## Quick Links

| Resource | Description | Path |
|----------|-------------|------|
| Current Sprint | Active sprint documentation | [`sprints/2026-q1-sprint-1/`](sprints/2026-q1-sprint-1/) |
| Sprint Template | Template for creating new sprints | [`sprints/template/`](sprints/template/) |
| Feature Backlog | Prioritized list of upcoming features | [`roadmap/features-backlog.md`](roadmap/features-backlog.md) |
| Decision Log | Architecture decisions and ADRs | [`decisions/decision-log.md`](decisions/decision-log.md) |

---

## Sprint Process

### Sprint Cycle

1. **Sprint Planning** (Monday, Week 1)
   - Review feature backlog
   - Define sprint goals
   - Assign story points
   - Create sprint backlog

2. **Daily Standups** (Every day)
   - What did you work on yesterday?
   - What are you working on today?
   - Any blockers?

3. **Mid-Sprint Review** (Wednesday, Week 2)
   - Assess progress toward goals
   - Adjust priorities if needed
   - Identify at-risk items

4. **Sprint Review** (Friday, Week 4)
   - Demo completed features
   - Gather stakeholder feedback
   - Update documentation

5. **Retrospective** (Friday, Week 4)
   - What went well?
   - What could be improved?
   - Action items for next sprint

### Creating a New Sprint

1. Copy the template folder:
   ```bash
   cp -r pm/sprints/template pm/sprints/2026-q2-sprint-3
   ```

2. Update the sprint goals in `goals.md`

3. Populate the backlog in `backlog.md`

4. Link the new sprint in this README

---

## Feature Backlog Management

### Prioritization Framework

Features are prioritized using the RICE scoring model:

- **R**each: How many users will this impact?
- **I**mpact: How much will this affect each user? (0.25 = minimal, 1 = low, 2 = medium, 3 = high)
- **C**onfidence: How confident are we in our estimates? (%)
- **E**ffort: How many person-months will this take?

**RICE Score** = (Reach × Impact × Confidence) / Effort

### Backlog Categories

| Category | Description | Owner |
|----------|-------------|-------|
| `P0 - Critical` | Must-have for current quarter | Product Lead |
| `P1 - High` | Important, should have | Product Lead |
| `P2 - Medium` | Nice to have | Product Lead |
| `P3 - Low` | Future consideration | Team |

---

## Architecture Decision Records (ADRs)

### When to Write an ADR

Create an ADR when:
- Choosing between multiple technical approaches
- Making a significant architectural change
- Selecting a new technology or framework
- Changing a previously made decision

### ADR Format

See [`decisions/decision-log.md`](decisions/decision-log.md) for the ADR template and existing decisions.

### ADR Lifecycle

1. **Proposed**: Decision is being discussed
2. **Accepted**: Decision has been agreed upon
3. **Deprecated**: Decision has been superseded
4. **Superseded**: Replaced by a new ADR

---

## Roles & Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Product Lead** | Prioritize backlog, define requirements, accept features |
| **Tech Lead** | Technical decisions, ADR approval, architecture review |
| **Engineering** | Implement features, write tests, update documentation |
| **QA** | Test features, verify acceptance criteria, report bugs |
| **Design** | Create mockups, review UI implementation, maintain design system |

---

## Communication Channels

- **Daily Standups**: Slack #dev-standup
- **Sprint Planning**: Zoom (recorded)
- **Code Reviews**: GitHub PRs
- **Technical Discussion**: GitHub Discussions or ADRs
- **Urgent Issues**: Slack #dev-urgent

---

## Definitions

| Term | Definition |
|------|------------|
| **Sprint** | 2-4 week timeboxed iteration |
| **Story Point** | Relative estimate of effort (1, 2, 3, 5, 8, 13) |
| **Velocity** | Average story points completed per sprint |
| **DoD** | Definition of Done - criteria for completing work |
| **ADR** | Architecture Decision Record |

---

## Tools

| Tool | Purpose |
|------|---------|
| GitHub Projects | Sprint board and task tracking |
| GitHub Issues | Bug reports and feature requests |
| Notion | Product documentation |
| Figma | Design mockups |
| Loom | Async video updates |

---

Last Updated: 2026-02-21
