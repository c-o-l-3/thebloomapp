# Feature Backlog

> **Prioritized list of upcoming features for TheBloomApp**  
> **Last Updated:** February 21, 2026  
> **Next Review:** March 1, 2026

---

## Prioritization Framework

We use the **RICE** scoring model:

- **R**each: How many users will this impact? (1-1000)
- **I**mpact: How much will this affect each user? (0.25 = minimal, 1 = low, 2 = medium, 3 = high)
- **C**onfidence: How confident are we in our estimates? (%)
- **E**ffort: How many person-months will this take?

**RICE Score** = (Reach × Impact × Confidence) / Effort

---

## Legend

| Priority | Description |
|----------|-------------|
| P0 | Critical - Must have for current quarter |
| P1 | High - Important, should have |
| P2 | Medium - Nice to have |
| P3 | Low - Future consideration |

---

## P0 - Critical Priority

| ID | Feature | R | I | C | E | Score | Owner | Status |
|----|---------|---|---|---|---|-------|-------|--------|
| F-001 | Email Factory v2 - AI Template Generation | 100 | 3 | 90% | 1 | 270 | @tech-lead | 🟡 In Progress |
| F-002 | Client Onboarding Wizard Improvements | 50 | 3 | 95% | 0.5 | 285 | @product-lead | 🟡 In Progress |
| F-003 | Journey Visualizer Bug Fixes (Safari, Memory) | 200 | 3 | 100% | 0.5 | 1200 | @frontend-lead | 🟡 In Progress |
| F-004 | Sync Engine Stability Improvements | 150 | 3 | 90% | 1 | 405 | @backend-lead | 🟡 In Progress |
| F-005 | Airtable-to-Postgres Migration - Phase 1 | 300 | 2 | 80% | 2 | 240 | @tech-lead | 🔵 Planned |

**P0 Total:** 5 features | **Effort:** 5 person-months

---

## P1 - High Priority

| ID | Feature | R | I | C | E | Score | Owner | Status |
|----|---------|---|---|---|---|-------|-------|--------|
| F-006 | Knowledge Hub Semantic Search v2 | 100 | 2 | 80% | 1 | 160 | @ai-specialist | 🔵 Planned |
| F-007 | Multi-Client Dashboard (MVP) | 80 | 3 | 70% | 2 | 84 | @frontend-lead | 🔵 Planned |
| F-008 | Advanced Journey Analytics | 150 | 2 | 75% | 1.5 | 150 | @backend-lead | 🔵 Planned |
| F-009 | AI Assistant Context Awareness | 100 | 3 | 60% | 1.5 | 120 | @ai-specialist | 🔵 Planned |
| F-010 | Workflow Automation Triggers v2 | 120 | 2 | 85% | 1 | 204 | @backend-lead | 🔵 Planned |
| F-011 | Custom Field Mapping UI | 60 | 2 | 90% | 0.75 | 144 | @frontend-lead | 🔵 Planned |
| F-012 | GHL API Rate Limiting & Backoff | 200 | 2 | 100% | 0.5 | 800 | @backend-lead | 🟡 In Progress |
| F-013 | Client Self-Service Portal (Basic) | 40 | 2 | 70% | 1 | 56 | @product-lead | ⚪ Research |

**P1 Total:** 8 features | **Effort:** 9.25 person-months

---

## P2 - Medium Priority

| ID | Feature | R | I | C | E | Score | Owner | Status |
|----|---------|---|---|---|---|-------|-------|--------|
| F-014 | Email Template Preview Feature | 80 | 1 | 90% | 0.5 | 144 | @frontend-lead | 🔵 Planned |
| F-015 | Knowledge Hub Indexing Optimization | 50 | 1 | 85% | 0.5 | 85 | @backend-lead | 🔵 Planned |
| F-016 | Journey A/B Testing Framework | 60 | 2 | 50% | 2 | 30 | @product-lead | ⚪ Research |
| F-017 | Real-time Sync with Webhooks | 100 | 2 | 60% | 1.5 | 80 | @backend-lead | ⚪ Research |
| F-018 | API Rate Limiting & Throttling | 150 | 1 | 90% | 0.75 | 180 | @backend-lead | 🔵 Planned |
| F-019 | Performance Optimization (<2s load) | 200 | 2 | 80% | 1 | 320 | @frontend-lead | 🔵 Planned |
| F-020 | Template Library Expansion | 50 | 2 | 90% | 1 | 90 | @product-lead | 🔵 Planned |

