# BLOOM-206: Add Automated Setup Validation Checks

## Task Metadata

| Field | Value |
|-------|-------|
| **ID** | BLOOM-206 |
| **Title** | Add Automated Setup Validation Checks |
| **Priority** | P0 |
| **Points** | 3 |
| **Assignee** | @backend-dev |
| **Status** | 🔴 Blocked |
| **Blocked By** | [BLOOM-205](BLOOM-205.md) - CLI onboarding wizard improvements |
| **Epic** | Developer Experience & Onboarding |
| **Sprint** | 2026 Q1 Sprint 1 |

---

## Problem Statement

Current onboarding process relies heavily on **manual validation** of configuration files, environment variables, and service connections. This leads to:

- **Configuration errors discovered late** in the setup process (often during first sync attempt)
- **Onboarding failures** requiring multiple iterations and developer intervention
- **Average onboarding time of 25+ minutes** due to back-and-forth troubleshooting
- **Inconsistent validation** across different client setups
- **Silent failures** where misconfigurations go unnoticed until production issues arise

### Impact Metrics

| Metric | Current State | Target State |
|--------|--------------|--------------|
| Onboarding Time | 25 min | <15 min |
| Configuration Error Detection | Manual (40% catch rate) | Automated (95% catch rate) |
| Failed First Sync Attempts | 35% | <5% |
| Developer Intervention Required | 60% of setups | <10% of setups |

---

## Goal

**Automate 95% of configuration error detection** to reduce onboarding time from 25 minutes to under 15 minutes, ensuring a smooth, error-free setup experience for new client configurations.

---

## Files to Modify

### Primary Files

| File | Size | Purpose | Changes Required |
|------|------|---------|------------------|
| [`scripts/sync-engine/src/utils/setup-validator.js`](../../../scripts/sync-engine/src/utils/setup-validator.js) | 18 KB | Existing validation utility | Add new validation checks, refactor for phase-based validation |
| [`scripts/sync-engine/src/cli-onboarding.js`](../../../scripts/sync-engine/src/cli-onboarding.js) | 21 KB | CLI onboarding wizard | Integrate validation at key checkpoints, display formatted results |
| [`scripts/sync-engine/src/services/ghl.js`](../../../scripts/sync-engine/src/services/ghl.js) | 10 KB | GHL API service | Add validation-specific API call methods with error handling |

### Supporting Files (Read-Only Reference)

| File | Purpose |
|------|---------|
| [`scripts/sync-engine/src/services/airtable.js`](../../../scripts/sync-engine/src/services/airtable.js) | Reference for Airtable connection patterns |
| [`scripts/sync-engine/src/utils/conflict.js`](../../../scripts/sync-engine/src/utils/conflict.js) | Reference for error formatting patterns |
| [`templates/standard-client/location-config.json`](../../../templates/standard-client/location-config.json) | Reference schema for client config validation |

---

## Validation Checks to Implement

### 1. GHL API Credentials Validation

**Purpose**: Verify GoHighLevel API credentials are valid and have required permissions.

**Checks**:
- [ ] API key format validation (length, prefix)
- [ ] API key authentication test (call `/oauth/token` or test endpoint)
- [ ] Location ID exists and is accessible
- [ ] Required scopes/permissions verification
- [ ] API rate limit status check
- [ ] Token expiration check (if using OAuth)

**Error Categories**:
- `INVALID_FORMAT` - Key doesn't match expected pattern
- `AUTH_FAILED` - Authentication rejected
- `INSUFFICIENT_PERMISSIONS` - Valid key but missing required scopes
- `LOCATION_NOT_FOUND` - Location ID invalid or inaccessible
- `RATE_LIMITED` - API quota exceeded

### 2. Airtable Connection Test

**Purpose**: Verify Airtable Personal Access Token and base access.

**Checks**:
- [ ] PAT format validation
- [ ] Authentication test (call `meta/bases`)
- [ ] Base ID exists and is accessible
- [ ] Required tables exist (Journeys, Touchpoints, Templates)
- [ ] Write permissions verification
- [ ] API rate limit status

**Error Categories**:
- `INVALID_PAT_FORMAT` - Token format incorrect
- `AUTH_FAILED` - Authentication rejected
- `BASE_NOT_FOUND` - Base ID invalid
- `MISSING_TABLES` - Required tables don't exist
- `READ_ONLY` - No write permissions

### 3. Required Environment Variables Check

**Purpose**: Ensure all required environment variables are set and valid.

