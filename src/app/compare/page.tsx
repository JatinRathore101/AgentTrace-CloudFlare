"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Comparison } from "@/agent/compare";
import type { RunSummary } from "@/agent/types";
import { CompareView } from "@/components/compare/CompareView";
import { api } from "@/lib/api-client";
import { fmtAgo, shortModel } from "@/lib/format";

function ComparePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const a = params?.get("a") ?? "";
  const b = params?.get("b") ?? "";
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [data, setData] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .listRuns()
      .then((r) => setRuns(r.runs.filter((x) => x.status !== "running")))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    setData(null);
    if (!a || !b) return;
    if (a === b) {
      setError("Pick two different runs to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    api
      .compare(a, b)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [a, b]);

  const pick = (key: "a" | "b", value: string) => {
    const next = new URLSearchParams({ a, b, [key]: value });
    router.replace(`/compare?${next.toString()}`);
  };

  const label = (r: RunSummary) =>
    `${r.scenario} · ${r.faults.length ? r.faults.join("+") : "no faults"} · ${shortModel(r.model)} · ${fmtAgo(r.started_at)}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Compare runs
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
          See what a fault or a model change did: B minus A for steps, tokens, cost and time.
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {(["a", "b"] as const).map((key) => (
          <TextField
            key={key}
            select
            id={`compare-${key}`}
            size="small"
            label={`Run ${key.toUpperCase()}`}
            value={runs.some((r) => r.id === (key === "a" ? a : b)) ? (key === "a" ? a : b) : ""}
            onChange={(e) => pick(key, e.target.value)}
            sx={{ flex: 1 }}
          >
            {runs.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {label(r)}
              </MenuItem>
            ))}
          </TextField>
        ))}
      </Stack>
      {loading && <LinearProgress color="info" />}
      {error && <Alert severity="error">{error}</Alert>}
      {!a || !b ? (
        <Alert severity="info">Pick two finished runs above, or tick two rows on the Runs page.</Alert>
      ) : (
        data && <CompareView data={data} />
      )}
    </Box>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<LinearProgress color="info" />}>
      <ComparePageInner />
    </Suspense>
  );
}
