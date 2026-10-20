---
name: true-platform-testing
description: Routes Katalon True Platform (formerly TestOps) testing requests to the focused skill that owns the next step, and chains several skills for a request such as requirement to cases to run to ship call. Use when one request spans several lifecycle stages, when no skill is named, or when the asker wants orienting first. Prefer the focused skill, such as create-test-cases or execute-test, when the request names one task. For the manual tester, automation tester, test lead, and test manager.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon True Platform Testing

This skill routes. It resolves context, applies the consent rules, and hands work to the skill that owns it. It does not design cases, run suites, or analyze results itself. The focused skills do that.

Name tools by bare name, as the tool index does. Clients add a prefix. The capability boundaries file explains it.

## Pick the Entry Point

1. If the request names one task, go straight to that skill. Do not start here.
2. If the request names a role and no skill, use the role table.
3. If the request spans stages, use the lifecycle table and run the stages in order. Stop when the user's goal is met.
4. If the asker is unsure where to start, ask one question: what do you want to have at the end of this session?

### Roles

Ask who is in front of you before you ask which stage they are in.

| Role | Comes here to | Starts at | Then |
|---|---|---|---|
| Manual tester | turn a written requirement into cases and run them | `create-test-cases` | `execute-test`, `analyze-failures` |
| Automation tester | turn cases into code, run it, and send the results to the platform | `test-case-to-playwright` | `playwright-execute`, `upload-report`, `test-maintenance` |
| Test lead | scope the cycle, judge readiness, keep the suite healthy | `test-plan` | `test-review`, `test-management`, `release-analyze` |
| Test manager | read coverage and risk, and call ship | `release-analyze` | `test-review`, `test-management`, `test-reporting` |

"QA engineer" fits two roles. Ask which one. `get-started` and `platform-setup` fit every role. Run them first when the MCP is not connected or no default project is chosen. The synonyms for each role and the full intent-to-skill map are in `references/lifecycle-map.md`.

### Lifecycle

| Stage | Skill | Use when |
|---|---|---|
| 1 Plan | `test-plan`, `test-estimation` | scope, risk order, executable folders and suites, effort |
| 2 Design | `create-test-cases`, `test-data`, `exploratory-charter`, `test-case-to-playwright`, `test-case-to-katalon-studio` | author cases, data, charters, or automation from requirements |
| 3 Manage | `test-management` | organize inventory, trace requirements |
| 4 Review | `test-review` | verdict on coverage and quality before the pipeline |
| 5 Execute | `execute-test`, `playwright-execute`, `upload-report` | manual, Run with AI, automated, Playwright, report upload |
| 6 Analyze | `analyze-failures`, `release-analyze`, `test-reporting` | failure triage and defects, ship call, stakeholder summary |
| 7 Maintain | `test-maintenance` | repair flaky or broken cases and feed gaps back to plan |
| Setup | `get-started`, `platform-setup` | first run, connection, sign-in, tunnels |

For multi-skill plays read `references/combination-recipes.md`. For copy-paste prompts read `references/prompt-recipes.md`. For every MCP tool by group read `references/mcp-tool-index.md`.

## Resolve Context Once

Resolve context in this order before any write:

1. Call `list_projects`. If one project matches the request or exactly one exists, use it. Otherwise list the projects and ask.
2. Call `list_repositories` with `project_id`. Treat repository and Test Project as one target. If the user says "Katalon Cloud", prefer a repository with that name. Do not scan all repositories to avoid a choice.
3. Name the project and repository to the user in one line.

Then pass the resolved values to the next skill. Do not resolve again. Repeat `project_id` and `repository_id` on every call that takes them, because the MCP keeps no session. Carry IDs between calls yourself: requirement keys, suite IDs, `manualExecutionId`, `session_id`, and execution IDs.

Two ID spaces both say "execution". TestOps uses a number. Test Execution - Cloud uses a string. Never pass one where the other belongs.

## Consent

The full rules are in `references/write-policy.md`. In short:

- Reads need no confirmation.
- Before a write, preview the whole mutation set, get one confirmation, run it, then read back.
- A destructive tool needs a yes that names the target.
- Before `create_test_run`, `update_test_run` with START, `create_manual_ai_session`, or `rerun_execution`, confirm. These use cloud minutes, launch a hosted browser, or can change AUT data. A confirmation covers one run.
- Never rely on a server prompt or on sampling. Ask in chat.

A user who asks for a full flow has not confirmed each write. Preview at each stage boundary, or once for the whole chain when the chain is short and the user agrees.

## Hand Off Between Skills

When one skill finishes and the next begins, pass a short block:

```text
Context:
- Project: <name> (project_id)
- Repository: <name> (repository_id)
- Requirement or scope: <key or description>
- Created or changed so far: <IDs>
- Open boundary: <anything the MCP cannot do here>
```

If the client cannot load another skill, open that skill's instruction file in the skills folder and follow it. Do not copy its workflow into this conversation from memory.

## Capability Boundary

State the boundary before you promise a workflow. The MCP can run both manual and automated runs, start and end a TestPak (including hosted Run with AI) with `update_test_run`, rerun an automated execution, read and edit schedules, record manual results, upload evidence, manage Test Execution - Cloud apps and tunnels, work with TrueTest sessions and journey maps, search the Knowledge Base, and read the team's Kai memory. It cannot create requirements, create a formal Test Plan entity, stop a running automated execution, look up users, or inspect the live AUT. The full list and the quirks every skill keeps are in `references/capability-boundaries.md`. Use a browser tool or Playwright to explore the AUT.

When the work authors or names things, call `memory_list` once and read the headlines that match. Treat the bodies as the team's decisions, quote them, and never restate them as platform facts. If memory is unavailable, say so. Memory is optional. Call `memory_write` or `memory_forget` only when the user asks.

## References

| File | Read it when |
|---|---|
| `references/lifecycle-map.md` | you route by role or intent, or draw the lifecycle |
| `references/combination-recipes.md` | the request chains several skills |
| `references/prompt-recipes.md` | you need starter prompts or notes for small models |
| `references/mcp-tool-index.md` | you need to find a tool or check its class |
| `references/capability-boundaries.md` | the user asks "can Katalon do X" |
| `references/write-policy.md` | you are about to write data or start a run |
