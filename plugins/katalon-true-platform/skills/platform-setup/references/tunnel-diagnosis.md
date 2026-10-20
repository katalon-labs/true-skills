# Tunnel Diagnosis for Private Apps

Read this when a Run with AI session or an automated run cannot reach the application under test (AUT) because it sits on localhost, a VPN, or a private network. Diagnosis only reads state. This skill does not start a run.

## Steps

1. Ask whether the AUT is reachable from the public internet. If it is, no tunnel is needed. Check the environment URL with `read_auts` and stop here.
2. Call `list_test_cloud_tunnels` with `project_id`. Note each active tunnel. A tunnel can be shared by other runs and other people in the project.
3. If no tunnel is active, call `prepare_test_cloud_tunnel_start`. Set `test_type` to MANUAL or AUTOMATED. For a manual run, set `manual_execution_mode` to TESTPAK or RUN_WITH_AI. The tool returns commands for a tunnel client. Give the commands to the user. They run them on a machine that can reach the AUT. Run them yourself only when the user asks and that machine can reach the AUT.
4. If a tunnel is active but the run still fails, check that the tunnel matches the run type. Then call `build_private_local_testing_config` with `mode` set to `tunnel` and `selected_tunnel`. Ask the user before you choose tunnel mode.
5. If a tunnel cannot be used, `build_private_local_testing_config` also takes `mode` set to `whitelist`. The customer's network team must allow the addresses the tool reports. Do not invent addresses.
6. If a tunnel is stale, ask the user. Call `stop_test_cloud_tunnel` only after a yes that names the tunnel. It stops a shared tunnel. Start a new one with step 3.
7. A Run with AI session reuses the private network setup from `create_test_run` without change. Do not build a second one.

## Report

```text
AUT reachable from the internet: yes or no
Active tunnels: <names or none>
Chosen setup: tunnel, allowlist, or none
Next step: <one action for the user>
```

After the fix, hand off to `execute-test`. That skill owns the run and its confirmation.