**P2 Total:** 7 features | **Effort:** 7.25 person-months

---

## P3 - Low Priority / Future

| ID | Feature | R | I | C | E | Score | Owner | Status |
|----|---------|---|---|---|---|-------|-------|--------|
| F-021 | White-Label Journey Visualizer | 30 | 3 | 40% | 3 | 12 | @product-lead | ⚪ Research |
| F-022 | Public API Marketplace | 40 | 3 | 30% | 4 | 9 | @tech-lead | ⚪ Research |
| F-023 | Enterprise SSO (SAML/OAuth) | 20 | 3 | 50% | 2 | 15 | @backend-lead | ⚪ Research |
| F-024 | Mobile App (iOS/Android) | 100 | 2 | 30% | 6 | 10 | @product-lead | ⚪ Research |
| F-025 | Multi-Language Support | 50 | 2 | 40% | 3 | 13 | @frontend-lead | ⚪ Research |
| F-026 | Advanced Permissions & RBAC | 30 | 2 | 60% | 2 | 18 | @backend-lead | ⚪ Research |
| F-027 | Partner Program Portal | 20 | 2 | 50% | 2 | 10 | @business-lead | ⚪ Research |
| F-028 | AI-Powered Journey Optimization | 80 | 3 | 20% | 4 | 12 | @ai-specialist | ⚪ Research |

**P3 Total:** 8 features | **Effort:** 26 person-months

---

## Feature Details

### F-001: Email Factory v2 - AI Template Generation
**Description:** Enhance email template generation with AI-powered brand voice matching and content optimization.

**Acceptance Criteria:**
- AI generates templates matching client brand voice with 90%+ accuracy
- Template validation catches syntax errors before deployment
- Support for 10+ email template types
- Integration with Knowledge Hub for content suggestions

**Dependencies:** F-006 (Knowledge Hub)

---

### F-002: Client Onboarding Wizard Improvements
**Description:** Streamline client onboarding with automated validation and guided setup.

**Acceptance Criteria:**
- Complete onboarding in < 15 minutes
- Automated validation catches 95% of configuration errors
- Step-by-step wizard with progress tracking
- Rollback capability for failed setups

**Dependencies:** None

---

### F-003: Journey Visualizer Bug Fixes
**Description:** Resolve critical bugs affecting user experience.

**Acceptance Criteria:**
- Safari journey edges render correctly
- No memory leaks in AI Assistant Panel
- Sync conflicts resolved automatically
- 99.5% uptime

**Dependencies:** None

---

### F-006: Knowledge Hub Semantic Search v2
**Description:** Improve search accuracy with semantic understanding and vector embeddings.

**Acceptance Criteria:**
- 95%+ search accuracy
- Support for natural language queries
- Results ranked by relevance
- Integration with AI Assistant

**Dependencies:** Vector database setup

---

### F-007: Multi-Client Dashboard (MVP)
**Description:** Single dashboard to manage multiple client locations.

**Acceptance Criteria:**
- View all clients in one interface
- Quick switching between clients
- Aggregate analytics view
- Support for 50+ concurrent clients

**Dependencies:** Postgres migration completion

---

## Recently Completed

| ID | Feature | Completed Date | Notes |
|----|---------|----------------|-------|
| F-000 | Journey Visualizer v1 | 2026-02-15 | Initial release with basic functionality |
| F-000 | Sync Engine v1 | 2026-02-10 | Initial sync capabilities |

---

## Backlog Maintenance

### Adding New Features
1. Create a proposal in GitHub Discussions
2. Complete RICE scoring
3. Assign to appropriate priority column
4. Link related dependencies

### Review Schedule
- **Weekly:** P0 items review in sprint planning
- **Monthly:** Full backlog review and re-prioritization
- **Quarterly:** Strategic alignment review

---

## Questions?

For questions about prioritization or to request new features:
- Open a GitHub Discussion with `backlog` label
- Attend monthly backlog review meeting
- Contact @product-lead
