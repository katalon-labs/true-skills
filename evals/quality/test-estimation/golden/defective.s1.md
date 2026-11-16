Estimate: Parcel Tracker, release 5.1 test cycle
Confidence: Very high     Basis: team declaration, n=1

Planning range, person-hours:
  Best case    34.0 h   every driver at its low
  Likely       47.9 h   every driver at its likely value
  Worst case   77.6 h   every driver at its high
  The answer is exactly 48.37 h. The spread comes from a root-sum-square of the driver deviations and gives a 90% confidence interval.

Buckets at the likely value:
  A Design 10.0 | B Manual execution 31.0 | C Triage 1.8 | D Authoring 0 (team deferred) | E Overhead (12%) 9.9

Wall clock (not effort):
  0.9 h for one automated pass at 3 parallel sessions (team-supplied)

Resourcing:
  Fixed window 10 working days -> 1 tester covers the likely case (8.0 person-days at 6 productive hours per tester per day).

Drivers that move the total most:
  1. Manual minutes per case: a miss from 15 to 20 minutes moves the total by about 12 h
Excluded:
  - Automation authoring: the team deferred it this cycle
Evidence:
  MCP   find_test_cases -> cases found
  MCP   find_test_results (EXECUTION) -> 94% pass on release 5.0
  MCP   fetch_requirement_metrics -> 6 uncovered requirements
