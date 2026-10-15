import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { listNotifications, markAllRead, markNotificationRead, subscribeNotifications } from "@/lib/api";
import { formatDate } from "@/lib/data";

export function useNotifications() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications", userId], queryFn: listNotifications, enabled: !!userId });
  useEffect(() => {
    if (!userId) return;
    return subscribeNotifications(userId, () => qc.invalidateQueries({ queryKey: ["notifications", userId] }));
  }, [userId, qc]);
  return q;
}

export function NotificationList({ onOpen }: { onOpen?: (incidentId: string | null | undefined) => void }) {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useNotifications();
  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>;
  if (error) return <p className="p-4 text-sm text-destructive" role="alert">Could not load notifications: {(error as Error).message}</p>;
  if (!data.length) return <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>;
  return (
    <ul className="divide-y">
      {data.map((n) => (
        <li key={n.id} className={`flex items-start justify-between gap-3 p-3 text-sm ${n.isRead ? "" : "bg-info-soft/40"}`}>
          <button className="min-w-0 text-left" onClick={async () => {
            try { if (!n.isRead) await markNotificationRead(n.id); refresh(); onOpen?.(n.incidentId); } catch (e) { toast.error((e as Error).message); }
          }}>
            <span className="block font-medium">{n.title}</span>
            {n.body && <span className="block truncate text-muted-foreground">{n.body}</span>}
            <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
          </button>
          {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-info" aria-label="Unread" />}
        </li>
      ))}
    </ul>
  );
}

export function NotificationBell() {
  const qc = useQueryClient();
  const { data = [] } = useNotifications();
  const unread = data.filter((n) => !n.isRead).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3"><span className="font-semibold">Notifications</span>
          <button className="text-xs text-primary" onClick={async () => { try { await markAllRead(); qc.invalidateQueries({ queryKey: ["notifications"] }); } catch (e) { toast.error((e as Error).message); } }}>Mark all read</button></div>
        <div className="max-h-80 overflow-y-auto"><NotificationList /></div>
      </PopoverContent>
    </Popover>
  );
}
