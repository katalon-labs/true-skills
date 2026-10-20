---
name: test-review
description: Reviews the coverage, case quality, and reliability of a Katalon True Platform (formerly TestOps) suite before it enters the delivery pipeline. It returns Approve, Approve with fixes, or Reject for pipeline, with the named weak cases and the reason for each. Use when someone must gate a suite before a CI or release run. This is a pre-run gate. The ship decision is release-analyze. For the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Review

This skill covers the review stage. It inspects coverage, case quality, and reliability so weak tests stay out of the pipeline. The test lead gates one suite at a time. The output is a **verdict with named weak cases**, never a metric dump. This skill only reads. It changes nothing on Katalon True Platform (formerly TestOps).

## What the MCP can and cannot do

Tool names are bare. Your client may add a prefix (Claude Code: `mcp__<server>__<tool>`).

- **Available.** Coverage: `fetch_requirement_metrics`, `find_test_cases_by_requirement`, `fetch_test_configuration_metrics`. Quality: `fetch_test_case_metrics`, `read_test_cases`, `search`. Reliability: `fetch_test_stability_metrics`, `find_test_results`. Environment readiness: `read_auts`. Suite contents: `read_test_suite`. Team conventions: `memory_list` and `memory_read`.
- **Not available.** No tool reviews script code, locators, or the Studio object repository. Those are Studio-side. For the code lane, use `test-case-to-playwright` and `playwright-execute`. No tool checks accessibility. Use a browser or Playwright check when the user asks.
- **Not a run.** Review does not start a run. A suite that looks good still needs `execute-test`.

## Review workflow

```text
Coverage review -> Quality review -> Reliability review -> Environment check -> Verdict
 requirements       case design        flaky and erratic      AUT exists        named cases
 configurations     oracle strength    run-count floor
```

## Steps

1. **Read the suite.** Call `list_projects`, `list_repositories`, then `read_test_suite`. Note the case count, the lane (manual or automated), and whether the page is complete. Do not report a partial page as a total. Call `memory_list` once. Read the records that match review, naming, or suite rules with `memory_read`, and quote them in the fix list. If `available` is false, say memory is unavailable. Do not infer that the team has no conventions.
2. **Coverage review.** Call `fetch_requirement_metrics` (`iteration_type`, `iteration_name`) and `find_test_cases_by_requirement` for requirement coverage. Call `fetch_test_configuration_metrics` (a `filter` and `configuration_type` `OS` or `BROWSER`) for browser and platform coverage. State the `coverage_threshold` and `pass_threshold` you used. Flag orphan requirements and under-covered configurations. A link shows that a case exists. It does not show that the case passed. A `search` hit on a requirement is context. It is not a coverage link.
3. **Quality review.** Call `fetch_test_case_metrics` (a `filter` with `filter_type` `ITERATION`, `DATE_RANGE`, or `DEFAULT`) for design signals. Read the cases behind any ambiguous signal with `read_test_cases` and `content_type` `FLOW` for the steps. Call `search` with `types` `["test_case"]` and `include_documents` false to look for duplicate coverage. A strong or exact hit decides "duplicate". A response with `incomplete=true` or a keyword fallback never proves that no duplicate exists. Apply the heuristics in `references/review-rubric.md`. Check each case for one behavior with a strong oracle, clear test data, and an observable expected result.
4. **Reliability review.** Call `fetch_test_stability_metrics` with `filter_type` `EXECUTION` or `ITERATION`, and set `return_tests` to name the flaky, always failing, newly failing, and slow cases. Add `from_date` and `to_date` for a lookback window. The tool lists three cases per category unless you raise `limit_tests`. It has no minimum-run parameter. Call `find_test_results` for recent history and count the runs per case yourself. Label a signal from fewer than about 10 runs as unconfirmed.
5. **Environment readiness.** Call `read_auts` to confirm that an executable AUT exists for the suite. It returns each AUT with its environments and client code.
6. **Verdict.** Give one of **Approve**, **Approve with fixes**, or **Reject for pipeline**. List the cases to fix and why. State the risk of approving with known gaps.

## Verdicts

- **Approve.** Coverage meets the plan. No flaky case sits in the critical path. Expected results are observable.
- **Approve with fixes.** The suite can run. Name each case to fix (flaky, weak oracle, vague expected result) and the owner action.
- **Reject for pipeline.** A critical requirement has no case, or a flaky case sits in the smoke or regression core. Fix these before the suite runs.

## AI features and AI-drafted cases

Two extra checks apply in some suites. Both are in `references/ai-review-checklists.md`.

- The suite tests a feature that uses a model. Use the CT-AI 2.0 checklist.
- Cases were drafted by a model. Use the CT-GenAI 1.1 risk checklist.

## Prompt recipes

- `Review the regression suite for release 3.2. Is it ready for the pipeline? Give a verdict and the weak cases.`
- `Check requirement and configuration coverage for project X and flag anything under-covered.`
- `Which cases in the smoke suite are flaky enough to reject before we wire them into CI?`
- `This suite tests our chat assistant. What should the review check that a normal suite does not?`

## Hand-offs

- Redesign or add cases -> `create-test-cases`.
- Repair flaky or broken cases -> `test-maintenance`.
- Approved suite -> `execute-test`.
- Scope or priority questions -> `test-plan`.
- Ship decision after execution -> `release-analyze`.

Read `references/review-rubric.md` before you issue a verdict. Read `references/ai-review-checklists.md` when the suite tests an AI feature or holds AI-drafted cases.
