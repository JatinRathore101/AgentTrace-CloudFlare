"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { RunDetail, Span } from "@/agent/types";
import { AskAiPanel } from "@/components/run/AskAiPanel";
import { FindingsList } from "@/components/run/FindingsList";
import { RunSummaryCard } from "@/components/run/RunSummaryCard";
import { SpanDrawer } from "@/components/run/SpanDrawer";
import { Timeline } from "@/components/run/Timeline";
import { RUN_POLL_INTERVAL_MS } from "@/constants";
import { ApiError, api } from "@/lib/api-client";

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [selected, setSelected] = useState<Span | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setDetail(await api.getRun(id));
      setError(null);
    } catch (e) {
      setError({ status: e instanceof ApiError ? e.status : 500, message: (e as Error).message });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const running = detail?.run.status === "running";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(load, RUN_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [running, load]);

  const focusSpan = (seq: number) => {
    setHighlight(seq);
    document.getElementById(`span-${seq}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (error) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
        <Alert severity={error.status === 404 ? "warning" : "error"}>
          {error.status === 404 ? "Run not found." : error.message}
        </Alert>
        <Button component={NextLink} href="/" startIcon={<ArrowBackIcon />}>
          Back to runs
        </Button>
      </Box>
    );
  }
  if (!detail) return <LinearProgress color="info" />;

  const { run, spans, findings, chat } = detail;
  const failed = run.status !== "succeeded" || findings.some((f) => f.severity === "crit");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button component={NextLink} href="/" startIcon={<ArrowBackIcon />} size="small">
          Runs
        </Button>
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{run.id}</Typography>
      </Box>
      {running && <LinearProgress color="info" />}
      <RunSummaryCard run={run} />
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 1fr)" } }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>Timeline ({spans.length} spans)</Typography>
          <Timeline
            spans={spans}
            runStart={run.started_at}
            runEnd={run.ended_at}
            selectedSeq={selected?.seq ?? null}
            highlightSeq={highlight}
            onSelect={setSelected}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <FindingsList findings={findings} onPick={focusSpan} />
          <AskAiPanel
            key={run.id}
            runId={run.id}
            status={run.status}
            chat={chat}
            failed={failed}
            onChat={(c) => setDetail((d) => (d ? { ...d, chat: c } : d))}
            onSpan={focusSpan}
          />
        </Box>
      </Box>
      <SpanDrawer span={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
