# ChatGPT submission checklist

Every step on this page is gated on Huy: it either touches an external account, a production endpoint or the reviewer tenant, or it submits or publishes. Nothing here runs from CI. Tick a box only after observing the result (a curl response, a dashboard screenshot), and keep the evidence in `04-projects/katalon-chatgpt-app/evidence/P5/`.

## Before the dashboard

- [ ] **OpenAI account.** Business identity verified as "Katalon, Inc."; a project with global data residency; the submitting account holds `api.apps.write` (Apps Management Write).
- [ ] **Endpoint live.** `https://platform.katalon.io/mcp/chatgpt` serves the ChatGPT profile over streamable HTTP from the second Deployment, and `/mcp` for other agents is unchanged.
- [ ] **OAuth for `/mcp/chatgpt`.** Protected resource metadata at `/.well-known/oauth-protected-resource/mcp/chatgpt`, ChatGPT redirect URIs allowed in the DCR policy, RFC 9207 `iss`, `mcp:access` advertised, audience mapper, DCR clients excluded from Keycloak cleanup (see the Authentication table in the design).
- [ ] **Domain verification (AC-61).** The dashboard issues a token; the gateway serves it at `https://platform.katalon.io/.well-known/openai-apps-challenge` as `text/plain`. Check with `curl -i https://platform.katalon.io/.well-known/openai-apps-challenge` and confirm the body equals the token and the `Content-Type` is `text/plain`.
- [ ] **Reviewer tenant.** Katalon Demo Shop seeded with the data listed in [`review-pack.md`](review-pack.md). A reviewer account with a password that does not expire during review, no MFA, no SMS or email codes, reachable from the public internet. Run every positive case once on it before submitting.
- [ ] **Case 3 dry runs.** Five dry runs of positive case 3; if one takes over 5 minutes or flakes, apply the pre-agreed swap in `review-pack.md` and update `chatgpt/plugin.json`.
- [ ] **Screenshots.** Replace the three placeholders in `chatgpt/assets/` with bar-passed widget captures at the same names and sizes (706 x 560, 706 x 720, 706 x 600). New captures carry no `katalon:placeholder` marker.
- [ ] **Expected output URLs.** Host the case screenshots on a Katalon HTTPS URL and add `expected_output_url` to each positive case in `chatgpt/plugin.json`.
- [ ] **Demo video.** Record W1, W5 to W8, W9 from launch to finish, W6 and W7 on desktop and iOS. Host it on a Katalon HTTPS URL and set `review.demo_recording_url`.
- [ ] **Countries.** Set `publication.countries` to the Katalon sales regions.
- [ ] **Privacy policy.** `https://katalon.com/privacy` lists the fields the ChatGPT Deployment stores (user settings, Test loop items, commit nonces) and the data types the tools return.
- [ ] **Annotations note.** `docs/chatgpt-annotations.md` in the server repo justifies `openWorldHint: true` on `app_commit_ai_run` and `app_commit_defect`, `readOnlyHint: true` on the preview tools, and the `settings_update` hints.
- [ ] **Surface replays (AC-62).** Someone other than the builder replays the five positive cases on ChatGPT web (Work), desktop, iOS and Android, three times each, with a screenshot per case per surface; the three negatives call no Katalon tool in three replays.
- [ ] **Golden sets (AC-63, AC-64).** The 10 negatives call no Katalon tool; the indirect win rate is above 0.5 with both slot orders.
- [ ] **Package.** `python3 scripts/build-chatgpt-plugin.py --for-submission` exits 0. Upload `dist/chatgpt/katalon-true-platform-<version>.zip`.

## Dashboard steps

- [ ] **Upload ZIP.**
- [ ] **Metadata & Skills (AC-59).** Wait for the skill scan (up to 2 hours) and fix every finding until it reports zero. Screenshot.
- [ ] **MCPs and Connect.** Point at `https://platform.katalon.io/mcp/chatgpt` and sign in through Katalon OAuth.
- [ ] **Domain verification.** Paste the token into the gateway config first, then verify.
- [ ] **Scan Tools (AC-60).** Zero findings, and the list equals the ChatGPT allowlist with the annotations from AC-3. Screenshot.
- [ ] **Review details (AC-66).** Reviewer username and password go in this form only, never in the ZIP. Screenshot with the password masked. `grep -E "test_credentials|reviewer_instructions"` over the ZIP must return nothing; the build already refuses both strings.
- [ ] **Submit for review** with the attestations. One active review per plugin.
- [ ] **Record the version.** Add the submitted version to `chatgpt/submitted-versions.json` and commit, so the next build refuses to reuse it.

## After approval

- [ ] **Publish** (Huy).
- [ ] **Directory check (AC-67).** The public page shows the display name, short description, three prompts and logo; install on a second account and run positive case 1. Screenshot.
- [ ] **Placeholder listings.** Decide what happens to "Katalon Platform" and "Katalon Public MCP".
- [ ] **Later changes.** New tools reach users through OpenAI's daily rescan with no new ZIP. Metadata, skill and asset changes need a new version and a new review.
