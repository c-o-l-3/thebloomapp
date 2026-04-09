# Push Cameron Estate Emails to Bloom

Push the updated Cameron Estate email templates to Bloom (GoHighLevel) via the GHL V2 API.

## What this does

1. Syncs HTML files → individual JSON files (HTML is source of truth)
2. Syncs JSON files → manifest.json
3. Pushes all templates to GHL using correct API fields (`editorContent`, `editorType: "html"`, `subjectLine`)

## Run it

```bash
cd clients/cameron-estate/email-factory && node scripts/push-to-bloom.js
```

Credentials are auto-loaded from `apps/journey-api/.env` — no need to pass them manually.

To preview without pushing:
```bash
cd clients/cameron-estate/email-factory && node scripts/push-to-bloom.js --dry-run
```

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