**Checks**:
- [ ] `GHL_API_KEY` - Present and non-empty
- [ ] `GHL_LOCATION_ID` - Present and valid format
- [ ] `AIRTABLE_PAT` - Present and non-empty
- [ ] `AIRTABLE_BASE_ID` - Present and valid format
- [ ] `OPENAI_API_KEY` - Present (if AI features enabled)
- [ ] `JOURNEY_API_URL` - Valid URL format
- [ ] `ENVIRONMENT` - One of: development, staging, production

**Validation Rules**:
```javascript
const ENV_VALIDATION_RULES = {
  GHL_API_KEY: { required: true, minLength: 20 },
  GHL_LOCATION_ID: { required: true, pattern: /^[a-zA-Z0-9]+$/ },
  AIRTABLE_PAT: { required: true, prefix: 'pat' },
  AIRTABLE_BASE_ID: { required: true, prefix: 'app' },
  OPENAI_API_KEY: { required: false, prefix: 'sk-' },
  JOURNEY_API_URL: { required: true, format: 'url' },
  ENVIRONMENT: { required: true, enum: ['development', 'staging', 'production'] }
};
```

### 4. Client Configuration Schema Validation

**Purpose**: Validate `location-config.json` structure and content.

**Checks**:
- [ ] JSON schema validation against standard template
- [ ] Required fields present:
  - `clientInfo.name`
  - `clientInfo.industry`
  - `ghl.locationId`
  - `airtable.baseId`
- [ ] Field type validation (strings, numbers, booleans)
- [ ] Enum value validation (industry types, subscription tiers)
- [ ] Nested object structure validation
- [ ] No unknown/extra fields (strict mode option)

**Schema Reference**: [`templates/standard-client/location-config.json`](../../../templates/standard-client/location-config.json)

### 5. Email Template Syntax Validation

**Purpose**: Validate email template structure and placeholder syntax.

**Checks**:
- [ ] Valid JSON structure in `emails/email-templates.json`
- [ ] Required fields: `name`, `subject`, `body`, `templateId`
- [ ] Subject line not empty and within length limits (<100 chars)
- [ ] Body content not empty
- [ ] Placeholder syntax validation: `{{variableName}}` format
- [ ] Valid placeholder variables (whitelist check)
- [ ] No unclosed placeholders
- [ ] HTML validity (if HTML templates)
- [ ] Image references valid (if applicable)

**Allowed Placeholders**:
```javascript
const VALID_PLACEHOLDERS = [
  'contact.firstName',
  'contact.lastName',
  'contact.email',
  'contact.phone',
  'contact.customFields.*',
  'opportunity.name',
  'opportunity.value',
  'calendar.name',
  'location.name',
  'location.phone',
  'currentDate',
  'currentTime'
];
```

### 6. Workflow Template Validation

**Purpose**: Validate workflow template definitions and GHL compatibility.

**Checks**:
- [ ] Valid JSON structure in `workflows/workflow-templates.json`
- [ ] Required fields: `name`, `status`, `steps`
- [ ] Step sequence validation (valid order, no orphaned steps)
- [ ] Trigger configuration validation
- [ ] Action type validation against GHL supported actions
- [ ] Email template references exist (cross-reference check)
- [ ] Wait step duration validation (positive integers)
- [ ] Condition logic validation (valid operators, fields)
- [ ] GHL workflow ID format validation (if updating existing)

**Workflow Action Types** (validate against):
```javascript
const VALID_ACTION_TYPES = [
  'SEND_EMAIL',
  'SEND_SMS',
  'WAIT',
  'IF_ELSE',
  'CREATE_TASK',
  'CREATE_OPPORTUNITY',
  'UPDATE_CONTACT',
  'ADD_TO_WORKFLOW',
  'REMOVE_FROM_WORKFLOW',
  'WEBHOOK',
  'ADD_TAG',
  'REMOVE_TAG'
];
```

---

## Implementation Approach

### Phase-Based Validation Architecture

Implement validation in three distinct phases to catch errors early and provide contextual feedback:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION PHASES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  PRE-VALIDATION │───▶│ REAL-TIME VALID │───▶│ POST-VALID  │ │
│  │  (Before Setup) │    │  (During Setup) │    │ (After Setup)│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│          │                       │                      │       │
│          ▼                       ▼                      ▼       │
│   • Environment vars      • API creds as            • Full     │
│   • File existence          typed                   sync test  │
│   • JSON syntax           • Config changes          • Data     │
│   • Schema pre-check      • Template edits            verify   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Pre-Validation (Before Setup)

