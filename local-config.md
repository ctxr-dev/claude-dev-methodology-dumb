# Per-project local config

The methodology stays project-agnostic. Per-project values live in a gitignored markdown table at `.claude/memory/ctxr-dev.config.local.md`.

## Schema

```markdown
# ctxr-dev.config.local.md (gitignored)

| Key | Value |
|---|---|
| `project_url` | https://github.com/orgs/<OWNER>/projects/<NUM>/views/1 |
| `org` | <OWNER> |
| `primary_repo` | <REPO> |
| `sibling_repos` | <REPO_2>, <REPO_3>, ... |
| `default_reviewer` | `copilot` \| `<github-login>` \| `ask` |
| `copilot_bot_id` | BOT_kgDOXXXXXX (per-installation; discover via commits.md snippet) |
| `pr_loop_poll_seconds` | 300 (override default 5-min cadence) |
| `pr_loop_max_hours` | 24 (override default 24h max-no-progress) |
| `default_dev_loop_mode` | autonomous \| interactive \| handoff |
| `polling_paradigm` | wakeup \| background |
| `plan_post_migration` | minimize (default) \| delete |
```

## Where the file lives

```
<project-root>/
├── .claude/
│   ├── memory/
│   │   ├── MEMORY.md                              (committed; index)
│   │   ├── ctxr-dev/                              (cloned methodology; this repo)
│   │   ├── ctxr-dev.config.local.md               (gitignored; this file)
│   │   └── ... (other memory entries)
```

Add to `.gitignore`:

```
.claude/memory/ctxr-dev
.claude/memory/*.local.md
```

The first line keeps the cloned methodology (its own `.git/`) from being tracked by the outer project. The second keeps the per-project config private. See the README's "Why `.gitignore`" section for the full rationale.

## How the AI reads it

At session start (or before any methodology recipe runs), the AI:

1. Checks if `<project-root>/.claude/memory/ctxr-dev.config.local.md` exists.
2. If yes: reads it via the `Read` tool, parses the markdown table, holds the values for the session.
3. If no: creates it from `templates/ctxr-dev.config.local.md` and **asks the user** to fill in the values BEFORE proceeding with any methodology recipe.

## Why markdown table not JSON

- Human-readable; user edits in their IDE without learning a schema.
- AI reads via the standard `Read` tool; no JSON parser needed.
- Comments-as-context easy: "<key>: <value>  <!-- override because reasons -->" works inline.

## Why gitignored

The values are user-/machine-specific:

- The org might differ if the user works in multiple orgs.
- The Copilot bot ID is per-org-per-repo-installation.
- The default reviewer is a personal preference.
- Polling overrides may be opinion-driven.

These shouldn't accidentally land in commits and propagate to other contributors.

## Updating the config

When the AI discovers a new value (e.g. learns the Copilot bot ID for a repo for the first time), it should:

1. Read the existing config.
2. Add or update the row.
3. Write the file back.
4. Mention the change in chat: "Cached `copilot_bot_id` = `BOT_kgDO...` to ctxr-dev.config.local.md".

This way the next session inherits the discovery.

## Why per-project, not org-wide

Different projects in the same org might have different conventions:

- One project uses Copilot reviews; another uses a named human.
- One project wants 5-min poll; another wants 15-min.

The per-project config lets each project override defaults without coordinating with the methodology repo.
