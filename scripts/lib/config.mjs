// Read .claude/memory/ctxr-dev.config.local.md from the consumer project.
// Walks up from cwd looking for the .claude/memory/ directory.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

export function findProjectRoot(start = process.cwd()) {
  let cur = resolve(start);
  while (true) {
    if (existsSync(join(cur, ".claude", "memory"))) return cur;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

export function readLocalConfig(projectRoot = null) {
  const root = projectRoot ?? findProjectRoot();
  if (!root) return {};
  const p = join(root, ".claude", "memory", "ctxr-dev.config.local.md");
  if (!existsSync(p)) return {};
  const text = readFileSync(p, "utf8");
  const config = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim();
      if (val.startsWith("<") && val.endsWith(">")) val = ""; // template placeholder
      config[key] = val;
    }
  }
  return config;
}

export function parseProjectUrl(url) {
  // https://github.com/orgs/<OWNER>/projects/<NUM>/views/1
  const m = url.match(/github\.com\/orgs\/([^/]+)\/projects\/(\d+)/);
  if (!m) throw new Error(`unparseable project_url: ${url}`);
  return { owner: m[1], number: Number(m[2]) };
}

export function parseRepoSpec(spec) {
  // <OWNER>/<REPO> or full URL
  const repoUrl = spec.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (repoUrl) return { owner: repoUrl[1], repo: repoUrl[2] };
  const slash = spec.split("/");
  if (slash.length === 2) return { owner: slash[0], repo: slash[1] };
  throw new Error(`unparseable repo spec: ${spec}`);
}

export function parseIssueSpec(spec) {
  // <OWNER>/<REPO>#<NUM> or full URL
  const m = spec.match(/^([^/]+)\/([^/#]+)#(\d+)$/);
  if (m) return { owner: m[1], repo: m[2], number: Number(m[3]) };
  const url = spec.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (url) return { owner: url[1], repo: url[2], number: Number(url[3]) };
  throw new Error(`unparseable issue spec: ${spec}`);
}
