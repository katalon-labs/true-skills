Estimate: Parcel Tracker, release 5.1 test cycle
Confidence: Medium     Basis: manual rate team-declared and measured on release 5.0, one comparable execution (n=1)

Planning range, person-hours:
  Best case    34.0 h   every driver at its low
  Likely       47.9 h   every driver at its likely value
  Worst case   77.6 h   every driver at its high
  The range comes from three scenarios. I cannot run code here, so I give no percentile.

Buckets at the likely value:
  A Design 10.0 | B Manual execution 31.0 | C Triage 1.8 | D Authoring 0 (team deferred) | E Overhead (12%) 5.1

Wall clock (not effort):
  0.9 h for one automated pass at 3 parallel sessions x 2 configurations (28 min per pass on release 5.0)

Resourcing:
  Fixed window 10 working days -> 1 tester covers the likely case (8.0 person-days at 6 productive hours per tester per day). The worst case needs 12.9 person-days, so 2 testers.
  Fixed team 2 testers -> 4.0 working days at the likely value, 6.5 working days at the worst case. Both fit the window.
  Serialized: triage and reporting cannot start before execution ends. Keep the last working day for them.

Drivers that move the total most:
  1. Manual minutes per case: a miss from 15 to 20 minutes moves the total by about 12 h
  2. New cases per uncovered requirement: a miss from 4 to 6 moves the total by about 9 h
  3. Failure rate of automated results: a miss from 6% to 12% moves the total by about 2 h
Excluded:
  - Automation authoring: the team deferred it this cycle
  - Manual execution on Safari: the manual lane is Chrome only
  - Any money figure: the platform holds no rate
Evidence:
  MCP   fetch_requirement_metrics -> 22 in scope, 6 uncovered
  MCP   find_test_cases -> 160 cases, full page, 100 manual and 60 automated
  MCP   find_test_results (EXECUTION) -> 94% pass on release 5.0
  MCP   read_execution -> 28 min elapsed for the automated pass, field present
  Team  15 minutes per manual case -> measured on release 5.0
  Team  3 parallel sessions -> not an MCP field

The one measurement that would raise confidence is the manual minutes per case on a second cycle.
