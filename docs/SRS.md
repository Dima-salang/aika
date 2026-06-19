---

# 📘 SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

# Aika

Version: 0.1.0

---

# 1. Introduction

## 1.1 Purpose

This document specifies the functional and non-functional requirements for a web-based task management and time logging system designed primarily for internship/workforce tracking, while supporting generalized team-based workflows.

The system enables users to manage tasks, log working hours, attach evidence, and allow supervisors to monitor progress across teams.

---

## 1.2 Scope

The system is a **pure web application** supporting:

- Task management (Kanban + backlog)
- Time tracking (manual + timer-based)
- Document Evidence-based logging
- Team-based role management
- Reporting and exports
- Audit logging

The system supports 50–100 concurrent users and is optimized for fast delivery.

---

## 1.3 Definitions

- **User**: Authenticated individual in the system
- **Team**: Group of users collaborating
- **Role**: Permission level per team (Admin, Leader, Member)
- **Task**: Work item owned by a user
- **Project**: Grouping of tasks with metadata
- **Time Log**: Record of time spent on tasks
- **Document Evidence**: Uploaded file attached to a time log
- **Audit Log**: System-generated record of critical actions

---

# 2. Overall System Description

## 2.1 System Architecture

- Frontend: Next.js (SPA + SSR hybrid)
- Backend: Next.js API routes
- Database: Supabase (PostgreSQL)
- File Storage: Cloudinary (images) / Supabase Object Storage (documents)
- Auth: Better Auth (with Google & GitHub OAuth)
- Deployment: Vercel
- Tanstack Query + TRPC
- Drizzle ORM
- Shadcn

---

## 2.2 System Modes

- Fully online system (no offline mode)
- SPA behavior within team context
- Full reload on team switching

---

# 3. System Features & Functional Requirements

---

# 3.1 Authentication & Session Management

### FR-1 User Authentication

- Users shall be able to log in and log out securely.

### FR-2 Session Behavior

- Upon login, users shall be redirected to their **last active team**.
- If no team exists, system defaults to personal workspace.

### FR-3 Role Context

- Users may have different roles per team:
    - Leader (team-level management)
    - Member (standard user)
- Admin has complete management control

---

# 3.2 Organization & Team Management

### FR-4 Organization Creation (Top-Level Multi-Tenancy)
- Mapped natively to Better Auth Organizations.
- Admins can create and delete Organizations.
- Supports organization-scoped membership (`Admin` or `Member` role context).

### FR-5 Nested Teams (Sub-Tenant level)
- An Organization contains multiple Teams.
- Users can create, view, and belong to multiple Teams inside their active Organization.

### FR-6 Invitation & Onboarding Flows
- **Outbound Invitations**: Admins or managers can generate invitation links (email/in-app) powered natively by Better Auth's invitation plugin. Recipient accepts or declines. Upon accepting, they join the Organization.
- **Inbound Magic Links (Join Requests)**: Admins or Team Leaders can generate cryptographically secure join tokens. Visiting users register or log in, then request to join the organization. Organization admins/owners can approve or reject these pending requests in the admin panel. Approved requests automatically enroll the user into the organization (and specified team).

### FR-7 Organization and Team Switching
- Switching active Organizations or active Teams triggers a **full page reload** to refresh the Drizzle and Better Auth environment contexts.
- Switching tabs within a team context preserves state (no reload).

---

# 3.3 Project Management

### FR-8 Project Creation

Projects contain:

- Name
- Description
- Start date
- End date

### FR-9 Project Scope

- Tasks may optionally belong to **one project**
- Tasks cannot span multiple projects
- Tasks may also exist without any project association

---

# 3.4 Task Management System

### FR-10 Task Definition

Tasks are work items with:

- Title
- Description
- Status (Todo, In Progress, Done)
- Due date (optional)
- Priority (optional)
- Project association (optional)

### FR-11 Task Lifecycle

- Tasks may be created, updated, deleted
- Tasks are owned by a single user

### FR-12 Task Views

- Kanban board (drag & drop)
- Backlog / list view

### FR-13 Task Flexibility

- Tasks may exist without being assigned to Kanban (backlog state)

---

# 3.5 Time Logging System

### FR-14 Time Log Structure

Each time log contains:

- Start time
- End time
- Description
- Linked task(s)
- Document Evidence (optional)
- Timestamp metadata

