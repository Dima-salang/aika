# Business Requirements Document (BRD)

# Aika

Version: 0.1.0

---

# 1. Executive Summary

The proposed system is a web-based team-oriented time logging and task management platform designed primarily to improve internship management workflows while remaining extensible for broader team-based use cases.

The system aims to reduce operational overhead caused by manual reporting, improve supervisor visibility into team activities, centralize task and evidence management, and create a more structured and accountable workflow for members.

The platform introduces centralized task tracking, time logging, evidence uploads, role-based team management, and reporting capabilities within a single unified application.

---

# 2. Problem Statement

Current internship and team workflows rely heavily on manual communication channels for:

- Task reporting
- Time tracking
- Evidence submission
- Progress monitoring

These processes create several problems:

- High communication overhead
- Reduced visibility for supervisors
- Inconsistent documentation
- Difficult progress monitoring
- Increased administrative workload

A centralized solution is required to streamline these workflows.

---

# 3. Business Objectives

The platform aims to achieve the following objectives:

### Primary Objectives

- Reduce operational overhead
- Improve supervisor monitoring efficiency
- Increase accountability
- Improve productivity

### Success Metrics

- Faster supervisor monitoring
- Reduced communication overhead
- Increased team productivity
- Increased reporting consistency

---

# 4. Scope

## In Scope (Version 1)

### User Management

- Authentication
- Role management
- Team membership management

### Team Management

- Team creation
- Team invitations
- Team member management

### Task Management

- User task creation
- Task organization
- Kanban task views
- Task status management

### Time Tracking

- Manual time logging
- Timer-based logging
- Start/end timestamps

### Document Evidence Management

- Document Evidence uploads
- Document Evidence deletion
- Attachment management

### Dashboards

- Member dashboards
- Team leader dashboards
- Admin dashboard

### Reporting

- Weekly reports
- Monthly reports
- Project time distribution reports

### Notifications

- In-app notifications for team invitations, task updates, and log events

### Third-Party & Data Integrations

- Notion task integration via OAuth
- GitHub repository, commit, and PR linking via Better Auth OAuth
- Excel/CSV import and exporting of task/time log reports

### Rich Text & Shared Access

- Rich Text editing powered by Lexical and Markdown format rendering for descriptions
- Publicly shareable read-only links for individual time logs

### Enhanced Layout & Responsiveness

- Mobile-first adaptive layout with hamburger toggle navigation and integrated time sidebar header controls

---

## Out of Scope

- Multi-organization hierarchy
- Team substructures
- Complex workforce management
- Advanced analytics
- Offline support
- Enterprise-scale deployments

---

# 5. Stakeholders

## Primary Stakeholders

### Administrators

Responsibilities:

- Team creation
- Role assignment
- Team deletion

### Team Leaders

Responsibilities:

- Invite users
- Manage teams
- Monitor progress

### Members

Responsibilities:

- Manage tasks
- Log work
- Upload Document Evidence

---

# 6. User Roles

## Admin

Permissions:

- Create teams
- Delete teams
- Assign roles
- Manage platform access

## Leader

Permissions:

- Invite users
- Manage members
- View team reports
- Monitor team activities

## Member

Permissions:

- Create tasks
- Log hours
- Upload evidence
- Generate personal reports

---

# 7. Functional Requirements

## Authentication System

The platform shall:

- Support login and authentication
- Support role-based permissions
- Maintain secure sessions

---

## Organization and Team Management

The platform shall support a multi-tenant hierarchy where Organizations act as the top-level boundary (e.g., companies, departments, universities) and Teams exist nested inside each Organization.

### Organization Management (Tenant level, powered by Better Auth)
- Support multiple Organizations.
- Users can belong to multiple Organizations with specific roles (Admin, Member) managed via Better Auth's native Organizations plugin.
- Support organization-level invitations.

### Team Management (Sub-tenant level)
- Support multiple Teams within an Organization.
- Allow organization members to belong to multiple Teams inside the organization.
- Support team-leader managed membership.
- Admins can manage team access.

Invitation & Onboarding flows:
- **Outbound Invitations**: Admins/Leaders generate an organization invitation (in-app/email) — recipient accepts or declines to join the Organization. Users are assigned to Teams within that Organization.
- **Inbound Magic Links (Self-service Join Requests)**: Admins or Team Leaders generate cryptographically secure, time-bound, and optionally limit-bound join tokens. Users visiting the link register or sign in, then apply to join. Organization Admins/Owners review (approve/reject) these requests to add members without manually typing their email addresses.

Constraints:
- Teams belong to a single Organization and cannot contain subteams.

---

## Task Management

The platform shall:

- Allow task creation
- Support task organization through Kanban views
- Support task statuses

Supported statuses:

- Todo
- In Progress
- Done

Tasks:

