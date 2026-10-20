# Worked example

One complete run of `test-reporting`. The project, IDs, and numbers are an example.

## Contents

- The request
- Question, metrics, and spine
- Pull per period
- Snapshot comparison and causes
- Expected output
- What the example leaves out

## The request

> I present to the steering committee on Thursday. Project Cellphone Shop, last four sprints. Are we getting better or worse, and what do I tell them?

## Question, metrics, and spine

The question is "is quality getting better or worse". The audience is a steering committee. The report needs a direction and an ask, not a table.

Metrics chosen: three. Pass-rate trend, open critical defect trend, flaky-case count. Requirement coverage is cut. It answers a different question. Configuration coverage is cut for the same reason.

```text
list_projects            -> Cellphone Shop (id 41207)
list_repositories        -> Cellphone Shop Web (id 8891)
find_iterations(41207)   -> Sprint 12  2026-05-19 .. 2026-06-01
                            Sprint 13  2026-06-02 .. 2026-06-15
                            Sprint 14  2026-06-16 .. 2026-06-29
                            Sprint 15  2026-06-30 .. 2026-07-13
```

Four periods give a direction.

## Pull per period

```text
find_test_results(COMMON, startTime 2026-05-19..2026-06-01) -> 214 results, 176 passed, 38 failed
find_test_results(COMMON, startTime 2026-06-02..2026-06-15) -> 221 results, 189 passed, 32 failed
find_test_results(COMMON, startTime 2026-06-16..2026-06-29) -> 218 results, 194 passed, 24 failed
find_test_results(COMMON, startTime 2026-06-30..2026-07-13) -> 226 results, 208 passed, 18 failed
fetch_defect_metrics(DEFAULT, UNRESOLVED, read 2026-07-14)  -> unresolved 14, critical 3, high 6
fetch_test_stability_metrics(ITERATION Sprint 15, read 2026-07-14) -> 9 unstable cases
```

The defect and stability reads carry the label "as of 2026-07-14". The tool returned counts without keys, so the report asks the user for the three open critical keys from Jira. The user supplies CEL-241, CEL-258, and CEL-263.

## Snapshot comparison and causes

The file `.katalon-reporting/cellphone-shop.json` holds a snapshot from 2026-06-16 with `open_critical_defects: 7` and `flaky_cases: 11`. Pass rate needs no snapshot because the results carry dates.

`read_test_suite` on the nine unstable cases shows six sit in the suite **Checkout Regression**. The three open critical defects are all in checkout, per the user's Jira list.

The run writes a new snapshot dated 2026-07-14 before it writes the brief.

## Expected output

```text
Answer:        Quality is improving on every metric we track, and the remaining risk
               sits in checkout.
Direction:     Improving
Period spine:  Sprints 12 to 15, 2026-05-19 to 2026-07-13, four periods from find_iterations
Confidence:    Medium (defect and flakiness history starts 2026-06-16, the date of our
               first snapshot. Pass rate covers all four sprints.)

What moved it:
- Pass rate 82.2% -> 92.0% across four sprints (176/214 -> 208/226) because the checkout
  failures that dominated Sprint 12 were fixed in Sprint 14
- Open critical defects 7 -> 3 since 2026-06-16. Two points, so a change and not yet a
  direction
- Flaky cases 11 -> 9 since 2026-06-16. That is inside the noise floor, so read it as flat

Named specifics:
- Checkout Regression suite -> holds 6 of the 9 flaky cases, so the suite most people
  watch is the one they can trust least
- CEL-241, CEL-258, CEL-263 -> the three open criticals, all in checkout
- Sprint 15 -> 18 failures, the lowest of the four, and none in the smoke core

Not in this report:
- Whether any of these defects reached a customer. The platform has no such flag and
  nobody has named the field that carries it
- How much effort the improvement cost. We do not record effort

The ask:
- One sprint of dedicated work on Checkout Regression. It holds 6 of our 9 unreliable
  cases and all 3 open critical defects, and it is the flow the committee cares about.
```

## What the example leaves out

- It does not report requirement coverage. Nobody asked.
- It does not call the flaky-case change an improvement. The change is inside the noise floor.
- It does not claim a direction for defects. Two points are a change.
- It does not claim any defect reached a customer. No field says so.
- It does not invent defect keys. The user supplied them.

A metric dump would have said more on each of these and meant less.
