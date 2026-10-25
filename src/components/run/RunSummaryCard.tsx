import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RunSummary } from "@/agent/types";
import CustomChip from "@/components/chips/customChip";
import { StatusChip } from "@/components/runs/StatusChip";
import { fmtInt, fmtMs, fmtNeurons, fmtUsd, shortModel } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography sx={{ fontSize: 12, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Box>
  );
}

export function RunSummaryCard({ run }: { run: RunSummary }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <StatusChip status={run.status} />
        <Typography sx={{ fontWeight: 700 }}>{run.scenario}</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>· {shortModel(run.model)}</Typography>
        {run.is_demo && <CustomChip chipValue="demo" chipState="PURPLE" />}
        {run.faults.map((f) => (
          <CustomChip key={f} chipValue={f} chipState="GREY" />
        ))}
      </Stack>
      <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Goal: {run.goal}</Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 3 }}>
        <Stat label="Steps" value={fmtInt(run.steps)} />
        <Stat label="Tokens in" value={fmtInt(run.prompt_tokens)} />
        <Stat label="Tokens out" value={fmtInt(run.completion_tokens)} />
        <Stat label="Neurons" value={fmtNeurons(run.neurons)} />
        <Stat label="Cost" value={fmtUsd(run.cost_usd)} />
        <Stat label="Duration" value={fmtMs(run.duration_ms)} />
      </Stack>
      {run.final_answer && (
        <Box>
          <Typography sx={{ fontSize: 12, color: "text.secondary", textTransform: "uppercase", mb: 0.5 }}>
            Final answer
          </Typography>
          <Typography sx={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{run.final_answer}</Typography>
        </Box>
      )}
      {run.error && <Typography sx={{ fontSize: 14, color: "error.main" }}>Error: {run.error}</Typography>}
    </Paper>
  );
}
