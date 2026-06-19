# 0002-folder-restructure-by-domain

We have decided to restructure the codebase by moving source components and services into domain-specific subdirectories under `components/` (e.g., `dashboard/`, `landing/`, `reports/`, `timer/`, `ui-components/`) and `services/` (e.g., `auth/`, `core/`, `import-export/`, `integrations/`). We did this to clean up the root namespaces, reduce directory clutter, improve maintainability, and group logically related code together.
