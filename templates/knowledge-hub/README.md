# Knowledge Hub Template

This directory contains template files for the BloomBuilder Knowledge Hub.

## Structure

```
knowledge-hub/
├── config.json                 # Hub configuration
├── golden-pages/              # Important website pages
│   └── index.json
├── documents/                 # Uploaded files
│   └── index.json
├── facts/                     # Structured fact database
│   └── index.json
├── brand-voice/              # Brand voice profile
│   └── profile.json
├── embeddings/               # Vector embeddings
│   └── index.json
├── verification/             # Fact verification
│   └── queue.json
└── sync-state/              # Sync tracking
    └── last-crawl.json
```

## Usage

1. Copy this directory to `clients/{client}/knowledge-hub/`
2. Update `config.json` with client-specific settings
3. Run the initial website crawl to populate golden-pages
4. Upload documents to the documents/uploads/ directory
5. Review and verify extracted facts in the verification queue

## Key Files

### config.json
- Hub settings (auto-extract, thresholds, models)
- Source configurations (website, documents, manual)
- Integration flags

### facts/index.json
- Structured facts with confidence scores
- Verification status tracking
- Source attribution

### brand-voice/profile.json
- Voice adjectives and personality
- Preferred and prohibited vocabulary
- Tone settings by journey stage

## Schemas

All JSON files reference schemas in `schemas/` directory for validation.
