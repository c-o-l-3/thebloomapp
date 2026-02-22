# Contributing to TheBloomApp

Thank you for your interest in contributing to TheBloomApp! This document provides guidelines and standards for contributing to the project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branch Naming Conventions](#branch-naming-conventions)
3. [Commit Message Format](#commit-message-format)
4. [Pull Request Process](#pull-request-process)
5. [Code Review Guidelines](#code-review-guidelines)
6. [Definition of Done](#definition-of-done)
7. [Testing Requirements](#testing-requirements)
8. [Development Workflow](#development-workflow)

---

## Getting Started

1. **Fork the repository** (if external contributor)
2. **Clone your fork**: `git clone https://github.com/your-username/TheBloomApp.git`
3. **Install dependencies**:
   ```bash
   npm install
   cd apps/journey-api && npm install
   cd apps/journey-visualizer && npm install
   cd scripts/sync-engine && npm install
   ```
4. **Set up environment**: Copy `.env.example` to `.env` and configure
5. **Run tests**: `npm test`

---

## Branch Naming Conventions

All branches must follow this naming convention:

```
<type>/<ticket-id>-<short-description>
```

### Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature` | New features or enhancements | `feature/BLOOM-123-add-email-templates` |
| `bugfix` | Non-urgent bug fixes | `bugfix/BLOOM-456-fix-sync-race-condition` |
| `hotfix` | Critical production fixes | `hotfix/BLOOM-789-fix-auth-bypass` |
| `docs` | Documentation changes | `docs/BLOOM-101-update-api-docs` |
| `refactor` | Code refactoring | `refactor/BLOOM-202-extract-sync-service` |
| `test` | Test additions/changes | `test/BLOOM-303-add-unit-tests` |

### Examples

```bash
# Good branch names
git checkout -b feature/BLOOM-456-add-knowledge-hub
git checkout -b bugfix/BLOOM-789-fix-journey-rendering
git checkout -b hotfix/BLOOM-001-fix-security-vulnerability

# Bad branch names
git checkout -b my-feature        # Missing type and ticket
git checkout -b fix-bug           # Too vague, no ticket
git checkout -b feature_new_stuff # Uses underscore, no ticket
```

---

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, semicolons, etc) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Changes to build process or auxiliary tools |
| `ci` | Changes to CI configuration |

### Scopes

Common scopes for TheBloomApp:

- `api` - Journey API changes
- `visualizer` - Journey Visualizer changes
- `sync` - Sync Engine changes
- `kb` - Knowledge Hub changes
- `auth` - Authentication/authorization
- `db` - Database changes
- `ghl` - GoHighLevel integration
- `docs` - Documentation

### Examples

```bash
# Good commit messages
git commit -m "feat(visualizer): add AI assistant panel for content generation"
git commit -m "fix(sync): resolve race condition in GHL webhook handler"
git commit -m "docs(api): update journey endpoints documentation"
git commit -m "refactor(kb): extract vector search into separate service"

# Detailed commit with body
git commit -m "feat(api): add bulk journey import endpoint

- Added POST /api/journeys/bulk endpoint
- Supports CSV and JSON import formats
- Validates journey structure before import
- Returns detailed error report for failed imports

Closes BLOOM-456"

# Bad commit messages
git commit -m "fix stuff"                    # Too vague
git commit -m "updated files"                # No type or scope
git commit -m "FEAT: New Feature"            # Wrong case for type
```

---

## Pull Request Process

### Creating a Pull Request

1. **Ensure your branch is up to date**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run the full test suite**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

3. **Push your branch**:
   ```bash
   git push origin feature/BLOOM-123-your-feature
   ```

4. **Create PR on GitHub** using the provided template

### PR Template Requirements

Your PR description must include:

- **Summary**: What changes are being made?
- **Ticket**: Link to related ticket (e.g., `Closes BLOOM-123`)
- **Type of Change**: Bug fix, feature, breaking change, etc.
- **Testing**: How was this tested?
- **Screenshots**: For UI changes
- **Checklist**: All items must be checked

### PR Title Format

```
[<type>][<scope>] <description>
```

Example: `[feat][visualizer] Add AI assistant panel for content generation`

---

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized (< 500 lines when possible)
- Respond to all review comments within 24 hours
- Request re-review after addressing feedback
- Be open to feedback and suggestions

### For Reviewers

- Review within 24 hours of PR submission
- Use "Request Changes" for blocking issues
- Use "Comment" for suggestions/discussion
- Use "Approve" when satisfied
- Be constructive and respectful in feedback

### Review Checklist

- [ ] Code follows project style guidelines
- [ ] Changes are well-tested
- [ ] Documentation is updated
- [ ] No console.log statements left in code
- [ ] No sensitive data exposed
- [ ] Error handling is appropriate
- [ ] Performance implications considered

---

## Definition of Done

A feature or bug fix is considered "Done" when ALL of the following criteria are met:

### Functional Requirements

- [ ] Code implements the requirement as specified
- [ ] Feature works in the target environment (staging)
- [ ] No critical or high bugs related to the feature
- [ ] Edge cases are handled appropriately

### Quality Requirements

- [ ] Code has been reviewed and approved by at least 1 team member
- [ ] All automated tests pass (unit, integration, e2e)
- [ ] New code has adequate test coverage (>80%)
- [ ] No linting errors or warnings
- [ ] TypeScript types are correctly defined

### Documentation Requirements

- [ ] Code comments added for complex logic
- [ ] API documentation updated (if applicable)
- [ ] README updated (if applicable)
- [ ] Changelog updated with change description

### Deployment Requirements

- [ ] Feature is merged to main branch
- [ ] Migration scripts tested (if applicable)
- [ ] Feature is deployed to staging
- [ ] Smoke tests pass in staging
- [ ] Monitoring/alerts configured (if applicable)

---

## Testing Requirements

### Unit Tests

- Required for all utility functions
- Required for service layer logic
- Use Jest for JavaScript/TypeScript
- Naming: `<module>.test.js` or `<module>.spec.js`

### Integration Tests

- Required for API endpoints
- Required for database operations
- Required for external service integrations
- Use Supertest for API testing

### E2E Tests

- Required for critical user flows
- Journey creation flow
- Sync workflow
- Client onboarding flow
- Use Cypress or Playwright

### Test Coverage Requirements

| Component | Minimum Coverage |
|-----------|-----------------|
| journey-api | 80% |
| journey-visualizer | 70% |
| sync-engine | 75% |
| Shared utilities | 85% |

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific app
cd apps/journey-api && npm test
cd apps/journey-visualizer && npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

---

## Development Workflow

### Daily Workflow

1. **Start of Day**:
   - Pull latest changes: `git pull origin main`
   - Check sprint board for assigned tasks
   - Update task status in project management tool

2. **During Development**:
   - Create feature branch from main
   - Make small, focused commits
   - Push branch regularly for backup
   - Run tests before committing

3. **End of Day**:
   - Push all local changes
   - Update task progress
   - Comment on any blockers

### Sprint Workflow

| Week | Activities |
|------|------------|
| Week 1 | Sprint planning, begin feature development |
| Week 2 | Continue development, mid-sprint check-in |
| Week 3 | Complete features, begin testing |
| Week 4 | Bug fixes, documentation, sprint review |

### Release Workflow

1. Create release branch: `git checkout -b release/v1.2.3`
2. Update version numbers in package.json files
3. Update CHANGELOG.md
4. Run full test suite
5. Deploy to staging
6. Conduct smoke tests
7. Create PR to main
8. Merge and tag release
9. Deploy to production

---

## Questions?

If you have questions about contributing:

- Check the [docs/](docs/) folder for detailed guides
- Ask in the #dev Slack channel
- Open a GitHub discussion

---

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints and experiences

---

Thank you for contributing to TheBloomApp! 🌸
