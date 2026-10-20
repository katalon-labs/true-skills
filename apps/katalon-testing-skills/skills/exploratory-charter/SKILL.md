---
name: exploratory-charter
description: Writes, runs, and debriefs timeboxed exploratory testing charters for Katalon True Platform (formerly TestOps). Records the outcome as session notes, optional manual results with uploaded evidence, and promoted test cases. Use when no script exists and the job is learning about a feature, rather than designing cases from a written requirement (create-test-cases) or triaging a failed run (analyze-failures). For the manual tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access. A browser or Playwright is needed to drive the application under test.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Exploratory Charter

This skill covers the unscripted part of test design. You run a timeboxed session that learns what the written requirement does not say. Then you turn the findings into scripted coverage. A charter is not a test case. A session is not a test run. The value is the learning plus the promotion. A session with no notes and no promoted cases has failed, even if nothing crashed.

Treat the human as a tool. Ask when the area, the timebox, the environment, or the risk appetite cannot be resolved safely. Never invent an oracle. Tool names below are bare. Clients add a prefix (Claude Code: `mcp__<server>__<tool>`).

## What the MCP can and cannot do

There is no exploratory session object in the platform. Say so before you promise to "run a session in Katalon".

- **Can read:** scope (`list_projects`, `list_repositories`), oracles you already have (`find_requirements`, `read_requirement`, `get_requirement_insights`), existing coverage (`find_test_cases`, `find_test_cases_by_requirement`), defect patterns for the area (`get_defect_insights`), and the target environment (`read_auts`).
- **Can write:** the outcome (`manage_test_folder`, `create_test_case`, `link_requirements_to_test_case`, `manage_test_suite`, `read_test_suite`), manual results for promoted cases (`update_test_results`), and evidence files (`prepare_artifact_upload`, then `confirm_artifact_upload`).
- **Cannot do:** hold a charter or session entity, time a session, tag a case as exploratory, or create a requirement for behavior the session found. No tool sees the application. Every observation comes from a browser you drive yourself. Use a browser tool or Playwright for the product and the MCP for the platform records.
- **Where the charter lives:** write the charter and the session sheet as a local artifact the user keeps. Optionally mirror the charter into the platform as one test case in the charter folder, with the mission in Description and the session log in Steps. Say which you did.

Read `references/write-policy.md` before any write. Read `references/charter-and-session.md` before you write a charter.

## Filing a finding

A session has no test result. `create_defect` needs a failed test result ID. Two paths exist.

1. **Direct.** File the finding in Jira or Azure DevOps. This path needs no run.
2. **Linked.** Promote the finding to a case, run it, and file from the failed result.
   1. Create the case (hand to `create-test-cases`).
   2. Start a manual run for it after the user confirms. This consumes capacity. Hand the run to `execute-test`.
   3. Reproduce the bug during the run. Record the result you observed with `update_test_results`. The tool needs an active run assigned to you. Treat only an `applied` or `unchanged` outcome as success.
   4. Upload evidence (see "Evidence").
   5. Find the ALM integration with `find_alm_integration_projects`. Show the user the defect summary. Get a yes. Then call `create_defect` with the failed result ID.
   6. Read the result back.

Offer the direct path when the user has no ALM integration, or when the bug does not reproduce on demand. Never record a failed result for a bug you did not reproduce.

## Evidence

Evidence capture stays with the tester. The MCP only stores the files.

- Capture screenshots, recordings, and HAR files from the browser you drive.
- Remove personal data and credentials first. A HAR file holds cookies and tokens. Strip them or skip the file.
- Call `prepare_artifact_upload` for each file of 10 MiB or less. Upload the file to the signed URL the tool returns. Then call `confirm_artifact_upload`. It returns an artifact ID.
- Attach the artifact ID where the `update_test_results` schema accepts one. If the schema offers no field, put the artifact reference in the defect description.
- Files over 10 MiB, such as long recordings, go into the tracker ticket. Reference the ticket ID from the finding.

## Session workflow

```text
+------------------+     +------------------+     +------------------+
| Frame the area   | --> | Write charter    | --> | Run the timebox  |
| scope + coverage |     | mission/oracles  |     | notes as you go  |
+------------------+     +------------------+     +------------------+
                                                           |
                                                           v
+------------------+     +------------------+     +------------------+
| Promote to cases | <-- | Debrief          | <-- | Classify findings|
| hand to authoring|     | timebox account  |     | oracle broken    |
+------------------+     +------------------+     +------------------+
```

