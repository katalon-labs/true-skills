# Changelog

## 0.5.0 (2026-10-20)

### Breaking changes

- Skills use the October 2026 Katalon MCP tool names. `create_manual_test_run` and `schedule_test_run` are replaced by `create_test_run` with `mode: "manual"` or `mode: "automated"`. The `fetch_*_data` tools are replaced by `get_requirement_insights`, `get_defect_insights`, `get_test_case_insights`, `get_test_configuration_insights`, `analyze_test_case_stability`, and `analyze_test_flakiness`.
- The build no longer writes `.cursor/rules/`, `.kiro/steering/`, `.windsurf/rules/`, `.clinerules/`, `.github/prompts/`, or `.github/skills/`. Each agent reads skills from a native skills folder. This removes about 1.6 MB of duplicate text and fixes 10 Windsurf rule files that went over the 12,000-character limit.
- Run with AI no longer starts automatically. `create_test_run`, `create_manual_ai_session`, and `rerun_execution` need a confirmation that names the suite, the AUT environment, the mode, the schedule, and the private network setup.

### MCP live alignment

- `docs/mcp-tools.json` now follows the live `tools/list` of platform.katalon.io, captured 2026-10-20: 74 tools. It supersedes the 71-tool docs-page contract named in the entries below. `node scripts/check-mcp-live.mjs` reports no missing and no new tools. 15 names from the docs page are not live and sit in `retired`.
- `read_test_case` is now `read_test_cases` (`test_case_ids` array, `content_type` FLOW for steps).
- `update_test_case` is now `update_test_cases` (`repository_id` required, one action per field in an `updates` array).
- `link_requirements_to_test_case` and `unlink_requirements_from_test_case` are now `manage_requirement_test_case_linkages` with `action` link or unlink.
- `read_test_result` and `read_execution_test_results` are now `find_test_results` with `filter_type` TEST_RESULT or EXECUTION.
- `get_requirement_insights`, `get_defect_insights`, `get_test_case_insights`, and `get_test_configuration_insights` are now `fetch_requirement_metrics`, `fetch_defect_metrics`, `fetch_test_case_metrics`, and `fetch_test_configuration_metrics`. The `fetch_*_data` names map to the same `fetch_*_metrics` tools.
- `analyze_test_case_stability` and `analyze_test_flakiness` are now `fetch_test_stability_metrics` with `return_tests` (ALL, FLAKY, ALWAYS_FAIL, NEW_FAILURE, SLOW). There is no `min_runs` parameter.
- `find_alm_integration_projects` is now `list_alm_integrations`.
- `generate_truetest_test_cases_from_sessions` is now `create_truetest_test_case_from_session`.
- `get_user_context` and `read_manual_test_run_detail_by_order` have no live replacement. `get-started` and `platform-setup` use `list_projects` as the connection check. Skills find a run with `list_executions` and `read_execution`.
- `search_external_tool_ops` and `run_external_skill` are absent from the live server. Skills use the tracker connector directly.
- New live tools adopted in skills: `update_test_run` (START, END, CONFIGURE), `create_truetest_test_case_from_flow`, `fetch_defects`, `search`, and the `memory_*` tools (read side only).
- The ChatGPT build rewrites for `get-started` follow the new step text. The packaged copy keeps `katalon_profile` as step 1 and stops after step 5.

### MCP tool contract and validation

