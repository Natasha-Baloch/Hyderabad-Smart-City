import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  High: "bg-danger-soft text-destructive",
  Medium: "bg-warning-soft text-warning",
  Low: "bg-success-soft text-success",
  Critical: "bg-danger-soft text-destructive",
  Submitted: "bg-info-soft text-info",
  "Under Review": "bg-info-soft text-info",
  Assigned: "bg-accent text-accent-foreground",
  Reopened: "bg-danger-soft text-destructive",
  Reported: "bg-info-soft text-info",
  "In Progress": "bg-warning-soft text-warning",
  Resolved: "bg-success-soft text-success",
  Pending: "bg-warning-soft text-warning",
  Accepted: "bg-info-soft text-info",
  Completed: "bg-success-soft text-success",
  Rejected: "bg-danger-soft text-destructive",
  Operational: "bg-success-soft text-success",
  Active: "bg-success-soft text-success",
  Maintenance: "bg-warning-soft text-warning",
  Offline: "bg-danger-soft text-destructive",
  Inactive: "bg-muted text-muted-foreground",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", styles[value] ?? "bg-muted text-muted-foreground")}>
      {value}
    </span>
  );
}
