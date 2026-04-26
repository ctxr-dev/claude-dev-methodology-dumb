# PR review loop

The canonical pattern for filing, iterating, and merging PRs in any project that imports this methodology.

## Exit predicate

The loop terminates iff ALL three hold:

1. **Every required reviewer** (effective list = configured `required_reviewers` + CODEOWNERS hits on changed paths) has `approved` review status.
2. **No unresolved review threads** on the PR.
3. **CI status: success** for the head SHA.

Otherwise: keep iterating.

## Polling cadence

- **Check every 5 minutes** while the loop is active.
- **Maximum 24 hours** without a state change before halt-and-ask the user. Idle reviewer time is normal; don't give up early.
- "No new comments this cycle" is NOT a reason to stop — schedule the next wake-up.
- Use `ScheduleWakeup` with `delaySeconds: 300` and the `<<autonomous-loop-dynamic>>` sentinel prompt.

## Reviewer auto-discovery (run once per project, cache in local config)

Order of precedence:

1. **Copilot is available?** Check via `gh api graphql -f query='{ repository(owner: "<OWNER>", name: "<REPO>") { pullRequest(first: 1) { nodes { reviews(first: 5) { nodes { author { __typename login } } } } } } }'`. Filter for `__typename == "Bot" && login == "copilot-pull-request-reviewer"`. If found, capture the bot node id (see `commits.md` for the extraction snippet).
2. **Configured `default_reviewer` in `.claude/memory/ctxr-dev.config.local.md`?** Use it.
3. **Ask the user** which reviewer(s) to use. **Persist the answer** to `.claude/memory/ctxr-dev.config.local.md` so future sessions don't re-ask.

## Loop step-by-step

```bash
# 0. Confirm auth + branch
gh auth status
git checkout -b <type>/<slug>          # e.g. fix/null-deref-in-x

# 1. Author + test
# ... edits ...
npm test && npm run lint               # must pass before commit

# 2. Conventional commit (see commits.md for full spec)
git commit -m "<type>(<scope>): <subject>

<body explaining why>"

# 3. Push + open PR
git push -u origin "$(git branch --show-current)"
gh pr create \
  --repo <OWNER>/<REPO> \
  --title "..." \
  --body "$(cat <<'EOF'
## Summary
...

## Test plan
- [ ] ...

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# 4. Trigger review (Copilot + humans). For Copilot, use GraphQL botIds (NOT REST):
COPILOT_ID=<from-config-or-discovery>  # e.g. BOT_kgDOXXXXXX (per-installation; see commits.md)
PR_NUM=<number>
PR_ID=$(gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){id}}}' \
  -f o=<OWNER> -f r=<REPO> -F n=$PR_NUM --jq '.data.repository.pullRequest.id')
gh api graphql -f query='mutation($pid:ID!,$bots:[ID!]!){requestReviews(input:{pullRequestId:$pid,botIds:$bots,union:true}){pullRequest{reviewRequests(first:10){nodes{requestedReviewer{__typename ... on Bot{login} ... on User{login}}}}}}}' \
  -f pid="$PR_ID" -f bots="$COPILOT_ID"

# 5. Poll every 5 min until exit predicate holds:
while true; do
  STATE=$(gh pr view $PR_NUM --repo <OWNER>/<REPO> \
    --json reviewDecision,reviews,reviewThreads,statusCheckRollup,mergeable)
  if echo "$STATE" | jq -e '<exit-predicate>' > /dev/null; then break; fi
  # else: address comments, push fix, resolve threads (see below), reschedule
  ScheduleWakeup delaySeconds=300 prompt="<<autonomous-loop-dynamic>>"
done
```

## Addressing review comments

For each new comment from the reviewer:

1. **Read** the comment + the cited code (always pull the actual file, never trust just the summary).
2. **Decide**: address the comment OR push back with reasoning OR ask user.
3. **If addressing**: edit, run tests, commit (`fix(review): <what>`), push.
4. **Resolve the thread** in the SAME turn as the push:
   ```bash
   # 1. Fetch unresolved threads:
   gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:50){nodes{id isResolved comments(first:1){nodes{body path line}}}}}}}' \
     -f o=<OWNER> -f r=<REPO> -F n=$PR_NUM --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'

   # 2. For each thread you fixed, resolve via GraphQL (NO REST equivalent exists):
   gh api graphql -f query='mutation($tid:ID!){resolveReviewThread(input:{threadId:$tid}){thread{isResolved}}}' \
     -f tid="<THREAD_ID>"   # PRRT_... node id from step 1
   ```
5. **Do NOT resolve** threads you didn't fix — leave them open as discussion signal.

## Re-requesting review after a push

After every meaningful push that addresses a comment, re-request the reviewer (Copilot picks up the new push automatically, but explicit re-request reduces ambiguity for human reviewers):

```bash
# Same requestReviews mutation as step 4 above; union:true preserves previous requests.
```

## Halt conditions

Stop the loop and report to the user when:

- Exit predicate holds → success; ask user "ready to merge?".
- 24 hours elapsed since the loop started → "stalled, no progress, please advise".
- User explicitly says stop / changes course → obey.
- Branch protection blocks the merge despite the predicate holding → escalate; this means the rule set is stricter than the methodology assumed.

## Guardrails

- **Never** force-push without explicit user authorization.
- **Never** skip pre-commit / pre-push hooks (`--no-verify`).
- **Never** merge yourself (`gh pr merge`) — merge is human-gated. See [`audit-vs-execute.md`](audit-vs-execute.md). User says "merge" / "ship it" / "go ahead" before any merge action.
- Dependabot alerts + CI failures block the PR; address them before declaring exit predicate true.