**When**: Run before any setup steps begin

**Purpose**: Fail fast on fundamental issues

**Implementation**:
```javascript
// In cli-onboarding.js - Before wizard starts
async function runPreValidation() {
  const validator = new SetupValidator({ phase: 'pre' });
  
  const checks = [
    validator.checkEnvVars(),
    validator.checkFileStructure(),
    validator.checkJsonSyntax(),
    validator.checkClientConfigSchema()
  ];
  
  const results = await Promise.all(checks);
  
  if (results.some(r => r.severity === 'error')) {
    displayValidationErrors(results);
    process.exit(1);
  }
}
```

**Output**: Block setup until critical errors resolved

### 2. Real-Time Validation (During Setup)

**When**: Triggered during interactive CLI prompts

**Purpose**: Provide immediate feedback as user inputs values

**Integration Points with BLOOM-205**:
- After GHL API key entry → Immediate auth test
- After Airtable PAT entry → Immediate connection test
- After client config edit → Schema validation
- Before template sync → Template syntax validation

**Implementation**:
```javascript
// In cli-onboarding.js - During prompts
const { validateGhlCredentials } = require('./utils/setup-validator');

const apiKey = await prompt('Enter GHL API Key:');
const validation = await validateGhlCredentials(apiKey, locationId);

if (!validation.valid) {
  console.log(chalk.red(`✗ ${validation.error}`));
  // Allow retry or skip with warning
}
```

**Output**: Inline feedback with color-coded status

### 3. Post-Validation (After Setup)

**When**: Run after all setup steps complete, before first sync

**Purpose**: Comprehensive end-to-end validation

**Implementation**:
```javascript
// In cli-onboarding.js - Final step
async function runPostValidation(clientConfig) {
  const validator = new SetupValidator({ 
    phase: 'post',
    clientConfig,
    verbose: true 
  });
  
  const report = await validator.runFullValidation();
  
  // Save report for reference
  await fs.writeJson(
    `${clientConfig.clientId}/setup-validation-report.json`,
    report,
    { spaces: 2 }
  );
  
  return report;
}
```

**Output**: Comprehensive validation report saved to client directory

---

## Integration with BLOOM-205 (CLI Wizard Improvements)

This task is **blocked by** BLOOM-205 because it depends on the new CLI wizard structure. Coordinate with assignee of BLOOM-205 on:

### Integration Points

| BLOOM-205 Feature | BLOOM-206 Integration |
|-------------------|----------------------|
| New prompt framework | Add validation hooks to prompt handlers |
| Progress indicators | Show validation status in progress steps |
| Error recovery flow | Trigger validation before retry attempts |
| Configuration wizard | Real-time validation between wizard steps |
| Summary screen | Include validation results in final summary |

### API Contract for BLOOM-205

```javascript
// setup-validator.js exports for BLOOM-205 integration
module.exports = {
  // Phase-based validators
  runPreValidation,
  runRealTimeValidation,
  runPostValidation,
  
  // Individual check functions (for real-time use)
  validateGhlCredentials,
  validateAirtableConnection,
  validateEnvironmentVars,
  validateClientConfig,
  validateEmailTemplates,
  validateWorkflowTemplates,
  
  // Utilities
  SetupValidator,  // Main class
  ValidationError, // Error class
  formatValidationResults,
  generateValidationReport
};
```

### Coordination Checklist

- [ ] Review BLOOM-205 PR for new prompt handler structure
- [ ] Agree on validation hook injection points
- [ ] Define shared types/interfaces for validation results
- [ ] Test integration in feature branch before merging

---

## Output Formatting

### Console Output (Interactive Mode)

Use colored, formatted output for CLI readability:

```
╔═══════════════════════════════════════════════════════════╗
║           Setup Validation Results                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Environment Variables                    ✅ 8/8 passed   ║
║  ├── GHL_API_KEY                          ✅ Valid        ║
║  ├── GHL_LOCATION_ID                      ✅ Valid        ║
║  ├── AIRTABLE_PAT                         ✅ Valid        ║
║  └── ...                                  ✅ ...          ║
║                                                           ║
║  GHL API Connection                       ✅ Connected    ║
║  ├── Authentication                       ✅ Success      ║
║  ├── Location Access                      ✅ Granted      ║
║  └── Rate Limit Status                    ✅ 4998/5000    ║
║                                                           ║
║  Airtable Connection                      ❌ Failed       ║
║  ├── Authentication                       ✅ Success      ║
║  ├── Base Access                          ❌ Not found    ║
║  │   Error: Base 'appXXXXXXXX' not found or no access    ║
║  └── Tables                               ⏭️  Skipped     ║
║                                                           ║
║  Client Configuration                     ✅ Valid        ║
║  Email Templates                          ⚠️  2 warnings  ║
║  Workflow Templates                       ✅ Valid        ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  Summary: 5 passed, 1 failed, 1 warning                   ║
╚═══════════════════════════════════════════════════════════╝
```

