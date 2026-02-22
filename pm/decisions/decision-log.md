# Architecture Decision Records (ADRs)

> **A log of architectural decisions made in TheBloomApp project**  
> **Last Updated:** February 21, 2026  
> **Status Key:** 🟢 Proposed | 🟡 Accepted | 🔵 Deprecated | ⚪ Superseded

---

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences. We use ADRs to:

- Document why we made certain technical choices
- Help onboard new team members
- Provide context for future decisions
- Avoid repeating past mistakes

---

## ADR Index

| ID | Title | Status | Date | Author |
|----|-------|--------|------|--------|
| ADR-001 | Use PostgreSQL as Primary Database | 🟡 Accepted | 2026-01-15 | @tech-lead |
| ADR-002 | Use React with Vite for Journey Visualizer | 🟡 Accepted | 2026-01-10 | @frontend-lead |
| ADR-003 | Use Prisma ORM for Database Access | 🟡 Accepted | 2026-01-15 | @backend-lead |
| ADR-004 | Use Express.js for API Layer | 🟡 Accepted | 2026-01-10 | @backend-lead |
| ADR-005 | Use OpenAI for AI Provider | 🟡 Accepted | 2026-01-20 | @ai-specialist |
| ADR-006 | Monorepo Structure with apps/ and scripts/ | 🟡 Accepted | 2026-01-05 | @tech-lead |
| ADR-007 | Migrate from Airtable to PostgreSQL | 🟢 Proposed | 2026-02-21 | @tech-lead |
| ADR-008 | Use Zeabur for Deployment | 🟡 Accepted | 2026-01-12 | @devops-lead |
| ADR-009 | Client Configuration as JSON Files | 🟡 Accepted | 2026-01-08 | @backend-lead |
| ADR-010 | Knowledge Hub with Vector Embeddings | 🟡 Accepted | 2026-01-25 | @ai-specialist |

---

## ADR Template

```markdown
# ADR-XXX: [Title]

## Status
- Proposed / Accepted / Deprecated / Superseded by ADR-YYY

## Context
[What is the issue that we're seeing that is motivating this decision or change?]

## Decision
[What is the change that we're proposing or have agreed to implement?]

## Consequences
### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Drawback 1]
- [Drawback 2]

### Neutral
- [Neutral consequence 1]

## Alternatives Considered
### [Alternative 1]
- Pros: ...
- Cons: ...
- Why not chosen: ...

### [Alternative 2]
- Pros: ...
- Cons: ...
- Why not chosen: ...

## Related Decisions
- [Link to related ADRs]

## Notes
[Additional context, links to discussions, etc.]

---
**Date:** YYYY-MM-DD  
**Author:** @username  
**Stakeholders:** @username1, @username2
```

---

## Detailed ADRs

---

### ADR-001: Use PostgreSQL as Primary Database

**Status:** 🟡 Accepted  
**Date:** 2026-01-15  
**Author:** @tech-lead

#### Context
We needed to choose a primary database for storing journey data, client configurations, and application state. Initially, we used Airtable for rapid prototyping, but it became clear we needed a more robust solution for production.

#### Decision
We will use PostgreSQL as our primary relational database.

#### Consequences

**Positive:**
- ACID compliance ensures data integrity
- Rich ecosystem of tools and libraries
- Excellent support for JSON fields (for flexible client configs)
- Scalable and battle-tested
- Strong TypeScript/Prisma integration

**Negative:**
- Requires migration from Airtable
- Need to manage database schema migrations
- Additional infrastructure complexity

**Neutral:**
- Will use managed PostgreSQL service (Neon/Supabase) initially

#### Alternatives Considered

**MongoDB:**
- Pros: Flexible schema, good for JSON documents
- Cons: Less mature transaction support, more complex querying for relational data
- Why not chosen: Need strong consistency for financial/contract data

**Airtable (continue using):**
- Pros: Already in use, easy to modify
- Cons: Rate limits, not designed for high-scale applications
- Why not chosen: Hit API limits, need more control

#### Related Decisions
- ADR-003 (Prisma ORM)
- ADR-007 (Migration from Airtable)

---

### ADR-002: Use React with Vite for Journey Visualizer

**Status:** 🟡 Accepted  
**Date:** 2026-01-10  
**Author:** @frontend-lead

#### Context
We needed to choose a frontend framework for the Journey Visualizer, our primary user interface for creating and editing customer journeys.

#### Decision
We will use React 18 with Vite as our build tool.

#### Consequences

**Positive:**
- Excellent developer experience with fast HMR
- Large ecosystem of component libraries
- React Flow library perfect for journey visualization
- Strong TypeScript support
- Smaller bundle size than Create React App

**Negative:**
- Team needs to be familiar with React patterns
- State management complexity as app grows

#### Alternatives Considered

**Vue.js:**
- Pros: Easier learning curve, great documentation
- Cons: Smaller ecosystem for specialized graph libraries
- Why not chosen: React Flow is React-specific, team has more React experience

**Svelte:**
- Pros: Smaller bundles, less boilerplate
- Cons: Newer ecosystem, smaller community
- Why not chosen: Concerns about long-term ecosystem support

