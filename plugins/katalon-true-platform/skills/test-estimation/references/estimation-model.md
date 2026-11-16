# Estimation model reference

The method behind `test-estimation`. Five buckets, three values per driver, a scenario range, and an optional simulation.

## Contents

- The five buckets
- Drivers and scenarios
- Why the buckets are not added in quadrature
- Simulation in short
- Lane units
- Rework
- Resourcing arithmetic
- Confidence rubric
- Sensitivity
- Re-estimation

## The five buckets

| # | Bucket | Unit | Countable input | Rate source |
|---|---|---|---|---|
| A | **Design** new coverage | person-hours | uncovered requirements x new cases per requirement | team, minutes per new case |
| B | **Manual execution** | person-hours | manual case count x configurations in the manual matrix | team, minutes per case |
| C | **Automated execution and triage** | wall clock + person-hours | automated case count x configurations; failure rate | platform for elapsed time, team for triage minutes per failing result |
| D | **Automation authoring** | person-hours | cases selected for automation | team, hours per case |
| E | **Fixed overhead** | percent of A to D | none | team, often 10 to 20 percent |

Rules:

- Sizing only bucket B is the usual way an estimate comes in low.
- Record an out-of-scope bucket as zero with the reason. Silence reads as forgetting.
- Rework is not a sixth bucket. Retest of failures lives in B. Triage of failures lives in C.
- Timebox exploratory sessions. Add the timebox as a stated line.

## Drivers and scenarios

A **driver** is a rate or a count that can miss. Examples: new cases per uncovered requirement, minutes per manual case, design minutes per case, failure rate, triage minutes per failing result.

For each driver, collect three values:

- **Low.** Nothing goes wrong. Often 0.8 times the likely value.
- **Likely.** Count times rate. It is the only value with arithmetic behind it.
- **High.** Set it from a named risk, such as "the 8 uncovered requirements need 7 cases each, not 4". If you cannot name the risk, use 1.5 times the likely value. Confidence then cannot be High.

Build three scenarios from the drivers:

| Scenario | Driver values | What it tells the reader |
|---|---|---|
| Best case | every driver at its low | the floor. Not a goal. |
| Likely | every driver at its likely value | the plan figure |
| Worst case | every driver at its high | the ceiling. A bound, not an interval. |

The scenarios give a **planning range**. They do not give a probability. Say "planning range" and never say "80 percent band".

A skewed driver makes the likely value sit below the median. A failure rate with a long upper tail is the usual cause. The simulation shows the gap. See the worked example.

## Why the buckets are not added in quadrature

An older version of this skill combined bucket deviations by root sum of squares and printed an 80 percent band. That method assumes the buckets vary independently. They do not.

A weak requirement set raises design effort, execution effort, and triage effort at the same time. A flaky environment raises triage and retest at the same time. When drivers move together, the total spreads wider than a quadrature sum shows. With one comparable execution as calibration, the true spread is wider again.

For that reason, the skill uses scenarios in which drivers move together, and an optional simulation with a stated correlation. Both show the spread the inputs allow. Neither adds precision the inputs lack.

## Simulation in short

The script is in `references/simulation.md`. It draws each driver from a triangular distribution (low, likely, high). It ties the draws together with one shared "trouble" factor. The correlation `rho` sets how strongly. Nobody can measure `rho` from one cycle, so report it as an assumption and run three values (0.0, 0.6, 0.9).

Report P50, P80, and P90 of the total. Say "model P80" and name the inputs. The percentile is only as good as the driver ranges the team gave.

## Lane units

| Lane | What consumes it | Unit | What shortens it |
|---|---|---|---|
| Manual | a person, per case, per configuration | person-hours | more people, until design and triage serialize |
| Automated | machines, bounded by session concurrency | wall clock | more parallel sessions. This changes person-hours by zero. |
| Automated, human side | triage of failing results | person-hours | a lower failure rate, or fewer flaky cases |
| Run with AI | platform wall clock, plus a person reviewing the session | wall clock + person-hours | nothing the estimator controls. Treat wall clock as fixed and estimate the review. |

Never add wall clock to person-hours. One answers "will it fit in the window". The other answers "how many people do I need".

## Rework

Failures cost twice. Both costs sit in a bucket already:

```text
failing results = total results x failure rate
triage hours    = failing results x triage minutes / 60            -> bucket C
manual retest   = failing manual cases x execution minutes / 60    -> bucket B
```

Flaky cases raise the failing count without a product defect. Use the unstable-case count to set the high value of the failure rate. Do not use it for the likely value, because a flake may or may not fire on a given run.

Environment and infrastructure errors raise the failing count the same way. Keep them out of the pass rate that feeds product-defect triage. Count their rerun and setup effort as a named risk.

## Resourcing arithmetic

```text
person-days   = person-hours / productive hours per day
Fixed window  testers = person-days / working days in the window
Fixed team    days    = person-days / testers
```

Two corrections stop the plain division from misleading:

1. **Serialization.** Triage and reporting cannot start before execution ends. Subtract that tail from the window before you divide. State it.
2. **Parallelism limits.** Manual execution parallelizes well across cases. Design parallelizes to about two people before coordination cost wins. Triage of one suite rarely parallelizes. Adding people late in a cycle moves bucket B and little else.

Report both directions. Headcount for a fixed date. A date for a fixed team. Use P50 and P80 (or Likely and Worst case when you did not simulate).

## Confidence rubric

| Label | Conditions | Typical spread of the range |
|---|---|---|
| **High** | The per-unit rate was measured in this project on a comparable cycle within 90 days. Scope is frozen. The platform returned a count for every bucket. | worst case within about 25% of likely |
| **Medium** | The rate is team-declared, or measured on another project or an older cycle, or one bucket's count is an estimate. | worst case about 25 to 100% above likely |
| **Low** | No measured rate anywhere, or scope is still moving, or the platform returned nothing for a bucket that matters. | wider than that |

At **Low**, give the model and its shape. Refuse the headline number. Name the one measurement that would move the label to Medium. That is usually "time 20 real cases".

## Sensitivity

Find the dominant driver before you publish. For each team-supplied driver, recompute the likely total with that driver raised by a stated amount (25 percent for rates, 50 percent for counts). Report the change in hours. Print the top two or three.

If one driver's miss moves the total by more than the gap between Likely and P80, that driver is the estimate. Say so. Ask for it to be measured before anyone commits to the number.

## Re-estimation

An estimate is a snapshot of a scope. When scope changes, rerun the model. Publish the change and name the driver: "+36 h, adding Safari to the manual lane". Never lower a published estimate to fit a date. Name the lever you pulled: scope, people, or window.
