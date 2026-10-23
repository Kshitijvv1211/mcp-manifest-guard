#!/usr/bin/env node
// mcp-manifest-guard CLI. Works on the JSON from an MCP `tools/list` call
// (either the full result { tools: [...] } or just the array).
//
//   mcp-manifest-guard pin    tools.json            > pin.json
//   mcp-manifest-guard verify pin.json tools.json   (exit 1 if changed or poisoned)
//   mcp-manifest-guard scan   tools.json            (exit 1 if anything is found)
import { readFileSync } from 'node:fs';
import { pinManifest, verifyManifest, scanTools } from './index.js';

const load = (f) => {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  return Array.isArray(j) ? j : j.tools ?? j.result?.tools ?? [];
};
const [cmd, a, b] = process.argv.slice(2);
const print = (v) => console.log(JSON.stringify(v, null, 2));

if (cmd === 'pin' && a) {
  print({ ...pinManifest(load(a)), pinned_at: new Date().toISOString() });
} else if (cmd === 'verify' && a && b) {
  const pin = JSON.parse(readFileSync(a, 'utf8'));
  const tools = load(b);
  const v = verifyManifest(pin, tools);
  const findings = scanTools(tools);
  print({ ...v, findings });
  process.exit(v.ok && !findings.length ? 0 : 1);
} else if (cmd === 'scan' && a) {
  const findings = scanTools(load(a));
  print({ findings });
  process.exit(findings.length ? 1 : 0);
} else {
  console.error('usage: mcp-manifest-guard pin <tools.json> | verify <pin.json> <tools.json> | scan <tools.json>');
  process.exit(2);
}