**Color Scheme**:
- ✅ Green: Passed
- ❌ Red: Failed (blocking)
- ⚠️  Yellow: Warning (non-blocking)
- ⏭️  Gray: Skipped
- 🔵 Blue: Info/headers

### JSON Output (CI/CD Mode)

For automated pipelines and reporting:

```json
{
  "timestamp": "2026-02-21T23:18:23.981Z",
  "clientId": "maison-albion",
  "phase": "post",
  "summary": {
    "total": 6,
    "passed": 5,
    "failed": 1,
    "warnings": 2,
    "skipped": 0,
    "durationMs": 3421
  },
  "results": [
    {
      "category": "environment",
      "name": "Environment Variables",
      "status": "passed",
      "checks": [
        {
          "name": "GHL_API_KEY",
          "status": "passed",
          "message": "Valid format and present"
        }
      ]
    },
    {
      "category": "ghl",
      "name": "GHL API Connection",
      "status": "passed",
      "checks": [
        {
          "name": "Authentication",
          "status": "passed",
          "responseTimeMs": 245
        },
        {
          "name": "Location Access",
          "status": "passed",
          "locationId": "abc123"
        }
      ]
    },
    {
      "category": "airtable",
      "name": "Airtable Connection",
      "status": "failed",
      "checks": [
        {
          "name": "Authentication",
          "status": "passed"
        },
        {
          "name": "Base Access",
          "status": "failed",
          "error": {
            "code": "BASE_NOT_FOUND",
            "message": "Base 'appXXXXXXXX' not found or no access",
            "suggestion": "Verify base ID and sharing permissions"
          }
        }
      ]
    }
  ],
  "recommendations": [
    "Check Airtable base sharing settings",
    "Verify base ID is correct in configuration"
  ]
}
```

**Usage**:
```bash
# Interactive mode (default)
npx bloom-onboarding validate

# CI/CD mode (JSON output)
npx bloom-onboarding validate --ci --output validation-report.json

# Quiet mode (exit code only)
npx bloom-onboarding validate --quiet
```

---

## Testing Requirements

### Unit Tests

Create comprehensive unit tests for each validator component:

| Test File | Coverage |
|-----------|----------|
| `test/utils/setup-validator/env-vars.test.js` | Environment variable validation |
| `test/utils/setup-validator/ghl.test.js` | GHL credential validation |
| `test/utils/setup-validator/airtable.test.js` | Airtable connection validation |
| `test/utils/setup-validator/client-config.test.js` | Client config schema validation |
| `test/utils/setup-validator/email-templates.test.js` | Email template validation |
| `test/utils/setup-validator/workflow-templates.test.js` | Workflow validation |
| `test/utils/setup-validator/formatters.test.js` | Output formatting |

**Unit Test Checklist**:
- [ ] Test each validation function in isolation
- [ ] Test with valid inputs (happy path)
- [ ] Test with invalid inputs (error cases)
- [ ] Test with edge cases (empty strings, null values, special chars)
- [ ] Mock external API calls (GHL, Airtable)
- [ ] Verify error messages are clear and actionable
- [ ] Test output formatters (console and JSON)

### Integration Tests

Test validators with mock services:

| Test File | Coverage |
|-----------|----------|
| `test/integration/validation/full-pipeline.test.js` | End-to-end validation flow |
| `test/integration/validation/ghl-mock.test.js` | GHL validation with mock server |
| `test/integration/validation/airtable-mock.test.js` | Airtable validation with mock server |

**Integration Test Checklist**:
- [ ] Mock GHL API responses (success, auth failure, rate limit)
- [ ] Mock Airtable API responses (success, base not found, permission denied)
- [ ] Test full validation pipeline
- [ ] Test validation report generation
- [ ] Test CLI integration (output capture)

### Edge Case Testing

