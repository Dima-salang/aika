# ⏳ Aika — Time & Task Orchestration

Aika is a modern **Time & Task Orchestration Platform** built with **Next.js 16**, **tRPC**, **Drizzle ORM**, and **Better Auth**. It enables teams and individuals to seamlessly manage workspaces, organize tasks, and log hours for tracking time.

---

## 🗺️ Domain Model & Concepts

Aika is designed around a multi-tenant workspace architecture with a clear hierarchical structure:

*   **🏢 Organization**: The top-level tenant boundary. All users, teams, projects, and tasks exist within the scope of a specific Organization.
*   **👥 Team**: Nested sub-units within an Organization (e.g., *Engineering*, *Design*). Teams have designated leaders and members.
*   **💼 Workspace**: The active session context for a user, dynamically determined by their selected active Organization and active Team.
*   **👤 Personal View**: A teamless fallback context. Users without an active team log time and manage tasks individually in their Personal View.
*   **👑 Global Admin**: A system-wide role with full read and write access across all organizations, teams, and user profiles.
*   **📊 Reports**:
    *   **Personal Report**: A user-scoped view compiling personal time logs and task metrics.
    *   **Team Report**: An aggregated team-scoped view showing workload distribution and team time logs (accessible to Team Leaders & Admins).

---

## 🛠️ Tech Stack

Aika uses a modern, type-safe stack optimized for developer experience and performance:

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **API & State**: [tRPC (v11)](https://trpc.io/) & [TanStack React Query (v5)](https://tanstack.com/query)
*   **Authentication**: [Better Auth](https://www.better-auth.com/)
*   **Database**: [Drizzle ORM](https://orm.drizzle.team/) with SQLite / PostgreSQL support
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Base UI](https://base-ui.com/)
*   **Observability**: [Sentry Next.js SDK](https://sentry.io/)
*   **Package Manager & Runner**: [Bun](https://bun.sh/)

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router (pages, layouts, api/trpc, auth routes)
├── components/           # Reusable UI component library (shadcn, auth, dashboards)
├── db/                   # Database client configurations, schemas, and seeding
├── docs/                 # Documentation (ADRs, system design guides)
├── drizzle/              # Generated migrations and schemas
├── env/                  # Schema-validated environment variable setups
├── lib/                  # Auth clients, helper utility libraries, wrappers
├── server/               # tRPC routers, context initialization, and controllers
├── services/             # Core business logic / services layer
└── utils/                # General utility helper functions
```

---

## ⚙️ Development Setup

### 1. Prerequisites
Make sure you have [Bun](https://bun.sh/) installed:
```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Environment Variables
Clone the `.env.example` file (or update your local `.env`) and provide the required keys:

```ini
# Database configuration
DATABASE_URL="file:aika.db"

# Supabase configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

# Better Auth setup
BETTER_AUTH_SECRET="your-32-byte-secret"
BETTER_AUTH_URL="http://localhost:3020"

# Sentry Token (Optional)
SENTRY_AUTH_TOKEN="your-sentry-token"
```

### 3. Installation
Install project dependencies using Bun:
```bash
bun install
```

### 4. Database Setup & Migrations
Generate and push database changes:
```bash
# Push schema updates directly to database
bun x drizzle-kit push
```

### 5. Running the Application
Start the Next.js development server:
```bash
bun dev
```
Open [http://localhost:3000](http://localhost:3000) to view Aika.

---

## 🧪 Testing

Aika uses `bun test` for unit and integration testing.

Run the test suite:
```bash
bun test
```

Run tests in watch mode:
```bash
bun test --watch
```

---

## 🚀 Production Build & Deploy

Compile the production application:
```bash
bun run build
```

Start the compiled server:
```bash
bun start
```
