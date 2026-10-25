"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { FaultId, ScenarioId } from "@/agent/types";
import { api, type Catalog } from "@/lib/api-client";

const MAX_GOAL = 500;

export function NewRunDialog({
  open,
  onClose,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  onStarted: (runId: string) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("lisbon-weekend");
  const [faults, setFaults] = useState<FaultId[]>([]);
  const [model, setModel] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || catalog) return;
    api
      .catalog()
      .then((c) => {
        setCatalog(c);
        setModel(c.models.find((m) => m.default)?.id ?? c.models[0]?.id ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, [open, catalog]);

  const scenario = catalog?.scenarios.find((s) => s.id === scenarioId);

  const toggleFault = (id: FaultId) =>
    setFaults((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.startRun({ scenarioId, faults, model, goal: goal.trim() || undefined });
      setFaults([]);
      setGoal("");
      onStarted(res.runId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>New run</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        {!catalog && !error && <CircularProgress size={24} />}
        {catalog && (
          <>
            <TextField
              select
              id="new-run-scenario"
              label="Scenario"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value as ScenarioId)}
              size="small"
            >
              {catalog.scenarios.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="new-run-goal"
              label="Goal (optional override)"
              placeholder={scenario?.goal}
              value={goal}
              onChange={(e) => setGoal(e.target.value.slice(0, MAX_GOAL))}
              multiline
              minRows={2}
              size="small"
              helperText={`${goal.length}/${MAX_GOAL}`}
            />
            <TextField
              select
              id="new-run-model"
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              size="small"
              helperText={catalog.models.find((m) => m.id === model)?.note}
            >
              {catalog.models.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>Inject faults</Typography>
              {catalog.faults.map((f) => (
                <Box key={f.id}>
                  <FormControlLabel
                    control={
                      <Checkbox size="small" checked={faults.includes(f.id)} onChange={() => toggleFault(f.id)} />
                    }
                    label={
                      <Box>
                        <Typography sx={{ fontSize: 14 }}>{f.label}</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{f.description}</Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", my: 0.5 }}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" color="info" onClick={start} disabled={!catalog || busy}>
          {busy ? "Starting…" : "Start run"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
