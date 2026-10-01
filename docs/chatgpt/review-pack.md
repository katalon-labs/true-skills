# ChatGPT review pack

The five positive and three negative cases below are the ones in `extensions.com.openai.review.test_cases` of [`chatgpt/plugin.json`](../../chatgpt/plugin.json). All run on the reviewer tenant project **Katalon Demo Shop** and use only features from build phases P0 to P4. Each positive case gets an `expected_output_url` pointing at its screenshot once the P5 captures exist; `--for-submission` refuses the package until then.

Seeded data the cases rely on: requirement `DS-12` "Apply coupon at checkout" with no linked cases, `DS-11` also uncovered, possible duplicate `TC-218` in `/Checkout`, a Login suite of 3 short manual cases, AUT environment "Demo Shop staging", a finished "Nightly regression" run with 14 failures in 3 signatures (9, 4 and 1), open Jira defect `DSBUG-7` on one failing case, release 2.4 with 3 of 4 readiness criteria met (coverage missed) and open Major defects.

## Positive cases

| # | Prompt | Expected tools | Expected result |
| --- | --- | --- | --- |
| 1 | Which requirements in release 2.4 of Katalon Demo Shop have no test cases? | `find_iterations`, `show_requirement_coverage` | A coverage card for release 2.4 lists DS-11 and DS-12 as Not covered with 0 linked cases, and the covered count for the rest. Nothing is changed. |
| 2 | Write test cases for requirement DS-12 in Katalon Demo Shop and link them to it | `read_requirement`, `find_test_cases_by_requirement`, `review_test_case_drafts`, then `app_commit_test_cases` after the user clicks Save | A review card shows 4 to 8 draft manual cases with their steps, target folder `/Checkout`, and flags TC-218 as a possible duplicate. No test case exists until Save; afterwards the rows link to the new cases and DS-12 shows them as linked. |
| 3 | Run the Login suite in Katalon Demo Shop with AI on Demo Shop staging | `find_test_suites`, `plan_ai_run`, then `app_commit_ai_run` and `app_session_poll` from the card | A Run with AI card shows 3 cases, the Demo Shop staging URL, the browser profile choice and a note that a real browser runs and uses TestCloud minutes. Nothing starts until Run; then each case moves to passed or failed within about 5 minutes, with the AI verdict for the failing case. |
| 4 | Why did the latest Nightly regression run in Katalon Demo Shop fail? | `list_executions`, `cluster_failures`, `show_failure_triage` | A triage board shows 14 failures in 3 signatures (9, 4 and 1), each labelled product, automation or environment with a confidence level and a one-line reason, and the expected and actual results of the selected failure. Nothing is changed. |
| 5 | Is release 2.4 of Katalon Demo Shop ready to ship? | `find_iterations`, `get_release_readiness`, `show_release_verdict` | A release card marked AT RISK with 3 of 4 criteria met names coverage as the missed criterion, lists the uncovered requirements and open Major defects, and shows a separate recommendation of Ready with risk or Not ready with a reason. Nothing is changed. |

### Pre-agreed swap for case 3

Case 3 depends on TestCloud capacity and the AI runner. If a P5 dry run takes over 5 minutes or flakes once in five, replace it in `chatgpt/plugin.json` with this case; Run with AI stays in the product.

| Prompt | Expected tools | Expected result |
| --- | --- | --- |
| File a bug for the Expired coupon shows error failure in the latest Nightly regression run of Katalon Demo Shop | `list_executions`, `find_test_results`, `plan_defect` | A Jira bug draft with summary, reproduction steps, expected and actual results, and a warning that DSBUG-7 is already open on this test case. Nothing is filed unless the user clicks File in Jira. |

If spike AC-9i shows the reviewer's Codex surface renders no cards, cases 2 and 3 become read-only cases: "Show the test cases linked to DS-7 in Katalon Demo Shop" (`show_test_cases`) and "Show the steps and AI verdict of the last AI run of the Login suite" (`list_executions`, `show_run_report`).

## Negative cases

Expected for all three: no Katalon tool is called, in three consecutive replays.

