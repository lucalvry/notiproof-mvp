import { EventConsumptionAnalytics } from "@/components/admin/EventConsumptionAnalytics";

export default function EventConsumption() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event Consumption Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor user event consumption patterns and quota usage across all plans
        </p>
      </div>
      
      <EventConsumptionAnalytics />
    </div>
  );
}
