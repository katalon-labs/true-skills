# ChatGPT listing copy

Source of truth: [`chatgpt/plugin.json`](../../chatgpt/plugin.json) and [`chatgpt/overlay/skills/*/agents/openai.yaml`](../../chatgpt/overlay/skills/). This page restates them for review on 2026-10-01; if the two disagree, the JSON and YAML win. Limits are the OpenAI submission limits, checked by `scripts/build-chatgpt-plugin.py`.

## Directory listing

| Field | Value | Limit |
| --- | --- | --- |
| `name` | katalon-true-platform | 64 chars, ASCII letters, digits, `_`, `-` |
| `version` | 1.0.0 | semver; must change on every new ZIP |
| `displayName` | Katalon True Platform | 21 of 30 chars; does not end in MCP or Plugin |
| `shortDescription` | Plan, run and triage tests | 26 of 30 chars |
| `developerName` | Katalon | overwritten by the verified developer identity |
| `category` | Developer Tools | allowed value |
| `capabilities` | Interactive, Read, Write | at most 20 entries, 120 chars each |
| `brandColor` | `#6059E4` | 5.19:1 against white (needs 2:1) |
| `brandColorDark` | `#8C86F0` | 5.20:1 against `#212121` (needs 2:1) |
| `websiteURL` | https://katalon.com/true-platform | HTTPS |
| `supportURL` | https://support.katalon.com | HTTPS |
| `privacyPolicyURL` | https://katalon.com/privacy | HTTPS; must list the fields stored in `chatgpt_plugin` (settings, Test loop items, commit nonces) |
| `termsOfServiceURL` | https://katalon.com/terms | HTTPS |
| `onboardingSkill` | `./skills/get-started/SKILL.md` | packaged `SKILL.md` |

The build computes the WCAG contrast ratio from the hex values and fails under 2:1.

## Long description

1195 of 4,000 characters. No comparative, pricing or upgrade copy. The Run with AI cost and side effect are stated in the copy.

> Connect ChatGPT to your Katalon True Platform workspace and work through the testing loop in one conversation. Find requirements in a release that have no test coverage. Design manual test cases for a requirement, then save them and link them after you review them. Run test cases with AI in a real browser against your application and follow each case as it runs; Run with AI uses your TestCloud minutes and can change data in the application under test. Group a failed run's failures by signature, with ChatGPT's classification shown beside the step evidence and screenshots. Draft a defect for Jira or Azure DevOps, with any open defect on the same test case flagged. Get a release readiness verdict that shows True Platform's criteria next to ChatGPT's recommendation. Open Katalon from the sidebar for your runs, uncovered requirements and release status, and use the Test loop tab beside each chat to see where this conversation's requirement, cases, run, failures, defects and release stand. Set your default project and Run with AI target in ChatGPT settings. Changes to your workspace happen only when you confirm them in a Katalon card. Open any item in True Platform for full editing.

## Starter prompts

Each prompt maps to one screenshot. None starts a billed run.

| # | Prompt | Chars | Screenshot | Card it opens |
| --- | --- | --- | --- | --- |
| 1 | Which requirements in my next release have no tests? | 52 | `./assets/screenshot-coverage.png` (706 x 560) | W5 Requirement coverage, with "Design missing cases" |
| 2 | Why did my latest test run fail? | 32 | `./assets/screenshot-triage.png` (706 x 720) | W6 Failure triage board |
| 3 | Is my next release ready to ship? | 33 | `./assets/screenshot-release.png` (706 x 600) | W7 Release verdict |

The three screenshots in `chatgpt/assets/` are placeholders marked with a `katalon:placeholder` PNG text chunk. `--for-submission` refuses them; replace each with the bar-passed widget capture at the same size.

## Icons

| Asset | File | Size | Notes |
| --- | --- | --- | --- |
| `logo` | `assets/logo.svg` | viewBox 1000 x 1000 | Katalon mark from `assets/katalon-icon-tile.svg` on a white rounded tile |
| `logoDark` | `assets/logo-dark.svg` | viewBox 1000 x 1000 | white mark on a `#212121` tile |
| `composerIcon` | `assets/composer-icon.svg` | viewBox 48 x 48 | outlined mark, `currentColor`, 3.2 px strokes (the 1.33 px stroke of a 20 px grid, scaled to 48) |
| `composerIconDark` | `assets/composer-icon-dark.svg` | viewBox 48 x 48 | same outline, `color` white |
| PNG renditions | `assets/logo.png`, `assets/logo-dark.png` (512 px), `assets/composer-icon.png`, `assets/composer-icon-dark.png` (96 px) | square | rendered from the SVGs with `rsvg-convert`; not referenced by `plugin.json` |

`assets/katalon-logo.svg` at the repository root has no `viewBox`, so the package never uses it.

## Release notes

> First release: Katalon sidebar home, Test loop tab, cards for runs, requirement coverage, failure triage, release readiness, test case drafts, Run with AI and defect drafts. Every write is confirmed in a card.

## Skills

Nineteen skills ship in the ZIP. Five are marked for Codex only because they drive a local CLI or configure a local agent, which a ChatGPT user cannot act on.

| Skill | Display name | Short description | Default prompt | Products |
| --- | --- | --- | --- | --- |
| `analyze-failures` | Analyze failures | Triage a red run | Why did last night's regression fail? | CHAT, CODEX |
| `create-test-cases` | Create test cases | Design cases for a requirement | Write test cases for requirement DS-12 and link them to it | CHAT, CODEX |
| `execute-test` | Execute tests | Run cases or suites | Run the Login suite with AI | CHAT, CODEX |
| `exploratory-charter` | Exploratory charter | Charter an exploratory session | Write a charter to explore the checkout flow | CHAT, CODEX |
| `get-started` | Get started | Pick your default project | Get me started with Katalon True Platform | CHAT, CODEX |
| `platform-setup` | Platform setup | Connect an agent to Katalon | Connect this agent to my Katalon True Platform account | CODEX |
| `playwright-execute` | Playwright execute | Run Playwright and upload | Run my Playwright suite and upload the report to Katalon | CODEX |
| `release-analyze` | Release readiness | Make the release call | Is my next release ready to ship? | CHAT, CODEX |
| `test-case-to-katalon-studio` | Test case to Studio | Generate Katalon Studio tests | Turn test case TC-1042 into a Katalon Studio test | CODEX |
| `test-case-to-playwright` | Test case to Playwright | Generate Playwright tests | Turn the Login suite cases into Playwright tests | CODEX |
| `test-data` | Test data | Design and reset test data | Which test data does this case need, and how do I reset it? | CHAT, CODEX |
| `test-estimation` | Test estimation | Size a test cycle | How long will testing my next release take, and with how many people? | CHAT, CODEX |
| `test-maintenance` | Test maintenance | Repair flaky and broken tests | Which test cases went flaky this month? | CHAT, CODEX |
| `test-management` | Test management | Organize and trace test assets | Which requirements in my project have no linked test cases? | CHAT, CODEX |
| `test-plan` | Test plan | Plan and prioritize testing | Plan testing for my next release and show the coverage gaps | CHAT, CODEX |
| `test-reporting` | Test reporting | Report quality upward | Build a quality summary of this release for stakeholders | CHAT, CODEX |
| `test-review` | Test review | Review a suite before it runs | Review the regression suite and list the weak cases | CHAT, CODEX |
| `true-platform-testing` | True Platform testing | Run the full testing loop | Take requirement DS-12 from test design to a release verdict | CHAT, CODEX |
| `upload-report` | Upload report | Upload a test report | Upload this JUnit report to Katalon True Platform | CODEX |
