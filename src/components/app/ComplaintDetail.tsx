import { useQuery } from "@tanstack/react-query";
import { Panel, EmptyState } from "./AppShell";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/lib/data";
import { listUpdates, photoUrl } from "@/lib/api";
import type { Complaint } from "@/lib/types";

/** Citizen-facing + staff-facing detail; the DB already hides internal notes from citizens (RLS). */
export function ComplaintDetail({ c }: { c: Complaint | null }) {
  const upd = useQuery({ queryKey: ["updates", c?.dbId], queryFn: () => listUpdates(c!.dbId!), enabled: !!c?.dbId });
  const img = useQuery({ queryKey: ["photo", c?.imagePath], queryFn: () => photoUrl(c!.imagePath!), enabled: !!c?.imagePath });
  if (!c) return <Panel title="Complaint details"><EmptyState text="Select a complaint to see its history." /></Panel>;
  return (
    <Panel title={`Complaint ${c.complaintNo}`}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2"><StatusBadge value={c.status} /><StatusBadge value={c.severity} /></div>
        <p className="text-base font-semibold">{c.title}</p>
        <p className="text-muted-foreground">{c.description}</p>
        <p><span className="text-muted-foreground">Category:</span> {c.category}</p>
        <p><span className="text-muted-foreground">Location:</span> {c.address || "—"} ({c.position[0].toFixed(5)}, {c.position[1].toFixed(5)})</p>
        <p><span className="text-muted-foreground">Submitted:</span> {formatDate(c.reportedAt)}</p>
        {c.assignedDepartment && <p><span className="text-muted-foreground">Department:</span> {c.assignedDepartment}</p>}
        {img.data && <img src={img.data} alt="Complaint evidence" className="max-h-56 rounded-lg border object-cover" />}
        <div>
          <h3 className="mb-2 font-semibold">History</h3>
          {upd.isLoading ? <p className="text-muted-foreground">Loading…</p> : upd.error ? <p role="alert" className="text-destructive">{(upd.error as Error).message}</p> :
            !upd.data?.length ? <p className="text-muted-foreground">{c.isDemo ? "History is not available for sample records." : "No updates yet."}</p> : (
              <ol className="space-y-2 border-l pl-4">
                {upd.data.map((u) => (
                  <li key={u.id}>
                    <p className="text-xs text-muted-foreground">{formatDate(u.createdAt)}{u.isInternal && " · internal note"}</p>
                    <p>{u.toStatus ? <>Status: <b>{u.toStatus}</b>{u.message ? ` — ${u.message}` : ""}</> : u.message}</p>
                  </li>
                ))}
              </ol>
            )}
        </div>
      </div>
    </Panel>
  );
}
