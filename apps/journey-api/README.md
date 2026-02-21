# Journey API

REST API for the Journey Builder platform, powered by PostgreSQL and Prisma ORM.

## Quick Start

### 1. Start PostgreSQL

```bash
# From project root
docker-compose up -d postgres redis
```

### 2. Install Dependencies

```bash
cd apps/journey-api
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start the API Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Health
- `GET /health` - Health check

### Authentication
- `POST /api/auth/login` - Login with email
- `GET /api/auth/me` - Get current user

### Clients
- `GET /api/clients` - List clients
- `GET /api/clients/:slug` - Get client by slug
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/:id/stats` - Get client statistics

### Journeys
- `GET /api/journeys` - List journeys
- `GET /api/journeys/:id` - Get journey with touchpoints
- `POST /api/journeys` - Create journey
- `PUT /api/journeys/:id` - Update journey
- `PUT /api/journeys/:id/status` - Update journey status
- `POST /api/journeys/:id/duplicate` - Duplicate journey
- `DELETE /api/journeys/:id` - Delete journey
- `GET /api/journeys/:id/versions` - List journey versions
- `POST /api/journeys/:id/versions` - Create new version

### Touchpoints
- `GET /api/touchpoints` - List touchpoints
- `GET /api/touchpoints/:id` - Get touchpoint
- `POST /api/touchpoints` - Create touchpoint
- `PUT /api/touchpoints/:id` - Update touchpoint
- `PUT /api/touchpoints/reorder` - Bulk reorder touchpoints
- `DELETE /api/touchpoints/:id` - Delete touchpoint

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `POST /api/templates/:id/sync-to-ghl` - Sync template to GHL
- `DELETE /api/templates/:id` - Delete template

### Workflows
- `GET /api/workflows` - List workflows
- `GET /api/workflows/:id` - Get workflow
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

## Database Schema

See `prisma/schema.prisma` for the complete schema definition.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with sample data

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | API server port | 3001 |
| `JWT_SECRET` | Secret for JWT signing | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |
| `AIRTABLE_API_KEY` | For migration only | - |
| `AIRTABLE_BASE_ID` | Airtable base ID | - |