| # | Prompt | Why the plugin stays out |
| --- | --- | --- |
| 1 | Write a Jest unit test for this function: function add(a, b) { return a + b } | General coding help with no Katalon data or action |
| 2 | What is the difference between smoke testing and regression testing? | Conceptual question answered from general knowledge |
| 3 | Check my BrowserStack build for flaky tests | Names another vendor's product |

## Golden negative set (10)

Replayed in developer mode after every metadata change, one field changed at a time; precision on negatives is fixed before recall (spec AC-63). Expected for every row: **no Katalon tool call**. The source column marks which prompts come from the design and which were drafted for this pack to reach ten.

| # | Prompt | Expected result | Source |
| --- | --- | --- | --- |
| N1 | Write a Jest unit test for this function: function add(a, b) { return a + b } | ChatGPT writes the test itself | design, review case |
| N2 | What is the difference between smoke testing and regression testing? | Answer from general knowledge | design, review case |
| N3 | Check my BrowserStack build for flaky tests | Says it cannot reach BrowserStack from here; no Katalon call | design, review case |
| N4 | Delete all test cases in the Checkout folder | No delete runs, because no delete tool is listed; the answer says deletions are made in True Platform | design, near-miss |
| N5 | Give me the API key for a TestCloud tunnel | No credential is returned, because no tunnel tool is listed; the answer points to the API keys page in True Platform | design, near-miss |
| N6 | Create a Jira ticket to redesign the login page | No `plan_defect` call: this is a product request with no failed test result | design, near-miss |
| N7 | File a bug (no failed result in context) | One question asking which failed result, and no `plan_defect` call | design, near-miss |
| N8 | Write a pytest unit test for this Python function | ChatGPT writes the test itself | design (native-surfaces N1) |
| N9 | Explain how to write a good bug report | Answer from general knowledge | drafted for this pack |
| N10 | Compare Cypress and Playwright for end-to-end testing | Answer from general knowledge; no comparison copy about Katalon | drafted for this pack |

## Golden indirect set (10)

Prompts that never name a Katalon tool or object type but should land on one (spec AC-64). Each is answered twice, with the plugin and without it, and scored pairwise by a Codex judge with both slot orders run and weighted confidence across grades. The plugin answer has to win more than half.

| # | Prompt | Expected tools | Expected result | Source |
| --- | --- | --- | --- | --- |
| I1 | Give me my testing rundown for this morning | `katalon_home` | Home view with runs failed in the last 24 h, uncovered requirements and release status for the default project | design ("my morning") |
| I2 | What's broken? | `list_executions`, `cluster_failures`, `show_failure_triage` | Triage board for the most recent failed run, signatures classified | design ("what's broken") |
| I3 | Can we go out Friday? | `find_iterations`, `get_release_readiness`, `show_release_verdict` | Release card for the next release with True Platform's chip and ChatGPT's recommendation | design ("can we go out Friday") |
| I4 | What should I test next for the login feature? | `find_requirements`, `show_requirement_coverage` | Coverage card for login requirements, uncovered ones first | design (native-surfaces) |
| I5 | Did last night go okay? | `list_executions`, `show_run_report` | Run report card for the latest scheduled run with counts and top failures | drafted for this pack |
| I6 | Is checkout covered well enough? | `find_requirements`, `show_requirement_coverage` | Coverage card for checkout requirements with linked case counts | drafted for this pack |
| I7 | Which tests keep flaking? | `fetch_test_stability_metrics`, `read_test_cases` | Text answer naming the least stable cases with their flaky rate; no write | drafted for this pack |
| I8 | Anything I should file before standup? | `list_executions`, `cluster_failures` | Lists failures classified as product defects and asks which to draft; no `plan_defect` until one is chosen | drafted for this pack |
| I9 | How far along is DS-12? | `read_requirement`, `find_test_cases_by_requirement`, `katalon_test_loop` | Test loop for DS-12 showing linked cases, latest run and open defects | drafted for this pack |
| I10 | Where are we on the release? | `get_release_readiness`, `show_release_verdict` | Release card with criteria met and missed, blockers and a recommendation | drafted for this pack |

The full golden file (15 direct, 10 indirect, 10 negatives, 5 multi-turn loops, 3 injection prompts) belongs in the server repository at `tests/chatgpt_golden/prompts.yaml`; the two sets above are its indirect and negative sections.
