# 0005-github-integration-linking

We have decided to integrate GitHub repository selection, commit linking, and Pull Request (PR) linking directly into Aika's time logs. 

To authorize access to the user's GitHub data, we reuse the existing `account` table populated by Better Auth's GitHub OAuth authentication. This avoids introducing custom token stores or redundant configuration steps for the user.

To store linked GitHub entities associated with a specific time log, we introduce a structured `time_log_github_links` join table rather than unstructured metadata fields. This maintains referential integrity, supports cross-referencing logs with specific commit SHA hashes or PR numbers, and aligns with the database pattern used for document evidences.
