# Worked example

One complete run of `test-estimation`, with arithmetic you can reproduce. The numbers are an example. The project is fictional.

## Contents

- The request
- Inputs with provenance
- Drivers and the named risk behind each high value
- Scenario arithmetic
- Simulation
- Resourcing
- Expected output
- What the reader should take from it

## The request

> How long will it take us to test release 3.2 of Cellphone Shop, and how many testers do I need?

## Inputs with provenance

Tag every line. Nothing untagged enters the model.

| Input | Value | Source |
|---|---|---|
| Cycle window | 2026-08-17 to 2026-08-28, 10 working days | MCP `find_iterations` |
| In-scope requirements | 34, of which 26 have coverage and 8 have none | MCP `get_requirement_insights` |
| Cases in the release folder | 214 (187 linked, 27 unlinked regression) | MCP `find_test_cases`, full page, not truncated |
| Automated / manual split | 96 / 118 | MCP `get_test_case_insights` |
| Unstable cases, last 30 days | 11 | MCP `analyze_test_case_stability` |
| Automated pass rate, sprint 3.1 | 91% | MCP `read_execution_test_results` on the sprint 3.1 execution found with `list_executions` |
| Target configurations | Chrome, Safari, Android Chrome. Automated covers all 3. Manual covers Chrome only. | MCP `get_test_configuration_insights` |
| Sprint 3.1 automated elapsed | 41 min for 96 results | MCP `read_execution`, elapsed field confirmed on the record |
| Session concurrency | 4 parallel sessions | **Team-supplied.** Not an MCP field. |
| Manual minutes per case | 15 / 18 / 22 (low / likely / high) | **Team-supplied.** Likely value measured on sprint 3.1. |
| Design minutes per new case | 20 / 25 / 35 | **Team-supplied.** Declaration. |
| New cases per uncovered requirement | 3 / 4 / 7 | **Team-supplied.** Historical ratio. |
| Failure rate of automated results | 5% / 9% / 15% | Likely from MCP (91% pass on sprint 3.1). Low and high team-supplied. |
| Triage minutes per failing result | 15 / 20 / 30 | **Team-supplied.** Declaration. |
| Productive hours per tester per day | 6 | **Team-supplied.** |
| Fixed overhead | 15% | **Team-supplied.** |
| Automation authoring this cycle | deferred | **Team decision.** |

## Drivers and the named risk behind each high value

| Driver | Low | Likely | High | Risk behind the high value |
|---|---|---|---|---|
| New cases per uncovered requirement | 3 | 4 | 7 | the 8 uncovered requirements are payment rules with many branches |
| Design minutes per new case | 20 | 25 | 35 | payment cases need test data setup |
| Manual minutes per case | 15 | 18 | 22 | the staging environment is slow on Chrome |
| Failure rate | 5% | 9% | 15% | the 11 unstable cases fail on all 3 configurations |
| Triage minutes per failing result | 15 | 20 | 30 | failures need log reading across two services |

## Scenario arithmetic

Fixed counts: 8 uncovered requirements, 118 existing manual cases, 96 automated cases times 3 configurations = 288 automated results, 15% overhead.

Likely case:

- A Design: 8 x 4 = 32 new cases. 32 x 25 min = 800 min = **13.3 h**.
- B Manual execution, Chrome only: (118 + 32) = 150 cases. 150 x 18 min = 2700 min = **45.0 h**.
- C Triage: 288 x 9% = 25.9 failing results. 25.9 x 20 min = 518 min = **8.6 h**.
- D Automation authoring: **0 h**. The team deferred it this cycle. Recorded, not dropped.
- E Overhead: 15% of (13.3 + 45.0 + 8.6 = 66.9) = 10.0 h.
- Total: **77.0 h**.

Best case and worst case use the low and high column of the driver table, with the same method:

| Scenario | A | B | C | Total with 15% overhead |
|---|---|---|---|---|
| Best case | 8.0 | 35.5 | 3.6 | 54.2 h |
| Likely | 13.3 | 45.0 | 8.6 | 77.0 h |
| Worst case | 32.7 | 63.8 | 21.6 | 135.8 h |

