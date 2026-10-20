# Snapshot and trend reference

The Katalon MCP has no trend tool, no aggregation tool, and no point-in-time read. Execution records carry their own dates. Insights and stability tools return data as of the call, even when you give them an iteration or a date range. This file shows how to build a trend anyway, and how to say what you have.

## Contents

- Three data classes
- The snapshot file
- The period loop
- Noise floors
- Language for what you have

## Three data classes

| Class | Metrics | Why |
|---|---|---|
| **Dated records** | pass rate, failure counts, run counts, results per suite | `find_test_results`, `list_executions`, `read_execution`, and `read_execution_test_results` return records with timestamps. History already exists. Trendable on the first run. |
| **Scoped reads** | requirement coverage, defect standing, case quality, configuration coverage | The docs say these insights tools accept an iteration or a date range. The scope selects the data. The values are as of the read date. A Sprint 12 coverage figure read in October counts links added after Sprint 12. |
| **Read-time only** | stability and flakiness | `analyze_test_case_stability` and `analyze_test_flakiness` describe now. A lookback window ends at read time. Two overlapping windows are not two periods. |

If the tool schema in your session shows no iteration or date parameter for a tool, treat that tool as read-time only.

Never mix classes in one trend line without saying so. A four-sprint pass-rate trend next to a one-week coverage change is two claims sharing a bullet.

A comparison of scoped reads across periods compares cohorts. Newer periods have had less time to gain cases and fixes. Check maturity before you call an older period better.

## The snapshot file

Write one on every run to `.katalon-reporting/<project-slug>.json` in the user's workspace. Use plain JSON. Append to it. Never rewrite it. Ask before you create the directory the first time.

```json
{
  "project": "Cellphone Shop",
  "project_id": 41207,
  "repository_id": 8891,
  "snapshots": [
    {
      "taken_at": "2026-06-16",
      "period_label": "Sprint 14 start",
      "requirement_coverage": { "covered": 44, "in_scope": 61 },
      "uncovered_critical": ["CEL-88", "CEL-102"],
      "defects": { "open": 22, "critical": 7, "high": 9, "reopened": 4 },
      "flaky_cases": 11,
      "configuration_coverage": { "tested": 6, "target": 9 },
      "source_tools": ["get_requirement_insights", "get_defect_insights",
                       "analyze_test_case_stability", "get_test_configuration_insights"]
    }
  ]
}
```

Rules:

- Write the snapshot before you write the brief. A run that dies mid-report should still help the next one.
- Record `taken_at` as the date of the fetch, never the period you attribute it to. They differ. Mixing them gives a report history it never had.
- Record `source_tools`. A later reader must see which numbers came from which tool.
- Never edit a past snapshot. If one was wrong, append a new entry with a note.
- The file holds counts and keys. Put no customer data in it.

## The period loop

1. Call `find_iterations` for the spine. If the team has no iterations, take explicit date ranges from the user.
2. For each period, call the dated-record tools with that period's range.
3. For each scoped-read tool, call it once per period if its schema takes an iteration or a date range. Otherwise call it once. Label every result "as of <read date>".
4. Call each read-time-only tool once.
5. Read the snapshot file. Align its entries to the spine by `taken_at`.
6. Append the new snapshot.

Use three to six periods. Fewer than three cannot show a direction. More than six is a chart, and this skill writes prose.

## Noise floors

A metric that moved less than its noise floor did not move. These are working defaults. If the team has its own, use theirs and say so.

| Metric | Treat as flat when |
|---|---|
| Pass rate | the change is under 2 percentage points, or the run count changed by more than 20 percent between periods |
| Flaky-case count | the change is 2 cases or fewer |
| Open defect count | the change is under 15 percent, or a triage sweep explains it fully |
| Requirement coverage | the change is under 2 percentage points, or the in-scope denominator changed |

**The denominator rule outranks all of them.** If the denominator moved, the metric does not compare across that boundary. Requirements were added, a suite was re-scoped, or a repository split. Say the denominator changed and report the periods separately. This is the most common way a quality trend misleads.

## Language for what you have

| What you have | Say |
|---|---|
| one reading | "baseline established, no trend yet" |
| two readings | "changed from X to Y". It is a change, not a direction. |
| three or more, same denominator | "improving, degrading, or flat across N periods" |
| three or more, denominator moved | "not comparable across <boundary>. Here is each side." |
| scoped reads across periods | "as read on <date>. This compares cohorts, not history." |
| a move inside the noise floor | "flat" |
| a move with no identifiable cause | "moved from X to Y, cause not identified in the platform data" |
