# Workflow Automation Triggers v2

**Priority:** P1  
**Roadmap:** Q2 2026  
**Status:** Implemented

## Overview

Workflow Automation Triggers v2 is a comprehensive upgrade to the workflow trigger system, enabling sophisticated conditional logic, time-based delays, and multi-trigger support for advanced marketing automation.

## Features

### Supported Trigger Types

1. **Contact Created** (`contactCreated`)
   - Fires when a new contact is created in the system
   - Configurable filters: source, initial tags
   - Use case: Welcome sequences for new leads

2. **Stage Changed** (`stageChanged`)
   - Fires when an opportunity moves between pipeline stages
   - Configurable filters: pipeline, from stage, to stage
   - Use case: Follow-up sequences when leads progress

3. **Email Opened** (`emailOpened`)
   - Fires when a contact opens an email
   - Configurable filters: template ID, minimum open count
   - Use case: Engagement-based follow-ups

4. **Link Clicked** (`linkClicked`)
   - Fires when a contact clicks a link in an email
   - Configurable filters: template ID, URL pattern, minimum clicks
   - Use case: Interest-based segmentation

5. **Form Submitted** (`formSubmitted`)
   - Fires when a contact submits a form
   - Required filter: form ID
   - Use case: Lead magnet delivery, survey responses

6. **Appointment Booked** (`appointmentBooked`)
   - Fires when an appointment is scheduled
   - Configurable filters: calendar ID, appointment type
   - Use case: Tour reminders, consultation prep

### Conditional Logic

Triggers support complex condition evaluation with:

- **Condition Groups**: Multiple groups of conditions with AND/OR logic
- **Operators**:
  - `equals` / `notEquals`: Exact value matching
  - `contains` / `notContains`: Substring matching
  - `startsWith` / `endsWith`: Prefix/suffix matching
  - `greaterThan` / `lessThan` / `greaterOrEqual` / `lessOrEqual`: Numeric comparisons
  - `in` / `notIn`: List membership
  - `exists` / `notExists`: Field presence checking
  - `matchesRegex`: Regular expression matching

- **Field Types**: string, number, boolean, date, array
- **Nested Fields**: Support for dot notation (e.g., `formData.email`)

### Time-Based Delays

- **Immediate**: No delay (default)
- **Minutes/Hours/Days**: Configurable numeric delay
- **Business Hours**: Optional scheduling within business hours
  - Configurable business hours (start/end time)
  - Day of week selection
  - Timezone support
  - Automatic rescheduling to next business window

### Deduplication & Rate Limiting

- **Deduplication Window**: Prevents duplicate triggers within specified minutes (default: 24 hours)
- **Deduplication Key**: Customizable key fields (default: contactId)
- **Max Executions**: Limit total executions per contact
- **Execution Cooldown**: Minimum time between executions for the same contact

## API Endpoints

### Trigger Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflow-triggers` | List all triggers (filterable by clientId, workflowId, status, type) |
| GET | `/api/workflow-triggers/:id` | Get single trigger details |
| POST | `/api/workflow-triggers` | Create new trigger |
| PUT | `/api/workflow-triggers/:id` | Update existing trigger |
| DELETE | `/api/workflow-triggers/:id` | Delete trigger |
| POST | `/api/workflow-triggers/:id/duplicate` | Duplicate a trigger |
| POST | `/api/workflow-triggers/:id/toggle` | Toggle active/paused status |
| POST | `/api/workflow-triggers/:id/test` | Test trigger with sample data |
| GET | `/api/workflow-triggers/:id/stats` | Get trigger execution statistics |
| GET | `/api/workflow-triggers/:id/executions` | Get execution history |

### Trigger Types & Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflow-triggers/types` | Get available trigger types and operators |

### Webhook Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflow-triggers/webhook/:clientId` | Receive events from external systems |

## Database Schema

### New Tables

