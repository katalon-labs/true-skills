---
name: test-environments
description: Gets an application under test ready to run on Katalon Test Execution - Cloud (formerly TestCloud). Picks browsers, devices and agents, uploads and manages mobile apps and dynamic app aliases, and sets up private access through a tunnel or IP whitelisting. Use when a run needs an environment, an app or a tunnel before it starts. Not for running tests (use execute-test).
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access. Uploading an app needs a terminal that can run the curl command the server returns.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Environments

This skill prepares what a run needs: the AUT (application under test), the browser or device, the mobile app, the agent, and the network path to a private AUT. The `execute-test` skill owns the run itself. This skill ends with a readiness summary that `execute-test` can use.

Katalon True Platform (formerly TestOps) calls the cloud side Katalon Test Execution - Cloud (formerly TestCloud). MCP clients can add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## Boundary

Available:

- Read AUTs and their environments with `read_auts`, and execution profiles with `find_execution_profiles`.
- Read the browser and device catalog with `list_test_cloud_environments`, and agents with `list_test_cloud_agents`.
- List apps with `list_test_cloud_apps`. Upload one with `get_upload_test_cloud_app_url` and `create_test_cloud_app`. Manage aliases with `manage_test_cloud_dynamic_app`. Remove apps with `delete_test_cloud_app`.
- List tunnels with `list_test_cloud_tunnels`, get setup steps with `prepare_test_cloud_tunnel_start`, and stop one with `stop_test_cloud_tunnel`.
- Build the payloads for a run with `build_run_configuration` and `build_private_local_testing_config`. Both builders only return a payload and change nothing.

Not available:

- Create or edit an AUT or its environments. Use the platform UI.
- Start a tunnel. The user runs the tunnel client. This skill gives the commands.
- Show which runs or aliases use an app, or the UDID of a private device.
- Run a test. Hand off to `execute-test`.

Read `references/write-policy.md` before any write.

## Resolve context

1. Call `list_projects`. Keep `project_id` and repeat it on every call.
2. For profiles, call `list_repositories` and keep `repository_id`.
3. Ask only when several choices fit equally, a value is missing, or the next call is destructive.

## Find the need

| The user wants | Do this | Read |
|---|---|---|
| A browser, OS or device for a run | Query the catalog, then build the configuration | `references/browsers-and-devices.md` |
| To test a mobile app | Find or upload the app, then build a MOBILE_NATIVE configuration | `references/mobile-apps.md` |
| An alias that always points at the newest build | Create or move a dynamic app | `references/mobile-apps.md` |
| To test an app on localhost, an intranet or a VPN | Settle private access | `references/private-aut-and-tunnels.md` |
| To check why a tunnel or an AUT is not reachable | Diagnose with the tunnel list | `references/private-aut-and-tunnels.md` |
| To remove an app or stop a tunnel | Destructive path below | the same two files |
| A profile or an agent for an automated run | `find_execution_profiles`, `list_test_cloud_agents` | `references/browsers-and-devices.md` |

## AUT and environment

1. Call `read_auts`. Show a table with AUT ID, AUT name, a Client code column (em dash when empty), and each environment name and URL.
2. Let the user choose an environment, or skip AUT setup. Reuse an explicit "skip AUT setup" from this conversation.
3. If no AUT exists and the user gave a URL, keep it as the free URL for `execute-test`.

Never reuse an AUT choice from an earlier conversation. Call `read_auts` again.

## Destructive paths

Two tools remove things for good. A third one silently redirects work.

- `delete_test_cloud_app`: list the matching apps with `list_test_cloud_apps`, show name, ID and upload date for each, and ask the user to type YES. Confirm which app when several match. The delete cannot be undone.
- `stop_test_cloud_tunnel`: name the tunnel ID and who started it. State that every run on it stops. Wait for an explicit yes.
- `manage_test_cloud_dynamic_app` with UPDATE: name the alias, the current target and the new target. Wait for an explicit yes.

After the call, read back with `list_test_cloud_apps` or `list_test_cloud_tunnels` and report what the platform now holds.

## Readiness summary

Finish with one summary and hand off to `execute-test`:

- Lane: manual, Run with AI, or automated.
- AUT environment ID and URL, or the app ID, name and platform for mobile native.
- The browser, OS and version, or the device, copied from one catalog row.
- The payload from `build_run_configuration`, when the lane is automated.
- The payload from `build_private_local_testing_config`, when private access is needed. Name the tunnel.
- The profile ID and agent, when the user chose them.

Preparing an environment is not consent to run. `execute-test` shows the run preview and asks for the yes.

## Quirks

- Choose `config_type` from the environment the user wants, not from the suite name. A suite named API can still run in a browser.
- A mobile device with no uploaded app means a browser configuration. Use MOBILE_NATIVE only for an app run with a known app.
- Run with AI uses one hosted Chrome on Windows or Linux. The catalog does not apply to it. It still needs the AUT and any private access.
- Never guess `browser_version` or `os_version` for a manual run, and never pass `latest` there. Read real values from the catalog.
- Device availability (BUSY) changes by the minute. A BUSY device is not an invalid choice for a later run.
- Setup text from `prepare_test_cloud_tunnel_start` can contain API keys. Show it only to the user. Never save it to a file, a note or a commit.
- The MCP is stateless. Carry IDs from call to call. Never rely on a prompt from the server.
