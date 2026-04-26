# claude-dev-methodology-dumb

A portable development methodology for AI-driven engineering work that uses GitHub Issues + Projects as the canonical source of truth.

This repo bundles:

- **The PR review loop** — autonomous polling, exit predicate, reviewer auto-discovery, conventional commits.
- **Plan → Issues migration recipe** — turn a markdown plan into a fully wired native sub-issue tree on a GitHub Project, with every issue cold-start ready.
- **Canonical issue body schema** — Metadata table + Why + Action items + Acceptance + Implementation pointers + Test plan. Validator hard-fails on missing sections.
- **Locked label taxonomy** — `type:*` / `scope:*` / `phase:*` / `release:*` (org-wide) + `area:*` (project-extensible).
- **Validation scripts** — 4 Node validators: parent-chain walk, issue-schema check, label consistency, plan-vs-issues diff.
- **Parallel validation pattern** — after every plan migration, spawn 3 Plan agents (completeness / dep-graph / cold-start) scoped to TOUCHED issues only.
- **Plan deprecation** — once issues exist, the original plan file is auto-minimized to title + 1-paragraph + epic link.

## Install on any new machine

Copy this prompt and paste it to your AI:

> Add the ctxr-dev development methodology to this project. Run these three steps:
>
> 1. `mkdir -p .claude/memory && cd .claude/memory && git clone https://github.com/ctxr-dev/claude-dev-methodology-dumb.git ctxr-dev`
> 2. Append `.claude/memory/ctxr-dev` and `.claude/memory/*.local.md` to the project root's `.gitignore` (creating the file if missing). The methodology has its own `.git/` and must NOT be tracked by the outer repo; the `*.local.md` rule keeps the per-project config private.
> 3. Add this single bullet to `.claude/memory/MEMORY.md` (creating the file if missing): `- [ctxr-dev methodology](ctxr-dev/index.md) — PR loop, plan-to-issues, validation scripts, cold-start schema. ALWAYS read first.`
>
> Then read `.claude/memory/ctxr-dev/index.md` and follow the methodology going forward.

After that one prompt, every future AI session in the project inherits the methodology automatically.

### Why `.gitignore`

The methodology is its **own git repository** (cloned into your project's `.claude/memory/ctxr-dev/`). The outer project's git would otherwise try to track the methodology's files as ordinary content, which causes:

- Confused submodule warnings (the nested `.git/` directory).
- Methodology updates appearing as foreign diffs in your project's PRs.
- Accidental commits of methodology content into your project.

Treating it as a non-tracked subtree avoids all three. To pull methodology updates: `cd .claude/memory/ctxr-dev && git pull`.

## Per-project configuration

The methodology is **project-agnostic**. Per-project values (project board URL, repo names, default reviewer, etc.) live in a gitignored config file the consumer project creates:

```
<project-root>/.claude/memory/ctxr-dev.config.local.md
```

Template for this config: [`templates/ctxr-dev.config.local.md`](templates/ctxr-dev.config.local.md). Copy it, fill in your values, add `*.local.md` to your `.gitignore`.

## What's inside

```
claude-dev-methodology-dumb/
├── README.md                                 you are here
├── index.md                                  AI memory entry point
├── pr-loop.md                                PR review loop (5-min cadence, 24h max)
├── plan-to-issues.md                         plan migration recipe
├── issue-schema.md                           canonical body shape (MUST-FOLLOW)
├── label-taxonomy.md                         label families + cascade install
├── cold-start.md                             pick up an issue from zero context
├── parallel-validation.md                    3-agent validation pattern
├── commits.md                                conventional commits + reviewer discovery
├── plan-deprecation.md                       post-migration plan minimization
├── audit-vs-execute.md                       findings ≠ approval
├── local-config.md                           per-project config schema
├── templates/
│   ├── labels/default-taxonomy.yaml          locked label families
│   └── ctxr-dev.config.local.md              per-project config template
└── scripts/
    ├── package.json                          @ctxr-dev/methodology-validators
    ├── validate-tree.mjs                     parent-chain walk
    ├── validate-issue-schema.mjs             body shape check
    ├── validate-labels.mjs                   label consistency cross-repo
    └── diff-plan.mjs                         plan-vs-issues diff
```

## Author

Dmitri Meshin <dmitri.meshin@gmail.com> — distilled from real ctxr-dev project work.

## License

MIT.
