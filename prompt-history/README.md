# Prompt history

Cloudflare's assignment requires that prompt history be submitted alongside the code. This folder is that history: every prompt given to an AI coding tool while building this project, in the order it was sent.

## Convention

- One folder per prompt, named with the exact UTC send time as `YYYY-MM-DDTHH-MM-SSZ`, so folders sort chronologically.
- Each folder holds a single `prompt.md` with a metadata table (UTC and IST time, tool and model, session ID, attachments) and the prompt text verbatim, typos included.
- Attachments such as screenshots are described in words, not copied in.
- Records are written before the prompt is acted on and are never edited or deleted.

The full rule is in the repository's `CLAUDE.md`.