Note: Duration is always computed from end time minus start time. It is never stored as a separate field.

---

### FR-15 Task ↔ Log Relationship

- A task may be linked to **multiple logs**

---

### FR-16 Timer System

- Only one active timer per user
- Timer is persisted in backend
- Timer resumes via stored state after full page reload (including team switching)
- Duration is computed from backend timestamps
- Timer is user-scoped, not team-scoped
- Timer continues running when user switches teams (full page reload does NOT stop the timer)
- After reload, the running timer is restored from backend state and displayed on the current page

### FR-16.1 Local Draft Retention
- The system shall automatically save the state of a time log form (title, description, project, tasks, files, times) client-side when the creation/editing dialog is closed, allowing users to resume later.
- Draft state is persisted across page reloads and context switches using a Zustand-based client-side store.

---

### FR-17 Overlap Prevention

- Time logs must NOT overlap existing logs
- If overlap occurs:
    - Save is fully blocked
    - UI displays validation error

---

### FR-18 Log Editing Rules

- Logs may be edited at any time
- Logs may be deleted
- No approval workflow exists

---

# 3.6 Document Evidence Management System

### FR-19 Document Evidence Option

- Document Evidence files are optional for time logs.

---

### FR-20 Document Evidence Constraints

- Max file size: 10MB
- Supported formats: images, PDFs, standard office documents (Word, Excel, PowerPoint), text files, and zip archives

---

### FR-21 Document Evidence Storage Rules

- Images stored in Cloudinary; non-image documents stored in Supabase Object Storage
- Files organized by organization and user under the `evidences` bucket
- Document Evidence cannot be reused across logs
- The system shall support parallel uploading of multiple evidence files up to the file size limit.
- The system shall support deleting multiple files in a single batch to minimize network requests.

---

# 3.7 Dashboard System

---

## 3.7.1 Member Dashboard

### FR-23 Member Home

Displays:

- Active tasks
- Recent logs
- Projects overview
- Time logging controls

---

### FR-24 Member Analytics

Includes:

- Total hours
- Weekly hours
- Activity heatmap
- Task counts
- Project distribution

---

## 3.7.2 Leader Dashboard

### FR-25 Leader Overview

Displays:

- Team members
- Individual progress
- Team activity summaries

---

### FR-26 Leader Analytics

Includes:

- Team hours
- Task distribution
- Activity heatmaps
- Project-level breakdowns

---

## 3.7.3 Admin Dashboard

### FR-27 Admin Controls

Admins can:

- Manage teams
- Manage users
- Assign roles
- Configure system settings

Admin cannot modify audit logs.

---

# 3.8 Reporting System

### FR-28 Report Generation

- Reports are generated on demand (pre-generated at request time)

---

### FR-29 Export Formats

- CSV
- PDF

---

### FR-30 Report Scope

- Reports are **team-specific only** — users select one team to generate a report for
- Members can generate personal reports (their own data, across all teams they belong to)
- Leaders can generate team reports (aggregated data for a specific team they lead)
- Admins can generate reports for any team
- No cross-team aggregated reports
- Users can select custom date ranges

---

### FR-31 Report Types

- Weekly time reports
- Monthly summaries
- Project time distribution
- Workload distribution

---

# 3.9 Notification System

### FR-32 Notification Types

- In-app notifications only (V1)

Out of scope for V1:

- Email notifications (future expansion)

---

### FR-33 Notification Events

- Task updates
- Time log events
- System activity alerts
- Team Invitation
- Team switch

---

# 3.10 Audit Logging System

### FR-34 Audit Events (Mandatory)

The system shall log the following mutation events only (reads/page views are NOT logged):

- Login/logout events
- Task creation/update/deletion
- Time log creation/modification/deletion
- Team creation/deletion/changes
- Role assignments/changes
- Profile updates
- User deactivation (admin)
- Document Evidence uploads/deletions

---

### FR-35 Audit Restrictions

- Audit logs are immutable
- Admin cannot modify audit logs
- Only Admins can view audit logs
- Leaders see team activity via their dashboard (not raw audit trails)
- Members see personal activity via their own dashboard/history

---

# 3.11 Third-Party Integrations

### FR-36 Notion Integration
- Users shall be able to connect their Notion workspace using OAuth.
- Once connected, Aika will create the Aika Time Logs database inside the Aika Workspace page in the root workspace of the user.
- Aika will sync the logs from the dashboard to the database, and the user can view the logs in the Notion database.
- Users can disconnect Notion at any time via a confirmation modal.

