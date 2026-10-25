import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import type { Comparison, SpanLite } from "@/agent/compare";
import type { RunSummary } from "@/agent/types";
import CustomChip from "@/components/chips/customChip";
import { StatusChip } from "@/components/runs/StatusChip";
import { fmtInt, fmtMs, fmtSigned, fmtUsd, shortModel } from "@/lib/format";

function MetricDelta({
  label,
  a,
  b,
  delta,
  format,
}: {
  label: string;
  a: string;
  b: string;
  delta: number | null;
  format: string;
}) {
  const theme = useTheme();
  // Lower is better for every metric shown (steps, tokens, cost, time, errors).
  const color =
    delta == null || delta === 0
      ? theme.palette.text.secondary
      : delta < 0
        ? theme.palette.success.main
        : theme.palette.error.main;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 150, flex: "1 1 150px" }}>
      <Typography sx={{ fontSize: 12, color: "text.secondary", textTransform: "uppercase" }}>{label}</Typography>
      {(a || b) && (
        <Typography sx={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
          A {a} → B {b}
        </Typography>
      )}
      <Typography sx={{ fontSize: 20, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
        {delta == null ? "—" : delta === 0 ? "±0" : `${delta > 0 ? "▲" : "▼"} ${format}`}
      </Typography>
    </Paper>
  );
}

function RunHeader({ label, run }: { label: string; run: RunSummary }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
        <StatusChip status={run.status} />
        <Link component={NextLink} href={`/runs/${run.id}`} color="info.main" underline="hover" sx={{ fontSize: 14 }}>
          {run.scenario}
        </Link>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{shortModel(run.model)}</Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
        {run.faults.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>no faults</Typography>
        ) : (
          run.faults.map((f) => <CustomChip key={f} chipValue={f} chipState="GREY" />)
        )}
      </Box>
    </Paper>
  );
}

const spanText = (list: SpanLite[]) =>
  list.length === 0 ? "—" : list.map((s) => `${s.name}${s.status === "error" ? " ✗" : ""}`).join(", ");

export function CompareView({ data }: { data: Comparison }) {
  const theme = useTheme();
  const { a, b, deltas } = data;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {!data.sameScenario && (
        <Alert severity="warning">These runs use different scenarios, so the deltas compare different tasks.</Alert>
      )}
      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <RunHeader label="A" run={a} />
        <RunHeader label="B" run={b} />
      </Box>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <MetricDelta
          label="Steps"
          a={fmtInt(a.steps)}
          b={fmtInt(b.steps)}
          delta={deltas.steps}
          format={fmtSigned(deltas.steps).slice(1)}
        />
        <MetricDelta
          label="Tokens"
          a={fmtInt(a.prompt_tokens + a.completion_tokens)}
          b={fmtInt(b.prompt_tokens + b.completion_tokens)}
          delta={deltas.prompt_tokens + deltas.completion_tokens}
          format={fmtInt(Math.abs(deltas.prompt_tokens + deltas.completion_tokens))}
        />
        <MetricDelta
          label="Cost"
          a={fmtUsd(a.cost_usd)}
          b={fmtUsd(b.cost_usd)}
          delta={deltas.cost_usd}
          format={fmtUsd(Math.abs(deltas.cost_usd))}
        />
        <MetricDelta
          label="Duration"
          a={fmtMs(a.duration_ms)}
          b={fmtMs(b.duration_ms)}
          delta={deltas.duration_ms}
          format={fmtMs(deltas.duration_ms == null ? null : Math.abs(deltas.duration_ms))}
        />
        <MetricDelta label="Errors" a="" b="" delta={deltas.errors} format={fmtInt(Math.abs(deltas.errors))} />
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Findings</Typography>
        {(
          [
            ["Only in A", data.findings.onlyA, "GREY"],
            ["Only in B", data.findings.onlyB, "RED"],
            ["In both", data.findings.both, "YELLOW"],
          ] as const
        ).map(([label, list, color]) => (
          <Box key={label} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.75, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 13, width: 90, color: "text.secondary" }}>{label}</Typography>
            {list.length === 0 ? (
              <Typography sx={{ fontSize: 13 }}>—</Typography>
            ) : (
              list.map((d) => <CustomChip key={d} chipValue={d} chipState={color} />)
            )}
          </Box>
        ))}
      </Paper>
      <Paper variant="outlined" sx={{ p: 2, overflowX: "auto" }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Tool calls by step</Typography>
        <Box sx={{ minWidth: 520 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 1fr",
              fontSize: 12,
              color: "text.secondary",
              mb: 0.5,
            }}
          >
            <span>Step</span>
            <span>A</span>
            <span>B</span>
          </Box>
          {data.steps.map((s) => (
            <Box
              key={s.step}
              sx={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 1fr",
                fontSize: 13,
                py: 0.75,
                px: 0.5,
                borderRadius: 1,
                bgcolor: s.same ? "transparent" : `${theme.palette.warning.main}1f`,
              }}
            >
              <span>{s.step}</span>
              <span>{spanText(s.a)}</span>
              <span>{spanText(s.b)}</span>
            </Box>
          ))}
          {data.steps.length === 0 && <Typography sx={{ fontSize: 13 }}>No tool calls in either run.</Typography>}
        </Box>
      </Paper>
    </Box>
  );
}
