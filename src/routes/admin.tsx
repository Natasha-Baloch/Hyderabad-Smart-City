import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/app/AppShell";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequireRole } from "@/lib/auth";
import { getAssets, getAuditLogs, getProfiles } from "@/lib/data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Hyderabad Digital Twin" },
      { name: "description", content: "Manage users, city assets, activity logs and reports." },
      { property: "og:title", content: "Administration — Hyderabad Digital Twin" },
      { property: "og:description", content: "Admin mockup for users, assets and reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireRole area="mayor"><Admin /></RequireRole>,
});

const mock = () => toast.info("Mockup only — available after backend is connected.");

function Admin() {
  const [report, setReport] = useState("assets");
  const assetSummary = Object.entries(
    getAssets().reduce<Record<string, { total: number; active: number; maint: number }>>((a, x) => {
      const r = (a[x.type] ??= { total: 0, active: 0, maint: 0 });
      r.total++; if (x.status === "Operational") r.active++; else r.maint++;
      return a;
    }, {}),
  );

  return (
    <AppShell title="Administration" subtitle="Manage users, assets and system activity (mockup).">
      <Tabs defaultValue="users">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="assets">City assets</TabsTrigger>
          <TabsTrigger value="log">Activity log</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Panel title="User management" action={<Button size="sm" onClick={mock}><Plus className="h-4 w-4" />Add user</Button>}>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{getProfiles().map((p) => (
                <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.email}</TableCell><TableCell>{p.role}</TableCell><TableCell><StatusBadge value={p.status} /></TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </Panel>
        </TabsContent>
        <TabsContent value="assets">
          <Panel title="City assets" action={<Button size="sm" onClick={mock}><Plus className="h-4 w-4" />Add asset</Button>}>
            <Table>
              <TableHeader><TableRow><TableHead>Asset type</TableHead><TableHead>Total</TableHead><TableHead>Operational</TableHead><TableHead>Maintenance / offline</TableHead></TableRow></TableHeader>
              <TableBody>{assetSummary.map(([t, r]) => (
                <TableRow key={t}><TableCell className="font-medium">{t}</TableCell><TableCell>{r.total}</TableCell><TableCell>{r.active}</TableCell><TableCell>{r.maint}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </Panel>
        </TabsContent>
        <TabsContent value="log">
          <Panel title="Activity log">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
              <TableBody>{getAuditLogs().map((l) => (
                <TableRow key={l.id}><TableCell className="text-muted-foreground">{l.at}</TableCell><TableCell>{l.actor}</TableCell><TableCell>{l.action}</TableCell><TableCell className="font-medium">{l.target}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </Panel>
        </TabsContent>
        <TabsContent value="reports">
          <Panel title="Export reports">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={report} onValueChange={setReport}>
                <SelectTrigger aria-label="Report type" className="sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assets">City asset report</SelectItem>
                  <SelectItem value="incidents">Incident report</SelectItem>
                  <SelectItem value="activity">Activity report</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={mock}><Download className="h-4 w-4" />Download</Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
