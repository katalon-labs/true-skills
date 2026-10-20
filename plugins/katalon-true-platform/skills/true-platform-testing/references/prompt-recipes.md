# Prompt recipes and cross-model notes

These skills run on any coding agent and any model tier. Smaller models reason less, so the skills are written to be followed, not interpreted.

## Cross-model design principles

1. **Fixed tool order.** Steps are numbered and the tool sequence is fixed. A small model executes the next numbered call. It does not choose which tool.
2. **Explicit stop conditions.** Every loop says when to stop. Example: poll `read_manual_ai_session` until no case is TODO or IN_TESTING, then stop. Add a maximum wait.
3. **One decision at a time.** Resolve project, then repository, then requirement. Ask only when a value cannot be resolved safely.
4. **Boundary first.** Each skill names what the MCP cannot do, so a weaker model does not invent a create-requirement or a self-heal tool.
5. **Report template.** Each workflow ends with an output shape.
6. **Bare tool names.** Name a tool as the platform names it, such as `create_test_run`. Clients add a prefix.
7. **Ask in chat.** Never rely on a server prompt or on sampling. Carry IDs between calls yourself.

## Small-model guardrails

- Run one recipe at a time. Do not chain every recipe in one prompt.
- Confirm scope (project and repository) before any write.
- After each write, read back with `read_test_case`, `read_test_suite`, or `read_execution` before you move on.
- If a tool errors, report the exact error and stop. Do not retry blindly or invent a workaround.

## Copy-paste prompts by intent

Start: `I just connected Katalon. Get me started.`
Setup: `Set up the Katalon MCP and verify my projects.`
Plan: `Plan testing for sprint 3.2: show coverage gaps and build the executable suite.`
Design: `Design and import atomic manual cases from requirement CEL-6 and link them.`
Manage and trace: `Audit requirement-to-test traceability for project X and list orphan requirements.`
Review: `Review the regression suite for release 3.2 and give a verdict with weak cases.`
Execute: `Run this suite with AI and report pass, fail, and blocked.`
Analyze: `Triage execution 8842: product bug, flaky, or environment, and what to file.`
Release: `Is release 3.2 ready to ship based on the quality data?`
Maintain: `Which cases went flaky this month, and repair or regenerate?`
Cross-verify: `Run this critical suite with AI and with Playwright, then reconcile any disagreement.`
Full chain: `Analyze CEL-6, design and import cases, build a suite, run with AI, and tell me if we can ship.`

## Per-agent notes

- **Copilot, Cursor, Kiro, Windsurf, Cline, Continue:** invoke the skill by name or as `/skill-name`. The MCP tool calls are the same on every client.
- **Codex and ChatGPT:** the plugin declares the MCP server. Follow the numbered steps exactly. They do not depend on the model.
- **Any agent through the AGENTS instruction file:** read it, match the request to a skill description, open that skill's instruction file, and follow it.
