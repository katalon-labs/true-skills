---
name: katalon-dogfood-session
description: Run a durable dogfooding / test-of session that uses Katalon True Platform to test a Katalon product build (or any product) end to end, with a working-session record and a human review gate. Use when you need to take a product intent or issue key, open a persistent testing session, gather context, design atomic cases, run them (manual AI plus optional Playwright code lane), cross-verify the AI self-report against code-lane ground truth, file defects back with a source tag, and keep durable evidence. Adapted from the lw-test-tower working-session model. For a single stateless requirement-to-execution pass use katalon-trueplatform-testing instead.
---

# Katalon Dogfood Session

Use this skill for **test-of / dogfooding**: exercising a product build through Katalon True Platform as a durable, resumable working session. It wraps the lifecycle skills with a session record, a cross-lane trust check, and a human-review gate. It is heavier than the stateless orchestrator on purpose — use it for multi-day or high-stakes test-of work.

## Availability Boundary

- **Uses every lifecycle skill** through the Katalon MCP; same boundaries apply (no create-requirement, no guaranteed Run-with-AI completion, no AUT inspection via MCP — use Browser/Playwright).
- **The session record is a local project convention**, not an MCP feature. Keep durable Markdown in the repo; keep heavy evidence (videos, traces) out of git (see `references/artifact-discipline.md`).
- **Cross-lane verify is a discipline, not a tool:** never trust a manual AI-run self-reported PASS/FAIL for a critical case without a code-lane (Playwright) or human check.

## Session Workflow

```text
+------------------+   +------------------+   +------------------+   +------------------+
| Pick intent/issue| ->| Open session +   | ->| Design atomic    | ->| Run: manual AI + |
| product-980 /    |   | gather context   |   | cases            |   | optional PW lane |
| KSR-11468        |   |                  |   |                  |   |                  |
+------------------+   +------------------+   +------------------+   +------------------+
                                                                              |
                                                                              v
+------------------+   +------------------+   +------------------+   +------------------+
| Human review gate| <-| File defects w/  | <-| Cross-verify AI  | <-| Collect evidence |
| promote refs     |   | source:dogfood   |   | vs code-lane     |   |                  |
+------------------+   +------------------+   +------------------+   +------------------+
```

## Steps and tool rules

1. **Pick the target.** A product intent or issue key (e.g. `product-980`, `KSR-11468`) drives the session and tags every artifact for traceability.
2. **Open a session record.** Create `sessions/<component>/<session-id>/` with `session.md` (target, scope, environment), `context/`, and `notes/`. Search any existing local test-case mirror or platform cases first (reuse before create).
3. **Gather context.** Requirements/docs/issue detail; resolve project/repository/AUT via `list_projects`/`list_repositories`/`read_auts`.
4. **Design atomic cases** with `katalon-create-test-cases` (ISTQB-as-reference, one validation per case, plain-English steps per `references/qa-artifact-writing.md`).
5. **Run both lanes when the case is critical.** Manual AI lane via `katalon-execute-test`; code lane via `katalon-test-case-to-playwright-script` + `katalon-playwright-execute`.
6. **Cross-verify.** Compare the manual AI self-report against code-lane ground truth. A self-reported PASS that the code lane (or a human) contradicts is **not** a PASS — record the discrepancy.
7. **File defects back** with `katalon-analyze-failures`, tagging each with the source key (`source:dogfood`, `product-980`). Only product defects, only with a failed result ID.
8. **Human review gate.** Before promoting a captured reference flow or approved case to shared knowledge, a human approves it. Keep the working-session source as provenance.
9. **Keep evidence disciplined** (see `references/artifact-discipline.md`): durable Markdown in the session; heavy media out of git with a metadata pointer.

## Prompt recipes

- `Dogfood product-980 on the demo tenant: open a session, design cases, run manual AI + Playwright, and cross-verify before trusting any pass.`
- `Test-of KSR-11468 end to end and file any real product bug back with a dogfood source tag.`
- `Resume dogfood session <id>: re-run the failed cases and update the session record.`

## Hand-offs

Every lifecycle skill: plan -> `katalon-test-plan`; design -> `katalon-create-test-cases`; run -> `katalon-execute-test` / `katalon-playwright-execute`; triage -> `katalon-analyze-failures`; ship call -> `katalon-release-analyze`.

Read `references/artifact-discipline.md` and `references/qa-artifact-writing.md` before writing session artifacts.
