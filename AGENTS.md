此為 OpenAI Codex 所建立。

# Repository workflow rules

1. Before any modification, sync `main` first:
   - `git checkout main`
   - `git pull --ff-only origin main`
2. Then create/update a working branch for changes.
3. Before finalizing, rebase working branch onto `main` when possible.
4. If `main` or remote is missing, report and wait for user direction.
5. For visible UI changes, provide a screenshot if tooling is available.
