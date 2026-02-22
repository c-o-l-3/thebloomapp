# Code Review Guide

> **Standards and best practices for reviewing code at TheBloomApp**  
> **Version:** 1.0  
> **Last Updated:** February 21, 2026

---

## Purpose

Code reviews ensure code quality, share knowledge, and maintain consistency across the codebase. This guide helps reviewers provide effective feedback and authors respond constructively.

---

## Review Principles

### For Reviewers

1. **Review within 24 hours** - Don't block teammates
2. **Be constructive** - Suggest improvements, don't just criticize
3. **Ask questions** - Seek to understand before judging
4. **Praise good work** - Highlight what was done well
5. **Focus on the code, not the person** - Use "what" not "you"

### For Authors

1. **Keep PRs small** - Easier to review, faster to merge
2. **Provide context** - Explain the "why" not just the "what"
3. **Respond promptly** - Address feedback within 24 hours
4. **Be open** - Feedback is about the code, not you
5. **Request specific reviewers** - When domain expertise is needed

---

## Review Checklist

### Before You Start Reviewing

- [ ] Read the PR description and linked issues
- [ ] Understand the context and requirements
- [ ] Check if this is a hotfix (may need expedited review)

### During Review

#### Code Quality

- [ ] **Code is readable** - Can you understand it without extensive context?
- [ ] **Naming is clear** - Variables, functions, classes have descriptive names
- [ ] **Functions are focused** - Single responsibility principle
- [ ] **No code duplication** - DRY principle followed
- [ ] **Comments are helpful** - Explain why, not what
- [ ] **Error handling** - Edge cases and errors are handled

#### Testing

- [ ] **Tests exist** - New features have tests
- [ ] **Tests are meaningful** - They verify actual behavior
- [ ] **Edge cases covered** - Boundary conditions tested
- [ ] **Test quality** - Tests are readable and maintainable

#### Security

- [ ] **Input validation** - User inputs are sanitized
- [ ] **No secrets** - No API keys or passwords in code
- [ ] **Authorization** - Access controls in place
- [ ] **Injection prevention** - SQL, XSS, etc. prevented

#### Performance

- [ ] **No N+1 queries** - Database queries are efficient
- [ ] **No memory leaks** - Resources properly managed
- [ ] **Bundle size** - No unnecessary dependencies
- [ ] **Async/await** - Proper handling of async operations

#### Architecture

- [ ] **Consistent patterns** - Follows existing conventions
- [ ] **Separation of concerns** - Components have clear responsibilities
- [ ] **Appropriate abstractions** - Not over-engineered
- [ ] **Backwards compatible** - Or migration path documented

### After Review

- [ ] **Summary comment** - Provide overall feedback
- [ ] **Action clear** - Approve, request changes, or comment
- [ ] **Follow up** - Check if author needs clarification

---

## Review Comment Types

### 🔴 **Blocking (Request Changes)**

Issues that must be fixed before merge:

- Security vulnerabilities
- Breaking changes without documentation
- Missing critical tests
- Performance regressions
- Code that doesn't meet acceptance criteria

**Example:**
```
🔴 **Security:** This query is vulnerable to SQL injection. 
Please use parameterized queries.

See: https://example.com/sql-injection-prevention
```

### 🟡 **Suggestion (Non-blocking)**

Improvements that would be nice but aren't required:

- Refactoring suggestions
- Alternative implementations
- Naming improvements
- Style preferences

**Example:**
```
🟡 **Suggestion:** Consider extracting this into a separate 
function for better testability.

Not blocking, but would improve the code.
```

### 🟢 **Praise (Positive Feedback)**

Highlight what was done well:

- Clean solution to a complex problem
- Good test coverage
- Helpful comments
- Clever optimizations

**Example:**
```
🟢 **Great work!** I like how you handled the edge case here. 
The error message is very user-friendly.
```

### 🔵 **Question (Seeking Understanding)**

Ask for clarification:

- Understanding the approach
- Why a certain decision was made
- How something works

**Example:**
```
🔵 **Question:** Why did you choose to use a Set here instead 
of an array? Just curious about the reasoning.
```

---

## Review Approaches by Change Type