Wall clock, kept apart from person-hours: 3 configurations x 41 min = 123 min = **2.1 h**. This holds if sprint 3.1 ran at the same 4 parallel sessions. If not, ask.

## Simulation

The script in `references/simulation.md` ran 20,000 draws on the five drivers above, with a shared trouble factor. Results for the total, in person-hours:

| Correlation assumed | P50 | P80 | P90 |
|---|---|---|---|
| 0.0 (drivers independent) | 84.8 | 92.2 | 96.2 |
| 0.6 | 84.6 | 95.7 | 101.7 |
| 0.9 | 84.0 | 99.3 | 107.9 |

Two things stand out. P50 (about 85 h) is above the Likely case (77.0 h), because the high values sit further from the likely value than the low values do. And P80 grows with correlation. An independence assumption gives 92 h. A strong shared factor gives 99 h. An older root-sum-square band on a similar example ended at 89 h, below every row here.

## Resourcing

Productive hours: 6 per tester per day. P50 = 84.6 h = 14.1 person-days. P80 = 95.7 h = 16.0 person-days.

- Fixed window, 10 working days: 1.4 testers at P50 and 1.6 at P80 before the serialization correction.
- Serialization: triage (about 10 h at the likely value) cannot start before execution ends. Reserve the last 2 days. Design and manual work then have 8 days. That needs about 1.6 testers at P50 and 1.7 at P80.
- Fixed team, 2 testers: 7.1 working days at P50 and 8.0 at P80. Both fit the 10-day window.

## Expected output

```text
Estimate: Cellphone Shop, release 3.2 test cycle
Confidence: Medium     Basis: manual rate measured on sprint 3.1 in this project, n=1

Planning range, person-hours:
  Best case    54 h    every driver at its low
  Likely       77 h    every driver at its likely value
  Worst case   136 h   every driver at its high
  Simulated    P50 85 h  P80 96 h  P90 102 h   correlation 0.6 (92 to 99 h at P80 for 0.0 to 0.9)

Buckets at the likely value:
  A Design 13.3 | B Manual execution 45.0 | C Triage 8.6 | D Authoring 0 (team deferred) | E Overhead (15%) 10.0

Wall clock (not effort):
  2.1 h for one automated pass at 4 parallel sessions x 3 configurations

Resourcing:
  Fixed window 10 working days -> 1.6 testers at P50, 1.7 at P80 (last 2 days kept for triage)
  Fixed team 2 testers -> 7.1 working days at P50, 8.0 at P80
  Serialized: triage and reporting cannot start before execution ends. Reserve the last 2 days.

Drivers that move the total most:
  1. New cases per requirement: a 50% miss moves the total by 13.2 h
  2. Manual minutes per case: a 25% miss moves the total by 12.9 h
  3. Failure rate: a 50% miss moves the total by 5.0 h
Excluded:
  - Automation authoring: team deferred it this cycle
  - Manual execution on Safari and Android Chrome: the manual matrix is Chrome only
  - Any money figure: the platform holds no rate
Evidence:
  MCP   get_requirement_insights -> 34 in scope, 8 uncovered
  MCP   find_test_cases -> 214 cases in the release folder
  MCP   get_test_case_insights -> 96 automated / 118 manual
  MCP   analyze_test_case_stability -> 11 unstable in 30 days
  MCP   read_execution_test_results -> 91% pass on sprint 3.1
  Team  18 min per manual case -> measured by the team on sprint 3.1
  Team  4 parallel sessions -> TestCloud plan, not an MCP field
```

## What the reader should take from it

Two manual testers fit the listed scope, even at P80. A third tester does not fund the listed scope. The exposure sits in the exclusions. Adding Safari to the manual lane at a team-supplied repeat-pass factor of 0.7 costs 150 x 18 min x 0.7 = 31.5 h, or 36.2 h with overhead. That is about 6 extra person-days. The same cycle then needs about 2.0 testers over the 10-day window instead of 1.4. The third seat is now a decision with a price on it.
