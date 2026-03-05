# Database Migration Plan: Airtable to PostgreSQL

**Version:** 1.0  
**Date:** 2026-02-21  
**Author:** Architect Mode  
**Status:** Draft for Review

---

## Executive Summary

This document outlines a comprehensive migration strategy to move from Airtable (Base ID: `app66pKRuzhlUzy3j`) to a proper PostgreSQL database. The migration addresses scalability limitations, enables complex querying, and provides a foundation for the Journey Builder platform.

---

## 1. Database Choice: PostgreSQL

### 1.1 Decision Matrix

| Criteria | PostgreSQL | MongoDB | Winner |
|----------|------------|---------|--------|
| **Relational Data** | Native support with FK constraints | Manual refs in code | PostgreSQL |
| **Complex Queries** | Powerful JOINs, CTEs, window functions | Aggregation pipeline | PostgreSQL |
| **Nested Touchpoints** | JSONB for flexible content | Native document nesting | Tie |
| **ACID Compliance** | Full ACID | Single-document ACID | PostgreSQL |
| **Query Patterns** | Optimized for relational reads | Optimized for document reads | PostgreSQL |
| **Migration Ease** | Clear table mapping | Flexible schema | PostgreSQL |
| **Team Familiarity** | Widely known | Less common | PostgreSQL |
| **Tooling** | Excellent ORMs (Prisma, TypeORM) | Good ODMs (Mongoose) | PostgreSQL |

### 1.2 Rationale

**PostgreSQL is recommended because:**

1. **Strong Relational Model**: The data has clear hierarchical relationships:
   - Clients → Journeys → Touchpoints → Templates
   - Pipelines → Stages → Journey Triggers
   - Workflows → Actions → Templates

2. **Complex Query Requirements**: Common queries include:
   - Get all journeys for a client with their touchpoints
   - Find all touchpoints using a specific template
   - Get journey version history with approvals
   - Search touchpoints across all client journeys

3. **Data Integrity**: Foreign key constraints ensure:
   - No orphaned touchpoints when journeys are deleted
   - Valid client references
   - Template consistency

4. **JSONB Flexibility**: Touchpoint content (complex nested objects) can be stored as JSONB while maintaining relational structure for queries.

5. **Migration Simplicity**: Airtable's tabular structure maps directly to SQL tables.

---

## 2. Database Schema Design

### 2.1 Entity Relationship Diagram