Test these specific edge cases:

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid credentials | Clear error message with remediation steps |
| Missing `.env` file | Warning with instructions to copy `.env.example` |
| Malformed JSON in config | Line-specific error with JSON parse details |
| Network timeout | Retry with exponential backoff, then graceful failure |
| Rate limited by GHL | Detect rate limit, show reset time, suggest wait |
| Empty email template | Flag as error before sync attempt |
| Unknown placeholder in template | Warning with list of valid placeholders |
| Workflow references non-existent template | Error with cross-reference details |
| Circular workflow dependencies | Detect and report circular references |
| Very long config file | Performance test (<2s for 1MB file) |
| Unicode in template content | Handle UTF-8 correctly |

### Performance Benchmarks

| Validation Type | Max Duration | Notes |
|-----------------|--------------|-------|
| Environment variables | <100ms | Local checks only |
| Client config schema | <200ms | JSON validation |
| Email templates | <500ms | Parse and validate all templates |
| Workflow templates | <500ms | Parse and validate dependencies |
| GHL API test | <3s | Including network roundtrip |
| Airtable API test | <3s | Including network roundtrip |
| **Full validation** | **<10s** | **Complete post-validation** |

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC1**: All 6 validation check categories are implemented and functional
- [ ] **AC2**: Pre-validation phase runs automatically before setup wizard starts
- [ ] **AC3**: Real-time validation provides feedback within 500ms of input
- [ ] **AC4**: Post-validation generates comprehensive report saved to client directory
- [ ] **AC5**: Validation correctly detects 95%+ of common configuration errors
- [ ] **AC6**: Console output uses colors and formatting for readability
- [ ] **AC7**: JSON output mode works correctly for CI/CD pipelines
- [ ] **AC8**: Integration with BLOOM-205 CLI wizard is seamless

### Error Handling

- [ ] **AC9**: Each validation failure includes specific error code
- [ ] **AC10**: Each error includes human-readable message
- [ ] **AC11**: Each error includes suggested remediation steps
- [ ] **AC12**: Critical errors block setup continuation
- [ ] **AC13**: Warnings allow setup continuation with acknowledgment

### Performance Requirements

- [ ] **AC14**: Full validation completes in under 10 seconds
- [ ] **AC15**: Real-time validation feedback within 500ms
- [ ] **AC16**: No memory leaks during repeated validation runs

### Testing Requirements

- [ ] **AC17**: Unit tests achieve >90% code coverage for validators
- [ ] **AC18**: Integration tests cover all API validation scenarios
- [ ] **AC19**: All edge cases from testing matrix are covered
- [ ] **AC20**: Tests run successfully in CI pipeline

### Documentation

- [ ] **AC21**: JSDoc comments for all public validator functions
- [ ] **AC22**: README update with validation feature documentation
- [ ] **AC23**: Error code reference guide created
- [ ] **AC24**: Example validation reports included in docs

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved by 2 team members
- [ ] All tests passing (unit + integration)
- [ ] Performance benchmarks verified
- [ ] Documentation complete
- [ ] BLOOM-205 integration tested in feature branch
- [ ] CHANGELOG.md updated with feature description
- [ ] No linting errors or warnings
- [ ] Security review completed (no credential logging)
- [ ] QA sign-off obtained

---

## Related Tasks

| Task | Relationship | Notes |
|------|--------------|-------|
| [BLOOM-205](BLOOM-205.md) | **Blocked By** | CLI wizard improvements |
| [BLOOM-207](BLOOM-207.md) | Related | Error recovery improvements |
| [BLOOM-208](BLOOM-208.md) | Related | Setup telemetry and metrics |

---

## Resources

### Internal Documentation
- [Onboarding Guide](../../../docs/ONBOARDING_GUIDE.md)
- [CLI Documentation](../../../scripts/sync-engine/README.md)
- [Setup Validator Source](../../../scripts/sync-engine/src/utils/setup-validator.js)

### External APIs
- [GHL API Documentation](https://highlevel.stoplight.io/docs/integrations/)
- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)

### Tools & Libraries
- [Joi](https://joi.dev/) - Schema validation
- [chalk](https://github.com/chalk/chalk) - Terminal styling (already in project)
- [cliui](https://github.com/yargs/cliui) - CLI layout (already in project)

---

## Notes

### Security Considerations
- Never log actual API keys or tokens
- Sanitize error messages before output
- Use `***` masking for sensitive values in reports

### Future Enhancements (Out of Scope)
- Webhook endpoint validation
- Custom field mapping validation
- Image asset availability check
- DNS record validation for custom domains

---

*Task created: 2026-02-21*
*Last updated: 2026-02-21*
*Author: @backend-lead*