- Belong to a single user
- May be linked to multiple time logs
- May be linked to a project
- A time log may contain multiple tasks (many-to-many relationship)

---

## Time Logging

The platform shall:

Support:

- Manual logging
- Timer-based logging
- Local draft persistence (automatically caching in-progress log inputs when the dialog is closed)

Required fields:

- Start time
- End time
- Linked tasks (one or more)
- Description

Note: Duration is always computed from end time minus start time. It is never stored as a separate field.

---

## Document Evidence Management

The platform shall:

Support:

- Image and Document uploads (PDF, Word, Excel, PowerPoint, Text, Zip)
- Document Evidence attachment to logs
- Batch uploading (parallel upload processing)
- Batch deletion (bulk deletion of files from providers)

Users may:

- Add Document Evidence
- Delete Document Evidence

Constraints:

- Document Evidence is optional — logs can be saved without any Document Evidence files attached
- Maximum file size: 10 MB

---

## Dashboard Requirements

### Member Dashboard

Must display:

- Personal tasks
- Logged hours
- Recent activity
- Personal metrics

### Leader Dashboard

Must display:

- Team members
- Team activity
- Recent submissions
- Progress indicators

---

## Reporting Requirements

Reports shall include:

- Weekly hours
- Monthly hours
- Project distributions
- Workload distributions

Reports may be generated by:

- Members — personal reports (own data only)
- Leaders — team reports for teams they lead
- Admins — reports for any team

Constraints:

- Reports are team-specific only — no cross-team aggregated reports

---

## Audit Requirements

The system shall track the following mutation events (reads/page views are NOT logged):

- Login/logout events
- Task creation/update/deletion
- Time log creation/modification/deletion
- Team changes
- Role assignments
- Profile updates
- User deactivation (admin)
- Document Evidence uploads/deletions

Only Admins can view audit logs. Audit logs are immutable and cannot be modified by anyone.

---

# 7.5 Data Lifecycle Rules

All entities in the system use **soft delete** only. Database rows are never physically removed.

Soft delete behavior:

- **Tasks** — Time logs remain intact and visible. Task appears as "deleted" in history views. Linked time logs are unaffected.
- **Projects** — Tasks under a deleted project are unassigned from the project (not deleted). Time logs on those tasks are unaffected.
- **Teams** — Team becomes "deleted." Members lose access. Members' personal tasks and time logs are preserved in their personal history but are no longer visible under the team context. Team invitation links become invalid.
- **Users (deactivated by admin)** — User cannot log in. All personal data (tasks, time logs, evidence) is preserved and remains visible to leaders and admins in reports.
- **Document Evidence** — The attachment reference is marked deleted, and the corresponding physical files are deleted from Cloudinary or Supabase Object Storage to free up space.

Constraints:

- Hard deletes are never exposed to users.
- Soft-deleted items are hidden from normal views but visible in admin/audit contexts.
- Soft delete is implemented via a `deleted_at` timestamp column (NULL = active, non-NULL = deleted).

---

# 9. Non Functional Requirements

## Performance

The system shall:

- Support 50–100 active users
- Maintain acceptable dashboard performance

## Accessibility

The system shall:

- Be mobile friendly
- Be responsive
- Be accessible and easy to use

## Security

The system shall:

- Use role-based access control
- Protect uploaded files
- Prevent unauthorized access

## Scalability

The system should:

- Support future feature expansion
- Allow additional integrations

---

# 10. Technical Constraints

Architecture:

- Monolithic architecture

Technology Stack:

Frontend:

- Next.js

Backend:

- Next.js backend routes

Database:

- PostgreSQL

Authentication:

- Better Auth (GitHub & Google OAuth)

Hosting:

- Vercel

---

# 11. Assumptions

Assumptions include:

- Users have internet access
- Users understand basic task management workflows
- Teams remain relatively small
- File uploads remain moderate

---

# 12. Risks

Potential risks include:

- Low adoption by users
- Poor logging consistency
- Overgeneralization increasing complexity
- Permission misconfiguration
- Document Evidence storage growth

---

# 13. High-Level User Flows

## Member Flow

Login

↓

View Dashboard

↓

Manage Tasks

↓

Log Time

↓

Attach Document Evidence

↓

Generate Reports

---

## Leader Flow

Login

↓

View Team Dashboard

↓

Manage Members

↓

Monitor Progress

↓

Generate Reports

---

## Admin Flow

Login

↓

Manage Teams

↓

Assign Roles

↓

Manage Platform Structure

---

# 14. MVP Deliverables

Version 1 Deliverables:

- Authentication
- Teams
- Role Management
- Task Management
- Time Logging
- Document Evidence Uploads
- Dashboards
- Notifications (in-app)
- Reporting and Exports

---

# 15. Future Expansion

Potential future expansions:

- Advanced analytics
- Organization structures
- Notification systems
- Integrations
- AI-assisted productivity features

---
