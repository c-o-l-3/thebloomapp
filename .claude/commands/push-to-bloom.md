# Push Cameron Estate Emails to Bloom

Push the updated Cameron Estate email templates to Bloom (GoHighLevel) via the GHL V2 API.

## What this does

1. Syncs HTML files → individual JSON files (HTML is source of truth)
2. Syncs JSON files → manifest.json
3. Pushes all templates to GHL using correct API fields (`editorContent`, `editorType: "html"`, `subjectLine`)

## Run it

```bash
# Any client (recommended)
node apps/journey-api/scripts/ghl-push.js --client=cameron-estate
node apps/journey-api/scripts/ghl-push.js --client=maravilla-gardens

# Dry run (preview without pushing)
node apps/journey-api/scripts/ghl-push.js --client=cameron-estate --dry-run
```

Credentials load automatically from `clients/{client}/.env` or `apps/journey-api/.env`.

## Import templates from a new client

```bash
node apps/journey-api/scripts/ghl-import.js --client=maravilla-gardens
```

This fetches all templates from GHL and saves them to `clients/maravilla-gardens/ghl-imported-templates/`.

## Adding a new client

1. Get the **Location ID** and **Private Integration Token** from GHL > Settings > Private Integrations
2. Create `clients/{client}/.env`:
   ```
   GHL_API_KEY=pit-xxxx
   GHL_LOCATION_ID=xxxx
   ```
3. Run import: `node apps/journey-api/scripts/ghl-import.js --client={client}`
4. Edit the HTML files in `clients/{client}/ghl-imported-templates/`
5. Push: `node apps/journey-api/scripts/ghl-push.js --client={client}`

## Key lessons learned

- The GHL V2 API field for HTML content is `editorContent` (not `html`), paired with `editorType: "html"`
- The subject field is `subjectLine` (not `subject`)
- The export script reads from individual `*.json` files, not `manifest.json` — always sync HTML → JSON before pushing
- API returning 200 doesn't mean content updated — wrong field names are silently ignored

## Files

| Purpose | Path |
|---------|------|
| Push script (sync + export) | `clients/cameron-estate/email-factory/scripts/push-to-bloom.js` |
| GHL API service | `clients/cameron-estate/email-factory/src/services/ghl-email-templates-v2.js` |
| HTML templates (edit these) | `clients/cameron-estate/ghl-imported-templates/001_E_Day_*.html` |
| Full workflow doc | `clients/cameron-estate/docs/EMAIL_UPDATE_WORKFLOW.md` |
