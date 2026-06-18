# Scope of Work (SoW)

# Aika

Version: 0.1.0

---

# 1. Project Overview

This project aims to design, develop, test, and deploy a web-based team-oriented time logging and task management platform optimized for internship management while remaining extensible for general team use cases.

The platform aims to reduce operational overhead, improve visibility for team leaders, centralize task management, and streamline time logging processes.

The final deliverable shall include a working deployed application, documentation, and source code.

---

# 2. Project Objectives

The project aims to achieve the following objectives:

- Reduce communication overhead
- Improve supervisor monitoring efficiency
- Increase accountability
- Improve task and time tracking workflows
- Provide centralized reporting and monitoring capabilities

---

# 3. Deliverables

The project shall deliver:

## Software Deliverables

- Fully functional deployed web application
- Source code repository
- Database schema and configurations
- Deployment configurations

## Documentation Deliverables

- Business Requirements Document (BRD)
- Scope of Work
- SRS
- Technical documentation
- Database documentation
- Deployment documentation
- User documentation

---

# 4. Scope of Work

The project scope includes the following components.

---

## 4.1 Authentication and Access Control

Implementation includes:

- User registration and login
- Session management
- Role-based access control

Supported Roles:

- Admin
- Leader
- Member

Permissions shall vary according to assigned roles.

---

## 4.2 Organization and Team Management Module

The system shall support:

- Organization creation and deletion (tenant level, powered natively by Better Auth)
- Team creation and deletion (nested inside an Organization)
- Organization and Team switching
- Organization invitations and user onboarding
- Membership role management

If the user does not have an organization at registration, they can still access basic platform actions until they create an organization or accept an invitation.

Invitation flow:
- Managers generate an organization invitation via Better Auth
- Recipient receives invitation, accepts/declines, and gets registered
- Admins can manage team assignments within the organization

Constraints:
- Users may belong to multiple Organizations and multiple Teams
- Teams belong to a single Organization and cannot contain subteams
- Switching Organization or Team reloads application context

---

## 4.3 Task Management Module

The system shall support:

- Task creation
- Task updates
- Task deletion
- Task assignment to projects
- Task organization

Supported Views:

- Kanban View
- List / Backlog View

Supported Task Statuses:

- Todo
- In Progress
- Done

Constraints:

- Tasks belong to a single user

---

## 4.4 Time Logging Module

The system shall support:

### Manual Logging

Users may:

- Input start time
- Input end time
- Attach tasks
- Provide descriptions

### Timer Logging

Users may:

- Start timer
- Stop timer
- Automatically generate duration

Each log shall support:

- Linked tasks (one or more)
- Linked project
- Start time
- End time
- Description

Note: Duration is always computed from end time minus start time. It is never stored as a separate field.

Constraints:

- A task may be linked to multiple logs
- A log may be linked to multiple tasks (many-to-many)

---

## 4.5 Document Evidence Upload Module

The system shall support:

- Image and Document uploads (PDF, Word, Excel, PowerPoint, Text, Zip)
- Document Evidence attachment to logs
- Document Evidence deletion

Constraints:

- Maximum upload size: 10 MB
- Storage usage shall remain minimal
- Document Evidence is optional — logs can be saved without any Document Evidence files attached

Out of Scope:

- Versioning systems

---

## 4.6 Dashboard Module

### Member Dashboard

The member dashboard shall include:

- Current tasks
- Current projects
- Recent logs
- Time logging shortcuts

Analytics:

- Total hours
- Weekly hours
- Recent activity
- Activity heatmap
- Task counts
- Project distribution charts

---

### Leader Dashboard

The leader dashboard shall include:

- Team member monitoring
- Team progress visibility
- Team activity summaries
- Team switching capability

Analytics:

- Team hours
- Team activity
- Project distribution
- Team activity heatmaps

---

### Admin Dashboard

The admin dashboard shall include:

- Team management
- User management
- Role management
- Platform overview

---

## 4.7 Reporting Module

The system shall support:

### Interactive Reporting

Users shall view:

- Weekly summaries
- Monthly summaries
- Project distributions
- Workload distributions

### Export Reporting

Supported exports:

- CSV
- PDF

Report Generation Permissions:

