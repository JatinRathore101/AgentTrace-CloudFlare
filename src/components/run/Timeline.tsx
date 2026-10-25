import BuildIcon from "@mui/icons-material/Build";
import PsychologyIcon from "@mui/icons-material/Psychology";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Span } from "@/agent/types";
import { fmtMs, shortModel } from "@/lib/format";

const MIN_BAR_PX = 3;

/** Waterfall: one row per span, bar x = offset from run start, width = latency. */
export function Timeline({
  spans,
  runStart,
  runEnd,
  selectedSeq,
  highlightSeq,
  onSelect,
}: {
  spans: Span[];
  runStart: number;
  runEnd: number | null;
  selectedSeq: number | null;
  highlightSeq: number | null;
  onSelect: (span: Span) => void;
}) {
  const theme = useTheme();
  const end = Math.max(runEnd ?? 0, ...spans.map((s) => s.ended_at), runStart + 1);
  const total = end - runStart;

  if (spans.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography sx={{ color: "text.secondary" }}>No spans recorded yet.</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, overflowX: "auto" }}>
      <Box sx={{ minWidth: 640 }}>
        <Box sx={{ display: "flex", fontSize: 12, color: "text.secondary", mb: 1 }}>
          <Box sx={{ width: 260, flexShrink: 0 }}>Span</Box>
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "space-between" }}>
            <span>0 s</span>
            <span>{fmtMs(Math.round(total / 2))}</span>
            <span>{fmtMs(total)}</span>
          </Box>
        </Box>
        {spans.map((s) => {
          const left = ((s.started_at - runStart) / total) * 100;
          const width = (s.latency_ms / total) * 100;
          const color =
            s.status === "error"
              ? theme.palette.error.main
              : s.kind === "llm"
                ? theme.palette.info.main
                : theme.palette.success.main;
          const active = s.seq === selectedSeq || s.seq === highlightSeq;
          return (
            <Box
              key={s.id}
              id={`span-${s.seq}`}
              onClick={() => onSelect(s)}
              sx={{
                display: "flex",
                alignItems: "center",
                height: 30,
                cursor: "pointer",
                borderRadius: 1,
                bgcolor: active ? `${color}22` : "transparent",
                "&:hover": { bgcolor: `${color}14` },
              }}
            >
              <Box
                sx={{
                  width: 260,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pl: 0.5,
                  overflow: "hidden",
                }}
              >
                <Typography
                  sx={{ fontSize: 12, color: "text.secondary", width: 28, fontVariantNumeric: "tabular-nums" }}
                >
                  #{s.seq}
                </Typography>
                {s.kind === "llm" ? (
                  <PsychologyIcon sx={{ fontSize: 16, color }} />
                ) : (
                  <BuildIcon sx={{ fontSize: 14, color }} />
                )}
                <Typography noWrap sx={{ fontSize: 13 }}>
                  {s.kind === "llm" ? shortModel(s.name) : s.name}
                </Typography>
              </Box>
              <Box sx={{ position: "relative", flexGrow: 1, height: 14 }}>
                <Tooltip title={`${s.name} · ${fmtMs(s.latency_ms)}${s.error ? ` · ${s.error}` : ""}`}>
                  <Box
                    sx={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `max(${MIN_BAR_PX}px, ${width}%)`,
                      top: 0,
                      bottom: 0,
                      bgcolor: color,
                      borderRadius: 0.5,
                      outline: active ? `2px solid ${theme.palette.text.primary}` : "none",
                    }}
                  />
                </Tooltip>
              </Box>
            </Box>
          );
        })}
        <Box sx={{ display: "flex", gap: 2, mt: 1.5, fontSize: 12, color: "text.secondary" }}>
          <span style={{ color: theme.palette.info.main }}>■ LLM call</span>
          <span style={{ color: theme.palette.success.main }}>■ Tool call</span>
          <span style={{ color: theme.palette.error.main }}>■ Error</span>
        </Box>
      </Box>
    </Paper>
  );
}