- New `docs/mcp-tools.json` holds the tool contract from the October 2026 Katalon docs. It lists 71 tools with group, class (read, write, or destructive), and notes. It also holds a `retired` map for the seven removed names and an allowlist for parameter names that look like tool names.
- The validator parses frontmatter as YAML, including the nested `metadata` block.
- The validator enforces the description contract: 250 to 600 characters, third person, a "Use when" clause, the adjacent skill, the declared roles named verbatim, no colon sequence, no "Written for" tail, and 10,000 characters in total.
- The validator requires `license`, `compatibility`, and `metadata` (`version` 0.5.0, `mcp-contract` katalon-docs-2026-10) in each SKILL.md, and caps SKILL.md at 500 lines.
- The validator fails on a retired tool name in skills, shared references, the ChatGPT package, README, AGENTS, and `docs/`. It also fails on a backticked tool-shaped name that is not in the contract.
- The validator checks that each relative link and each `references/`, `scripts/`, or `assets/` path in a skill resolves inside that skill folder. It warns about reference files that nothing links to.
- The validator scans skill text for fetch-and-execute patterns such as `curl ... | sh`, `bash <(curl ...)`, and `irm ... | iex`.
- New `scripts/check-mcp-live.mjs` compares a `tools/list` dump from a signed-in session with the contract. It reports missing tools, new tools, retired names that are still live, and annotation conflicts.
- New Node fixture tests for the validator, the sync script, and the live diff (`tests/validate-skills.test.mjs`). `python3 -m unittest discover -s tests` runs them.

### Shared references and policies

- New `shared/references/` folder holds one canonical copy of each shared reference. `scripts/sync-shared.mjs` copies each file into the skills in the `SHARED` map under a GENERATED banner. `--check` and the validator fail on drift.
- New `write-policy.md` gives one write rule for every adapter: preview the change set, confirm once, write, then read back. Destructive tools (`delete_test_case`, `delete_test_cloud_app`, `stop_test_cloud_tunnel`, folder or suite DELETE, app alias UPDATE) need a yes that names the target. The file also holds the execution consent rule, the stateless MCP rules, and the terminology.
- `capability-boundaries.md` replaces `unavailable-capabilities.md` and the hand-kept copies. Rerun of a completed execution, schedule read and edit, manual result recording, evidence upload, Test Execution - Cloud apps and tunnels, and TrueTest sessions are now available. Run with AI cancel, stopping a running execution, assignee lookup, and suite collection edits are listed as not available.
- `istqb-coverage.md` starts from risk and treats ISTQB as one toolset next to other coverage methods. It adds checks for AI-drafted cases and for AI features (metamorphic relations, pass thresholds over repeated runs, red-team prompts, drift checks).
- `manual-test-case-format.md`, `requirement-analysis.md`, and `execution-workflow.md` are rewritten with the current tool names.
- Terminology: Katalon True Platform (formerly TestOps), Katalon Test Execution - Local (formerly KRE), and Katalon Test Execution - Cloud (formerly TestCloud).

### Router, onboarding, and setup

- `true-platform-testing` only routes. It picks the entry point by task, role, or lifecycle stage, resolves the project and repository once, applies the consent rules, and hands a context block to the focused skill. The repeated design and execution workflows are removed.
- The router description names one task as the reason to use a focused skill. Role-named requests for one stage now land on the focused skill.
- The tool index is grouped by tool family (workspace, requirements, test assets, execution, results, insights, Test Execution - Cloud, TrueTest), with a class for each tool. The lifecycle map and recipes use the current names. New recipe R7 turns TrueTest sessions into cases.
- `get-started` uses only MCP tools. It confirms the user with `get_user_context`, picks defaults from `list_projects` and `list_repositories`, and reads `read_auts` for the Run with AI target. It saves defaults only when the client has a settings tool.
- `platform-setup` verifies the connection with `get_user_context`, `list_projects`, and `list_repositories`, and points to the per-client page `docs/connect.md`. It pins `mcp-remote@0.14.3` as a fallback only.
- `platform-setup` adds sign-in troubleshooting (registration fallback, `Invalid JWT token format`, the Windsurf 100-tool cap), a tunnel diagnosis reference, and a security note on untrusted page content in Playwright MCP 1.64.

### Execution and report upload

