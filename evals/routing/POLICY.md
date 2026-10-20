# Routing labels: how a case gets its expected skill

Every case in `cases.jsonl` has a label in `labels.jsonl`:

```json
{"id": "cel6-design", "accept": ["create-test-cases"], "primary": "create-test-cases", "why": "one requirement key, asks for cases, nothing downstream"}
```

`accept` is the set of skills that count as correct. `primary` is the one owner a careful Katalon QA practitioner would pick first; the `exact` metric scores against it. A negative case has `"accept": ["none"]`.

## Rules

1. **The owner is the skill whose workflow does the job, judged from the whole skill** (SKILL.md body and references, `LIFECYCLE.md`, the role table in `AGENTS.md`). The descriptions are what the eval tunes, so a label is never derived from a description alone; otherwise a description bug becomes the ground truth.
2. **One owner by default.** A second skill goes in `accept` only when its body carries the same job end to end. If careful readers split three ways, the case is ambiguous: drop it or rewrite it until one owner is clear.
3. **A request spanning two or more lifecycle stages** (design and run, run and triage, plan and estimate and report) belongs to `true-platform-testing`, the router, unless one stage clearly dominates and the others are incidental.
4. **Orientation with no task** ("where do I start", "which skill do I need", "I own quality here and don't know where to begin") belongs to `true-platform-testing`.
5. **A role word with a concrete task** goes to the task's owner. A role word with no task is rule 4.
6. **Negatives (`none`)** are requests no Katalon skill should grab:
   - generic development or testing work with no Katalon, True Platform, or TestOps signal and no platform artifact (unit tests, a failing Jest test, CI YAML, a Playwright spec in a repo that never mentions the platform);
   - Katalon-adjacent questions no skill owns (pricing, licence purchase, account recovery, Studio IDE installation);
   - requests outside testing entirely.
   A negative is scored correct whenever no Katalon skill fires, whether the agent answers directly, asks a question, or picks a built-in skill.
7. **Connectivity is setup.** "The Katalon tools don't show up", an MCP auth error, or "connect my agent to the platform" belongs to `platform-setup`, even when the user's real goal is a later task.
8. **Language does not change the owner.** Non-English cases follow the same rules.

## Case tags

`tags[0]` is the primary owner (or `none`) and is the stratum for the train/test split. `tags[1]` is the case kind:

| kind | what it tests |
|---|---|
| `production` | phrasing taken from real requests (Slack, GitHub, session transcripts), rewritten to remove names, customers, URLs and IDs |
| `boundary` | sounds like a neighbouring skill but belongs here, or the reverse |
| `role` | phrased by role (manual tester, SDET, QA lead, QA manager) |
| `multi-stage` | spans two or more lifecycle stages |
| `orientation` | asks where to start |
| `regression` | reproduces a misroute a past commit fixed |
| `negative` | no Katalon skill should fire |

`tags[2]` is the source (`slack`, `github`, `transcript`, `starter`, `authored`); a `lang:xx` tag marks non-English cases.

## Where the ground truth lives

Labels live only in `labels.jsonl`, which only the grader reads. The model under test runs with the Skill tool as its only tool and no file access, so it cannot read them.
