# Agent Rules, review queue, and Sources

Read this when someone asks how Agent Rules, the review queue, Custom Instructions, or Sources work. All of it is web UI or Katalon AI behavior. The memory tools only read rules and write personal memory. Captured on 2026-11-12 and 2026-11-13 unless a line says otherwise.

## Agent Rules

- A project admin adds a rule on the Agent Rules screen. The Add dialog has no Tag field.
- The platform detects a tag from the rule text and adds it. A sparkle marks a tag it added. An unknown tag the person typed is replaced. Tag detection uses a model, so check the tag and say when it looks wrong.
- Saving a rule with the same Details text no longer fails.
- No tool writes a rule. `memory_write` stores a personal memory, never a project rule.
- An agent rule beats a personal memory. See "Apply what you read" in `SKILL.md`.

## Needs your review

- The Needs your review list holds proposed agent rules and proposed memories. Katalon AI distills personal memories from chats, and they wait here for a person.
- The list has Accept all and Dismiss all. Both act on every item in the list, so ask the person to read the items first.
- A proposed record carries `status` `proposed` in `memory_read`. Treat it as a suggestion until a person accepts it.

## Custom Instructions end on 2026-11-20

- After 2026-11-20 Katalon AI follows Agent Rules and Memory only. The product shows an "Ends Nov 20" pill and a notice with that date.
- Active personal Custom Instructions moved into proposed agent rules. A person must accept them in Needs your review before they apply.
- Project-scope Custom Instructions did not move. A project admin can re-create each one as an agent rule.
- Retirement of the old screen was not live on 2026-11-13. Say "ends on 2026-11-20" and not "is gone".

## Sources

- The Sources popover in the Katalon AI chat box turns Knowledge Base and Project memory on or off for one conversation. Each source shows an empty state when it holds nothing.
- With Project memory off, an agent that reads memory for that chat may get nothing back. An empty read can mean that, and it does not mean the team has no conventions.
- Sources is a web UI control. No tool reads or sets it. Ask the person to open the popover and check.

## Call Test Case steps from a rule

An agent rule can ask for a Call Test Case step in every generated draft. Three gaps were open on 2026-11-13:

- A rule that points at a case that does not exist still produces calls to it.
- A rule that names a case by title only can pick the wrong match.
- A very large requirement attachment (about 2.5 MB) returned a backend timeout twice.

Check each generated draft for a call step that points at a real case. Read `create-test-cases` for the draft checklist.

## Run order

Read memory before run setup, and read the agent rules first. Katalon AI does the same. An external agent that sets up a run should call `memory_list`, then `memory_read` on the rule headlines, then read the AUT and create the run.
