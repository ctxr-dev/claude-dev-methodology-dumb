# Label taxonomy

Locked label families propagate across every repo in the project. Project-extensible families allow per-project specialization.

## Locked families (same names + colors across every repo)

| Family | Lock status | Color family |
|---|---|---|
| `type:*` | Locked | Blue tones (`5319E7` for epic; `0E8A16` for feature; `D73A4A` for bug; etc.) |
| `scope:*` | Locked | Red tones (`B60205` for breaking, `E99695` for additive) |
| `phase:*` | Locked structure (specific phase names per project) | Yellow (`FBCA04`) |
| `release:*` | Locked structure | Green (`0E8A16`) |
| `area:*` | Open (project extends) | Purple (`8B4FBC`) |

## Canonical labels (template)

See [`templates/labels/default-taxonomy.yaml`](templates/labels/default-taxonomy.yaml) for the full canonical set as a YAML file consumers can `gh label create` cascade-install.

### `type:*` — kind of work (mutually exclusive)

- `type:epic` (color `5319E7`) — Umbrella parent issue with sub-issues.
- `type:feature` (color `0E8A16`) — New capability.
- `type:enhancement` (color `0075CA`) — Improvement to existing capability.
- `type:bug` (color `D73A4A`) — Defect.
- `type:refactor` (color `1D76DB`) — Internal restructure, no behaviour change.
- `type:docs` (color `0052CC`) — Documentation.
- `type:chore` (color `C5DEF5`) — Maintenance / infrastructure.

Every issue gets exactly ONE `type:*` label. Project-extensible: NO. Locked across all repos.

### `scope:*` — semver signal

- `scope:breaking` (color `B60205`) — Breaks backward compatibility.
- `scope:additive` (color `E99695`) — Additive only; no breaking change.

Every issue gets exactly ONE `scope:*` label. Locked across all repos.

### `phase:*` — project phase grouping (project-extensible)

Each project picks its own phase names. Examples:
- skill-code-review uses `phase:sprint-b`, `phase:sprint-2`, `phase:sprint-c`, `phase:sprint-3`, `phase:sprint-4`, `phase:sprint-d`, `phase:sprint-5`, `phase:release`.
- agent-staff-engineer uses `phase:P0-foundations`, `phase:P1-remote-sync`, `phase:P2-missing-skills`, `phase:P3-orchestration`, `phase:P4-observability`, `phase:P5-fsm`.
- mcp-github uses `phase:v0.1`, `phase:v0.2`.

Color: `FBCA04` (yellow) for every `phase:*` regardless of project.

### `release:*` — target release

E.g. `release:v2.0`, `release:v0.1`, etc. One per issue if relevant; not all issues need one. Color: `0E8A16` (green).

### `area:*` — subsystem (multi-select OK; project-extensible)

E.g. `area:bootstrap`, `area:tracker-sync`, `area:fsm`, `area:orchestration`, `area:integration`, etc. Each project adds its own. Color: `8B4FBC` (purple) for consistency across repos.

A single issue can carry multiple `area:*` labels when it genuinely spans subsystems. Default color enforced; descriptions are project-specific.

## Cascade install (per-project)

When initialising a new project that imports this methodology:

```bash
# Install locked labels across every repo in the project:
for REPO in <REPO_1> <REPO_2> ...; do
  while IFS='|' read -r name desc color; do
    [ -z "$name" ] && continue
    gh label create "$name" --repo <OWNER>/$REPO --description "$desc" --color "$color" --force >/dev/null 2>&1
  done < <(npx --yes js-yaml templates/labels/default-taxonomy.yaml | jq -r '.locked[] | "\(.name)|\(.description)|\(.color)"')
done
```

Or use the validator:

```bash
node scripts/validate-labels.mjs <OWNER>           # report missing or drifted labels
node scripts/validate-labels.mjs <OWNER> --fix     # cascade-install canonical set
```

## What's intentionally NOT a label

- **Priority** (P0/P1/P2/P3) — lives in the project board's `Priority` field, not as a label. Project field supports filtering / sorting; labels add visual noise.
- **Size** (S/M/L/XL) — lives in the project board's `Size` field. Same rationale.
- **Status** — project board's `Status` field. Reserved values: Backlog / Ready / In progress / In review / Done.

This split is per the canonical taxonomy spec — keep labels for semantic categorisation, project fields for execution-state tracking. Don't duplicate.