- execute-test: runs use `create_test_run` in both modes, with one consent preview before `create_test_run`, `create_manual_ai_session`, and `rerun_execution`. These calls use Test Execution - Cloud minutes and can change AUT data. The agent always asks for `browser_profile_mode`.
- execute-test: manual results are recorded with `update_test_results`, and evidence is uploaded with `prepare_artifact_upload` and `confirm_artifact_upload` (new reference `manual-results-and-evidence.md`).
- execute-test: new reference `executions-and-schedules.md` covers `list_executions`, `list_execution_outputs` and their two execution ID spaces, `rerun_execution`, `list_schedule`, `read_schedule_detail`, `update_schedule_configuration`, and `read_manual_test_run_detail_by_order`.
- execute-test: new reference `testcloud-and-private-aut.md` covers private AUT access, tunnels, mobile native apps, dynamic apps, and the destructive tools with explicit-yes gates.
- execute-test: the always-green check uses `analyze_test_case_stability` and cross-checks an all-zero answer with `find_test_results`.
- upload-report: the Report Uploader jar version comes from the `katalon-studio/report-uploader` releases page, with a download consent step and no fetch-and-execute.
- upload-report: uploads are verified with `list_executions`, `read_execution`, and `read_execution_test_results` against local counts (new reference `verify-upload.md`). Zero or mismatched counts stay "unverified".
- upload-report: the Studio command uses `-report.folderPath` (Katalon Studio 11.1.2 and later). The skill notes the Playwright 1.59 JUnit `error` element change.
- playwright-execute: pinned to Playwright 1.64 and `@katalon/playwright-reporter` 0.0.3 (checked 2026-10-20). Adds a run-before-report gate, a rule against reruns with no change, flaky reporting, and trace, `errorContext`, and console output as failure evidence.
- playwright-execute: verifies the upload with `list_executions` and `read_execution_test_results`, and adds a Playwright MCP security note.

### Test design and management

- create-test-cases: new reference `from-truetest-sessions.md` builds cases from TrueTest sessions and journey maps with the nine TrueTest tools, an approval gate, a 25-session cap, and PII handling.
- create-test-cases: coverage is ranked by risk first, and the skill reports uncovered gaps.
- create-test-cases: bulk writes follow plan, validate, execute, and read back. New reference `bulk-write-plan.md` holds the plan table and eight validation checks.
- create-test-cases: documents `find_test_suite_collections`, the AUTOMATED type that creates nothing, the rejection of mixed suites, and the missing assignee lookup.
- test-management: uses `get_requirement_insights` and `find_test_suite_collections`, adds a change-plan table and safe-mutation checks, and requires a read-back after link, unlink, move, and suite changes. Deletes need an explicit yes that names the target.
- exploratory-charter: a finding can go through the platform. Promote the finding, run the case, record the result with `update_test_results`, upload evidence, then call `create_defect`. Direct Jira or Azure DevOps filing stays the default alternative.
- exploratory-charter: adds an accessibility tour, an adversarial-input tour for AI features, and an oracle section for AI features (properties, repeat counts, metamorphic pairs).
- test-data: the boundary section lists only real tools. Conditions are ranked by risk before classes are derived, and case edits need one confirmed update set.
- test-data: the worked example uses the documented single-identifier requirement lookup, and captured user sessions count as production data for PII masking.

### Automation

- test-case-to-playwright: new reference `test-agents.md` maps Playwright Test Agents (planner, generator, healer). The manual case replaces the planner. The healer runs only on one named failing test, with guardrails (no weaker assertions, no deleted tests, no unapproved `fixme`, an assertion-count diff, an outcome assertion after a repair).
- test-case-to-playwright: pinned to Playwright 1.64 (checked 2026-10-20) with a version table for 1.56 to 1.64. The locator order is role, label, test id, text, CSS, XPath. Removed APIs (`page.accessibility`, `_react=`, `_vue=`) are banned, and aria snapshot assertions are added.
- test-case-to-playwright: the repeat check is `--repeat-each=5 --retries=0` and is a flake screen only. The mutation check runs only on a local throwaway copy. Framework discovery no longer needs `rg`.
- test-case-to-playwright: adds a review checklist for AI-drafted specs and a security note for Playwright MCP exploration.
- test-case-to-katalon-studio: adds the two missing references, `studio-project-anatomy.md` and `groovy-authoring.md`. Full XML examples move into the anatomy reference, so SKILL.md is shorter.
- test-case-to-katalon-studio: `update_test_case` write-back follows the write policy. Adds an AI-drafted review checklist and a rule to leave `isSelected` unchanged on existing test objects, because Studio self-healing edits those flags.

