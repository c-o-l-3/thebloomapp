# Airtable to GoHighLevel Sync Engine

A Node.js application that synchronizes marketing journeys from Airtable to GoHighLevel workflows.

## Overview

This sync engine is part of the Journey Builder Stack - a three-layer headless CMS:

1. **Database (Airtable)** - Schema documented at `docs/airtable-schema.md`
2. **Visualizer (React Flow)** - Built at `apps/journey-visualizer/`
3. **Sync Engine (Node.js)** - This application

## Features

- **Automated Sync**: Sync published journeys from Airtable to GHL workflows
- **Conflict Detection**: Detects external modifications and version mismatches
- **Batch Processing**: Efficiently processes multiple journeys
- **Dry Run Mode**: Preview sync changes without making them
- **Comprehensive Logging**: Colored console output and JSON log files
- **Rollback Support**: Ability to revert failed syncs
- **Multi-Client Support**: Sync specific clients or all clients

## Project Structure

```
scripts/sync-engine/
├── src/
│   ├── services/
│   │   ├── airtable.js           # Airtable API client
│   │   ├── ghl.js                # GoHighLevel API client
│   │   └── sync.js               # Main sync orchestration
│   ├── models/
│   │   ├── journey.js            # Journey data models
│   │   ├── touchpoint.js         # Touchpoint models
│   │   └── template.js           # Template models
│   ├── utils/
│   │   ├── logger.js            # Logging utilities
│   │   ├── conflict.js          # Conflict detection
│   │   └── mapper.js             # Airtable to GHL mapping
│   └── cli.js                   # CLI entry point
├── config/
│   └── templates/
│       ├── workflow-template.js  # GHL workflow templates
│       ├── email-template.js     # Email templates
│       └── sms-template.js       # SMS templates
├── scripts/
│   └── sync.sh                  # Shell script wrapper
├── package.json
├── .env.example
└── README.md
```

## Installation

```bash
cd scripts/sync-engine

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Configuration

Create a `.env` file with the following variables:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id

# GoHighLevel Configuration
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_ghl_location_id

# Sync Engine Configuration
SYNC_LOG_LEVEL=info
SYNC_DRY_RUN=false
SYNC_BATCH_SIZE=10
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY=5000

# Client Configuration
DEFAULT_CLIENT=maison-albion
```

## Usage

### Using npm scripts

```bash
# Full sync of all published journeys
npm run sync

# Dry run (no actual changes)
npm run sync -- --dry-run

# Sync specific client only
npm run sync -- --client=maison-albion

# Sync specific journey
npm run sync -- --journey=welcome-series

# Show sync history
npm run sync -- --history

# Test connections
npm run sync -- --test
```

### Using shell script

