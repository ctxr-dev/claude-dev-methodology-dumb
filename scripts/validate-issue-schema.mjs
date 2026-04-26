#!/usr/bin/env node
// validate-issue-schema.mjs <OWNER>/<REPO> [--touched <num,num,...>]
//
// Pulls every open issue (or just the touched ones) and verifies each body
// follows the canonical schema: Metadata header (>) + ## Why + ## Action items
// + ## Acceptance + ## Implementation pointers + ## Test plan.
//
// Exits non-zero if any issue fails.

import { ghJson } from "./lib/gh.mjs";
import { parseRepoSpec } from "./lib/config.mjs";

const REPO_SPEC = process.argv[2];
if (!REPO_SPEC) {
  console.error("Usage: validate-issue-schema.mjs <owner>/<repo> [--touched 1,2,3]");
  process.exit(1);
}
const { owner, repo } = parseRepoSpec(REPO_SPEC);
const touchedArg = process.argv.find((a) => a.startsWith("--touched"));
const touched = touchedArg ? new Set(process.argv[process.argv.indexOf(touchedArg) + 1].split(",").map(Number)) : null;

const REQUIRED_SECTIONS = [
  { re: /^>\s*\*\*(?:Part of|Sprint|Priority|Status)\*\*/m, name: "Metadata header (> blockquote)" },
  { re: /^##\s+Why/im, name: "## Why" },
  { re: /^##\s+Action items/im, name: "## Action items" },
  { re: /^##\s+Acceptance/im, name: "## Acceptance" },
  { re: /^##\s+Implementation pointers/im, name: "## Implementation pointers" },
  { re: /^##\s+(Test plan|Verification)/im, name: "## Test plan / Verification" },
];

const issues = ghJson(["issue", "list", "--repo", `${owner}/${repo}`, "--state", touched ? "all" : "open", "--limit", "200", "--json", "number,title,body,state,labels"]);

let pass = 0, fail = 0;
const failures = [];
for (const issue of issues) {
  if (touched && !touched.has(issue.number)) continue;
  const body = issue.body ?? "";
  const missing = REQUIRED_SECTIONS.filter((s) => !s.re.test(body)).map((s) => s.name);
  // Skip epics (they have a different shape; their schema is "Mission" + "Children" + "Decision log").
  const isEpic = (issue.labels ?? []).some((l) => l.name === "type:epic");
  if (isEpic) {
    const epicSections = [
      { re: /^##\s+Mission/im, name: "## Mission" },
      { re: /^##\s+Children/im, name: "## Children" },
    ];
    const epicMissing = epicSections.filter((s) => !s.re.test(body)).map((s) => s.name);
    if (epicMissing.length) {
      fail++;
      failures.push({ num: issue.number, title: issue.title, missing: epicMissing, isEpic: true });
    } else pass++;
    continue;
  }
  if (missing.length) {
    fail++;
    failures.push({ num: issue.number, title: issue.title, missing });
  } else pass++;
}

console.log(`=== Issue-schema validation: ${owner}/${repo} ===`);
console.log(`  PASS: ${pass}`);
console.log(`  FAIL: ${fail}`);
if (failures.length) {
  console.log("\n--- Failures ---");
  for (const f of failures) {
    console.log(`  #${f.num} ${f.isEpic ? "(EPIC)" : ""} "${f.title.slice(0, 70)}" — missing: ${f.missing.join(", ")}`);
  }
  process.exit(1);
}
console.log("\nAll issues conform to the canonical schema.");