#### `workflow_triggers_v2`
Stores trigger definitions with conditional logic and scheduling.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workflow_id | UUID | Associated workflow |
| client_id | UUID | Associated client |
| name | String | Trigger name |
| type | String | Trigger type (contactCreated, etc.) |
| status | String | active, paused, archived |
| config | JSON | Type-specific configuration |
| conditions | JSON | Array of condition groups |
| condition_logic | String | and/or logic between groups |
| time_delay | Int | Delay amount |
| time_delay_type | String | immediate, minutes, hours, days |
| schedule_window | JSON | Business hours configuration |
| max_executions | Int | Max executions per contact |
| execution_cooldown | Int | Minutes between executions |
| dedup_window | Int | Deduplication window in minutes |
| dedup_key | String | Key fields for deduplication |

#### `workflow_executions`
Tracks workflow execution instances.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workflow_id | UUID | Associated workflow |
| client_id | UUID | Associated client |
| contact_id | String | Associated contact |
| trigger_id | String | Trigger that initiated execution |
| status | String | pending, running, completed, failed, cancelled |
| started_at | DateTime | Execution start time |
| completed_at | DateTime | Execution completion time |
| context | JSON | Execution context data |
| results | JSON | Action results |
| error | String | Error message if failed |
| actions_total | Int | Total actions in workflow |
| actions_completed | Int | Successfully completed actions |
| actions_failed | Int | Failed actions |

#### `trigger_executions`
Tracks individual trigger evaluations.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| trigger_id | UUID | Associated trigger |
| workflow_id | UUID | Associated workflow |
| client_id | UUID | Associated client |
| contact_id | String | Associated contact |
| event_type | String | Type of event that fired |
| event_data | JSON | Event payload |
| status | String | triggered, suppressed, failed, conditions_not_met |
| matched_conditions | JSON | Which conditions were matched |
| execution_id | String | Linked workflow execution |
| dedup_hash | String | Deduplication hash |
| created_at | DateTime | Execution timestamp |

## React Components

### WorkflowTriggerConfig

Configuration component for creating/editing triggers.

```jsx
import WorkflowTriggerConfig from './components/WorkflowTriggerConfig';

<WorkflowTriggerConfig
  workflowId="workflow-uuid"
  clientId="client-uuid"
  trigger={existingTrigger} // null for new trigger
  onSave={(triggerData) => handleSave(triggerData)}
  onCancel={() => handleCancel()}
/>
```

**Features:**
- Visual trigger type selection with descriptions
- Dynamic configuration fields based on trigger type
- Condition builder with groups and multiple operators
- Time delay configuration with business hours support
- Advanced options (deduplication, rate limiting)
- Built-in testing capability

### WorkflowTriggerList

List and manage triggers for a workflow.

```jsx
import WorkflowTriggerList from './components/WorkflowTriggerList';

<WorkflowTriggerList
  workflowId="workflow-uuid"
  clientId="client-uuid"
  onCreateTrigger={() => handleCreate()}
  onEditTrigger={(trigger) => handleEdit(trigger)}
  onBack={() => handleBack()}
/>
```

**Features:**
- Filter by status (all, active, paused)
- Quick actions (toggle, edit, duplicate, delete)
- Execution counts and metadata
- Empty state guidance

## Example Trigger Configurations

### New Lead Welcome with Conditions
```json
{
  "name": "New Lead Welcome",
  "type": "contactCreated",
  "status": "active",
  "config": {
    "source": "website"
  },
  "conditions": [
    {
      "conditions": [
        { "field": "email", "operator": "exists" },
        { "field": "source", "operator": "equals", "value": "website" }
      ],
      "logic": "and"
    }
  ],
  "conditionLogic": "and",
  "timeDelay": 5,
  "timeDelayType": "minutes",
  "dedupWindow": 1440
}
```

