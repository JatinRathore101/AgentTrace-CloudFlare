import type { RunStatus } from "@/agent/types";
import CustomChip from "@/components/chips/customChip";
import { STATUS_CHIP } from "@/lib/format";

export function StatusChip({ status }: { status: RunStatus }) {
  const chip = STATUS_CHIP[status];
  return <CustomChip chipValue={chip.label} chipState={chip.color} />;
}