### Failure analysis, maintenance, and release

- analyze-failures: a flaky label comes from run history on the same build first, and a model only explains the cause. A flaky label that drives a quarantine needs two independent reads.
- analyze-failures: adds `rerun_execution` with a consent gate and a completed-execution limit. A green rerun with no change is flaky evidence and never clears a failure.
- analyze-failures: reads evidence from `list_execution_outputs`, `read_manual_ai_session`, Playwright trace and error context, and JUnit output from Playwright 1.59 or later. Evidence upload is optional.
- analyze-failures: documents the two execution ID spaces and adds a preview and confirm step for defect filing.
- test-maintenance: adds requirement-change impact detection through requirement links.
- test-maintenance: adds healing guardrails (no weaker assertions, no deleted tests, no unapproved `test.fixme()` or skip, an assertion-count diff, an outcome assertion after a healed step, a three-attempt cap, an audit trail) and three healing levels with reviewed change as the default.
- test-maintenance: regeneration hands off to create-test-cases, which can draft from TrueTest sessions. `rerun_execution` can confirm a repair.
- release-analyze: gates use the insights and stability tools, and scope uses `find_iterations`. Adds an evidence freshness rule, a requirement-based impact check with a recall count, an all-zero stability cross-check, and the execution ID space warning.

### Planning, review, estimation, and reporting

- test-plan: the folder and suite are now the "execution scope". The skill no longer claims a sprint or release association, and the iteration name goes in the suite name.
- test-plan: reads schedules with `list_schedule` and `read_schedule_detail`, edits them with `update_schedule_configuration` under the write policy, and reads suite collections with `find_test_suite_collections`.
- test-plan: keeps manual and automated suites separate, adds a recall check for impact-based selection, and adds a note for AI features in scope.
- test-review: the atomicity check asks about one behavior, independent failure, oracle strength, and test data. Assertion count alone no longer flags a case.
- test-review: new reference `ai-review-checklists.md` holds a CT-AI 2.0 checklist for suites that test AI features and a CT-GenAI 1.1 risk checklist for AI-drafted cases.
- test-estimation: best, likely, and worst scenarios plus an optional correlated Monte Carlo simulation (P50, P80, P90 at three correlation values) replace the root-sum-square PERT band. New references `simulation.md` and `worked-example.md`.
- test-reporting: trends use the insights tools per iteration or date range, labeled "as of" the read date. The snapshot file keeps the view as it stood then, and the skill states the cohort-maturity limit.
- test-reporting: effort and duration questions route to test-estimation. New reference `worked-example.md`.

### New skills

