# Entflow — Visual Workflow Map for HubSpot

Visual dependency map for HubSpot automations. See how your workflows connect. Find conflicts before they break.

## What This Does

Connects to your HubSpot portal via OAuth, pulls every automation workflow, parses the enrollment criteria and action steps, and renders an interactive visual graph showing how workflows depend on each other.

**Key features:**
- Interactive node graph (React Flow) showing all workflows and their dependencies
- Property-level dependency tracking (which workflows read/write each property)
- Conflict detection (property write collisions, circular dependencies, inactive references)
- Search and filter by status, object type, dependency type, or property name
- Export to PNG, PDF, and CSV

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (React), Tailwind CSS, React Flow |
| Backend | Next.js API Routes (Node.js) |
| Database | PostgreSQL (Supabase or Neon) |
| ORM | Prisma |
| Auth | HubSpot OAuth |
| Hosting | Vercel |

## Project Structure

```
src/
├── app/                        # Next.js app router
│   ├── api/                    # API routes
│   │   ├── auth/hubspot/       # OAuth initiation
│   │   ├── auth/callback/      # OAuth callback handler
│   │   ├── sync/               # Trigger and check sync status
│   │   ├── graph/              # React Flow graph data
│   │   ├── workflows/          # Workflow list and details
│   │   ├── conflicts/          # Detected conflicts
│   │   └── properties/         # Property index
│   ├── map/                    # Map page (main view)
│   ├── dashboard/              # Dashboard page
│   ├── conflicts/              # Conflicts page
│   ├── properties/             # Properties index page
│   └── settings/               # Settings page
├── components/
│   └── map/
│       ├── WorkflowMap.tsx     # Main map canvas with React Flow
│       ├── WorkflowNode.tsx    # Custom node component
│       ├── FilterSidebar.tsx   # Filter controls
│       └── WorkflowDetailPanel.tsx  # Side panel for workflow details
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── encryption.ts           # AES-256-GCM for token storage
│   ├── hubspot.ts              # HubSpot API client (OAuth + API calls)
│   ├── parser.ts               # ⭐ Workflow parser (core logic)
│   ├── conflicts.ts            # Conflict detection engine
│   ├── sync.ts                 # Sync orchestrator
│   └── graph.ts                # Graph layout engine
├── types/
│   └── index.ts                # TypeScript types
└── prisma/
    └── schema.prisma           # Database schema
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- A HubSpot developer account (free at https://developers.hubspot.com)
- A PostgreSQL database (Supabase free tier or Neon free tier)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd workflow-mapper
npm install
```

### 2. Set up the database

Create a Supabase or Neon project, then copy the connection string.

### 3. Register a HubSpot app

1. Go to https://developers.hubspot.com and create a developer account
2. Create a new app
3. Under "Auth" tab:
   - Add redirect URL: `http://localhost:3000/api/auth/callback`
   - Required scopes: `automation`, `crm.objects.contacts.read`, `crm.schemas.contacts.read`
   - Optional scopes: `crm.objects.deals.read`, `crm.objects.companies.read`
4. Copy the Client ID and Client Secret

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:
- `DATABASE_URL` - your PostgreSQL connection string
- `HUBSPOT_CLIENT_ID` - from your HubSpot app
- `HUBSPOT_CLIENT_SECRET` - from your HubSpot app
- `HUBSPOT_REDIRECT_URI` - `http://localhost:3000/api/auth/callback`
- `TOKEN_ENCRYPTION_KEY` - generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 5. Initialize the database

```bash
npx prisma db push
npx prisma generate
```

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` and click "Connect HubSpot" to start.

## Core Architecture

### The Parser (`src/lib/parser.ts`)

This is the brain of the app. It runs in two passes:

**Pass 1 - Parse:** Iterates through each workflow and extracts:
- Properties read (from enrollment criteria and branch conditions)
- Properties written (from SET_PROPERTY, COPY_PROPERTY, CLEAR_PROPERTY actions)
- Cross-enrollments (ENROLL_IN_WORKFLOW actions)
- List references (enrollment criteria and ADD_TO_LIST/REMOVE_FROM_LIST actions)
- Email sends (SEND_EMAIL actions)
- Webhooks and delays

**Pass 2 - Graph:** Compares all parsed workflows against each other to generate dependency edges:
- Writer→Reader property dependencies
- Cross-enrollment chains
- Shared list references
- Email overlaps

### Conflict Detection (`src/lib/conflicts.ts`)

Five detection rules:
1. **Property Write Collision** (CRITICAL) - Multiple active workflows writing to the same property
2. **Circular Dependency** (CRITICAL) - Workflow A enrolls into B, B enrolls into A
3. **Inactive Reference** (WARNING) - Active workflow enrolls into an inactive one
4. **Email Overlap** (WARNING) - Multiple workflows sending the same email
5. **Orphaned Enrollment** (WARNING) - Enrollment into a deleted/missing workflow

### Sync Engine (`src/lib/sync.ts`)

Orchestrates: fetch from HubSpot → parse → detect conflicts → store in DB. Runs on manual trigger and optionally on a schedule.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/hubspot` | GET | Start OAuth flow |
| `/api/auth/callback` | GET | OAuth callback |
| `/api/sync` | POST | Trigger manual sync |
| `/api/sync` | GET | Check sync status |
| `/api/graph` | GET | React Flow graph data |
| `/api/workflows` | GET | Workflow list/detail |
| `/api/conflicts` | GET | Detected conflicts |
| `/api/properties` | GET | Property index |

## Next Steps (after MVP)

See the build plan document for the full roadmap. Priority additions:
1. Export functionality (PNG, PDF, CSV)
2. Dashboard page with stats
3. Stripe billing integration
4. Landing/marketing page
5. HubSpot Marketplace listing