```bash
# Make script executable
chmod +x scripts/sync.sh

# Run sync
./scripts/sync.sh sync

# Test connections
./scripts/sync.sh test

# Show history
./scripts/sync.sh history

# Dry run
./scripts/sync.sh sync --dry-run

# Specific client
./scripts/sync.sh sync --client=maison-albion
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `sync` | Sync published journeys from Airtable to GHL |
| `history` | Show sync history |
| `conflicts` | Show current conflicts |
| `resolve <id>` | Resolve a conflict |
| `test` | Test API connections |
| `status` | Show sync engine status |

### Sync Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be synced without making changes |
| `--client=<name>` | Sync only for specific client |
| `--journey=<id>` | Sync only specific journey |
| `--overwrite` | Overwrite GHL with Airtable data (for resolve) |
| `--skip` | Skip sync (for resolve) |
| `--merge` | Merge changes (for resolve) |

## Data Transformations

### Journey to GHL Workflow

| Airtable Field | GHL Field |
|----------------|-----------|
| Journey Name | Workflow Name |
| Description | Workflow Description |
| Status | Workflow Status (active/paused) |
| Touchpoints | Workflow Steps |
| Touchpoint Order | Step Order |

### Touchpoint Type Mapping

| Touchpoint Type | GHL Step Type |
|----------------|---------------|
| Email | email |
| SMS | sms |
| Task | task |
| Wait | delay |
| Condition | conditional |
| Trigger | trigger |
| Note | note |
| Call | call |

## Conflict Detection

The sync engine detects the following conflict types:

1. **External Modification**: GHL workflow was modified outside the system
2. **Version Mismatch**: GHL version is ahead of Airtable version
3. **Concurrent Edit**: Step count mismatch between Airtable and GHL

### Conflict Resolution Options

- **Skip**: Skip this sync
- **Overwrite**: Overwrite GHL with Airtable data
- **Merge**: Attempt to merge changes
- **Manual**: Manual resolution required

## Sync Status

| Status | Description |
|--------|-------------|
| Pending | Not yet synced |
| Syncing | Sync in progress |
| Synced | Successfully synced |
| Sync Failed | Sync failed |
| Conflict | Conflicts detected |
| Skipped | Skipped due to conflicts |

## Maison Albion Test Data

The sync engine includes pre-configured test data for Maison Albion:

- **48 workflows** across 4 pipelines
- **Example journey**: "Welcome Series" with Email → Wait → SMS → Task flow
- Pre-configured GHL API responses in `clients/maison-albion/`

### Example Journey: Welcome Series

```javascript
{
  name: "Welcome Series",
  description: "Automated welcome sequence for new contacts",
  status: "Published",
  touchpoints: [
    {
      name: "Welcome Email",
      type: "Email",
      order: 0,
      config: {
        subject: "Welcome to Maison Albion!",
        content: "Thank you for joining us..."
      }
    },
    {
      name: "Wait 24 Hours",
      type: "Wait",
      order: 1,
      config: {
        delay: 24,
        delayUnit: "hours"
      }
    },
    {
      name: "Check-in SMS",
      type: "SMS",
      order: 2,
      config: {
        content: "Hi! Just checking in..."
      }
    },
    {
      name: "Personal Follow-up",
      type: "Task",
      order: 3,
      config: {
        title: "Personal outreach",
        assignee: "team@maisonalbion.com",
        dueIn: 24
      }
    }
  ]
}
```

## API Reference

### Airtable Service

```javascript
import airtableService from './services/airtable.js';

// Fetch published journeys
const journeys = await airtableService.getPublishedJourneys();

// Get specific journey
const journey = await airtableService.getJourneyById(journeyId);

// Get touchpoints for journey
const touchpoints = await airtableService.getTouchpointsForJourney(journeyId);

// Update sync status
await airtableService.updateJourneySyncStatus(journeyId, 'Synced');
```

### GoHighLevel Service

```javascript
import ghlService from './services/ghl.js';

// Create workflow
const workflow = await ghlService.createWorkflow(workflowData);

// Update workflow
const updated = await ghlService.updateWorkflow(workflowId, workflowData);

// Get workflow
const workflow = await ghlService.getWorkflowById(workflowId);

// Delete workflow
await ghlService.deleteWorkflow(workflowId);
```

### Sync Orchestration

```javascript
import syncOrchestration from './services/sync.js';

// Initialize
await syncOrchestration.initialize({
  dryRun: false,
  client: 'maison-albion',
  journey: null
});

// Execute sync
const result = await syncOrchestration.execute();
```

## Logging

The sync engine produces:

1. **Colored Console Output**: Real-time progress and status
2. **JSON Log Files**: Saved to `logs/` directory with timestamps
3. **Summary Report**: After each sync operation

Log levels: `error`, `warn`, `info`, `debug`, `verbose`

## Error Handling

- Automatic retry on rate limiting (429 responses)
- Batch rollback on sync failures
- Comprehensive error logging with stack traces
- Graceful degradation for non-critical errors

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Run with debug logging
SYNC_LOG_LEVEL=debug npm run sync
```

## Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure `.env` is properly configured
2. **Rate Limiting**: Increase `SYNC_RETRY_DELAY` in `.env`
3. **Missing Touchpoints**: Check Airtable junction table configuration
4. **Sync Conflicts**: Review conflict report and resolve manually

### Debug Mode

Run with verbose logging to see detailed API requests:

```bash
SYNC_LOG_LEVEL=debug npm run sync
```

## License

MIT
