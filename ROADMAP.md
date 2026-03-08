# TheBloomApp Product Roadmap

> **Last Updated:** February 2026  
> **Planning Horizon:** 6-12 months  
> **Status:** Active Development

---

## Overview

This roadmap outlines the strategic direction for TheBloomApp, focusing on stability, scalability, and enhanced AI capabilities to deliver exceptional value to wedding venue and event planning clients.

---

## Q1 2026 (Current Quarter) — Stability & Foundation

**Theme:** Stability, Email Factory v2, Client Onboarding Improvements

| Feature | Status | Priority | Owner |
|---------|--------|----------|-------|
| Email Factory v2 with AI-powered templates | ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | P0 | Engineering |
| Client onboarding wizard improvements | ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | P0 | Product |
| Journey Visualizer bug fixes & polish | ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | P0 | Engineering |
| Sync Engine stability improvements | ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | P0 | Engineering |
| Knowledge Hub basic search | ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | P1 | Engineering |
| Airtable-to-Postgres migration (Phase 1) | ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | P1 | Engineering |
| Multi-client dashboard foundation | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Engineering |

### Q1 Goals
- ✅ Reduce critical bugs by 50%
- ✅ Improve client onboarding time by 30%
- ✅ Launch Email Factory v2 with 10+ template types
- 🎯 Complete Postgres migration for journey data

---

## Q2 2026 — Intelligence & Multi-Client

**Theme:** Knowledge Hub Enhancements, AI Assistant Improvements, Multi-Client Dashboard

| Feature | Status | Priority | Owner |
|---------|--------|----------|-------|
| Knowledge Hub v2 with semantic search | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P0 | Engineering |
| AI Assistant context awareness | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P0 | Engineering |
| Multi-client dashboard (MVP) | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P0 | Product |
| Advanced journey analytics | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Engineering |
| Custom field mapping UI | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Product |
| Workflow automation triggers v2 | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Engineering |
| Client self-service portal | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P2 | Product |

### Q2 Goals
- 🎯 Launch Knowledge Hub with 95% search accuracy
- 🎯 Enable AI Assistant to understand brand voice context
- 🎯 Support 50+ concurrent clients on dashboard

---

## Q3 2026 — Scale & Analytics

**Theme:** Postgres Migration Completion, Advanced Analytics, Workflow Automation v2

| Feature | Status | Priority | Owner |
|---------|--------|----------|-------|
| Complete Airtable-to-Postgres migration | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P0 | Engineering |
| Advanced journey analytics dashboard | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P0 | Engineering |
| Workflow automation v2 with conditional logic | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P0 | Engineering |
| Real-time sync with webhooks | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Engineering |
| Journey A/B testing framework | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Product |
| Performance optimization (sub-2s load times) | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Engineering |
| API rate limiting & throttling | ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | P1 | Engineering |

### Q3 Goals
- 🎯 100% data migrated to PostgreSQL
- 🎯 Launch analytics with 10+ key metrics
- 🎯 Support 10,000+ active journeys

---

## Q4 2026 — Enterprise & Ecosystem

**Theme:** White-Label Capabilities, API Marketplace, Enterprise Features

| Feature | Status | Priority | Owner |
|---------|--------|----------|-------|
| White-label journey visualizer | ![Research](https://img.shields.io/badge/status-research-yellow) | P0 | Product |
| Public API marketplace | ![Research](https://img.shields.io/badge/status-research-yellow) | P0 | Engineering |
| Enterprise SSO (SAML/OAuth) | ![Research](https://img.shields.io/badge/status-research-yellow) | P0 | Engineering |
| Custom integrations framework | ![Research](https://img.shields.io/badge/status-research-yellow) | P1 | Engineering |
| Advanced permissions & RBAC | ![Research](https://img.shields.io/badge/status-research-yellow) | P1 | Engineering |
| SLA guarantees & support tiers | ![Research](https://img.shields.io/badge/status-research-yellow) | P1 | Business |
| Partner program launch | ![Research](https://img.shields.io/badge/status-research-yellow) | P2 | Business |

### Q4 Goals
- 🎯 Launch white-label solution for 3+ partners
- 🎯 Open API marketplace with 5+ integrations
- 🎯 Close first enterprise deal (500+ locations)

---

## Long-Term Vision (2027+)

| Initiative | Description |
|------------|-------------|
| **AI-Powered Journey Optimization** | Machine learning models that automatically optimize journey touchpoints based on conversion data |
| **Industry Expansion** | Expand beyond wedding venues to corporate events, conferences, and hospitality |
| **Mobile Applications** | Native iOS/Android apps for on-the-go journey management |
| **Internationalization** | Multi-language support for global expansion |
| **Ecosystem Platform** | Third-party developer marketplace for journey plugins and extensions |

---

## Status Legend

| Badge | Meaning |
|-------|---------|
| ![In Progress](https://img.shields.io/badge/status-in%20progress-blue) | Currently being developed |
| ![Planned](https://img.shields.io/badge/status-planned-lightgrey) | Committed for the quarter |
| ![Research](https://img.shields.io/badge/status-research-yellow) | Under investigation, not committed |
| ![Completed](https://img.shields.io/badge/status-completed-green) | Shipped and available |
| ![Blocked](https://img.shields.io/badge/status-blocked-red) | Blocked by dependency or issue |
| ![On Hold](https://img.shields.io/badge/status-on%20hold-orange) | Paused, may resume later |

---

## How to Contribute

See something missing? Have feedback on priorities?

1. **Feature Requests**: Open a GitHub issue with the `feature-request` label
2. **Priority Discussions**: Comment on existing roadmap items
3. **Technical Design**: Submit an ADR to `pm/decisions/decision-log.md`

---

## Known UX Issues (Post-Audit — Not Yet Fixed)

The following issues were identified during a UX audit but were **not addressed** in the v1.1.0 overhaul. They are lower priority and tracked here for future resolution.

| Issue | Description | Priority |
|-------|-------------|----------|
| **Three competing editors** | TouchpointEditor (ReactQuill), HTMLEditor (Monaco), and VisualEmailEditor (Unlayer) all write to `content.body`. Need to designate VisualEmailEditor as the primary editor for email touchpoints and restrict others. | P1 |
| **Stale Unlayer design** | VisualEmailEditor loads `content.unlayerDesign` first; if body was edited via HTMLEditor, the design may be stale. Need to detect and warn. | P1 |
| **HTMLEditor draft restore uses `window.confirm()`** | Should use an in-app modal instead of the native browser dialog. | P2 |
| **Print View is paper-oriented** | Signature lines in print view are paper/physical-document oriented — consider a digital-first alternative. | P2 |
| **No "Create Touchpoint" button on Touchpoints tab** | Touchpoint creation is only possible from the JourneyFlow canvas. Should be accessible from the Touchpoints list view. | P1 |
| **No next/previous touchpoint navigation in editors** | Users must return to the list to switch between touchpoints. Add prev/next navigation inside editors. | P2 |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-21 | 1.0 | Initial roadmap creation |
