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
| Client reports a registration error | The server offers dynamic client registration. It does not advertise client ID metadata documents. The MCP revision 2026-07-28 deprecates dynamic client registration in favor of client ID metadata documents, so a client that supports only the new flow can fail here. Which revision this server speaks is not confirmed. | Choose the client's dynamic registration option. For Codex: `codex mcp login katalon-prod-mcp --oauth-client-registration dcr`. Not tested against this server. |
| Codex shows the server auth as unsupported | Reported on some setups | Use the `mcp-remote` fallback below. |
| A call returns `CREDENTIAL_REJECTED` | The repository credential saved for the user, such as a Git token, was rejected. The error points to the api-key page, `/user-settings/api-key`. | Tell the user to fix the credential on that page. Do not retry the call. |
| A call returns `BACKEND_TIMEOUT`, `BACKEND_UNAVAILABLE`, or `BACKEND_SERVER_ERROR` | A backend problem. The error carries `retry`. Some errors arrive in a wrapper message named `BACKEND_API_ERROR` with an `http_status`. Treat it as a wrapper, not a code. `BACKEND_UNAVAILABLE` covers 502, 503, and 504. | The service retries a read once and does not retry a failed write. Read back before you retry a write. A write can time out and still land. |
| An API key stopped working | The key was revoked. A revoked key stops working at once, for every username. | Create a new key. Do not keep retrying with the old one. |
| 403 or "access denied" from one call, while other calls work | It may not be a permission problem. It can mean the requested environment, browser version, or data value is unavailable. | Check the values you asked for first. Then check the role. |
| StudioAssist gets a permission denial on a project | StudioAssist may sign in with a different global account than the project connection in Studio. | Compare the two accounts. Sign in with the account that has project access. |
| Katalon AI refuses and names AI Services | AI is switched off in the account's AI Services settings. | Ask an organization admin to check the setting. |
| Access Denied on a system page | Usually a role problem, not an AI setting. | Check the user's role. |
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
