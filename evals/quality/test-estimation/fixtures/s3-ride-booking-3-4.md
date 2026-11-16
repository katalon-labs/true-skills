# Fixture: inputs for Ride Booking release 3.4 (fictional)

| Input | Value | Source |
|---|---|---|
| Cycle window | 2026-11-16 to 2026-11-27, 10 working days | MCP find_iterations |
| In-scope requirements | 18, of which 14 have coverage and 4 have none | MCP fetch_requirement_metrics |
| Cases, from metrics | 140 (90 manual, 50 automated) | MCP fetch_test_case_metrics |
| Cases, from the list call | find_test_cases returned page 0 with 50 cases and next_page_token "1". The call was not repeated. | MCP find_test_cases (partial page) |
| Automated lane | 50 cases on 3 configurations (Chrome, Safari, Android Chrome), 150 results per pass | MCP fetch_test_configuration_metrics |
| Manual lane today | Chrome only. The user wants to add Safari and Android Chrome. | MCP fetch_test_configuration_metrics and the user |
| Repeat-pass factor for each extra manual configuration | 0.7 of the Chrome effort | Team-supplied |
| Manual minutes per case | 14 / 18 / 24 | Team-supplied |
| Design minutes per new case | 25 / 30 / 40 | Team-supplied |
| New cases per uncovered requirement | 3 / 4 / 6 | Team-supplied |
| Failure rate of automated results | 5% / 8% / 14% | Team-supplied, likely matches a past 92% pass rate (MCP find_test_results) |
| Triage minutes per failing result | 15 / 20 / 30 | Team-supplied |
| Productive hours per tester per day | 6 | Team-supplied |
| Fixed overhead | 15% | Team-supplied |
| Automation authoring | deferred | Team decision |

Question from the user: "We have 2 testers and the sprint ends on the 27th. If we add Safari and Android Chrome to the manual lane, does the scope still fit, and what would I cut?"
