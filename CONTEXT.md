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
