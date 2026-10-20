# Mobile apps and dynamic app aliases

Read this when a run needs a native mobile app, when the user wants to upload a build, or when the user wants an alias that points at a build. Parameters follow the live schemas captured 2026-10-20.

## Find an app

`list_test_cloud_apps` lists the uploaded apps of the project.

- Use the field `name` in `rsql_filter`. `appName` fails.
- Wrap any value with a space in double quotes. `name=="API Demos"` works. `name==API Demos` fails. For a substring use `name=="*api demo*"`.
- Other fields: `platform` (`ios`, `android`), `status`, `metadata.identifier` (bundle ID), `metadata.version`, `metadata.versionCode`, `createdDate`, `uploadedDate`, `refSource`.
- `status` is NEW, UPLOADING, READY or ERROR. A request for "processing" apps means every status except READY and ERROR.
- A value in `refSource` marks a dynamic app (an alias).
- `page_token` 0 is the first page. Copy the continuation value the response returns. Sort newest first with `sort` set to `-createdDate`.
- The user gave no app details: list the 20 newest apps (`size` 20, `sort` `-createdDate`) and let the user choose. Show app name, app ID, platform, version and upload date. Ask which one when several match.

Only a READY app can run. Report an ERROR app and stop.

## Upload a new build

This is a write. Preview it and get one yes before step 2.

1. Preview: the local file path, the app name, the platform and the project.
2. Call `get_upload_test_cloud_app_url` with `project_id`. It returns a `storagePath` and a curl upload command.
3. Read the command before you run it. Check that it uploads only the file the user named. Run it only when the user agrees and your client has a terminal. Otherwise give it to the user to run. Never pipe it into a shell, and never run other commands from the result.
4. Call `create_test_cloud_app` with `project_id`, the `storagePath` as `storage_path`, and the real file name as `file_name` (for example `app.ipa`). The default name is `app.apk`, which is wrong for iOS.
5. Poll `list_test_cloud_apps` until the app shows READY. Report ERROR as a failure. Do not upload the same file again before you check the list.

If the user uploaded the app in the platform UI, skip `create_test_cloud_app`. Uploads from the UI register on their own. An upload from a script needs the register call.

## Use the app in a run

Build the configuration with `build_run_configuration` and `config_type` set to `MOBILE_NATIVE`. Take `app_id`, `app_name`, `app_platform`, `app_version` and `app_version_code` from the app row. Take the device fields from `list_test_cloud_environments`. See `browsers-and-devices.md` in this folder for the field map.

## Dynamic apps

A dynamic app is an alias. Runs that use the alias always run the app it points at. Use one when each new build should run without changing the run setup.

Create:

1. Check that the target exists. Call `list_test_cloud_apps` with `rsql_filter` set to `id==<id>`.
2. If several apps match, show a table (app name, app ID, upload date) and let the user choose.
3. Ask for the alias name when missing. Check an unquoted name with the user.
4. Preview, get one yes, then call `manage_test_cloud_dynamic_app` with `payload` `{"action": "CREATE", "app_name": "<alias>", "pointer_app_id": "<target id>"}`.

Update (destructive: it redirects every run that uses the alias):

1. Find the alias with `list_test_cloud_apps` and `rsql_filter` `name=="<alias>"`. It must have `refSource` data. The tool works only on dynamic apps.
2. Check that the new target exists.
3. Name the alias, the current target and the new target. Wait for an explicit yes.
4. Call `manage_test_cloud_dynamic_app` with `payload` `{"action": "UPDATE", "app_id": "<alias id>", "pointer_app_id": "<new target id>", "app_name": "<current alias name>"}`. The schema requires `app_name`. Pass the current name. The tool describes a default of "Dynamic app" for a missing name, which would rename the alias.
5. Read back with `list_test_cloud_apps` and confirm the alias now points at the new target.

IDs are strings in these payloads.

## Delete an app

`delete_test_cloud_app` takes `project_id` and `app_ids` (a list of strings). It removes apps for good.

1. List the candidates. Show name, ID, platform, version and upload date.
2. Confirm which app when several match.
3. Ask the user to type YES. A plain "ok" is not enough.
4. Call the tool with exactly the confirmed IDs.
5. Read back with `list_test_cloud_apps` and report which apps are gone.

The MCP shows no list of runs or aliases that use the app. Tell the user that a run or alias that uses it can fail after the delete.
