import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useABTests } from "@/hooks/useABTests";

interface ABTestDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  userId: string;
}

export function ABTestDialog({ open, onClose, campaignId, userId }: ABTestDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [variantCount, setVariantCount] = useState(2);

  const { createTest } = useABTests(userId, campaignId);

  const handleCreate = () => {
    const distribution = splitType === 'equal'
      ? Array(variantCount).fill(Math.floor(100 / variantCount))
      : [50, 50];

    createTest.mutate({
      campaign_id: campaignId,
      user_id: userId,
      name,
      description,
      status: 'draft',
      traffic_split: {
        type: splitType,
        distribution,
      },
    });

    onClose();
    setName("");
    setDescription("");
    setSplitType('equal');
    setVariantCount(2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
          <DialogDescription>
            Test different variations of your campaign to find what works best
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Test Name</Label>
            <Input
              id="name"
              placeholder="e.g., Message Variation Test"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What are you testing?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="split">Traffic Split</Label>
            <Select value={splitType} onValueChange={(value: any) => setSplitType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal Split</SelectItem>
                <SelectItem value="custom">Custom Split</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variants">Number of Variants</Label>
            <Select
              value={variantCount.toString()}
              onValueChange={(value) => setVariantCount(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Variants (50/50)</SelectItem>
                <SelectItem value="3">3 Variants (33/33/33)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name}>
            Create Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
