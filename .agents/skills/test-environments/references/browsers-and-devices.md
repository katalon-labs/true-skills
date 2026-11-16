# Browsers, devices, agents and profiles

Read this when a run needs a browser, an OS, a device, a Katalon Test Execution - Cloud agent, or an execution profile. Parameters follow the live schemas captured 2026-10-20. Check the schema in your session when a field is unclear.

## Query the catalog

`list_test_cloud_environments` returns desktop browsers and mobile devices. Put every criterion the user gave into `rsql_filter`. Dropping one returns wrong rows.

| User says | `rsql_filter` |
|---|---|
| Chrome on Linux | `platform==linux and browser==chrome` |
| Edge on Windows | `platform==windows and browser==msedge` |
| Android 11 | `platform==android and platformVersion==11` |
| Any iPhone family device | `platform==ios and device.deviceFamily==iPhone` |
| One exact device | `device.deviceId==<id from a row>` |
| Substring | `platform==*win*` (use `*` as the wildcard) |

Common fields: `type` (`desktop_browser`, `mobile_device`), `platform`, `platformVersion`, `browser`, `browserVersion`, `browserVersionType` (`dev`, `beta`, `stable`), `device.deviceName`, `device.manufacturer`, `capabilities.automation.supported`, `capabilities.automation.devicePoolType`.

Paging (a page holds up to 50 rows):

1. Leave `page_token` and `offset` out on the first call.
2. Copy `page_token` and `next_offset` from the response into the next call.
3. Stop when `page_token` is null. An empty page does not mean the end.
4. `count` is the size of one page. To count all matches, walk every page.

Other facts:

- `available` (LOW, MEDIUM, HIGH, BUSY) applies to mobile devices only. Desktop browsers are always available. Pair `is_live_testing` with `available`.
- The default `sort` is `-browserVersion`.
- Private-device UDIDs are not in this catalog. Keep an existing UDID, or use one the user typed.
- Availability changes during a walk. The result is not a snapshot.

## Build a configuration for an automated run

`build_run_configuration` returns the object for `automated.configurations` in `create_test_run`. Pass the same `config_type` as `automated.test_run_type`.

| Need | `config_type` | Key inputs |
|---|---|---|
| Desktop or mobile browser | `DESKTOP_AND_MOBILE_BROWSER` | `os`, `browser`, `browser_version`, `os_version`, `headless` |
| Native mobile app | `MOBILE_NATIVE` | `os`, `os_version`, `device_*` from the catalog, `app_*` from the app list |
| Web service | `API` | `os`, `name` |

Rules:

1. Copy `os`, `os_version`, `browser`, `browser_version` and `browser_version_type` from the same catalog row. Never mix rows.
2. If the user named no browser version, leave `browser_version` out or use `latest`. Do not put the OS version there.
3. A mobile device with no app means a mobile browser. Ask "mobile browser or mobile app" only when the intent is unclear.
4. For MOBILE_NATIVE, call `list_test_cloud_environments` and `list_test_cloud_apps` first. Do not build the configuration without an app ID, name and platform.
5. Mobile field sources: `device_name` is `device.deviceName` as-is (no OS version added), `device_id` is `device.deviceId`, `device_family` is `device.formFactor`, `device_pool` is `capabilities.automation.devicePoolType`, `os` is `platform`, `os_version` is `platformVersion`. App fields: `app_id` is `id`, `app_name` is `name`, `app_platform` is `platform`, `app_version` is `version`, `app_version_code` is `versionCode`.
6. User names no device: the builder defaults to "Any iPhone" for iOS or "Any Phone" for Android. Say which one you chose in the preview. Never swap in a different device without telling the user.
7. For a local agent, set `agent_type` to `LOCAL_AGENT` and pass `agent_id` (an integer from `list_test_cloud_agents`). The default is `TEST_CLOUD_AGENT`.

If `create_test_run` later returns INVALID_ENVIRONMENT, read `compatibleConfigurations` in the error, correct the tuple within the user's limits, and build again. Do not widen the user's request.

## Manual runs and Run with AI

A TestPak (manual run) takes `browser`, `browser_version`, `os` and `os_version` as plain fields. Read real values from the catalog. Never guess a version and never pass `latest` there. Omit `os_version` and `browser_version` when the user gave none.

Run with AI does not use the catalog. See "Run with AI environments" below. Settle the AUT and private access, then hand off.

## Run with AI environments

An organization admin sets which environments Run with AI may use. The rule covers the web UI and the MCP `START` call.

| Organization setting | What the user gets |
|---|---|
| No list set | Linux Chrome only, on the newest stable version. No OS or browser picker. |
| List allows everything | The full picker. |
| List names pairs | Only those pairs. The first is the default. `latest` is rejected and the run pins a concrete stable version. |

- Windows and macOS rows need a Test Execution - Cloud desktop license. Native mobile without it is refused with `TESTCLOUD_LICENSE_REQUIRED`.
- A beta build is replaced by the newest stable build of the same browser. For example, a request for a Windows Chrome beta runs on the newest stable Windows Chrome. Say this in the readiness summary.
- Do not offer a pair the organization does not list. A missing picker can mean "Linux Chrome only", not a bug.
- A 403 or "access denied" for one version can mean that version is unavailable. Check the requested values before you suspect permissions.
- The picker shows Linux Chrome and Chrome (headless) with versions from 151 down on one reviewed tenant. Versions change often. Read the picker, not this file.
- A Windows case that needs a client certificate carries `[cert: <profile>]` in its precondition. See `execute-test`.

## Desktop Browser live testing

Live Testing has three tabs: Desktop Browser, Mobile Native App and Mobile Browser. Since November 2026 the Desktop Browser tab is a native form. It is a web UI page with no MCP tool.

1. Enter the URL to open.
2. Select Configuration. It is a drill: OS (Windows or macOS), OS version, browser, browser version, then screen resolution. Windows lists Chrome, Firefox, Microsoft Edge, Brave, DuckDuckGo and Opera. macOS lists Safari as well. A pre-release version carries a BETA label. The lists come from the environment service and can differ from older pages.
3. Start Test. Starting is billed. Ask the user before you open a session for them.
4. A Private/Local Testing toggle is on the form. A link at the top right switches back to the old experience. Switching changes a saved user preference. Do not click it unasked.

For an automated or Run with AI run, use the catalog and the rules above. Live testing does not feed a run.

## Agents

`list_test_cloud_agents` needs `project_id`. It takes `rsql_filter` (for example `status==ACTIVE and os==linux`), `page_token`, `size` and `sort` (default `-id`). Stop paging when the response `page_token` is null, even on an empty page. Use an agent only when the user asked for a local agent or a run waits for one.

## Execution profiles

`find_execution_profiles` needs `project_id` and `repository_id`. It returns each profile ID, name and `isDefault`. Never assume a profile. Show the list, let the user choose, and pass the ID as `profile_id` to `create_test_run`. If the list is empty, say so and proceed without a profile only when the user agrees.