## Steps and tool rules

1. **Resolve scope and existing coverage.** Call `list_projects`, then `list_repositories`. Call `find_test_cases` on the area keywords, and `find_test_cases_by_requirement` when a requirement key is known. Coverage is an input to the charter. An area with twenty cases is a poor use of the timebox. Point the charter at the gaps. Also check `get_defect_insights` for the area. A history of confirmed defects outweighs a hunch.
2. **Write the charter before you touch the application.** All fields are required. Show the charter to the user and get one confirmation. A charter without an oracle is a browsing session. Refuse to start until at least one oracle is named.
3. **Choose the tours.** Pick two or three from `references/oracles-and-tours.md`. Name them in the charter so another tester can repeat the session.
4. **Run the timebox and take notes as you go.** Timestamp and type every note: `SETUP`, `OBS`, `Q`, `BUG`, `RISK`, `IDEA`. A `BUG` needs its repro steps. Write them before you move on. Confirm the environment with `read_auts` or the user before the first action.
5. **Stop when the timebox ends.** Record the accounting: minutes on charter, minutes on bug investigation and writeup, minutes on setup. A session that spent 40 of 60 minutes on setup is a finding about the environment. Report it as one.
6. **Classify every finding against the oracle it broke.** The classes are product defect, test-data or environment issue, question for the product owner, and design risk. A finding with no broken oracle is an observation. Say so.
7. **Debrief.** Report the mission, what was covered, what was not reached, the findings by class, the timebox accounting, and the next charter.
8. **Promote, then hand off.** Turn confirmed findings into a promotion list: title, priority, requirement link if one exists, one-line expected result. Call `manage_test_folder` to create or reuse the charter folder. Hand authoring to `create-test-cases`. It owns duplicate checks, atomic-case rules, and import. Add the promoted cases to the right suite with `manage_test_suite` and confirm with `read_test_suite`. Offer to run them and record results (see "Filing a finding").

## Hard rules

- **No oracle, no charter.** Name at least one checkable oracle before the timebox starts. "It feels wrong" is not an oracle.
- **The timebox ends the session.** When ideas outrun the clock, you have two charters. Split them.
- **A `BUG` note carries its repro, or it is an `OBS`.** Write the reproduction while the state is on screen.
- **A finding with no broken oracle is not a defect.** Report it as a question or a risk.
- **Confirm before you explore production.** Get explicit confirmation of the environment first.
- **Confirm before any run, result, or defect write.** Runs use capacity. Defects write to an external tracker.

## Naming and platform constraints

- Test case and folder names accept only letters, numbers, spaces, and `( ) . , _ -`. Charter titles tend to carry colons. A colon is rejected. Write `CH-01 Explore guest checkout with expired card`. Folder paths may use `/`.
- No tag or custom field marks exploratory origin. Use the naming convention and the folder together. Folder: `Exploratory / <charter id> <short mission>`. Prefix promoted case titles with the charter id.
- Prefer `update_test_case` over delete and recreate when a later session revises a promoted case. `delete_test_case` is unreliable. Updating keeps IDs, links, and history.

## Worked example

**User asks:** *We shipped guest checkout last week with no cases for it. Run an hour of exploratory testing on the payment step in Cellphone Shop and tell me what to write up.*

**Step 1, scope and coverage.**

```text
list_projects            -> Cellphone Shop (id 4021), Demo Bank (id 3980)
list_repositories        -> Katalon Cloud (id 118)   [exactly one, so use it]
find_requirements "CEL"  -> CEL-6 Guest checkout (synced from Jira)
find_test_cases_by_requirement CEL-6
                         -> 4 cases, all on the cart step, none on payment
```

The payment step has no coverage. It is worth the timebox.

**Step 2, the charter, confirmed with the user before starting.**

```text
CHARTER      CH-01
Mission      Explore guest checkout payment with declined, expired, and
             mistyped cards, to discover error-handling and cart-state defects
Areas        Payment form, order confirmation, cart persistence, email receipt
Oracles      CEL-6 acceptance lines 3 and 4 (an unsuccessful payment keeps
             the cart intact and shows a retry message)
             Consistency with the logged-in checkout flow, which is covered
             Consistency with purpose (no order record means no charge)
             The payment provider's published test-card behavior
Tours        Error-message tour, then money tour
Timebox      60 minutes, one tester, staging
Out of scope Saved cards, subscriptions, refunds, mobile web
Done when    Every declined-card path has a recorded outcome and every
             finding is classified
```

