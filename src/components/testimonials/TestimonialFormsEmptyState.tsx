import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "./EmptyState";

export function TestimonialFormsEmptyState() {
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={MessageSquare}
      title="No forms yet"
      description="Create your first testimonial collection form to start gathering customer feedback and social proof."
      actionLabel="Create Your First Form"
      onAction={() => navigate("/testimonial-form-builder")}
    />
  );
}
