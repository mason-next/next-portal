import { Button } from "@/components/ui/button";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import type { BomStatus } from "@/types/bom";

interface BomBulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onSetStatus: (status: BomStatus) => void;
}

export function BomBulkActionBar({ selectedCount, onClear, onSetStatus }: BomBulkActionBarProps) {
  return (
    <BulkActionBar selectedCount={selectedCount} onClear={onClear}>
      <Button size="sm" variant="outline" onClick={() => onSetStatus("Approved")}>
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => onSetStatus("Update Needed")}>
        Update Needed
      </Button>
      <Button size="sm" variant="outline" onClick={() => onSetStatus("Do Not Order")}>
        Do Not Order
      </Button>
    </BulkActionBar>
  );
}
