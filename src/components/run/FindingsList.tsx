import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Finding } from "@/agent/types";
import CustomChip from "@/components/chips/customChip";
import { SEVERITY_CHIP } from "@/lib/format";

export function FindingsList({ findings, onPick }: { findings: Finding[]; onPick: (seq: number) => void }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>Findings ({findings.length})</Typography>
      {findings.length === 0 ? (
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>No problems detected in this run.</Typography>
      ) : (
        <Stack spacing={1}>
          {findings.map((f) => (
            <Box
              key={f.id}
              onClick={() => f.span_seq != null && onPick(f.span_seq)}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                p: 1,
                borderRadius: 1,
                cursor: f.span_seq != null ? "pointer" : "default",
                "&:hover": { bgcolor: f.span_seq != null ? "action.hover" : "transparent" },
              }}
            >
              <CustomChip chipValue={f.severity} chipState={SEVERITY_CHIP[f.severity]} fontSize="11px" />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  {f.detector}
                  {f.span_seq != null && (
                    <Typography component="span" sx={{ fontSize: 12, color: "text.secondary", ml: 1 }}>
                      span #{f.span_seq}
                    </Typography>
                  )}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{f.message}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
