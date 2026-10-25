import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Span } from "@/agent/types";
import CustomChip from "@/components/chips/customChip";
import { APPBAR_HEIGHT } from "@/constants";
import { fmtInt, fmtMs, fmtNeurons, prettyJson } from "@/lib/format";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: "text.secondary", textTransform: "uppercase" }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>{value}</Typography>
    </Box>
  );
}

function JsonBlock({ title, text }: { title: string; text: string | null }) {
  const truncated = (text ?? "").includes("…[truncated");
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{title}</Typography>
        {truncated && <CustomChip chipValue="truncated" chipState="YELLOW" fontSize="10px" />}
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          fontSize: 12,
          bgcolor: "background.default",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          maxHeight: 320,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {prettyJson(text)}
      </Box>
    </Box>
  );
}

export function SpanDrawer({ span, onClose }: { span: Span | null; onClose: () => void }) {
  return (
    <Drawer
      anchor="right"
      open={!!span}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 520 }, pt: `${APPBAR_HEIGHT}px` } } }}
    >
      {span && (
        <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>
              #{span.seq} · {span.kind === "llm" ? "LLM call" : "Tool call"}
            </Typography>
            <IconButton aria-label="close span details" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack direction="row" spacing={1}>
            <CustomChip chipValue={span.status} chipState={span.status === "ok" ? "GREEN" : "RED"} />
            <CustomChip chipValue={`step ${span.step}`} chipState="GREY" />
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <Field label="Name" value={span.name} />
            <Field label="Latency" value={fmtMs(span.latency_ms)} />
            {span.kind === "llm" && <Field label="Tokens in" value={fmtInt(span.prompt_tokens)} />}
            {span.kind === "llm" && <Field label="Tokens out" value={fmtInt(span.completion_tokens)} />}
            {span.kind === "llm" && <Field label="Neurons" value={fmtNeurons(span.neurons)} />}
            {span.gateway_log_id && <Field label="AI Gateway log" value={span.gateway_log_id} />}
          </Box>
          {span.error && <Typography sx={{ color: "error.main", fontSize: 14 }}>Error: {span.error}</Typography>}
          <JsonBlock title={span.kind === "llm" ? "Output (text + tool calls)" : "Output"} text={span.output} />
          <JsonBlock title={span.kind === "llm" ? "Input (messages + tools)" : "Arguments"} text={span.input} />
        </Box>
      )}
    </Drawer>
  );
}
