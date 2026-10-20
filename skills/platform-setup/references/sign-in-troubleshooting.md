# Sign-in and Connection Troubleshooting

Read this when sign-in fails, the tools do not appear, or a native config does not work. Facts here were checked on 2026-10-20 against the public endpoint and client documentation. Items marked "not tested" come from client documentation only.

## How sign-in works

The endpoint `https://platform.katalon.io/mcp` answers a call without a token with an authorization challenge. This is expected. The challenge points the client to the sign-in server. The client discovers it, opens the browser, and stores the token itself. The user never pastes a token.

## Common failures

| Symptom | Likely cause | Action |
|---|---|---|
| `401 Invalid JWT token format` before sign-in finished | Auth challenge. The server is up. | Finish the browser sign-in. |
| 401 or 403 after sign-in | Wrong account, organization, or role | Ask which account and organization the user chose. Check project role. |
| Empty project list | The user is not a member, or the picker chose another workspace | Check membership. Sign in again and pick the workspace. |
| Wrong workspace after sign-in | The picker chose a different tenant | Ask for the dedicated domain. Use `https://<your.sub.domain>.katalon.io/mcp`. |
| Client reports a registration error | The server offers dynamic client registration. It does not advertise client ID metadata documents. | Choose the client's dynamic registration option. For Codex: `codex mcp login katalon-prod-mcp --oauth-client-registration dcr`. Not tested against this server. |
| Codex shows the server auth as unsupported | Reported on some setups | Use the `mcp-remote` fallback below. |
| Tools missing in Windsurf | Windsurf caps tools at 100 across all servers | Disable tools or servers you do not use. |
| Native config does nothing | Wrong `type` value or file for that client | Check the connect page for the client. Cline needs `streamableHttp`. Continue needs `streamable-http`. Claude Code and VS Code use `http`. |

## mcp-remote fallback

Use it only for a client that cannot reach a remote server natively, or when native sign-in fails.

1. Pin a version. Do not use `latest`. On 2026-10-20 the newest release that was at least two weeks old was 0.14.3. It was not tested against this endpoint. Test the version you pin, then update this line.
2. Run the proxy:

   ```sh
   npx mcp-remote@0.14.3 "https://platform.katalon.io/mcp" --transport http-first
   ```

3. `npx` asks before it installs a package. Answer the prompt yourself. Do not pre-approve it.
4. If the command prints an authorization URL or opens the browser, wait for the user to finish. The proxy keeps its sign-in state in its own auth cache, such as `~/.mcp-auth`. It does not write to the workspace.
5. The valid transport values are `http-first` and `http-only`. The value `http` is rejected.
6. Inside an MCP config entry the server has no terminal to answer the install prompt, so pass `-y`:

   ```json
   { "mcpServers": { "katalon-prod-mcp": { "command": "npx", "args": ["-y", "mcp-remote@0.14.3", "https://platform.katalon.io/mcp", "--transport", "http-first"] } } }
   ```

7. If the proxy works and the agent still shows no Katalon tools, the agent needs a reload or a new session. Say so.
8. To check through a local MCP client, the tool list should include `list_projects` and `list_repositories`. Call both. Use `project_id` for the second.

## What you cannot fix from here

- The sign-in server and its registration options belong to the platform team. Report the exact client error and stop.
- Do not retry in a loop. Do not ask for secrets to work around a failure.
