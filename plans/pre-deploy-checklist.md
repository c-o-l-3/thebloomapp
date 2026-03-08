# Pre-Deploy Checklist — UX Overhaul Release

## Before Deploying

### Backend (journey-api)
- [ ] Run `npm test` in `apps/journey-api` — ensure no test failures
- [ ] Verify Prisma schema hasn't changed (no migration needed — this was a route-level fix)
- [ ] Test PUT `/api/touchpoints/:id` with a payload containing `journey`, `createdAt`, `updatedAt` fields — should be stripped
- [ ] Test PUT `/api/touchpoints/:id` with `content: null` — should default to `{}`

### Frontend (journey-visualizer)
- [ ] Run `npm run build` in `apps/journey-visualizer` — ensure no build errors
- [ ] Test login flow: `/login` → sign in → redirected to `/`
- [ ] Test Dashboard: click client card → should switch client and navigate to `/touchpoints`
- [ ] Test Touchpoints tab: journey selector dropdown works, filters work
- [ ] Test email touchpoint: click "Edit Email" → opens Visual Email Editor
- [ ] Test Visual Email Editor: edit subject, preview text, body → Save → no errors
- [ ] Test unsaved changes: edit something → click Back → should show confirmation
- [ ] Test global header: user avatar shows, Sign Out works
- [ ] Verify no console errors in browser dev tools during normal flow

### Smoke Test Flow
1. Login
2. Dashboard → click a client card
3. Touchpoints tab loads → select a journey from dropdown
4. Click "Edit Email" on an email touchpoint
5. Change the subject line
6. Click Save → should show "Saved" confirmation
7. Click "Back to Touchpoints" → should return to list
8. Verify the subject line updated in the touchpoint list

### Known Limitations
- Three editors still exist for email content (VisualEmailEditor, HTMLEditor, TouchpointEditor) — consolidation is a future task
- `navigate(-1)` still used in HTMLEditor back button (only VisualEmailEditor was fixed)
