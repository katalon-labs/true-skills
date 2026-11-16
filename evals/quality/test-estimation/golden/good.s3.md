Estimate: Ride Booking, release 3.4 test cycle with Safari and Android Chrome added to the manual lane
Confidence: Medium     Basis: team-supplied rates, repeat-pass factor of 0.7 declared by the team, no measured cycle (n=0)

Planning range, person-hours:
  Best case    73.6 h   every driver at its low
  Likely       101.5 h   every driver at its likely value
  Worst case   156.3 h   every driver at its high
  The range comes from three scenarios. I cannot run code here, so I give no percentile.

Buckets at the likely value:
  A Design 8.0 | B Manual execution 76.3 | C Triage 4.0 | D Authoring 0 (team deferred) | E Overhead (15%) 13.2

Wall clock (not effort):
  150 automated results per pass on 3 configurations. No elapsed time was supplied, so I give no hours.

Resourcing:
  Fixed window 10 working days -> 1.7 testers at the likely value (101.5 h is 16.9 person-days at 6 productive hours per tester per day) and 2.6 testers at the worst case.
  Fixed team 2 testers -> 8.5 working days at the likely value and 13.0 at the worst case. It fits the 10 days only at the likely value.
  Serialized: triage and reporting cannot start before execution ends. Keep the last day for them.

What the added configurations cost:
  Chrome only gives a likely 50.4 h. Adding Safari and Android Chrome at the team factor of 0.7 each adds 51.1 h. The manual bucket grows from 31.8 h to 76.3 h before overhead.
  What to cut: drop Android Chrome from the manual lane. The likely case falls to 76.0 h, about 25 h less, and fits the window with 2 testers.

Drivers that move the total most:
  1. Manual minutes per case: a miss from 18 to 24 minutes moves the total by about 29 h
  2. Repeat-pass factor 0.7: a miss to 1.0 moves the total by about 22 h
Excluded:
  - Automation authoring: the team deferred it
  - Any money figure: the platform holds no rate
Evidence:
  MCP   fetch_test_case_metrics -> 140 cases, 90 manual and 50 automated
  MCP   find_test_cases -> a partial page: page 0 held 50 cases and next_page_token was "1". I used the metrics total, not the page.
  MCP   fetch_requirement_metrics -> 18 in scope, 4 uncovered
  Team  18 minutes per manual case -> declared by the team
  Team  factor 0.7 per extra manual configuration -> declared by the team
