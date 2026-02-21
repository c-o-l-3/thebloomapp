# Journey Visualizer Deployment Guide

## Zeabur Deployment

### Prerequisites

1. **Zeabur Account**: Sign up at [zeabur.com](https://zeabur.com)
2. **Airtable Base**: Ensure your Airtable base is set up with the correct schema
3. **Environment Variables**: Prepare the following:
   - `VITE_AIRTABLE_API_KEY` - Your Airtable API key
   - `VITE_AIRTABLE_BASE_ID` - Your Airtable base ID

### Deployment Steps

#### Option 1: Deploy via GitHub Integration

1. Push your code to GitHub
2. Connect your repository to Zeabur
3. Set environment variables in Zeabur dashboard
4. Deploy!

#### Option 2: Deploy via CLI

```bash
# Install Zeabur CLI
npm install -g zeabur

# Login
zeabur login

# Deploy
zeabur deploy
```

#### Option 3: Manual Docker Build

```bash
# Build the Docker image
cd apps/journey-visualizer
docker build -t journey-visualizer .

# Run locally to test
docker run -p 8080:80 \
  -e VITE_AIRTABLE_API_KEY=your_key \
  -e VITE_AIRTABLE_BASE_ID=your_base_id \
  journey-visualizer
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AIRTABLE_API_KEY` | Airtable Personal Access Token | Yes |
| `VITE_AIRTABLE_BASE_ID` | Airtable Base ID | Yes |
| `VITE_API_BASE_URL` | Optional API base URL | No |

### Airtable Schema

Ensure your Airtable base has these tables:
- **Clients** - Client information
- **Journeys** - Journey definitions
- **Touchpoints** - Individual touchpoints
- **Approvals** - Approval workflow
- **Versions** - Version history

See `docs/airtable-schema.md` for full schema details.

### Post-Deployment

1. **Verify Deployment**: Check the health endpoint at `/health`
2. **Configure Custom Domain** (optional): Set up in Zeabur dashboard
3. **Monitor Logs**: Use Zeabur dashboard to monitor application logs

### Troubleshooting

**Build fails**: 
- Check that all dependencies are in `package.json`
- Ensure Node.js version compatibility

**Runtime errors**:
- Verify environment variables are set correctly
- Check Airtable API key has correct permissions
- Ensure base ID is correct

**CORS issues**:
- Configure CORS in Airtable base settings
- Check `nginx.conf` proxy settings if using API routes

### Syncing Journeys

To sync local journey files to Airtable:

```bash
cd scripts/sync-engine
npm run sync:airtable -- --client=<client-slug>
```

For dry run (no changes):
```bash
npm run sync:airtable -- --client=<client-slug> --dry-run
```

For mock mode (no Airtable connection):
```bash
npm run sync:airtable -- --client=<client-slug> --mock
```
