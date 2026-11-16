# Routing score: baseline

Claude Code 2.1.284, 2.1.25. WARNING: mixed versions inside one variant.

540 scored rows, 0 failed attempts (failed attempts are never scored).

| split | cases | accuracy (95% CI) | paired delta vs baseline | miss | wrong skill | false trigger | reps agree | cost |
|---|---|---|---|---|---|---|---|---|
| train | 107 | 93.1 [88.9, 97.4] | - | 1.5 | 3.3 | 18.8 | 89.7 | $11.35 |
| test | 73 | 90.9 [85.0, 96.7] | - | 1.1 | 7.0 | 15.2 | 86.3 | $7.95 |
| all | 180 | 92.2 [88.8, 95.7] | - | 1.3 | 4.8 | 17.3 | 88.3 | $19.29 |

Miss = a positive case got no Katalon skill. Wrong skill = a different Katalon skill. False trigger = a negative case grabbed a Katalon skill. Rates are over reps.

## Per skill (rep level)

| skill | tp | fp | fn | precision | recall |
|---|---|---|---|---|---|
| analyze-failures | 33 | 2 | 0 | 94.3 | 100.0 |
| create-test-cases | 21 | 5 | 0 | 80.8 | 100.0 |
| execute-test | 18 | 4 | 0 | 81.8 | 100.0 |
| exploratory-charter | 18 | 3 | 3 | 85.7 | 85.7 |
| platform-setup | 17 | 0 | 1 | 100.0 | 94.4 |
| playwright-execute | 21 | 3 | 0 | 87.5 | 100.0 |
| release-analyze | 21 | 3 | 0 | 87.5 | 100.0 |
| test-case-to-katalon-studio | 20 | 0 | 1 | 100.0 | 95.2 |
| test-case-to-playwright | 22 | 3 | 2 | 88.0 | 91.7 |
| test-data | 21 | 0 | 0 | 100.0 | 100.0 |
| test-estimation | 24 | 0 | 0 | 100.0 | 100.0 |
| test-maintenance | 26 | 1 | 1 | 96.3 | 96.3 |
| test-management | 21 | 5 | 0 | 80.8 | 100.0 |
| test-plan | 16 | 3 | 5 | 84.2 | 76.2 |
| test-reporting | 21 | 3 | 0 | 87.5 | 100.0 |
| test-review | 24 | 0 | 0 | 100.0 | 100.0 |
| true-platform-testing | 66 | 1 | 15 | 98.5 | 81.5 |
| upload-report | 21 | 0 | 0 | 100.0 | 100.0 |

## Top confusions (expected -> picked, rep count)

- test-plan -> test-management: 5
- true-platform-testing -> execute-test: 4
- true-platform-testing -> test-plan: 3
- none -> test-reporting: 3
- exploratory-charter -> create-test-cases: 3
- none -> exploratory-charter: 3
- none -> playwright-execute: 3
- none -> release-analyze: 3
- true-platform-testing -> none: 2
- true-platform-testing -> analyze-failures: 2
- test-case-to-playwright -> none: 2
- none -> test-case-to-playwright: 2
- platform-setup -> create-test-cases: 1
- true-platform-testing -> other:init: 1
- true-platform-testing -> create-test-cases: 1