```mermaid
erDiagram
    CLIENTS {
        uuid id PK
        string slug UK
        string name
        string location_id UK
        string ghl_location_id
        string industry
        string website
        string status
        jsonb settings
        jsonb config
        timestamp created_at
        timestamp updated_at
    }

    PIPELINES {
        uuid id PK
        uuid client_id FK
        string name
        string pipeline_id
        jsonb stages
        boolean is_default
        timestamp created_at
        timestamp updated_at
    }

    JOURNEYS {
        uuid id PK
        uuid client_id FK
        uuid pipeline_id FK
        string name
        string slug
        string description
        string category
        string status
        integer version
        jsonb trigger_config
        jsonb goal
        jsonb metadata
        timestamp published_at
        timestamp approved_at
        timestamp created_at
        timestamp updated_at
    }

    TOUCHPOINTS {
        uuid id PK
        uuid journey_id FK
        string name
        string type
        integer order_index
        jsonb content
        jsonb config
        jsonb position
        uuid ghl_template_id
        string status
        uuid next_touchpoint_id
        timestamp created_at
        timestamp updated_at
    }

    TEMPLATES {
        uuid id PK
        uuid client_id FK
        string name
        string type
        string ghl_template_id UK
        jsonb content
        jsonb variables
        string status
        timestamp last_synced
        string sync_status
        timestamp created_at
        timestamp updated_at
    }

    WORKFLOWS {
        uuid id PK
        uuid client_id FK
        string name
        string workflow_id
        string status
        jsonb trigger
        jsonb actions
        jsonb notes
        timestamp created_at
        timestamp updated_at
    }

    WORKFLOW_ACTIONS {
        uuid id PK
        uuid workflow_id FK
        string action_type
        uuid template_id FK
        integer delay_minutes
        jsonb config
        integer order_index
        timestamp created_at
    }

    JOURNEY_VERSIONS {
        uuid id PK
        uuid journey_id FK
        integer version
        jsonb snapshot
        string created_by
        text change_log
        timestamp created_at
    }

    APPROVALS {
        uuid id PK
        uuid journey_id FK
        uuid version_id FK
        string status
        text comments
        string requested_by
        string reviewed_by
        timestamp reviewed_at
        timestamp created_at
    }

    USERS {
        uuid id PK
        string email UK
        string name
        string role
        jsonb permissions
        timestamp created_at
        timestamp updated_at
    }

    CLIENT_USERS {
        uuid id PK
        uuid client_id FK
        uuid user_id FK
        string role
        timestamp created_at
    }

    SYNC_HISTORY {
        uuid id PK
        uuid client_id FK
        string operation
        string status
        integer items_synced
        text errors
        jsonb metadata
        timestamp created_at
    }

    CLIENTS ||--o{ PIPELINES : has
    CLIENTS ||--o{ JOURNEYS : owns
    CLIENTS ||--o{ TEMPLATES : has
    CLIENTS ||--o{ WORKFLOWS : has
    PIPELINES ||--o{ JOURNEYS : contains
    JOURNEYS ||--o{ TOUCHPOINTS : contains
    JOURNEYS ||--o{ JOURNEY_VERSIONS : versions
    JOURNEYS ||--o{ APPROVALS : approvals
    TOUCHPOINTS ||--o{ TEMPLATES : uses
    WORKFLOWS ||--o{ WORKFLOW_ACTIONS : contains
    WORKFLOW_ACTIONS ||--o{ TEMPLATES : references
    CLIENTS ||--o{ CLIENT_USERS : has
    USERS ||--o{ CLIENT_USERS : belongs_to
    CLIENTS ||--o{ SYNC_HISTORY : logs
```

### 2.2 Table Definitions

#### 2.2.1 Clients
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location_id VARCHAR(100) UNIQUE,
    ghl_location_id VARCHAR(100),
    industry VARCHAR(100),
    website VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'onboarding', 'archived')),
    settings JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_ghl_location ON clients(ghl_location_id);
```

#### 2.2.2 Pipelines
```sql
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    pipeline_id VARCHAR(100),
    stages JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipelines_client ON pipelines(client_id);
```

#### 2.2.3 Journeys
```sql
CREATE TABLE journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    description TEXT,
    category VARCHAR(100) CHECK (category IN ('wedding', 'corporate', 'event', 'inquiry', 'nurture', 'retention', 'reactivation')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'client_review', 'approved', 'published', 'rejected', 'archived')),
    version INTEGER DEFAULT 1,
    trigger_config JSONB,
    goal TEXT,
    metadata JSONB DEFAULT '{}',
    published_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journeys_client ON journeys(client_id);
