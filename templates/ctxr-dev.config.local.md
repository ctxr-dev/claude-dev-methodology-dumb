# ctxr-dev.config.local.md

> **This file is gitignored.** Add `*.local.md` to your `.gitignore` if not already there.
> **Each machine fills in its own values.** Don't share via git.

## Project values

| Key | Value |
|---|---|
| `project_url` | <fill: https://github.com/orgs/YOUR-ORG/projects/N/views/1> |
| `org` | <fill: github org name> |
| `primary_repo` | <fill: main repo name> |
| `sibling_repos` | <fill: comma-separated, or empty> |

## Reviewer + PR-loop config

| Key | Value |
|---|---|
| `default_reviewer` | <one of: `copilot`, `<github-login>`, `ask`> |
| `copilot_bot_id` | <auto-discovered after first PR; e.g. `BOT_kgDOXXXXXX`> |
| `pr_loop_poll_seconds` | 300 |
| `pr_loop_max_hours` | 24 |

## Dev-loop modes (if the project supports them; see methodology pr-loop.md)

| Key | Value |
|---|---|
| `default_dev_loop_mode` | <one of: `autonomous`, `interactive`, `handoff`> |
| `polling_paradigm` | <one of: `wakeup`, `background`> |

## Plan-deprecation policy

| Key | Value |
|---|---|
| `plan_post_migration` | minimize |

## Notes for the AI

- This config is read at the start of every session that uses the methodology.
- When a value is discovered (e.g. `copilot_bot_id` after first review), update the row and mention the change in chat.
- If a value is missing AND a methodology recipe needs it, halt and ask the user before proceeding.
