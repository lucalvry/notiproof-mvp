// Legacy component — replaced by /proof/:id route. Kept as a no-op stub to satisfy imports.
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface Props {
  proofId: string | null;
  businessId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function ProofDetailSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent />
    </Sheet>
  );
}