### New Features

**Focus areas:**
- Does it meet acceptance criteria?
- Are tests comprehensive?
- Is documentation updated?
- Are there appropriate feature flags?

### Bug Fixes

**Focus areas:**
- Does it fix the root cause?
- Is there a regression test?
- Are edge cases handled?
- Is the fix minimal and focused?

### Refactoring

**Focus areas:**
- Is functionality preserved?
- Are tests updated?
- Is the new structure clearer?
- No accidental behavior changes?

### Configuration/Infra Changes

**Focus areas:**
- Are environment variables documented?
- Is rollback possible?
- Are monitoring/alerting configured?
- Security implications considered?

---

## Language-Specific Guidelines

### JavaScript/TypeScript

- Prefer `const` over `let` when not reassigning
- Use async/await over raw promises
- Destructure props and state in React components
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid `any` type in TypeScript

### React

- Keep components small and focused
- Use custom hooks for reusable logic
- Prefer functional components with hooks
- Memoize expensive calculations
- Use proper key props in lists

### Node.js/Express

- Use middleware for cross-cutting concerns
- Validate request bodies with schemas
- Return consistent error responses
- Use environment variables for configuration
- Handle async errors properly

### SQL/Prisma

- Use transactions for multi-step operations
- Add indexes for frequently queried columns
- Avoid SELECT * in production queries
- Use migrations for schema changes
- Document complex queries

---

## Review Etiquette

### Do

- ✅ Be specific in feedback
- ✅ Suggest alternatives, don't just point out problems
- ✅ Learn from the code you're reviewing
- ✅ Respond to reviews within 24 hours
- ✅ Say thank you for reviews
- ✅ Approve when satisfied

### Don't

- ❌ Use aggressive or dismissive language
- ❌ Block PRs for subjective style preferences
- ❌ Review when you're too busy to be thorough
- ❌ Forget to run tests locally if CI is failing
- ❌ Approve without actually reviewing

---

## Handling Disagreements

### When Author and Reviewer Disagree

1. **Discuss in PR comments** - Keep it technical
2. **Move to synchronous chat** - If async isn't resolving it
3. **Involve a third party** - Ask another team member
4. **Escalate to Tech Lead** - If still unresolved
5. **Document the decision** - Especially if going against review

### Remember

- There's rarely one "right" way
- Consistency with codebase matters
- Ship working code over perfect code
- You can always refactor later

---

## Review Tools

### GitHub Features We Use

- **Request Changes** - For blocking issues
- **Approve** - When satisfied
- **Comment** - For questions or non-blocking suggestions
- **Suggested Changes** - For small, specific fixes
- **Review Threads** - For discussion on specific lines

### Local Tools

- **ESLint/Prettier** - Automated style checking
- **TypeScript** - Type checking
- **Jest** - Test running
- **React DevTools** - Component inspection

---

## Metrics

We track (but don't optimize for):

- **Time to first review** - Target: < 4 hours
- **Time to merge** - Target: < 24 hours for small PRs
- **Review rounds** - Target: < 3 rounds
- **Approval rate** - Should be high (>90%)

---

## Examples

### Good Review Comment

```
🟡 **Suggestion:** The variable name `data` is quite generic. 
Would `journeyConfiguration` be more descriptive here?

Also, consider extracting the filtering logic into a helper 
function since it's used in multiple places.

See line 45-52 in `JourneyFlow.jsx`.
```

### Good PR Description

```markdown
## Summary
Add real-time collaboration to Journey Visualizer using 
WebSockets for multi-user editing.

## Changes
- Added WebSocket server for real-time sync
- Implemented operational transforms for conflict resolution
- Added user presence indicators
- Added cursor position sharing

## Testing
- Tested with 5 concurrent users
- Verified conflict resolution with simultaneous edits
- Added unit tests for OT algorithm

## Screenshots
[Attached GIF showing collaboration]

## Related
Closes BLOOM-456
```

---

## Resources

- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/)
- [GitHub Code Review Docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests)
- [Team Charter](./team-charter.md)
- [Definition of Done](./definition-of-done.md)

---

**Questions?** Ask in #dev-general or discuss in team retro
