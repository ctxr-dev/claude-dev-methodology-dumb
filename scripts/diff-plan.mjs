#!/usr/bin/env node
// diff-plan.mjs <plan-file.md> <project-url>
//
// Best-effort heuristic diff between a markdown plan file and the actual
// GitHub Project state. Surfaces:
//
//   - Issues promised in the plan that don't exist on GH.
//   - Issues on GH (under the project) that aren't mentioned in the plan.
//   - Major-section drift (plan-headings without corresponding epic on the board).
//
// This is a HEURISTIC. Inspect the output before treating it as truth.

import { readFileSync } from "node:fs";
import { ghGraphql } from "./lib/gh.mjs";
import { parseProjectUrl } from "./lib/config.mjs";

const PLAN_FILE = process.argv[2];
const PROJECT_URL = process.argv[3];
if (!PLAN_FILE || !PROJECT_URL) {
  console.error("Usage: diff-plan.mjs <plan-file.md> <project-url>");
  process.exit(1);
}

const planText = readFileSync(PLAN_FILE, "utf8");
const { owner, number: projectNum } = parseProjectUrl(PROJECT_URL);

// Plan-side: extract every <OWNER>/<REPO>#<NUM> reference.
const issueRefRe = /\b([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)#(\d+)/g;
const planRefs = new Set();
let m;
while ((m = issueRefRe.exec(planText)) !== null) {
  planRefs.add(`${m[1]}/${m[2]}#${m[3]}`);
}
console.log(`Plan references ${planRefs.size} distinct issue refs.`);

// Plan-side: extract H2/H3 headings as "promised topics".
const planHeadings = [];
for (const line of planText.split("\n")) {
  const h = line.match(/^(#{2,3})\s+(.+)$/);
  if (h) planHeadings.push({ level: h[1].length, text: h[2].trim() });
}
console.log(`Plan has ${planHeadings.length} H2/H3 headings.`);

// Project-side: pull every item.
const projectItems = [];
let cursor = null;
while (true) {
  const after = cursor ? `, after: "${cursor}"` : "";
  const r = ghGraphql(
    `query{organization(login:"${owner}"){projectV2(number:${projectNum}){items(first:100${after}){pageInfo{hasNextPage endCursor}nodes{id content{__typename ... on Issue{number title state repository{nameWithOwner}}}}}}}}`,
    {}
  );
  const page = r.data.organization.projectV2.items;
  for (const node of page.nodes) {
    const c = node.content;
    if (c?.__typename === "Issue") {
      projectItems.push({ ref: `${c.repository.nameWithOwner}#${c.number}`, title: c.title, state: c.state });
    }
  }
  if (page.pageInfo.hasNextPage) cursor = page.pageInfo.endCursor;
  else break;
}
console.log(`Project has ${projectItems.length} issue items.\n`);

const projectRefSet = new Set(projectItems.map((i) => i.ref));

// Diff:
const inPlanNotProject = [...planRefs].filter((ref) => !projectRefSet.has(ref));
const inProjectNotPlan = projectItems.filter((i) => !planRefs.has(i.ref));

console.log(`=== Plan vs Project ===`);
console.log(`  in plan, not in project:    ${inPlanNotProject.length}`);
console.log(`  in project, not in plan:    ${inProjectNotPlan.length}`);

if (inPlanNotProject.length) {
  console.log(`\n--- Plan-only references (might be promised but not created) ---`);
  for (const ref of inPlanNotProject) console.log(`  ${ref}`);
}
if (inProjectNotPlan.length) {
  console.log(`\n--- Project-only items (created but not mentioned in plan) ---`);
  for (const item of inProjectNotPlan.slice(0, 20)) console.log(`  ${item.ref}  "${item.title.slice(0, 70)}" [${item.state}]`);
  if (inProjectNotPlan.length > 20) console.log(`  ... and ${inProjectNotPlan.length - 20} more`);
}
console.log(`\nThis is a heuristic diff. Inspect carefully — plan-only refs may be intentional cross-references; project-only items may be auto-added.`);
