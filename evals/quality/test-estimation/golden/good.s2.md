Estimate: Loyalty App, release 2.0 test cycle (provisional)
Confidence: Low     Basis: industry defaults, assumed, no team rates supplied (n=0)

I will not give one number. No rate came from your team, so every per-unit rate below is an assumption. The range moves a lot when you replace them.

Planning range, person-hours:
  Best case    14.3 h   every driver at its low
  Likely       24.5 h   every driver at its likely value
  Worst case   48.0 h   every driver at its high
  The range comes from three scenarios. I cannot run code here, so I give no percentile.

Buckets at the likely value:
  A Design 4.5 | B Manual execution 16.0 | C Triage 0.8 | D Authoring 0 (not asked) | E Overhead (15%) 3.2

Wall clock (not effort):
  not estimated: the 25 automated cases run on 1 configuration, and no elapsed time or session concurrency was supplied

Resourcing:
  Fixed window not given. The likely case is 4.1 person-days at an assumed 6 productive hours per tester per day, so tell me the window and I give the headcount.
  Fixed team not given. One tester needs about 4.1 working days at the likely value and 8.0 at the worst case.
  Serialized: triage and reporting cannot start before execution ends. Keep the last day for them.

Drivers that move the total most:
  1. Manual minutes per case: a miss from 15 to 25 minutes moves the total by about 12 h
  2. New cases per uncovered requirement: a miss from 3 to 5 moves the total by about 5 h
Excluded:
  - Automation authoring: nobody asked for it
  - Configurations beyond Chrome: the matrix has one
Evidence:
  MCP   fetch_requirement_metrics -> 12 in scope, 3 uncovered
  MCP   find_test_cases -> 80 cases, full page, 55 manual and 25 automated
  Team  no rates supplied -> asked below

Questions for you
- What are your manual minutes per case, and how many minutes does a new case take to design?
- What are your triage minutes per failing result, and how many productive hours does a tester give per day?
- What is the cycle window, and how many testers do you have?
