"use client";

import AddIcon from "@mui/icons-material/Add";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RunSummary } from "@/agent/types";
import CustomChip from "@/components/chips/customChip";
import { NewRunDialog } from "@/components/runs/NewRunDialog";
import { StatusChip } from "@/components/runs/StatusChip";
import SearchBar from "@/components/searchbar/searchbar";
import DataTableBody, { type Column } from "@/components/table/dataTableBody";
import { RUN_POLL_INTERVAL_MS } from "@/constants";
import { api } from "@/lib/api-client";
import { fmtAgo, fmtInt, fmtMs, fmtUsd, shortModel } from "@/lib/format";

export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback(async () => {
    try {
      const res = await api.listRuns();
      setRuns(res.runs);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const anyRunning = runs.some((r) => r.status === "running");
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(load, RUN_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [anyRunning, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter((r) => [r.scenario, r.status, r.model, ...r.faults].some((v) => v.toLowerCase().includes(q)));
  }, [runs, search]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)));
  }, []);

  const remove = useCallback(
    async (id: string) => {
      try {
        await api.deleteRun(id);
        setSelected((prev) => prev.filter((x) => x !== id));
        setToast("Run deleted");
        load();
      } catch (e) {
        setToast((e as Error).message);
      }
    },
    [load],
  );

  const columns: Column<RunSummary>[] = useMemo(
    () => [
      {
        accessor: "select",
        Header: "",
        width: 48,
        Cell: ({ row }) => (
          <Checkbox
            size="small"
            checked={selected.includes(row.id)}
            disabled={row.status === "running"}
            onChange={() => toggle(row.id)}
            inputProps={{ "aria-label": "select run for compare" }}
          />
        ),
      },
      { accessor: "status", Header: "Status", Cell: ({ row }) => <StatusChip status={row.status} /> },
      {
        accessor: "scenario",
        Header: "Scenario",
        Cell: ({ row }) => (
          <Link component={NextLink} href={`/runs/${row.id}`} underline="hover" color="info.main">
            {row.scenario}
          </Link>
        ),
      },
      {
        accessor: "faults",
        Header: "Faults",
        Cell: ({ row }) => (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
            {row.is_demo && <CustomChip chipValue="demo" chipState="PURPLE" />}
            {row.faults.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>none</Typography>
            ) : (
              row.faults.map((f) => <CustomChip key={f} chipValue={f} chipState="GREY" />)
            )}
          </Stack>
        ),
      },
      { accessor: "model", Header: "Model", Cell: ({ row }) => <span>{shortModel(row.model)}</span> },
      { accessor: "steps", Header: "Steps", align: "right" },
      {
        accessor: "tokens",
        Header: "Tokens",
        align: "right",
        Cell: ({ row }) => <span>{fmtInt(row.prompt_tokens + row.completion_tokens)}</span>,
      },
      { accessor: "cost", Header: "Cost", align: "right", Cell: ({ row }) => <span>{fmtUsd(row.cost_usd)}</span> },
      {
        accessor: "findings",
        Header: "Findings",
        align: "center",
        Cell: ({ row }) =>
          row.findings_count === 0 ? (
            <span>0</span>
          ) : (
            <CustomChip chipValue={row.findings_count} chipState={row.crit_count > 0 ? "RED" : "YELLOW"} />
          ),
      },
      {
        accessor: "started",
        Header: "Started",
        Cell: ({ row }) => (
          <Tooltip title={`${new Date(row.started_at).toISOString()} · ${fmtMs(row.duration_ms)}`}>
            <span>{fmtAgo(row.started_at)}</span>
          </Tooltip>
        ),
      },
      {
        accessor: "actions",
        Header: "",
        width: 48,
        Cell: ({ row }) => (
          <IconButton
            size="small"
            aria-label="delete run"
            disabled={row.status === "running"}
            onClick={() => remove(row.id)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [selected, toggle, remove],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Runs
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
            Every traced agent run. Inject a fault, then open a run to see why it went wrong.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="info"
          startIcon={<CompareArrowsIcon />}
          disabled={selected.length !== 2}
          onClick={() => router.push(`/compare?a=${selected[0]}&b=${selected[1]}`)}
        >
          Compare ({selected.length}/2)
        </Button>
        <Button
          variant="contained"
          color="info"
          startIcon={<AddIcon />}
          disabled={anyRunning}
          onClick={() => setDialogOpen(true)}
        >
          New run
        </Button>
      </Stack>

      <Box sx={{ maxWidth: 360 }}>
        <SearchBar value={search} setValue={setSearch} placeholder="Filter by scenario, status, fault, model" />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <DataTableBody<RunSummary>
        columns={columns}
        data={pageRows}
        page={page}
        totalRecords={filtered.length}
        rowsPerPage={rowsPerPage}
        handlePageChange={setPage}
        handleRowsPerPageChange={(n) => {
          setRowsPerPage(n);
          setPage(0);
        }}
        loading={loading}
        getRowKey={(row) => row.id}
        noDataHeading="No runs yet"
        noDataSubHeading="Click “New run” to trace your first agent run."
      />

      <NewRunDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStarted={(runId) => {
          setDialogOpen(false);
          router.push(`/runs/${runId}`);
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ""} />
    </Box>
  );
}