- Members — personal reports only (their own data, across all teams they belong to)
- Leaders — team reports for teams they lead (aggregated member data, team-specific)
- Admins — reports for any team

Constraints:

- Reports are team-specific only — no cross-team aggregated reports
- Members see only their own data in personal reports
- Users can select custom date ranges

---

## 4.8 Audit Logging

The system shall record the following mutation events (reads/page views are NOT logged):

- Login/logout events
- Task creation/update/deletion
- Time log creation/modification/deletion
- Team changes
- Role assignments
- Profile updates
- User deactivation (admin)
- Document Evidence uploads/deletions

Constraints:

- Audit logs are immutable
- Only Admins can view audit logs
- Only essential audit functionality shall be implemented.

---

## 4.9 Notification System

The system shall support:

- In-app notifications only (V1)

Notification events:

- Team invitations
- Task updates
- Time log events
- Team switch events

Out of scope for V1:

- Email notifications

---

## 4.10 Data Lifecycle Rules

All entities in the system use **soft delete** only. Database rows are never physically removed.

Soft delete behavior:

- **Tasks** — Time logs remain intact and visible. Task appears as "deleted" in history views. Linked time logs are unaffected.
- **Projects** — Tasks under a deleted project are unassigned from the project (not deleted). Time logs on those tasks are unaffected.
- **Teams** — Team becomes "deleted." Members lose access. Members' personal tasks and time logs are preserved in their personal history but are no longer visible under the team context. Team invitation links become invalid.
- **Users (deactivated by admin)** — User cannot log in. All personal data (tasks, time logs, evidence) is preserved and remains visible to leaders and admins in reports.
- **Document Evidence** — Files remain stored in Cloudinary or Supabase Object Storage. The attachment reference is marked deleted. Files are never physically deleted from storage.

Constraints:

- Hard deletes are never exposed to users.
- Soft-deleted items are hidden from normal views but visible in admin/audit contexts.
- Soft delete is implemented via a `deleted_at` timestamp column (NULL = active, non-NULL = deleted).

---

# 5. Out of Scope

The following features are explicitly excluded from Version 1.

Excluded Features:

- Chat systems
- AI functionality
- Advanced analytics
- Organization hierarchies
- Team substructures
- Offline support
- Native mobile applications
- Enterprise scaling requirements
- Multi-team aggregated dashboards

---

# 6. Technical Scope

Preferred Technology Stack:

Frontend:

- Next.js

Backend:

- Next.js Backend Routes

Database:

- PostgreSQL

Infrastructure:

- Supabase

Authentication:

- Better Auth (GitHub & Google OAuth)

Hosting:

- Vercel

These technologies are preferred but may change if necessary.

---

# 7. Testing Scope

The project shall include:

## Manual Testing

- Functional testing
- User flow testing
- Acceptance testing

## Unit Testing

Coverage includes:

- Core logic
- Critical services

## Integration Testing

Coverage includes:

- Authentication flows
- Database interactions
- Core workflows

Out of Scope:

- Extensive end-to-end automation

---

# 8. Constraints

Project Constraints:

- Single developer implementation
- Optimize for fastest delivery
- Support approximately 50–100 users
- Mobile friendly design required
- Minimal storage consumption required

---

# 9. Project Ownership

The project owner is responsible for:

- Requirements gathering
- Architecture decisions
- UI/UX design
- Development
- Database design
- Testing
- Deployment
- Documentation

---

# 10. Acceptance Criteria

The project shall be considered complete when:

✓ Users can authenticate

✓ Teams can be created and managed

✓ Users can switch teams

✓ Tasks can be created and organized

✓ Users can log time

✓ Users can upload Document Evidence

✓ Dashboards display relevant information

✓ Reports can be generated

✓ Application is deployed

✓ Documentation is delivered

---

# 11. Minimum Successful Demonstration

A successful project demonstration includes:

1. User login
2. Team selection
3. Task creation
4. Time logging
5. Document Evidence upload
6. Team leader monitoring
7. Dashboard analytics viewing
8. Report generation
9. Export functionality

---

# 12. Future Expansion Opportunities

Potential future expansions include:

- AI-assisted workflows
- Advanced analytics
- Organization hierarchies
- Integrations
- Mobile applications

---