CREATE INDEX idx_journeys_status ON journeys(status);
CREATE INDEX idx_journeys_category ON journeys(category);
CREATE INDEX idx_journeys_client_status ON journeys(client_id, status);
```

#### 2.2.4 Touchpoints
```sql
CREATE TABLE touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'task', 'wait', 'condition', 'trigger', 'form', 'call', 'note')),
    order_index INTEGER NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    config JSONB DEFAULT '{}',
    position JSONB,
    ghl_template_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published')),
    next_touchpoint_id UUID REFERENCES touchpoints(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_touchpoints_journey ON touchpoints(journey_id);
CREATE INDEX idx_touchpoints_type ON touchpoints(type);
CREATE INDEX idx_touchpoints_order ON touchpoints(journey_id, order_index);
```

#### 2.2.5 Templates
```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms')),
    ghl_template_id VARCHAR(100) UNIQUE,
    content JSONB NOT NULL,
    variables JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft',
    last_synced TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_client ON templates(client_id);
CREATE INDEX idx_templates_ghl_id ON templates(ghl_template_id);
CREATE INDEX idx_templates_type ON templates(type);
```

#### 2.2.6 Workflows
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    workflow_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    trigger JSONB NOT NULL,
    actions JSONB DEFAULT '[]',
    notes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflows_client ON workflows(client_id);
```

#### 2.2.7 Journey Versions
```sql
CREATE TABLE journey_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by VARCHAR(255),
    change_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journey_id, version)
);

CREATE INDEX idx_versions_journey ON journey_versions(journey_id);
CREATE INDEX idx_versions_number ON journey_versions(journey_id, version DESC);
```

#### 2.2.8 Approvals
```sql
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    version_id UUID REFERENCES journey_versions(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
    comments TEXT,
    requested_by VARCHAR(255),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approvals_journey ON approvals(journey_id);
CREATE INDEX idx_approvals_status ON approvals(status);
```

#### 2.2.9 Users & Client Access
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer', 'client')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'editor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, user_id)
);
```

---

## 3. Migration Strategy

### 3.1 Pre-Migration Checklist

- [ ] Create PostgreSQL database instance (RDS/Supabase/Neon)
- [ ] Set up migration user with appropriate permissions
- [ ] Install migration tooling (Prisma/TypeORM/node-pg-migrate)
- [ ] Create rollback scripts
- [ ] Set up data validation tests
- [ ] Backup current Airtable data (CSV export)

### 3.2 Migration Script Architecture

```mermaid
flowchart TD
    A[Start Migration] --> B[Export Airtable Data]
    B --> C{Data Validation}
    C -->|Valid| D[Transform Data]
    C -->|Invalid| E[Log Errors & Stop]
    D --> F[Create Clients]
    F --> G[Create Pipelines]
    G --> H[Create Journeys]
    H --> I[Create Touchpoints]
    I --> J[Create Templates]
    J --> K[Create Workflows]
    K --> L[Verify Migration]
    L -->|Success| M[Update Frontend Config]
    L -->|Failure| N[Rollback]
    M --> O[Migration Complete]
    N --> P[Investigate & Fix]
