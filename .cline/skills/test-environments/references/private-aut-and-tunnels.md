# Private AUT access and tunnels

Read this when the AUT is not on the public internet, when the user asks for a tunnel, or when a run cannot reach its AUT. Parameters follow the live schemas captured 2026-10-20.

## Does the AUT need private access

Treat the AUT URL as private when its host is localhost, 127.0.0.1, ::1, a 10.x.x.x, 192.168.x.x or 172.16 to 31.x.x address, a 169.254.x.x address, or ends in .local, .internal, .corp, .intranet or .lan. Even then, ask. The user can know better. A public-looking URL can also sit behind a VPN.

Two modes exist:

- `tunnel`: a tunnel client on the user's network opens a path from the cloud to the AUT.
- `whitelist`: the AUT allows the platform's addresses. The network guide is at https://docs.katalon.com/katalon-testcloud/network-configuration-for-testcloud.

## Ask the user

Use a choice form when your client has one. Otherwise ask in chat. Copy the option labels character for character. Never choose for the user. Reuse an explicit "No private access needed" from this conversation.

1. Call `list_test_cloud_tunnels` to see which options exist.
2. With active tunnels, offer: "No private access needed" | "Use Katalon Tunnel" | "Use IP Whitelisting".
3. With no active tunnel, offer: "No private access needed" | "Yes, I need private access".
4. After "Use Katalon Tunnel", ask a second question and wait: "Auto-select tunnel (recommended)" plus one "Tunnel: <id> (started by <username>)" for each active tunnel. Never pick a tunnel for the user, even when only one is listed.
5. Only the exact label drives the branch. If the user answers in free text, show the options again.

## Build the payload

Call `build_private_local_testing_config` only after the user chose.

| Choice | Call |
|---|---|
| Use Katalon Tunnel, auto-select | `mode` `tunnel`, `selected_tunnel` null |
| Use Katalon Tunnel, one tunnel | `mode` `tunnel`, `selected_tunnel` the tunnel ID |
| Use IP Whitelisting | `mode` `whitelist` |
| No private access needed | No call. Leave the payload out. |

Set `include_api_calls` to true only when the user asks to send API calls through the tunnel. The default is false.

The result goes to `execute-test` as `private_local_testing_configuration`. For a run that already exists, `execute-test` passes it in `update_test_run` `CONFIGURE`, or in `START` with `KATALON_AI`.

## No active tunnel

If the user needs private access and no tunnel is active, block the run. Offer two paths.

Tunnel:

1. Call `prepare_test_cloud_tunnel_start`. Set `test_type` to `MANUAL` or `AUTOMATED`. For manual, set `manual_execution_mode` to `RUN_WITH_AI` for the full guide, or `TESTPAK` for VPN guidance only. Add `platform_label` (for example Windows or macOS) when the user named one. An unset mode counts as TestPak.
2. Give the setup text to the user. The result can hold download links, an API key and commands. Show it only to the user. Never save it to a file, a note or a commit.
3. Ask the user to start the tunnel client and tell you when it runs. You cannot start it.
4. Call `list_test_cloud_tunnels` again. If it is still empty, say no tunnel is detected yet and wait. Do not continue.
5. When a tunnel shows, ask the "Select Tunnel" question, then build the payload.

IP whitelisting:

1. Share the network guide above.
2. Ask the user to confirm that the addresses are allowed.
3. Call `build_private_local_testing_config` with `mode` `whitelist`.

## Diagnose a tunnel

Start with `list_test_cloud_tunnels` in the right project. It shows what the platform sees.

| Symptom | Likely cause | Next step |
|---|---|---|
| The list is empty | The tunnel runs under another `project_id`, or the client is not running or stopped | First read the list with the `project_id` the tunnel was started under. Then ask the user to check the client. Read the list again. |
| A tunnel shows but the AUT does not load | The AUT host is not reachable from the tunnel machine | Ask the user to open the AUT URL from that machine |
| The run used the wrong tunnel | Auto-select picked one of several | Ask the user to choose a tunnel by ID and rebuild the payload |
| Only VPN guidance came back | `manual_execution_mode` was TESTPAK or unset | For Run with AI, call again with `RUN_WITH_AI` |
| API calls fail inside the AUT | `include_api_calls` was false | Ask whether to send API calls through the tunnel, then rebuild |

Say plainly when the data does not explain the failure. The MCP has no tunnel log.

## Stop a tunnel

`stop_test_cloud_tunnel` takes `project_id` and `tunnel_id`. A tunnel can be shared, so stopping it ends every run that uses it.

1. Call `list_test_cloud_tunnels` and show the tunnel ID and who started it.
2. Say that every run on this tunnel stops. Wait for an explicit yes that names the tunnel.
3. Call the tool.
4. Call `list_test_cloud_tunnels` again and confirm the tunnel is gone.
