// Thin wrapper around `gh api` so every script speaks the same JSON.
import { spawnSync } from "node:child_process";

export function ghJson(args) {
  const r = spawnSync("gh", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`gh ${args.join(" ")} failed: ${r.stderr}`);
  }
  return JSON.parse(r.stdout);
}

export function ghGraphql(query, variables = {}) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(variables)) {
    if (typeof v === "number") args.push("-F", `${k}=${v}`);
    else args.push("-f", `${k}=${v}`);
  }
  return ghJson(args);
}
