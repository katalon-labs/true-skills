# TestCloud assets and private AUT access

Read this when a run needs a mobile native app, a private or internal AUT, a tunnel, or a dynamic app alias. Katalon Test Execution - Cloud (formerly TestCloud) holds the browsers, devices, apps, agents and tunnels. Parameters here follow the live tool schemas captured 2026-10-20. Check the schema in your session when a field is unclear.

## Private AUT access

An AUT that the cloud cannot reach needs one of two modes:

- `tunnel`: a tunnel client on the user's network opens a path to the AUT.
- `whitelist`: the AUT allows the platform's addresses.

Steps:

1. Call `read_auts`. Its description carries the private-access decision flow. Follow it.
2. Ask the user with these fixed labels, character for character, and never pick one for them. With active tunnels: "No private access needed" | "Use Katalon Tunnel" | "Use IP Whitelisting". With no active tunnel: "No private access needed" | "Yes, I need private access". Reuse an explicit "no private access needed" answer from this conversation.
3. For "Use Katalon Tunnel", show a second "Select Tunnel" choice and wait: "Auto-select tunnel (recommended)" plus one "Tunnel: <id> (started by <username>)" per active tunnel. Never auto-pick a tunnel, even when only one exists.
4. Call `build_private_local_testing_config` with `mode` `tunnel` or `whitelist`. For `tunnel`, pass `selected_tunnel` from the user's choice (null for auto-select). Set `include_api_calls` only when the user asks.
5. Pass the result as `private_local_testing_configuration` to `create_test_run`. For a TestPak that already exists, pass it in `update_test_run` `CONFIGURE` (`configuration.private_local_testing_configuration`) or in `START` with `KATALON_AI`.
6. For Run with AI, `update_test_run` `START` reuses that configuration. Do not call `create_manual_ai_session` on the same run.
7. If the user needs private access and no tunnel is active, block the run. Offer `prepare_test_cloud_tunnel_start` or IP whitelisting. Call `list_test_cloud_tunnels` again after the user says the tunnel runs. Do not continue without an active tunnel.

## Tunnels

| Tool | Use | Class |
|---|---|---|
| `list_test_cloud_tunnels` | Show active tunnels for the project. Needs `project_id`. | read |
| `prepare_test_cloud_tunnel_start` | Get the setup commands for a tunnel client. Set `test_type` to MANUAL or AUTOMATED. For manual, set `manual_execution_mode` to TESTPAK or RUN_WITH_AI. | read |
| `stop_test_cloud_tunnel` | Stop a tunnel. | destructive |

A tunnel can be shared. Stopping it ends every run that uses it. Name the tunnel in your question and wait for an explicit yes before you call `stop_test_cloud_tunnel`.

`prepare_test_cloud_tunnel_start` with `manual_execution_mode` `RUN_WITH_AI` returns the full guide. `TESTPAK` or an unknown mode returns VPN guidance only.

You cannot start a tunnel through the MCP. Give the user the commands from `prepare_test_cloud_tunnel_start` and ask them to run them. Then call `list_test_cloud_tunnels` to confirm it is active.

## Mobile native apps

1. Call `list_test_cloud_apps`. Quote an app name that has spaces inside `rsql_filter`.
2. If the app is missing, call `get_upload_test_cloud_app_url` for a presigned upload URL and a `storage_path`. Upload the binary the way the tool result says.
3. Call `create_test_cloud_app` with the `storage_path` and `file_name`.
4. Poll `list_test_cloud_apps` until the app shows READY.
5. Put the app in the configuration from `build_run_configuration` (config type MOBILE_NATIVE).

Uploading and registering an app is a write. Preview it and get one yes first.

## Dynamic apps

`manage_test_cloud_dynamic_app` creates an alias app that points at a real app. Its two actions are CREATE and UPDATE.

- CREATE adds an alias. Preview it, then confirm.
- UPDATE moves the alias to another app. Every run that uses the alias then runs the new app. Name the alias and the new target, and wait for an explicit yes.

## Delete an app

`delete_test_cloud_app` removes apps for good. The user must type YES. Name each app, confirm which app when several match, and do not call the tool without it.

## Agents and environments

- `list_test_cloud_agents` lists the execution agents for a project. Use it when a run waits for an agent.
- `list_test_cloud_environments` lists browsers and devices. Put every criterion the user gave in `rsql_filter`. Page with `page_token` until it is null. Copy `os`, `os_version` and the browser fields from one row into `build_run_configuration`.
