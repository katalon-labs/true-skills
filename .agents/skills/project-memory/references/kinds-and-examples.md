# Memory kinds and examples

Read this when you pick a `kind` for `memory_write` or write a headline.

## Kinds

| kind | Use it for |
|---|---|
| `convention` | How the work is done here: naming, structure, where things go. |
| `preference` | How this person likes it, with no team practice behind it. |
| `correction` | We got something wrong and this is the fix. |
| `verdict` | A judgement call on a result or a case. |
| `constraint` | A hard limit that must be respected. |
| `environment` | A fact about the system under test. |

If none fits, do not write. Examples that stay in the chat: a one-time request, a date, the state of today's run.

## Examples

| User says | kind | headline |
|---|---|---|
| "Whenever you generate a test folder, name it like 'Folder name - YYYYMMDD'" | `convention` | Test folders: "Folder name - YYYYMMDD" |
| "Note that I like test names in Given/When/Then" | `preference` | Test names use Given/When/Then |
| "Never run the checkout suite against prod" | `constraint` | Checkout suite never runs against prod |
| "The staging login is rate limited to 5 tries a minute" | `environment` | Staging login allows 5 tries a minute |

The `body` is always the user's sentence as they said it, with any reason they gave. The headline is your short statement of the rule.

## Checks before you save

- The text states a rule that should hold in the next session.
- The body copies the user's words.
- The headline shows the exact format, prefix, or name someone must type later.
- The user confirmed the preview.
