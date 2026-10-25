"use client";

import SendIcon from "@mui/icons-material/Send";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Fragment, useState } from "react";
import type { ChatMessage, RunStatus } from "@/agent/types";
import { api } from "@/lib/api-client";

const DEFAULT_QUESTION = "Why did this run fail?";
const MAX_QUESTION = 1000;

/** Renders answer text and turns span references like [#4] or [#5, #7] into links that highlight the span. */
function WithSpanLinks({ text, onSpan }: { text: string; onSpan: (seq: number) => void }) {
  // Keys combine position and text: the split of one immutable string never reorders.
  const parts = text.split(/(\[#\d+(?:,\s*#\d+)*\])/g).map((part, i) => ({ part, key: `${i}:${part.slice(0, 16)}` }));
  return (
    <>
      {parts.map(({ part, key }) => {
        if (!/^\[#\d+(?:,\s*#\d+)*\]$/.test(part)) return <Fragment key={key}>{part}</Fragment>;
        const seqs = [...part.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
        return (
          <Fragment key={key}>
            [
            {seqs.map((seq, j) => (
              <Fragment key={`${key}-${seq}`}>
                {j > 0 && ", "}
                <Link
                  component="button"
                  color="info.main"
                  onClick={() => onSpan(seq)}
                  sx={{ verticalAlign: "baseline", fontSize: "inherit" }}
                >
                  #{seq}
                </Link>
              </Fragment>
            ))}
            ]
          </Fragment>
        );
      })}
    </>
  );
}

export function AskAiPanel({
  runId,
  status,
  chat,
  failed,
  onChat,
  onSpan,
}: {
  runId: string;
  status: RunStatus;
  chat: ChatMessage[];
  failed: boolean;
  onChat: (chat: ChatMessage[]) => void;
  onSpan: (seq: number) => void;
}) {
  const [question, setQuestion] = useState(failed && chat.length === 0 ? DEFAULT_QUESTION : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = status === "running" || busy;

  async function send() {
    const message = question.trim() || DEFAULT_QUESTION;
    setBusy(true);
    setError(null);
    try {
      const res = await api.explain(runId, message);
      onChat(res.chat);
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography sx={{ fontWeight: 700 }}>Ask AI</Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
        Answers are grounded in this run's spans and findings. The conversation is saved with the run.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 420, overflowY: "auto" }}>
        {chat.map((m) => (
          <Box
            key={m.id}
            sx={{
              alignSelf: m.role === "user" ? "flex-end" : "stretch",
              maxWidth: m.role === "user" ? "85%" : "100%",
              p: 1.25,
              borderRadius: 1,
              bgcolor: m.role === "user" ? "info.main" : "background.default",
              color: m.role === "user" ? "#fff" : "text.primary",
              border: m.role === "user" ? 0 : 1,
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {m.role === "assistant" ? <WithSpanLinks text={m.content} onSpan={onSpan} /> : m.content}
            </Typography>
          </Box>
        ))}
        {busy && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", color: "text.secondary", fontSize: 13 }}>
            <CircularProgress size={14} /> Thinking…
          </Box>
        )}
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          id="ask-ai-question"
          size="small"
          fullWidth
          placeholder={status === "running" ? "Available when the run finishes" : DEFAULT_QUESTION}
          value={question}
          disabled={disabled}
          onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled) {
              e.preventDefault();
              send();
            }
          }}
        />
        <IconButton color="info" aria-label="send question" disabled={disabled} onClick={send}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
