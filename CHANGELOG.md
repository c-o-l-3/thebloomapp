# Changelog

All notable changes to TheBloomApp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Journey Visualizer v2 with AI Assistant Panel for content generation
- Client Review Portal for stakeholder approval workflows
- Knowledge Hub integration with vector embeddings for brand voice
- Sync Engine with automated GHL data synchronization
- Comment system for collaborative journey editing
- Approval workflow system with status tracking
- Template Library with industry-specific journey templates
- Multi-client dashboard foundation

### Changed
- Refactored journey-api to use Prisma ORM with PostgreSQL
- Enhanced journey-visualizer UI with responsive design improvements
- Improved AI provider abstraction for multiple LLM support
- Updated sync-engine to support incremental sync operations

### Deprecated
- Legacy Airtable-based journey storage (migration in progress)
- Old client onboarding scripts (replaced by CLI onboarding)

### Removed
- N/A

### Fixed
- Journey edge rendering issues in Safari browsers
- Memory leak in AI Assistant Panel component
- Sync conflicts when multiple users edit simultaneously
- API rate limiting issues with GHL integration

### Security
- Implemented JWT token refresh mechanism
- Added API key rotation for GHL integrations
- Enhanced input validation on all API endpoints

## [1.0.0] - 2026-02-15

### Added
- **Journey Visualizer**: Interactive React-based journey mapping tool
  - Drag-and-drop journey node editor
  - Real-time collaboration features
  - Touchpoint editor with rich content support
  - Journey flow visualization with React Flow
  - Status badges and progress tracking
  
- **Journey API**: Express.js REST API for journey management
  - CRUD operations for journeys and touchpoints
  - Client management endpoints
  - Template management system
  - Workflow integration with GoHighLevel
  - PostgreSQL database with Prisma ORM
  
- **Sync Engine**: Automated synchronization service
  - GHL API integration for data sync
  - Email template synchronization
  - SMS template management
  - Workflow deployment pipeline
  - Brand voice analysis and extraction
  - Knowledge Hub with semantic search
  - AI-powered content generation
  
- **Client Management**:
  - Multi-tenant client architecture
  - Location-specific configurations
  - Pipeline and opportunity tracking
  - Calendar integration support
  
- **Templates**:
  - Standard client template structure
  - Knowledge Hub configuration templates
  - Email and SMS template generators
  - Workflow template library
  
- **Documentation**:
  - Comprehensive API documentation
  - Deployment guides
  - Technical specifications
  - Onboarding guides

### Changed
- N/A (Initial release)

### Deprecated
- N/A (Initial release)

### Removed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

### Security
- N/A (Initial release)

---

## Version History Legend

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Now removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements and vulnerabilities

## Release Process

1. Update version numbers in all package.json files
2. Update CHANGELOG.md with new version section
3. Create release branch: `release/vX.X.X`
4. Run full test suite
5. Deploy to staging environment
6. Conduct smoke tests
7. Merge to main branch
8. Tag release: `git tag -a vX.X.X -m "Release X.X.X"`
9. Deploy to production
10. Announce release to team