### Stage Change with Business Hours
```json
{
  "name": "Post-Tour Follow-up",
  "type": "stageChanged",
  "status": "active",
  "config": {
    "toStage": "Tour Completed"
  },
  "conditions": [
    {
      "conditions": [
        { "field": "fromStage", "operator": "equals", "value": "Tour Scheduled" }
      ],
      "logic": "and"
    }
  ],
  "timeDelay": 2,
  "timeDelayType": "hours",
  "scheduleWindow": {
    "businessHoursStart": 9,
    "businessHoursEnd": 17,
    "businessDays": [1, 2, 3, 4, 5],
    "timezone": "America/New_York"
  }
}
```

### Email Engagement Trigger
```json
{
  "name": "High Engagement Follow-up",
  "type": "emailOpened",
  "status": "active",
  "config": {
    "templateId": "welcome-series-1",
    "minOpens": 3
  },
  "conditions": [
    {
      "conditions": [
        { "field": "openCount", "operator": "greaterOrEqual", "value": "3", "fieldType": "number" }
      ],
      "logic": "and"
    }
  ],
  "maxExecutions": 1,
  "executionCooldown": 10080
}
```

## Migration Guide

### Database Migration
```bash
cd apps/journey-api
npx prisma migrate dev --name add_workflow_triggers_v2
```

### Legacy Workflow Migration
Existing workflows using the old trigger format remain functional. To upgrade to v2:

1. Create new v2 triggers alongside existing ones
2. Test thoroughly in staging environment
3. Pause old triggers
4. Activate new v2 triggers
5. Monitor execution logs
6. Remove old triggers after validation period

## Webhook Integration

### Receiving Events

External systems (like GoHighLevel) can send events to trigger workflows:

```bash
POST /api/workflow-triggers/webhook/{clientId}
Content-Type: application/json

{
  "eventType": "contactCreated",
  "eventData": {
    "contactId": "12345",
    "email": "lead@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "source": "website",
    "tags": ["new-lead", "website-inquiry"]
  }
}
```

### Event Types and Payloads

Each trigger type expects specific event data:

**contactCreated**
```json
{
  "contactId": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "source": "string",
  "tags": ["string"]
}
```

**stageChanged**
```json
{
  "opportunityId": "string",
  "contactId": "string",
  "pipelineId": "string",
  "fromStage": "string",
  "toStage": "string"
}
```

**emailOpened**
```json
{
  "contactId": "string",
  "templateId": "string",
  "emailId": "string",
  "openCount": "number",
  "openTime": "ISO timestamp"
}
```

## Monitoring & Analytics

### Trigger Statistics

Access trigger performance metrics via API:

```bash
GET /api/workflow-triggers/{triggerId}/stats?clientId={clientId}
```

Response:
```json
{
  "total": 1000,
  "triggered": 850,
  "suppressed": 100,
  "failed": 25,
  "conditionsNotMet": 25,
  "dailyStats": [...]
}
```

### Execution Logs

Query execution history with filtering:

```bash
GET /api/workflow-triggers/{triggerId}/executions?status=triggered&limit=50
```

## Best Practices

1. **Start Simple**: Begin with basic triggers and add conditions gradually
2. **Test Thoroughly**: Use the test endpoint before activating triggers
3. **Monitor Performance**: Regularly review execution statistics
4. **Set Deduplication**: Always configure appropriate deduplication windows
5. **Use Business Hours**: For customer-facing workflows, respect business hours
6. **Rate Limit**: Set maxExecutions and cooldowns to prevent spam
7. **Document Triggers**: Use clear, descriptive names for triggers

## Troubleshooting

### Trigger Not Firing
- Check trigger status (must be "active")
- Verify conditions are correctly configured
- Check event data matches expected schema
- Review deduplication window settings

### Duplicate Executions
- Increase dedupWindow value
- Verify dedupKey includes unique identifier
- Check for multiple triggers with overlapping conditions

### Delayed Executions
- Verify timeDelay and timeDelayType settings
- Check business hours configuration
- Review timezone settings

## Future Enhancements

Planned for future releases:
- A/B testing for triggers
- Machine learning-based condition suggestions
- Visual workflow builder integration
- Real-time trigger monitoring dashboard
- Advanced scheduling (cron expressions)
- Trigger chaining and dependencies