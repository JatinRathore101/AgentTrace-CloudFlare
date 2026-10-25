# CLAUDE.md

Project: AI-powered application on Cloudflare, built for the optional assignment attached to Cloudflare's Software Engineer (Bengaluru) application, job ID 8212060.

## Rule 1: Document every prompt

The assignment states: "AI-assisted coding is encouraged, but you have to submit prompt history." Therefore every prompt given to an AI coding tool for this project must be recorded in this repository, with no exceptions.

### Location and layout

```text
prompt-history/
  <timestamp>/
    prompt.md
```

- `prompt-history/` lives at the repository root and holds nothing but timestamp folders.
- One folder per prompt. The folder name is the exact time the prompt was sent, in UTC, formatted `YYYY-MM-DDTHH-MM-SSZ` (ISO 8601 with colons replaced by hyphens so the name is filesystem-safe and sorts chronologically). Example: `2026-10-24T22-47-54Z`.
- Each timestamp folder contains exactly one file, `prompt.md`. No other files go in it.

### Contents of prompt.md

1. A heading `# Prompt N`, where N is the prompt's sequence number across the whole history.
2. A metadata table with: timestamp in UTC, timestamp in IST, the tool and model used, the session identifier, and a description of any attachments (images, pasted files). Attachments are described in words, not copied into the folder.
3. A section `## Prompt (verbatim)` containing the prompt text exactly as typed, inside a fenced `text` block. Typos and formatting are preserved. Nothing is paraphrased, trimmed, or corrected.

### Procedure

- Record the prompt before acting on it, as the first step of handling every user message. Do not batch or defer this.
- Timestamps come from the tool's own record of when the message was sent, not from when the file is written.
- Prompts that only steer the session (for example "check remote") are still prompts and are still recorded.
- Exception: prompts that ask only for git operations (commit, push, stage, remote, branch, status) are **not** recorded. A prompt that mixes git work with any other change is recorded.
- Never edit or delete an existing `prompt.md`. If a correction is needed, add a new prompt that explains it.

## Rule 2: Store every key, secret and token in env files

Every key, secret, token, password, account ID or similar value used, created or seen for this project must be saved in an env file, even if nothing uses it yet, so that no value is lost.

### Files

| File | Holds | Committed |
| --- | --- | --- |
| `.env` | Real values for tooling and deploys (account IDs, API tokens, emails, URLs) | Never (listed in `.gitignore`) |
| `.dev.vars` | Real values the Worker reads at runtime during `wrangler dev` | Never (listed in `.gitignore`) |
| `.env.example` | The same keys as `.env` and `.dev.vars` with empty or placeholder values | Yes |

### Procedure

- Save the value as soon as it appears, in the same turn. Do not defer it.
- Unused values are kept, with a comment saying where the value came from and which todo step it belongs to.
- Add every new key to `.env.example` at the same time, without the real value.
- Never write real values into committed files (code, docs, `wrangler.jsonc`, prompt records other than the verbatim prompt text). Reference the env variable name instead.
- Never delete a value from `.env` or `.dev.vars`. If a value is rotated or revoked, keep the old one commented out with the date.
- Deployed Worker secrets are set with `npx wrangler secret put <NAME>` and also recorded in `.dev.vars`.