- Add the `truetest-journeys` skill. It turns real user traffic captured by TrueTest into test coverage. It lists linked AUTs and tracking environments, searches sessions (31-day window), reads and builds journey maps, compares flows with existing cases, and queues case generation from sessions or one flow after explicit approval. It owns all 10 TrueTest tools.
- The skill polls async map builds with the exact `request_id` and never resubmits after an error or timeout. It treats `STARTED` as queued and reads back before it reports cases.
- New skill `test-environments`: prepares the AUT, browsers, devices, agents, mobile apps and private access before a run. Covers 14 live tools (`read_auts`, `find_execution_profiles`, `list_test_cloud_environments`, `list_test_cloud_agents`, `list_test_cloud_apps`, `get_upload_test_cloud_app_url`, `create_test_cloud_app`, `manage_test_cloud_dynamic_app`, `delete_test_cloud_app`, `list_test_cloud_tunnels`, `prepare_test_cloud_tunnel_start`, `stop_test_cloud_tunnel`, `build_private_local_testing_config`, `build_run_configuration`).
- `test-environments` asks for a typed YES before an app delete, and an explicit yes naming the target before a tunnel stop or a dynamic app UPDATE.
- `test-environments` warns that tunnel setup text can contain API keys and must not be saved, and that the dynamic app UPDATE schema requires `app_name`.
- Add `project-memory` skill: loads team and personal memory once per session with `memory_list`, reads policy and needed records, and applies them with conflict reporting (agent rule over personal memory, then newer record).
- `project-memory` writes memory only when the user asks, in the user's own words, reports `redacted` and `duplicate` results, and points project-wide rules to the Agent Rules screen.
- `project-memory` handles `memory_forget` as a two-step, named, permanent delete and handles truncated listings and `available` false without claiming the team has no conventions.
- Added `truetest-journeys`, `test-environments`, and `project-memory` to the skills config (interface, order) and the shared-reference map. The skill count is now 22.
- The router now tells every session to call `memory_list` once at the start through `project-memory`, and lists the three new skills in its lifecycle table.
- Router references: the lifecycle map and the MCP tool index now route to the new skills. Private-network runs go to `test-environments` first.
- `execute-test` gained a TestPak lifecycle block: `CONFIGURE` limits, the execution-path choice before `START`, `END` defaults to `REJECT`, and no retry with `SKIP` without a yes.
- Shortened 12 skill descriptions so all 22 stay under the 10,000-character budget.
- README skill counts, skills table, and role notes, and `llms.txt`, list the 22 skills.

### Harnesses

- Add `harness/mcp/tools.snapshot.json`: the full input schemas and descriptions of all 74 live Katalon True Platform MCP tools, read from the live connector on 2026-10-20.
- Add a mock Katalon MCP server, `harness/mock-mcp/server.mjs`. It has no dependencies, speaks stdio and Streamable HTTP, validates every call against the tool schema, answers from fixtures and writes a JSONL call log.
- Add default fixtures for all 74 tools (two projects, requirements CEL-6 to CEL-9, test cases, suites, executions with one failed result, TestCloud environments and apps, a TrueTest map with one uncovered flow, project memory).
- Add `harness/mock-mcp/server.test.mjs` (22 `node:test` tests) and `harness/README.md` with the Claude Code config and isolation flags.
- Add workflow evals in `evals/workflow/`: 17 scenarios (`scenarios/*.json`) that check whether an agent follows the consent and ask-first rules of the skills against the mock Katalon MCP server. They cover execute-test (manual TestPak, Run With AI with `browser_profile_mode`, the Run With AI or TestPak question, ending a TestPak with `SKIP`, rerun), create-test-cases, test-management (link, delete), analyze-failures (defect filing, hand-off), test-environments (app delete, tunnel stop, tunnel pick), truetest-journeys (flow, sessions, hand-off) and project-memory (write on request, no write unasked).
- Add `evals/workflow/assert.mjs`. Four rules run on every scenario: no write or destructive tool before a confirming user turn, no unknown tool, valid arguments per the live snapshot, and a call log that matches the transcript. Scenario assertions add ordering, asked-before, user-said-before, read-back, hand-off, called, not-called and says checks.
- Add `evals/workflow/run.mjs`. `--dry` replays 35 recorded runs (17 passing, 18 failing) so CI proves the asserter catches each violation without a model. `--live-model --model <id>` drives `claude -p` against the mock with the plugin dir and the same isolation flags as the routing eval. It never runs by default.
- Add `evals/workflow/assert.test.mjs` (41 `node:test` tests), `evals/workflow/make-recordings.mjs` (regenerates the recordings from the real mock) and `evals/workflow/README.md`.
- Added output-quality evals in `evals/quality/` for create-test-cases, test-review, release-analyze, test-estimation, test-case-to-playwright and analyze-failures. Each skill has 3 scenarios with a fixture file and a rubric of binary checks.
- Added `evals/quality/check.mjs`. It runs the deterministic checks over a saved agent output (markdown or JSON) and prints PASS, FAIL or SKIP for each check. Checks cover the output template, verdict words, case name charset, case shape, grounding of IDs in the fixture, estimation arithmetic, and house style.
- Added `evals/quality/judge.mjs`. It compares two outputs through the command in `QUALITY_JUDGE_CMD`, runs both slot orders, and reports a weighted preference with the slot bias. It gives no absolute score and exits 3 when no judge is configured.
- Added golden samples and a self-test. Each scenario has a good sample that must pass. Each skill has a defective sample that must fail exactly the planted checks. Run `node --test evals/quality/quality.test.mjs`.
- Added 36 routing cases and labels for the new skills truetest-journeys, test-environments and project-memory. Each new skill has 8 owned cases, 2 boundary cases that belong to a neighbouring skill, and 2 near-miss negatives.
- Add `node scripts/harness.mjs` with the subcommands `check`, `mock`, `workflow`, `quality`, `routing`, `test`, and `all`. Every model-free harness runs from one command. A model runs only with `--live-model`.
- The validator now checks that `harness/mcp/tools.snapshot.json` and `docs/mcp-tools.json` list the same tool names. It warns and skips while the snapshot file is absent.
- CI gains a `harness` job that runs `node scripts/harness.mjs all` and the harness and eval unit tests.
- `evals/README.md` documents the workflow, quality, and routing evals and the runner. `CONTRIBUTING.md` gains a Harness section.

