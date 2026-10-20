# Fixture: inputs for Parcel Tracker release 5.1 (fictional)

The agent has already called the read tools. Their results and the human's answers follow. Every line carries its source.

| Input | Value | Source |
|---|---|---|
| Cycle window | 2026-11-02 to 2026-11-13, 10 working days | MCP find_iterations |
| In-scope requirements | 22, of which 16 have coverage and 6 have none | MCP fetch_requirement_metrics |
| Cases | 160 (100 manual, 60 automated), full page, next_page_token null | MCP find_test_cases |
| Automated cases run on 2 configurations (Chrome, Safari) | 60 x 2 = 120 results per pass | MCP fetch_test_configuration_metrics |
| Unstable cases, last 30 days | 7 | MCP fetch_test_stability_metrics (return_tests FLAKY) |
| Automated pass rate, release 5.0 | 94% | MCP find_test_results (filter_type EXECUTION) |
| Elapsed time of release 5.0 automated pass | 28 min for the 60-case pass, elapsed field present on the record | MCP read_execution |
| Manual lane | Chrome only | MCP fetch_test_configuration_metrics |
| Session concurrency | 3 parallel sessions | Team-supplied, not an MCP field |
| Manual minutes per case | 12 / 15 / 20 (low / likely / high), likely measured on release 5.0 | Team-supplied |
| Design minutes per new case | 20 / 25 / 30 | Team-supplied |
| New cases per uncovered requirement | 3 / 4 / 6 | Team-supplied, historical ratio |
| Failure rate of automated results | 4% / 6% / 12% | Likely from MCP (94% pass), low and high team-supplied |
| Triage minutes per failing result | 10 / 15 / 25 | Team-supplied |
| Productive hours per tester per day | 6 | Team-supplied |
| Fixed overhead | 12% | Team-supplied |
| Automation authoring | deferred this cycle | Team decision |

Question from the user: "How long will it take to test release 5.1, and how many testers do I need? We have 2 testers."
