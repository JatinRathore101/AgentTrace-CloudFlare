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