---

### ADR-003: Use Prisma ORM for Database Access

**Status:** 🟡 Accepted  
**Date:** 2026-01-15  
**Author:** @backend-lead

#### Context
We needed an ORM to interact with PostgreSQL that provides type safety and simplifies database operations.

#### Decision
We will use Prisma as our ORM.

#### Consequences

**Positive:**
- Excellent TypeScript integration
- Auto-generated types for database schema
- Easy migration management
- Visual data browser (Prisma Studio)
- Great developer experience

**Negative:**
- Learning curve for team members new to Prisma
- Additional build step for schema generation

#### Alternatives Considered

**TypeORM:**
- Pros: Decorator-based, very flexible
- Cons: More boilerplate, less type safety
- Why not chosen: Prisma offers better DX and type safety

**Raw SQL:**
- Pros: Full control, no abstraction overhead
- Cons: No type safety, more error-prone
- Why not chosen: Need type safety for rapid development

---

### ADR-005: Use OpenAI for AI Provider

**Status:** 🟡 Accepted  
**Date:** 2026-01-20  
**Author:** @ai-specialist

#### Context
We need an AI provider for content generation, brand voice analysis, and semantic search in the Knowledge Hub.

#### Decision
We will use OpenAI as our primary AI provider, with a provider abstraction layer for future flexibility.

#### Consequences

**Positive:**
- State-of-the-art model quality (GPT-4)
- Good API documentation
- Embeddings API for semantic search
- JSON mode for structured outputs

**Negative:**
- API costs can be significant at scale
- Rate limits on lower tiers
- Single vendor dependency

**Neutral:**
- Provider abstraction allows adding alternatives later

#### Alternatives Considered

**Anthropic Claude:**
- Pros: Larger context window, good for long documents
- Cons: Higher latency, more expensive
- Why not chosen: Will add as secondary provider via abstraction

**Local Models (Llama, etc.):**
- Pros: Lower cost, data privacy
- Cons: Infrastructure complexity, lower quality
- Why not chosen: Not ready for production quality requirements

---

### ADR-007: Migrate from Airtable to PostgreSQL

**Status:** 🟢 Proposed  
**Date:** 2026-02-21  
**Author:** @tech-lead

#### Context
We have outgrown Airtable as our primary data store. We're hitting API rate limits and need more complex querying capabilities for analytics and reporting.

#### Decision
We will migrate all journey and client data from Airtable to PostgreSQL in three phases.

#### Migration Plan

**Phase 1 (Sprint 3):** Read from both, write to both
- Keep Airtable as source of truth
- Mirror writes to PostgreSQL
- Verify data consistency

**Phase 2 (Sprint 4):** Read from PostgreSQL, write to both
- Switch reads to PostgreSQL
- Continue writing to both
- Monitor for issues

**Phase 3 (Sprint 5):** PostgreSQL only
- Stop Airtable writes
- Maintain Airtable as backup
- Full cutover complete

#### Consequences

**Positive:**
- Eliminate API rate limit issues
- Enable complex queries and analytics
- Better data integrity
- Lower long-term costs

**Negative:**
- Migration risk
- Temporary complexity during transition
- Need to update all sync processes

#### Related Decisions
- ADR-001 (PostgreSQL choice)
- ADR-003 (Prisma ORM)

---

### ADR-010: Knowledge Hub with Vector Embeddings

**Status:** 🟡 Accepted  
**Date:** 2026-01-25  
**Author:** @ai-specialist

#### Context
We need to enable semantic search across client documents, brand voice profiles, and journey content. Traditional keyword search is insufficient for understanding context and meaning.

#### Decision
We will implement a Knowledge Hub using vector embeddings and cosine similarity for semantic search.

#### Architecture

```
Documents → Text Extraction → OpenAI Embeddings → Vector Store (JSON)
                                                    ↓
User Query → OpenAI Embeddings → Similarity Search → Results
```

#### Consequences

**Positive:**
- Semantic understanding of queries
- Better search results for ambiguous terms
- Enables AI Assistant context awareness

**Negative:**
- Embedding generation costs
- Storage requirements for vectors
- Need to manage embedding updates

**Neutral:**
- Currently using JSON file storage (pgvector considered for future)

#### Alternatives Considered

**Traditional Full-Text Search:**
- Pros: Simpler, lower cost
- Cons: No semantic understanding
- Why not chosen: Doesn't meet product requirements

**Elasticsearch:**
- Pros: Mature, scalable
- Cons: Additional infrastructure, no native vector support (older versions)
- Why not chosen: Will consider if JSON approach doesn't scale

---

## How to Propose a New ADR

1. Copy the ADR template above
2. Fill in the details with as much context as possible
3. Create a PR with the new ADR
4. Request review from @tech-lead and relevant stakeholders
5. Discuss in team meeting if significant
6. Merge once accepted

---

## ADR Lifecycle

```
Proposed → Accepted → [Optional: Deprecated/Superseded]
              ↓
         Active/Current
```

---

**Last Updated:** 2026-02-21  
**Maintained by:** @tech-lead
