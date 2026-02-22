# Definition of Done (DoD)

> **Checklist for determining when work is complete**  
> **Applies to:** All features, bug fixes, and improvements  
> **Version:** 1.0  
> **Last Updated:** February 21, 2026

---

## Overview

The Definition of Done is a shared understanding of what it means for work to be complete. All items on this checklist must be satisfied before a feature or bug fix can be considered done.

---

## Universal DoD Checklist

### ✅ Functional Requirements

- [ ] **Requirement Met** - The implementation satisfies the acceptance criteria
- [ ] **No Regressions** - Existing functionality continues to work
- [ ] **Edge Cases Handled** - Boundary conditions and error scenarios are addressed
- [ ] **Feature Toggle** - New features use feature flags where appropriate (for gradual rollout)

### ✅ Code Quality

- [ ] **Code Review Approved** - At least one team member has reviewed and approved
- [ ] **Follows Style Guide** - Code follows project conventions (ESLint, Prettier)
- [ ] **Self-Reviewed** - Author has reviewed their own code before requesting review
- [ ] **No TODOs/FIXMEs** - No temporary comments left in production code
- [ ] **DRY Principle** - No unnecessary duplication of code

### ✅ Testing

- [ ] **Unit Tests** - Core logic has unit tests (minimum 80% coverage for new code)
- [ ] **Integration Tests** - API endpoints and integrations have tests
- [ ] **Tests Passing** - All tests pass locally and in CI
- [ ] **Manual Testing** - Feature tested in a realistic environment
- [ ] **Regression Testing** - Related areas tested to ensure no breakage

### ✅ Documentation

- [ ] **Code Comments** - Complex logic is explained with comments
- [ ] **README Updated** - Any setup or usage changes documented
- [ ] **API Documentation** - API changes reflected in docs
- [ ] **Changelog Updated** - Significant changes added to [CHANGELOG.md](../../CHANGELOG.md)
- [ ] **ADR Created** - Architectural decisions documented in [`pm/decisions/`](../../pm/decisions/)

### ✅ Security

- [ ] **Input Validation** - All user inputs are validated
- [ ] **Authentication Check** - Protected routes require authentication
- [ ] **Authorization Check** - Users can only access permitted resources
- [ ] **No Secrets in Code** - API keys, passwords not committed
- [ ] **SQL Injection Safe** - Database queries use parameterized statements
- [ ] **XSS Prevention** - User-generated content is properly escaped

### ✅ Performance

- [ ] **No N+1 Queries** - Database queries are optimized
- [ ] **Efficient Rendering** - No unnecessary re-renders in React components
- [ ] **Bundle Size** - No significant increase in bundle size without justification
- [ ] **Memory Leaks** - No memory leaks introduced (check with profiling tools)

### ✅ Deployment

- [ ] **Environment Variables** - New env vars documented in `.env.example`
- [ ] **Database Migrations** - Migrations are reversible and tested
- [ ] **Feature Flags** - New features behind flags where appropriate
- [ ] **Monitoring** - Key metrics and alerts configured
- [ ] **Rollback Plan** - Rollback procedure documented if risky

### ✅ UX/UI (for frontend changes)

- [ ] **Design Match** - Implementation matches approved designs
- [ ] **Responsive** - Works on desktop, tablet, and mobile
- [ ] **Accessibility** - Follows WCAG 2.1 AA standards
- [ ] **Browser Compatible** - Works in Chrome, Safari, Firefox, Edge
- [ ] **Error States** - Loading and error states are handled gracefully

---

## DoD by Work Type

### Feature Development

In addition to Universal DoD:

- [ ] **User Story Met** - Acceptance criteria from user story satisfied
- [ ] **Analytics** - Usage tracking implemented where applicable
- [ ] **Documentation** - User-facing documentation updated
- [ ] **Demo Ready** - Can be demonstrated in sprint review

### Bug Fixes

In addition to Universal DoD:

- [ ] **Root Cause Fixed** - Fix addresses root cause, not just symptom
- [ ] **Regression Test** - Test added to prevent recurrence
- [ ] **Edge Cases** - Related edge cases tested
- [ ] **Ticket Referenced** - Commit message references issue number

### Technical Debt / Refactoring

In addition to Universal DoD:

- [ ] **Functionality Preserved** - No change in external behavior
- [ ] **Metrics Improved** - Performance, maintainability, or readability improved
- [ ] **Tests Updated** - Existing tests updated for new structure
- [ ] **Documentation Updated** - Architecture docs updated if applicable

### Documentation

In addition to Universal DoD:

- [ ] **Accuracy** - Information is accurate and up-to-date
- [ ] **Completeness** - Covers all necessary aspects
- [ ] **Clarity** - Written clearly for target audience
- [ ] **Examples** - Includes practical examples where helpful
- [ ] **Links** - All internal and external links work

---

## DoD Verification Process

### Author Checklist (Before Creating PR)

```markdown
## DoD Checklist (Author)

- [ ] I've tested this locally
- [ ] I've reviewed my own code
- [ ] I've added/updated tests
- [ ] I've updated documentation
- [ ] I've checked for security issues
```

### Reviewer Checklist (During Code Review)

```markdown
## DoD Checklist (Reviewer)

- [ ] Code is clean and maintainable
- [ ] Tests are comprehensive
- [ ] Security concerns addressed
- [ ] Performance looks good
- [ ] Documentation is adequate
- [ ] Ready to merge
```

### QA Checklist (Before Deployment)

```markdown
## DoD Checklist (QA)

- [ ] Feature works as specified
- [ ] No critical bugs found
- [ ] Edge cases tested
- [ ] Cross-browser testing (if UI)
- [ ] Mobile responsive (if UI)
- [ ] Approved for deployment
```

---

## Exceptions

Exceptions to the DoD must be:

1. **Documented** - Note the exception in the PR description
2. **Justified** - Explain why the exception is necessary
3. **Approved** - Get approval from Tech Lead
4. **Temporary** - Create follow-up ticket if needed

Example:
> **DoD Exception:** Skipping E2E tests for this hotfix due to urgent production issue. Follow-up ticket BLOOM-999 created to add tests.

---

## Common DoD Anti-Patterns

❌ **"It works on my machine"** - Must work in staging/production too  
❌ **"I'll add tests later"** - Tests are part of the feature  
❌ **"The code is self-documenting"** - Complex logic needs comments  
❌ **"It's just a small change"** - Small changes need testing too  
❌ **"Docs can be updated after merge"** - Docs are part of the PR  

---

## DoD Evolution

This DoD is a living document. Propose changes by:

1. Opening a PR with proposed changes
2. Discussing in team retro
3. Getting consensus from Tech Lead and Product Lead

---

## Related Documents

- [Contributing Guide](../../CONTRIBUTING.md)
- [Code Review Guide](./code-review-guide.md)
- [Team Charter](./team-charter.md)

---

**Questions?** Ask in #dev-general or reach out to @tech-lead