### Adapters, packaging, and CI

- New `.agents/skills/` folder. Codex, Cursor, Copilot, Gemini CLI, OpenCode, Amp, Zed, Junie, Factory, Augment, Roo, and Windsurf or Devin Desktop read it with no more setup.
- New `.kiro/skills/` and `.cline/skills/` folders for Kiro and Cline.
- Kiro and Continue connect to the MCP server with a native remote entry. The `mcp-remote` wrapper is a documented fallback only.
- New `.codex/config.toml` with the MCP server entry for trusted Codex projects.
- Codex: the root `plugin.json` and the plugin `plugin.json` carry the interface under `extensions["com.openai"]` and name `get-started` as the onboarding skill. `.codex-plugin/plugin.json` stays as the fallback. Each `agents/openai.yaml` lists the Katalon MCP server as a tool dependency.
- Claude Code plugin manifest adds `displayName`, `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, and `termsOfServiceUrl`. The Claude marketplace adds a top-level `description`, a category, and tags, and drops the duplicate entry `version`.
- The Cursor marketplace entry uses a string `source` and drops the `policy` block. The Cursor plugin manifest drops the Codex `interface` block and adds `logo`.
- New `docs/connect.md` gives an MCP snippet for 13 clients. One `CLIENTS` table in the build script writes the shipped MCP files and this page.
- `AGENTS.md` shrinks from 16.5 KB to about 1.7 KB. The build fails if it reaches 4 KB. `.github/copilot-instructions.md` shrinks to a pointer and an MCP note.
- The version (0.5.0) lives in one constant, `PLUGIN_VERSION`, and every manifest reads it. The root `plugin.json` reads 0.5.0.
- `node scripts/build-adapters.mjs --check` builds into a temp folder and fails on a missing, stale, or retired file.
- ChatGPT package: `chatgpt-tools.md` names the October tools in its not-available row, and the validator checks the tool names in the `chatgpt/plugin.json` review cases. The package build removes client-specific prefix notes from packaged skills and keeps the onboarding rewrite on `katalon_profile`.
- CI runs the shared-reference sync check, the validator, the adapter check, and a clean-tree check that also catches new untracked files. `claude plugin validate --strict` and a skills CLI discovery check run as advisory jobs. Node 22 replaces Node 20.
- README and `llms.txt` point to `docs/connect.md` and `.agents/skills/`. `CONTRIBUTING.md` documents shared references, the version constant, the tool contract, the retired outputs, and the CI steps.
- The Kiro Crew hero image shows the real skill count (it said 18).
- All skills carry `license`, `compatibility`, and `metadata` frontmatter. Descriptions follow the new contract, and persona text moved from the description into the body.
