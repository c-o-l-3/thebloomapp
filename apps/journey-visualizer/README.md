# Journey Visualizer

A React Flow-based journey visualization tool for the Journey Builder Stack. This application provides a client-facing interface for reviewing and approving marketing automation journeys built for GoHighLevel CRM.

## Overview

This is the **Visualizer Layer** of the three-layer Headless CMS architecture:

1. **Database (Airtable)** - Structured database for journey data
2. **Visualizer (React Flow)** - Client-facing web app for journey visualization
3. **Sync Engine (Node.js)** - API bridge to GoHighLevel

## Features

### Journey Visualization
- Render journeys as interactive timelines using React Flow
- Custom nodes for each touchpoint type:
  - 📧 **Email** - Shows subject line preview and open rates
  - 💬 **SMS** - Shows message preview with character count
  - ⏱ **Wait** - Shows delay duration
  - ❓ **Condition** - Shows branching logic
  - ✓ **Task** - Shows task details and assignees
  - ⚡ **Trigger** - Shows trigger configuration
  - 📝 **Form** - Shows form details
  - 📞 **Call** - Shows call details
- Bezier curve edges with condition labels
- Zoom and pan controls with minimap

### Approval Workflow
- Status tracking: Draft → Client Review → Approved → Published
- Approval history with timestamps
- Comments required for rejections
- Version tracking

### Client Management
- Multi-client support with Maison Albion example data
- Client selector dropdown
- Per-client journey organization

## Project Structure

```
apps/journey-visualizer/
├── src/
│   ├── components/
│   │   ├── JourneyFlow.jsx      # Main React Flow canvas
│   │   ├── JourneyNode.jsx      # Custom node for touchpoints
│   │   ├── JourneyEdge.jsx      # Custom edge for transitions
│   │   ├── StatusBadge.jsx      # Status indicator
│   │   ├── ApprovalPanel.jsx    # Approval workflow UI
│   │   └── ClientSelector.jsx   # Client dropdown
│   ├── services/
│   │   ├── airtable.js         # Airtable API client
│   │   └── ghl.js              # GoHighLevel API client
│   ├── hooks/
│   │   ├── useJourneys.js      # Journey data hook
│   │   └── useApprovals.js     # Approval workflow hook
│   ├── types/
│   │   └── index.js            # TypeScript interfaces
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── package.json
├── vite.config.js
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd apps/journey-visualizer
npm install
```

### Environment Variables

Create a `.env` file with:

```env
VITE_AIRTABLE_API_KEY=your_airtable_api_key
VITE_AIRTABLE_BASE_ID=your_airtable_base_id
VITE_GHL_API_KEY=your_gohighlevel_api_key
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 to view the application.

### Production Build

```bash
npm run build
npm run preview
```

## Airtable Schema

The application expects the following tables in Airtable:

### Journeys Table
| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Journey name |
| Description | Long text | Journey description |
| Client | Link to Clients | Client relationship |
| Pipeline | Link to Pipelines | Pipeline relationship |
| Status | Single select | Draft, Client Review, Approved, Published, Rejected |
| Version | Number | Version number |

### Touchpoints Table
| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Touchpoint name |
| Type | Single select | Email, SMS, Wait, Condition, etc. |
| Journey | Link to Journeys | Journey relationship |
| Content | JSON | Touchpoint content/configuration |
| Order | Number | Display order |
| PositionX | Number | X position on canvas |
| PositionY | Number | Y position on canvas |

### Approvals Table
| Field | Type | Description |
|-------|------|-------------|
| Journey | Link to Journeys | Journey relationship |
| Status | Single select | Approval status |
| Comments | Long text | Review comments |
| Requested By | User | Who requested approval |
| Reviewed By | User | Who reviewed |
| Reviewed At | Date | When reviewed |
| Version | Number | Version being approved |

### Clients Table
| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Client name |
| Location ID | Single line text | GHL Location ID |

## Maison Albion Example

The application includes pre-configured data for Maison Albion with:
- **4 Pipelines**: Sales, Support, Onboarding, Retention
- **48 Workflows**: Including Welcome Series, Lead Nurture, Win-back, Appointment Reminder

## Status Badges

| Status | Color | Description |
|--------|-------|-------------|
| 🟡 Draft | Yellow | Work in progress |
| 🔵 Client Review | Blue | Awaiting client approval |
| 🟢 Approved | Green | Approved and ready for publish |
| ⚫ Published | Gray | Live and active |
| 🔴 Rejected | Red | Needs revision |

## Tech Stack

- **React 18** - UI framework
- **React Flow** - Flow visualization
- **Vite** - Build tool
- **Axios** - HTTP client
- **date-fns** - Date utilities

## Usage

### Selecting a Client
Use the client selector dropdown in the header to switch between clients.

### Viewing a Journey
Click on any journey in the sidebar to view its flow diagram.

### Approving a Journey
1. Navigate to a journey in "Client Review" status
2. Review the flow diagram
3. Add optional comments
4. Click "Approve" to approve or "Reject" with required feedback

### Requesting Review
For journeys in "Draft" status, click "Request Client Review" to submit for approval.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