---

# 3.12 Import & Export Capabilities

### FR-37 Excel Import & Exporting
- The system shall support importing time log and task records from formatted Excel worksheets.
- Imported data is parsed, validated, and appended to the user's active logs.
- The system shall support exporting personal or team reports to standard Excel and CSV formats.

---

# 3.13 Rich Content & Formatting

### FR-38 Markdown Support & Rich Text Editor (Lexical)
- The time log description and task comments/notes shall support rendering of standard Markdown.
- Editing text fields (like log descriptions) shall use a rich text editor built on Lexical.
- Lexical editor features include headers (H1/H2/H3), ordered and unordered lists, bold, italics, code blocks, and blockquotes.

---

# 3.14 Public Access Control

### FR-39 Public Shareable Links
- Users can generate public shareable links for individual time logs.
- Anyone visiting a shareable link can view a full read-only detail page of the log (including its title, description with rendered Markdown, metadata, and evidence attachments).

---

# 3.15 Enhanced Mobile Responsiveness

### FR-40 Responsive UI & Sidebar Collapsing
- The main sidebar navigation shall collapse into a top header bar on mobile viewports.
- The collapsed sidebar is accessible via a header hamburger toggle button.
- The time-tracking sidebar / active timer control panel is integrated directly into the header bar on mobile devices to ensure readability and access.

---

# 4. Non-Functional Requirements

---

## 4.1 Performance

- Supports 50–100 users
- Optimized for low concurrency load
- Fast UI switching within SPA
- SSR by default if possible

---

## 4.2 Security

- Role-based access control (RBAC)
- Secure file storage via signed URLs
- Authenticated API routes only

---

## 4.3 Availability

- Fully online system
- No offline support required

---

## 4.4 Usability

- Mobile responsive design
- Minimal friction UI for logging
- Fast task-to-log workflow

---

## 4.5 Reliability

- Timer state persists server-side
- Logs stored transactionally
- Overlap validation enforced server-side

---

# 5. Data Requirements (High-Level)

---

## Entities

- Users
- Teams
- Roles (per team)
- Projects
- Tasks
- Time Logs
- Document Evidence Files
- Audit Logs
- Notifications

---

# 6. System Constraints

- Fast delivery priority
- Minimal storage usage
- Support for image and document (PDF, Office, Zip) evidence

- No AI features
- No chat system
- No offline functionality

---

# 7. Key Business Rules

- A task may optionally belong to one project, or none at all
- Time logs must not overlap
- Document Evidence is optional for logs
- Only one active timer per user
- Document Evidence cannot be reused
- Admin cannot modify audit logs
- Team switching triggers full reload
- User may exist without a team
- Timer is user-scoped and persists across team switches (full page reload does NOT stop the timer)

---

# 7.5 Data Lifecycle Rules

All entities in the system use **soft delete** only. Database rows are never physically removed.

Soft delete behavior:

- **Tasks** — Time logs remain intact and visible. Task appears as "deleted" in history views. Linked time logs are unaffected.
- **Projects** — Tasks under a deleted project are unassigned from the project (not deleted). Time logs on those tasks are unaffected.
- **Teams** — Team becomes "deleted." Members lose access. Members' personal tasks and time logs are preserved in their personal history but are no longer visible under the team context. Team invitation links become invalid.
- **Users (deactivated by admin)** — User cannot log in. All personal data (tasks, time logs, evidence) is preserved and remains visible to leaders and admins in reports.
- **Document Evidence** — Files remain stored in ImageKit/Cloudinary. The attachment reference is marked deleted. Files are never physically deleted from storage.

Constraints:

- Hard deletes are never exposed to users.
- Soft-deleted items are hidden from normal views but visible in admin/audit contexts.
- Soft delete is implemented via a `deleted_at` timestamp column (NULL = active, non-NULL = deleted).

---

# 8. Acceptance Criteria

System is considered complete when:

- Users can authenticate
- Teams can be created and managed
- Users can switch teams
- Projects and tasks can be created
- Kanban + backlog works
- Time logging works (manual + timer)
- Overlap validation works
- Document Evidence upload supported
- Dashboards display analytics
- Reports can be exported
- In-app notifications work
- Audit logs are recorded
- Application is deployed
