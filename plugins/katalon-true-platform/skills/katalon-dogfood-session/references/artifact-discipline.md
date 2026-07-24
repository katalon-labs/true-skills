# Artifact discipline reference

Adapted from lw-test-tower. Keep durable source, generated views, and heavy evidence separate.

## Session layout

```text
sessions/<component>/<session-id>/
  session.md            target intent/issue, scope, environment, process
  context/              starting context: requirements, docs, issue detail
  notes/                compact testing notes for future agents
  test-execution/       run metadata (small Markdown), links to heavy evidence
```

## Rules

- Write durable decisions, context, risks, designs, runs, blockers, and conclusions as **Markdown under the session folder**.
- Keep **large videos, traces, screenshots, and raw tool output out of the data repo** unless the project uses Git LFS or an agreed store. Put them in a workspace artifact store / CI artifacts / release assets and link them.
- Write **small trace metadata Markdown** under the session pointing to the heavy evidence: path or URL, creation time, related session, environment/runner, and one line on what it proves.
- Treat any generated/combined views as **read-only**; never use them to choose the active session or state.

## Captured reference flows

- Call a QA-recorded reusable source a **reference flow**, not a "happy path".
- Store captured session JSON as source evidence; store the human-readable Markdown beside it as a derived view.
- **Require human review before promoting a candidate to an approved reference flow.** Keep the working-session source as provenance.
- Store approved reference flows in a separate flow library, not inside the capture-evidence folder.

## Source tags

Tag cases, flows, and defects with the compact source key of the intent/issue (`product-980`, `KSR-11468`, `source:dogfood`) so every artifact traces to its origin.

## What NOT to port from lw-test-tower

- The repo's Node tooling (session-combine, flow-register, regression-runner, mirror-sync) is data-project-specific. The equivalent capability lives in `katalon-playwright-execute` / `playwright-to-true`. Do not require that tooling to use this skill.
- The SCXML process-pack formalism is unnecessary here; the numbered workflow above is the state model.