```

### 3.3 Airtable to PostgreSQL Mapping

| Airtable Table | PostgreSQL Table | Mapping Notes |
|----------------|------------------|---------------|
| Clients | clients | Direct field mapping; status enum conversion |
| Pipelines | pipelines | JSON parse for stages field |
| Journeys | journeys | Link to clients/pipelines; status enum mapping |
| Touchpoints | touchpoints | Content field → JSONB; parse position coordinates |
| Templates | templates | GHL Template ID preserved |
| Versions | journey_versions | Snapshot stored as JSONB |
| Approvals | approvals | Direct mapping with FK to journeys |
| Sync History | sync_history | Direct mapping |
| Email Previews | templates | Consolidated into templates table |

### 3.4 Data Transformation Rules

#### 3.4.1 Status Mappings
```javascript
// Airtable → PostgreSQL
const statusMap = {
  // Journey status
  'Draft': 'draft',
  'In Review': 'client_review',
  'Active': 'published',
  'Paused': 'archived',
  'Archived': 'archived',
  'Approved': 'approved',
  'Rejected': 'rejected',
  
  // Client status
  'Active': 'active',
  'Inactive': 'inactive',
  'Onboarding': 'onboarding',
  'Archived': 'archived'
};
```

#### 3.4.2 Content Transformation
```javascript
// Touchpoint content parsing
function transformTouchpointContent(airtableContent) {
  // Airtable stores as string or object
  const content = typeof airtableContent === 'string' 
    ? JSON.parse(airtableContent) 
    : airtableContent;
    
  return {
    subject: content.subject || '',
    greeting: content.greeting || '',
    body: content.body || '',
    cta: content.cta || null,
    templateType: content.templateType || '',
    html: content.html || null,
    text: content.text || null
  };
}
```

#### 3.4.3 Position Parsing
```javascript
// Extract X/Y coordinates from Airtable
function parsePosition(positionX, positionY) {
  return {
    x: parseInt(positionX) || 0,
    y: parseInt(positionY) || 0
  };
}
```

### 3.5 Migration Script (Node.js)

```javascript
// scripts/migration/migrate-airtable-to-postgres.js
import { AirtableClient } from '../src/services/airtable.js';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class MigrationService {
  constructor(airtableClient) {
    this.airtable = airtableClient;
    this.mappings = {
      clients: new Map(),      // airtableId -> uuid
      journeys: new Map(),     // airtableId -> uuid
      touchpoints: new Map(),  // airtableId -> uuid
      templates: new Map()     // airtableId -> uuid
    };
  }

  async migrate() {
    console.log('🚀 Starting Airtable to PostgreSQL migration...\n');
    
    try {
      await this.migrateClients();
      await this.migratePipelines();
      await this.migrateJourneys();
      await this.migrateTouchpoints();
      await this.migrateTemplates();
      await this.migrateVersions();
      await this.migrateApprovals();
      
      console.log('\n✅ Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }

  async migrateClients() {
    console.log('📦 Migrating Clients...');
    const records = await this.airtable.getRecords('Clients');
    
    for (const record of records) {
      const client = await prisma.client.create({
        data: {
          id: uuidv4(),
          slug: this.generateSlug(record.fields.Name),
          name: record.fields.Name,
          locationId: record.fields['Location ID'],
          ghlLocationId: record.fields['PIT Token'], // Verify field name
          website: record.fields.Website,
          status: this.mapStatus(record.fields.Status, 'client'),
          settings: {},
          config: {
            notes: record.fields.Notes || ''
          }
        }
      });
      
      this.mappings.clients.set(record.id, client.id);
      console.log(`  ✓ ${client.name}`);
    }
  }

  async migrateJourneys() {
    console.log('🗺️  Migrating Journeys...');
    const records = await this.airtable.getRecords('Journeys');
    
    for (const record of records) {
      const airtableClientId = record.fields.Client?.[0];
      const clientId = this.mappings.clients.get(airtableClientId);
      
      if (!clientId) {
        console.warn(`  ⚠️  Skipping journey ${record.fields['Journey Name']} - no client mapping`);
        continue;
      }

      const journey = await prisma.journey.create({
        data: {
          id: uuidv4(),
          clientId: clientId,
          name: record.fields['Journey Name'],
          category: this.mapCategory(record.fields.Type),
          status: this.mapStatus(record.fields.Status, 'journey'),
          description: record.fields.Description,
          version: 1,
          metadata: {
            tags: record.fields.Tags || []
          }
        }
      });
      
      this.mappings.journeys.set(record.id, journey.id);
      console.log(`  ✓ ${journey.name}`);
    }
  }

  async migrateTouchpoints() {
    console.log('📍 Migrating Touchpoints...');
    const records = await this.airtable.getRecords('Touchpoints');
    
    for (const record of records) {
      const airtableJourneyId = record.fields.Journey?.[0];
      const journeyId = this.mappings.journeys.get(airtableJourneyId);
      
      if (!journeyId) {
        console.warn(`  ⚠️  Skipping touchpoint ${record.fields['Internal Name']} - no journey mapping`);
        continue;
      }

      const content = this.parseContent(record.fields['Body Content']);
      
      const touchpoint = await prisma.touchpoint.create({
        data: {
          id: uuidv4(),
          journeyId: journeyId,
          name: record.fields['Internal Name'],
          type: this.mapTouchpointType(record.fields.Type),
          orderIndex: record.fields.Day || 0,
          content: {
            subject: record.fields.Subject,
            ...content
          },
          ghlTemplateId: record.fields['GHL Template ID'],
          status: this.mapStatus(record.fields.Status, 'touchpoint')
        }
      });
      
      this.mappings.touchpoints.set(record.id, touchpoint.id);
    }
    console.log(`  ✓ Migrated ${records.length} touchpoints`);
  }

  // Helper methods
  generateSlug(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  mapStatus(airtableStatus, entityType) {
    const mappings = {
      client: {
        'Active': 'active',
        'Inactive': 'inactive',
        'Onboarding': 'onboarding',
        'Archived': 'archived'
      },
      journey: {
        'Draft': 'draft',
        'In Review': 'client_review',
        'Active': 'published',
        'Paused': 'archived',
        'Approved': 'approved',
        'Rejected': 'rejected'
      }
    };
    return mappings[entityType]?.[airtableStatus] || 'draft';
  }

  mapCategory(airtableType) {
    const map = {
      'Wedding': 'wedding',
      'Corporate': 'corporate',
      'Event': 'event',
      'Inquiry': 'inquiry',
      'Nurture': 'nurture'
    };
    return map[airtableType] || 'nurture';
  }

  mapTouchpointType(type) {
    const map = {
      'Email': 'email',
      'SMS': 'sms',
      'Task': 'task',
      'Wait': 'wait'
    };
    return map[type] || 'email';
  }

  parseContent(content) {
    if (!content) return {};
    try {
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      return { body: content };
    }
  }
}

// Run migration
const airtableClient = new AirtableClient(
  process.env.AIRTABLE_API_KEY,
  process.env.AIRTABLE_BASE_ID
);

const migration = new MigrationService(airtableClient);
migration.migrate().catch(console.error);
```

### 3.6 Rollback Plan

```sql
-- Rollback script: restore-airtable-state.sql
-- Run this if migration fails and needs to be reverted

-- 1. Disable foreign key checks (if using MySQL) or use CASCADE
-- PostgreSQL uses CASCADE on DROP

-- 2. Truncate all tables in reverse dependency order
TRUNCATE TABLE approvals CASCADE;
TRUNCATE TABLE journey_versions CASCADE;
TRUNCATE TABLE workflow_actions CASCADE;
TRUNCATE TABLE workflows CASCADE;
TRUNCATE TABLE touchpoints CASCADE;
TRUNCATE TABLE templates CASCADE;
TRUNCATE TABLE journeys CASCADE;
TRUNCATE TABLE pipelines CASCADE;
TRUNCATE TABLE client_users CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE sync_history CASCADE;
TRUNCATE TABLE clients CASCADE;

-- 3. Reset sequences (if using auto-increment)
-- Not needed for UUID primary keys

-- 4. Log rollback
INSERT INTO migration_logs (operation, status, created_at)
VALUES ('ROLLBACK', 'completed', NOW());
```

---

## 4. API Layer Architecture

### 4.1 Architecture Decision: REST API with Prisma

**Approach**: Create a REST API layer between the frontend and PostgreSQL

**Rationale**:
- **Security**: No direct DB connections from frontend
- **Flexibility**: Can add caching, rate limiting, auth
- **Future-proofing**: Easy to add GraphQL or other protocols later
- **Team scaling**: Backend and frontend can evolve independently

### 4.2 API Structure

```
apps/
├── journey-visualizer/          # Existing frontend
├── journey-api/                 # NEW: REST API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── clients.ts
│   │   │   ├── journeys.ts
│   │   │   ├── touchpoints.ts
│   │   │   ├── templates.ts
│   │   │   ├── workflows.ts
│   │   │   └── auth.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   └── error-handler.ts
│   │   ├── services/
│   │   │   ├── client-service.ts
│   │   │   ├── journey-service.ts
│   │   │   └── sync-service.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── index.ts
│   ├── package.json
│   └── Dockerfile
```

### 4.3 API Endpoints

#### Clients
```typescript
// GET /api/clients
// GET /api/clients/:slug
// POST /api/clients
// PUT /api/clients/:id
// DELETE /api/clients/:id
// GET /api/clients/:id/stats
```

#### Journeys
```typescript
// GET /api/journeys?clientId=:id&status=:status
// GET /api/journeys/:id
// GET /api/journeys/:id/touchpoints
// POST /api/journeys
// PUT /api/journeys/:id
// PUT /api/journeys/:id/status
// DELETE /api/journeys/:id
// POST /api/journeys/:id/duplicate
// GET /api/journeys/:id/versions
// POST /api/journeys/:id/versions
```

#### Touchpoints
```typescript
// GET /api/touchpoints?journeyId=:id
// GET /api/touchpoints/:id
// POST /api/touchpoints
// PUT /api/touchpoints/:id
// PUT /api/touchpoints/:id/order (bulk reorder)
// DELETE /api/touchpoints/:id
```

#### Templates
```typescript
// GET /api/templates?clientId=:id&type=:type
// GET /api/templates/:id
// POST /api/templates
// PUT /api/templates/:id
// POST /api/templates/:id/sync-to-ghl
// DELETE /api/templates/:id
```

### 4.4 Authentication/Authorization

```typescript
// JWT-based authentication
interface AuthConfig {
  type: 'jwt';
  secret: string;
  expiresIn: '24h';
}

// Role-based access control
interface Permissions {
  admin: ['create', 'read', 'update', 'delete', 'publish'],
  editor: ['create', 'read', 'update', 'delete'],
  viewer: ['read'],
  client: ['read', 'update_own'] // Client users limited to their own data
}

// Middleware example
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 4.5 Database Service Layer Example

```typescript
// services/journey-service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class JourneyService {
  async getJourneys(filters: JourneyFilters) {
    return prisma.journey.findMany({
      where: {
        clientId: filters.clientId,
        status: filters.status,
        category: filters.category
      },
      include: {
        client: {
          select: { name: true, slug: true }
        },
        _count: {
          select: { touchpoints: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getJourneyWithTouchpoints(id: string) {
    return prisma.journey.findUnique({
      where: { id },
      include: {
        touchpoints: {
          orderBy: { orderIndex: 'asc' }
        },
        client: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 5
        }
      }
    });
  }

  async createJourney(data: CreateJourneyInput) {
    return prisma.$transaction(async (tx) => {
      // Create journey
      const journey = await tx.journey.create({
        data: {
          ...data,
          slug: this.generateSlug(data.name)
        }
      });

      // Create initial version
      await tx.journeyVersion.create({
        data: {
          journeyId: journey.id,
          version: 1,
          snapshot: {},
          createdBy: data.createdBy,
          changeLog: 'Initial creation'
        }
      });

      return journey;
    });
  }

  async updateTouchpointOrder(journeyId: string, touchpointOrders: { id: string; order: number }[]) {
    return prisma.$transaction(
      touchpointOrders.map(({ id, order }) =>
        prisma.touchpoint.update({
          where: { id },
          data: { orderIndex: order }
        })
      )
    );
  }
}
```

---

## 5. Updated Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer"]
        JV["Journey Visualizer<br/>React + Vite"]
        CD["Client Dashboards"]
    end

    subgraph APILayer["API Layer"]
        API["REST API<br/>Express/Fastify"]
        Auth["Auth Middleware<br/>JWT"]
        Cache["Redis Cache"]
    end

    subgraph DataLayer["Data Layer"]
        PG[("PostgreSQL<br/>Primary Data")]
        Redis[("Redis<br/>Session/Cache")]
    end

    subgraph External["External Services"]
        GHL["GoHighLevel API"]
        AirtableLegacy["Airtable<br/>(Legacy Read-only)"]
    end

    subgraph SyncLayer["Sync Layer"]
        SyncEngine["Sync Engine<br/>Node.js"]
        GHLPublisher["GHL Publisher"]
    end

    JV -->|HTTPS| API
    CD -->|HTTPS| API
    API --> Auth
    Auth --> PG
    API --> Cache
    Cache --> PG
    
    SyncEngine --> PG
    SyncEngine --> GHLPublisher
    GHLPublisher --> GHL
    
    API -.->|Migration reads| AirtableLegacy
    
    style AirtableLegacy fill:#f96,stroke:#333,stroke-dasharray: 5 5
```

---

## 6. Implementation Phases

### Phase 1: Database Setup and Schema (Week 1)

**Tasks:**
- [ ] Provision PostgreSQL instance (Supabase/RDS/Neon)
- [ ] Set up Prisma ORM with schema definitions
- [ ] Create migration files for all tables
- [ ] Set up database indexes and constraints
- [ ] Create development/staging/production environments
- [ ] Document connection strings and credentials

**Deliverables:**
- Running PostgreSQL instance
- Prisma schema file
- Migration scripts
- Database documentation

### Phase 2: Migration Scripts (Week 2)

**Tasks:**
- [ ] Build Airtable export script
- [ ] Implement data transformation logic
- [ ] Create PostgreSQL import script
- [ ] Add data validation checks
- [ ] Build rollback mechanism
- [ ] Test migration on staging data

**Deliverables:**
- `migrate-airtable-to-postgres.js` script
- Data validation reports
- Rollback procedures

### Phase 3: API Development (Week 3-4)

**Tasks:**
- [ ] Set up Express/Fastify API project
- [ ] Implement authentication middleware
- [ ] Build CRUD endpoints for all entities
- [ ] Add validation (Zod/Joi)
- [ ] Implement error handling
- [ ] Add rate limiting
- [ ] Write API documentation (OpenAPI/Swagger)

**Deliverables:**
- Working REST API
- API documentation
- Postman collection

### Phase 4: Frontend Integration (Week 5)

**Tasks:**
- [ ] Create API client service
- [ ] Replace Airtable calls with API calls
- [ ] Update local development mode
- [ ] Add loading states and error handling
- [ ] Implement optimistic updates
- [ ] Add offline support (optional)

**Deliverables:**
- Updated frontend using new API
- Environment configuration
- Integration tests

### Phase 5: Sync Engine Update (Week 6)

**Tasks:**
- [ ] Update sync engine to read from PostgreSQL
- [ ] Modify GHL publisher to use new data source
- [ ] Add sync status tracking in database
- [ ] Implement retry logic
- [ ] Add monitoring and alerting

**Deliverables:**
- Updated sync engine
- Sync status dashboard
- Monitoring setup

### Phase 6: Testing and Cutover (Week 7)

**Tasks:**
- [ ] Run full migration on production clone
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Create cutover runbook
- [ ] Execute production migration
- [ ] Verify data integrity
- [ ] Switch frontend to production API

**Deliverables:**
- Test reports
- Production runbook
- Migrated production database

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss during migration | High | Low | Full backups, validation checks, rollback plan |
| Downtime during cutover | Medium | Medium | Blue-green deployment, maintenance window |
| API performance issues | Medium | Medium | Caching, query optimization, load testing |
| Data inconsistencies | High | Medium | Validation scripts, data quality checks |
| Team learning curve | Low | High | Documentation, training sessions |
| Airtable API rate limits | Medium | Medium | Rate limiting, caching, incremental exports |

---

## 8. Success Criteria

- [ ] All Airtable data successfully migrated to PostgreSQL
- [ ] Zero data loss (100% record count match)
- [ ] API response times < 200ms for common queries
- [ ] Frontend fully functional with new API
- [ ] Sync engine operational with new data source
- [ ] All existing features preserved
- [ ] Rollback tested and documented

---

## 9. Post-Migration Cleanup

After successful migration and 30-day stabilization period:

1. **Archive Airtable base** (read-only mode)
2. **Remove Airtable API keys** from codebase
3. **Delete migration scripts** (keep documentation)
4. **Update documentation** with new architecture
5. **Train team** on new database tools

---

## Appendix A: Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Client {
  id              String   @id @default(uuid())
  slug            String   @unique
  name            String
  locationId      String?  @unique
  ghlLocationId   String?
  industry        String?
  website         String?
  status          String   @default("active")
  settings        Json     @default("{}")
  config          Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  pipelines       Pipeline[]
  journeys        Journey[]
  templates       Template[]
  workflows       Workflow[]
  clientUsers     ClientUser[]
  syncHistory     SyncHistory[]

  @@index([slug])
  @@index([status])
  @@map("clients")
}

model Pipeline {
  id          String   @id @default(uuid())
  clientId    String
  name        String
  pipelineId  String?
  stages      Json     @default("[]")
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  journeys    Journey[]

  @@index([clientId])
  @@map("pipelines")
}

model Journey {
  id              String    @id @default(uuid())
  clientId        String
  pipelineId      String?
  name            String
  slug            String?
  description     String?
  category        String?
  status          String    @default("draft")
  version         Int       @default(1)
  triggerConfig   Json?
  goal            String?
  metadata        Json      @default("{}")
  publishedAt     DateTime?
  approvedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  client          Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  pipeline        Pipeline? @relation(fields: [pipelineId], references: [id], onDelete: SetNull)
  touchpoints     Touchpoint[]
  versions        JourneyVersion[]
  approvals       Approval[]

  @@index([clientId])
  @@index([status])
  @@index([clientId, status])
  @@map("journeys")
}

model Touchpoint {
  id              String   @id @default(uuid())
  journeyId       String
  name            String
  type            String
  orderIndex      Int
  content         Json
  config          Json     @default("{}")
  position        Json?
  ghlTemplateId   String?
  status          String   @default("draft")
  nextTouchpointId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  journey         Journey  @relation(fields: [journeyId], references: [id], onDelete: Cascade)

  @@index([journeyId])
  @@index([journeyId, orderIndex])
  @@map("touchpoints")
}

model Template {
  id              String    @id @default(uuid())
  clientId        String?
  name            String
  type            String
  ghlTemplateId   String?   @unique
  content         Json
  variables       Json      @default("[]")
  status          String    @default("draft")
  lastSynced      DateTime?
  syncStatus      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  client          Client?   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([ghlTemplateId])
  @@map("templates")
}

model Workflow {
  id          String   @id @default(uuid())
  clientId    String
  name        String
  workflowId  String?
  status      String   @default("active")
  trigger     Json
  actions     Json     @default("[]")
  notes       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@map("workflows")
}

model JourneyVersion {
  id          String   @id @default(uuid())
  journeyId   String
  version     Int
  snapshot    Json
  createdBy   String?
  changeLog   String?
  createdAt   DateTime @default(now())

  journey     Journey  @relation(fields: [journeyId], references: [id], onDelete: Cascade)

  @@unique([journeyId, version])
  @@index([journeyId])
  @@map("journey_versions")
}

model Approval {
  id            String    @id @default(uuid())
  journeyId     String
  versionId     String?
  status        String
  comments      String?
  requestedBy   String?
  reviewedBy    String?
  reviewedAt    DateTime?
  createdAt     DateTime  @default(now())

  journey       Journey   @relation(fields: [journeyId], references: [id], onDelete: Cascade)

  @@index([journeyId])
  @@index([status])
  @@map("approvals")
}

model User {
  id            String       @id @default(uuid())
  email         String       @unique
  name          String?
  role          String       @default("editor")
  permissions   Json         @default("{}")
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  clientUsers   ClientUser[]

  @@map("users")
}

model ClientUser {
  id        String   @id @default(uuid())
  clientId  String
  userId    String
  role      String   @default("editor")
  createdAt DateTime @default(now())

  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([clientId, userId])
  @@map("client_users")
}

model SyncHistory {
  id            String   @id @default(uuid())
  clientId      String?
  operation     String
  status        String
  itemsSynced   Int?
  errors        String?
  metadata      Json?
  createdAt     DateTime @default(now())

  client        Client?  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@map("sync_history")
}
```

---

## Appendix B: Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DATABASE_SSL_MODE="require"

# API
API_PORT=3001
API_BASE_URL="http://localhost:3001"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"

# Redis (optional, for caching)
REDIS_URL="redis://localhost:6379"

# Legacy Airtable (for migration only)
AIRTABLE_API_KEY="key..."
AIRTABLE_BASE_ID="app66pKRuzhlUzy3j"

# GHL
GHL_API_KEY="..."
GHL_BASE_URL="https://services.leadconnectorhq.com"
```

---

## Review Checklist

Before proceeding with implementation, ensure:

- [ ] Database choice (PostgreSQL) is approved
- [ ] Schema design reviewed by team
- [ ] Migration approach validated
- [ ] API architecture agreed upon
- [ ] Implementation timeline feasible
- [ ] Risk mitigation strategies in place
- [ ] Rollback plan tested
- [ ] Success criteria defined
