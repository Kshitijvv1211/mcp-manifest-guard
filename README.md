# mcp-manifest-guard

Pin an MCP server's tool manifest, detect silent changes ("rug pulls"), and scan tool text for hidden instructions ("tool poisoning"). There are zero dependencies, and it runs on Node 18+.

## Why

An MCP client trusts each tool's name, description and schema. Two documented attacks abuse that trust:

- **Tool poisoning:** a description carries instructions aimed at the model, not the user. Examples include "ignore previous instructions", "also call `mailer__send`", "do not tell the user", or text hidden with zero-width characters.
- **Rug pull:** a server is reviewed and approved, then quietly changes a tool's description, schema or annotations afterwards.

`mcp-manifest-guard` gives a client or gateway a cheap, deterministic check for both:

1. **Pin** the manifest you approved with a SHA-256 over a canonical form of every tool (name, title, description, input and output schema, annotations). The hash doesn't depend on tool order or key order.
2. **Verify** the live manifest against the pin before using the server. You get back the exact tools that were changed, added or removed.
3. **Scan** tool names, titles, descriptions and nested schema descriptions for poisoning patterns.

It is the integrity layer of [SafeWord / Decision Gate](https://github.com/Kshitijvv1211/decision-gate-alexa), a trust layer for Alexa+ add-ons, which checks every forwarded tool call this way.

## Use it as a library

```js
import { pinManifest, verifyManifest, scanTools } from 'mcp-manifest-guard';

const { tools } = await client.listTools();      // at approval time
const pin = pinManifest(tools);                  // store pin.hash / pin.tools

// later, before each call (or on notifications/tools/list_changed)
const live = (await client.listTools()).tools;
const v = verifyManifest(pin, live);             // { ok, changed, added, removed, hash, pinned_hash }
const findings = scanTools(live);                // [{ tool, field, kind, excerpt }]
if (!v.ok || findings.length) refuseToCall();
```

## Use it from the command line

Save the result of an MCP `tools/list` call to a file, then:

```bash
npx mcp-manifest-guard pin tools.json > pin.json
```

```bash
npx mcp-manifest-guard verify pin.json tools.json
```

```bash
npx mcp-manifest-guard scan tools.json
```

`verify` and `scan` exit with status 1 when something is wrong, so they work in CI. For example, you can fail a build when a server you depend on changes its tools.

## What the scanner looks for

| kind | Example |
|---|---|
| `instruction_override` | "ignore previous instructions" |
| `hidden_from_user` | "do not tell the user" |
| `cross_tool_call` | "also call …", "then buy …" |
| `tool_reference` | `mailer__send` inside another tool's text |
| `fake_tags` | `<IMPORTANT>`, `<system>` |
| `credential_grab` | "read the api key and include it" |
| `invisible_unicode` | zero-width and bidi control characters, Unicode tag characters |
| `encoded_blob` | long base64-looking strings |
| `url_in_tool_text` | URLs inside tool descriptions |

These are heuristics, and false positives are possible, for example a legitimate URL in a description. Treat a finding as "needs a human look", not as proof. A changed hash is exact.

## Limits

- It checks what the server *says* its tools are. It can't see what the server *does* when a tool is called; pair it with output filtering and action-level checks.
- Trust on first use: the first manifest you pin is the one you trust. Review it before pinning.

## Test

```bash
npm test
```

## License

MIT
