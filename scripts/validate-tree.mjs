#!/usr/bin/env node
// validate-tree.mjs <ROOT_ISSUE_URL_OR_SPEC>
//
// Walks every issue under <ROOT> via the native GraphQL `subIssues` connection,
// then walks each issue's parent chain back to the root. Reports orphans, cycles,
// mis-rooted leaves, and depth excess (>4 hops).
//
// Usage:
//   node validate-tree.mjs https://github.com/owner/repo/issues/17
//   node validate-tree.mjs owner/repo#17

import { ghGraphql } from "./lib/gh.mjs";
import { parseIssueSpec } from "./lib/config.mjs";

const ROOT_SPEC = process.argv[2];
if (!ROOT_SPEC) {
  console.error("Usage: validate-tree.mjs <root-issue-url-or-spec>");
  process.exit(1);
}

const root = parseIssueSpec(ROOT_SPEC);
const MAX_DEPTH = 4;

// Recursively pull subIssues. Builds a {nodeId → {repo, number, title, parentId, childIds[]}} map.
const tree = new Map();
const visited = new Set();

function key(repo, num) { return `${repo}#${num}`; }

function getIssue(owner, repo, number) {
  const r = ghGraphql(
    `query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){id title parent{number repository{nameWithOwner}} subIssues(first:50){totalCount nodes{number title repository{nameWithOwner}}}}}}`,
    { o: owner, r: repo, n: number }
  );
  return r.data.repository.issue;
}

function walk(owner, repo, number, depth = 0) {
  const k = key(`${owner}/${repo}`, number);
  if (visited.has(k)) return;
  visited.add(k);
  if (depth > 50) {
    console.error(`! depth bomb at ${k} (probable cycle)`);
    return;
  }
  const issue = getIssue(owner, repo, number);
  if (!issue) return;
  tree.set(k, {
    nameWithOwner: `${owner}/${repo}`,
    number,
    title: issue.title,
    parent: issue.parent ? `${issue.parent.repository.nameWithOwner}#${issue.parent.number}` : null,
    children: issue.subIssues.nodes.map((c) => `${c.repository.nameWithOwner}#${c.number}`),
  });
  for (const child of issue.subIssues.nodes) {
    const [co, cr] = child.repository.nameWithOwner.split("/");
    walk(co, cr, child.number, depth + 1);
  }
}

console.log(`Walking subtree from ${root.owner}/${root.repo}#${root.number} ...`);
walk(root.owner, root.repo, root.number);
console.log(`Captured ${tree.size} issues.\n`);

const rootKey = key(`${root.owner}/${root.repo}`, root.number);
const issues = { orphans: [], misRooted: [], cycles: [], tooDeep: [], asymmetric: [] };

// For each issue, walk its parent chain.
for (const [k, info] of tree) {
  if (k === rootKey) continue;
  const seen = new Set([k]);
  let cur = info.parent;
  let hops = 0;
  let reachedRoot = false;
  while (cur && hops < 50) {
    if (cur === rootKey) { reachedRoot = true; break; }
    if (seen.has(cur)) { issues.cycles.push({ issue: k, cycle: [...seen, cur] }); break; }
    seen.add(cur);
    const parentInfo = tree.get(cur);
    if (!parentInfo) {
      issues.misRooted.push({ issue: k, terminal: cur, reason: "parent not in subtree" });
      break;
    }
    cur = parentInfo.parent;
    hops++;
  }
  if (!reachedRoot && !issues.cycles.find((c) => c.issue === k) && !issues.misRooted.find((c) => c.issue === k)) {
    issues.orphans.push({ issue: k });
  }
  if (hops > MAX_DEPTH) {
    issues.tooDeep.push({ issue: k, hops });
  }
  // Bidirectional check: if issue says parent X, X should list issue as child.
  const parentInfo = tree.get(info.parent);
  if (parentInfo && !parentInfo.children.includes(k)) {
    issues.asymmetric.push({ issue: k, parent: info.parent });
  }
}

console.log("=== Validation results ===");
console.log(`  total issues:     ${tree.size}`);
console.log(`  reach root:       ${tree.size - issues.orphans.length - issues.misRooted.length - issues.cycles.length}`);
console.log(`  orphans:          ${issues.orphans.length}`);
console.log(`  mis-rooted:       ${issues.misRooted.length}`);
console.log(`  cycles:           ${issues.cycles.length}`);
console.log(`  too-deep (>${MAX_DEPTH}):  ${issues.tooDeep.length}`);
console.log(`  asymmetric:       ${issues.asymmetric.length}`);

if (issues.orphans.length || issues.misRooted.length || issues.cycles.length) {
  console.log("\n--- Defects ---");
  for (const o of issues.orphans) console.log(`  ORPHAN ${o.issue} "${tree.get(o.issue)?.title?.slice(0, 70)}"`);
  for (const m of issues.misRooted) console.log(`  MIS-ROOTED ${m.issue} → ${m.terminal} (${m.reason})`);
  for (const c of issues.cycles) console.log(`  CYCLE ${c.cycle.join(" → ")}`);
  for (const t of issues.tooDeep) console.log(`  TOO DEEP ${t.issue} (${t.hops} hops)`);
  for (const a of issues.asymmetric) console.log(`  ASYMMETRIC ${a.issue} claims parent ${a.parent}, but parent doesn't list this child`);
  process.exit(1);
}
console.log("\nAll issues reach root within ≤ " + MAX_DEPTH + " hops. Tree is acyclic and consistent.");
