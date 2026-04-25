// Legacy component — kept as a no-op stub to satisfy imports. Use /proof/request instead.
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

export function RequestTestimonialModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent />
    </Dialog>
  );
}
