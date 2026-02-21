# Client Review Dashboard

This dashboard allows you to review the entire customer journey (Emails and SMS) and provide feedback.

## How to Use (For Clients)

1.  **Navigate**: Use the timeline on the left or the "Previous" / "Next" buttons to move through the sequence of messages.
2.  **Review**: See exactly how emails and text messages will appear to your customers.
3.  **Feedback**: Type your notes, changes, or approval in the **Feedback / Notes** box below the preview.
    -   Your notes are **automatically saved** to your browser's local storage, so you can close the page and come back later without losing work.
4.  **Export**: When you are finished, click the **Export Feedback** button in the top right corner.
    -   This will download a `.json` file containing all your notes.
5.  **Send**: Email this downloaded file back to us.

## For Developers

### Setup
1.  Install dependencies: `npm install`
2.  Generate data: `npm run generate` (aggregates latest emails and SMS templates)
3.  Start local server: `npm run dev`

### Deployment
To build a static version for hosting:
```bash
npm run build
```
The output will be in the `dist` folder.
