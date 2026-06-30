# Domain Glossary

## Organization
A tenant-level boundary representing a company, group, or workspace. All users, teams, projects, and tasks exist within the scope of an organization.

## Team
A sub-unit nested inside an Organization. Teams organize users into specific groups (e.g., Engineering, Marketing) led by a Team Leader.

## Workspace
The current active context for a user session, determined by a combination of the active Organization and active Team.

## Personal View
A teamless workspace context. When a user has no active Team within an Organization, they default to their Personal View, allowing them to track tasks, projects, and time logs individually without being bound to a team.

## Global Admin
A system-wide administrative role (governed by the user's `is_admin` attribute) with full read and write access across all organizations, teams, and user profiles. This is distinct from organization-level administrators or owners whose visibility and management rights are limited to their specific organization.

## Personal Report
A user-scoped report compiling an individual's own time logs and task metrics. Can be scoped to a single team, their Personal View, or aggregated across all teams in the active organization.

## Team Report
A team-scoped report aggregating time logs, workload distribution, and task metrics across all members of a specific Team. Visible only to Team Leaders, Organization Admins, or Global Admins.

## Local Draft
Client-side persisted state of an in-progress time log form, preserved using a Zustand store to prevent data loss when a dialog is closed or the page is refreshed.

## Evidence Batching
Parallel uploading of multiple files and bulk deletion of stored assets in a single request to minimize latency and network overhead.

## GitHub Link
A reference to a specific GitHub commit or Pull Request associated with a Time Log to provide direct, verifiable code context for the logged hours.