**Step 4, session sheet excerpt.**

```text
00:00 SETUP  Staging reachable, cart seeded with 1 phone, provider test keys present
00:07 OBS    CVV field accepts 5 digits without complaint, submit still enabled
00:09 BUG-1  Expired card 01/24 -> spinner 41s -> blank page. Back button shows an
             EMPTY cart. No order in Orders. No charge on the provider dashboard.
             Repro 3/3. Oracle broken: CEL-6 line 3, cart must survive a decline
00:24 Q-1    Is a 5-digit CVV meant to be accepted, or is the provider silently
             truncating? No acceptance line covers CVV length
00:31 BUG-2  Declined card shows the raw provider string "card_declined" instead
             of a user message. Oracle broken: CEL-6 line 4
00:38 RISK-1 Retrying after a decline re-submits the same idempotency key. Could
             double-charge under a slow network. Not reproduced in the timebox
00:52 OBS    Receipt email never arrives for guest orders. Out of scope, logged
01:00 STOP
```

**Step 5, timebox accounting.** 44 minutes on charter, 11 on bug investigation and writeup, 5 on setup.

**Step 6, findings.**

| ID | Class | Oracle broken | Severity | Promote |
|---|---|---|---|---|
| BUG-1 | product defect | CEL-6 line 3 | P0 | yes, 2 cases |
| BUG-2 | product defect | CEL-6 line 4 | P1 | yes, 1 case |
| Q-1 | question for the product owner | none, the rule does not exist | n/a | no, ask first |
| RISK-1 | design risk, unreproduced | none yet | n/a | no, next charter |

**Step 8, promotion list handed to `create-test-cases`.**

```text
CH-01 Guest checkout keeps the cart after an expired card is declined   P0  CEL-6
CH-01 Guest checkout shows a retry message after a decline              P0  CEL-6
CH-01 Guest checkout shows a readable message instead of a provider code P1  CEL-6
```

```text
find_test_cases "checkout expired card"  -> 0 matches   [dedupe before create]
manage_test_folder create "Exploratory / CH-01 Guest checkout payment"
                                         -> folder id 9134
-> hand to create-test-cases for create_test_case x3 + link_requirements_to_test_case
manage_test_suite add the 3 cases to "CEL-6 Regression"
read_test_suite                          -> 7 cases, 3 new   [confirmed]
```

**Expected report back to the user.** Name each item. A report with no filing line is incomplete.

```text
Charter CH-01, guest checkout payment, 60 minutes on staging. Timebox: 44 charter / 11 writeup / 5 setup.
Findings: 2 product defects (BUG-1 P0 cart lost on decline, BUG-2 P1 raw provider string),
  1 open question (CVV length, no acceptance line covers it), 1 unreproduced risk (duplicate idempotency key).
Promoted: 3 cases under folder 9134 "Exploratory / CH-01 Guest checkout payment", added to the CEL-6
  Regression suite. read_test_suite confirms 7 cases, 3 new.
Not reached: email receipt path, out of scope by the charter.
Next charter: CH-02, retry and idempotency under a slow network, 45 minutes.
Filing: no defect is filed yet. Two options. (1) File BUG-1 and BUG-2 in Jira directly.
  (2) Start a manual run of the 3 promoted cases, reproduce each bug and record the failed result with
  evidence, then file from the failed result with create_defect. Option 2 needs your yes for the run
  and again for each defect.
```

## Prompt recipes

- `Run a 60 minute exploratory charter on guest checkout payment in Cellphone Shop and give me the findings.`
- `Write a charter for the new search filters. I have no requirement, just the feature.`
- `Debrief my session notes below and tell me which findings should become test cases.`
- `We have an hour before the release. Which area is worth exploring given current coverage?`
- `Which of these findings are real defects and which are just observations?`
- `Record the failed result for the promoted cases and file the defects with my screenshots attached.`

## Hand-offs

- Promoted cases to author, dedupe, and import: `create-test-cases`.
- The data a promoted case needs before anyone can run it: `test-data`.
- Running the promoted cases, by hand or with AI, and recording results: `execute-test`.
- A red run with a result ID already: `analyze-failures`. This skill owns findings that have no result ID yet.
- A charter programme across a sprint or release: `test-plan`.
- Coverage gaps across the repository: `test-management`.

Read `references/charter-and-session.md` before writing a charter, and `references/oracles-and-tours.md` before choosing how to explore.
