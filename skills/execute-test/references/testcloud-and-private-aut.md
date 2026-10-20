# TestCloud assets and private AUT access

Read this when a run needs a mobile native app, a private or internal AUT, a tunnel, or a dynamic app alias. Katalon Test Execution - Cloud (formerly TestCloud) holds the browsers, devices, apps, agents and tunnels. Source: Katalon docs "Katalon True Platform MCP Server" (October 2026). The docs list the tools but leave most parameters open, so check each tool schema.

## Private AUT access

An AUT that the cloud cannot reach needs one of two modes:

- `tunnel`: a tunnel client on the user's network opens a path to the AUT.
- `whitelist`: the AUT allows the platform's addresses.

Steps:

1. Call `read_auts`. Its description carries the private-access decision flow. Follow it.
2. Ask the user which mode to use. Ask before you choose a tunnel, because a tunnel runs on their machine.
3. Call `build_private_local_testing_config` with the mode. For `tunnel`, pass `selected_tunnel`.
4. Pass the result as `private_local_testing_configuration` to `create_test_run`.
5. For Run with AI, `create_manual_ai_session` reuses that configuration unchanged. Do not rebuild it.

## Tunnels

| Tool | Use | Class |
|---|---|---|
| `list_test_cloud_tunnels` | Show active tunnels for the project. | read |
| `prepare_test_cloud_tunnel_start` | Get the setup commands for a tunnel client. Set `test_type` to MANUAL or AUTOMATED. For manual, set `manual_execution_mode` to TESTPAK or RUN_WITH_AI. | read |
| `stop_test_cloud_tunnel` | Stop a tunnel. | destructive |

A tunnel can be shared. Stopping it ends every run that uses it. Name the tunnel in your question and wait for an explicit yes before you call `stop_test_cloud_tunnel`.

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
- UPDATE moves the alias to another app. Every run that uses the alias then runs the new app. Treat UPDATE as destructive. Name the alias and the new target, and wait for an explicit yes.

## Delete an app

`delete_test_cloud_app` removes apps for good. The tool text asks the user to type YES. Ask for that, name each app, and do not call the tool without it.

## Agents and environments

- `list_test_cloud_agents` lists the execution agents for a project. Use it when a run waits for an agent.
- `list_test_cloud_environments` lists browsers and devices. It takes an RSQL filter on platform, browser, device name or device family.
