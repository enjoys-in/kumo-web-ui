import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { listBounces, createBounce, cancelBounce, type BounceRequest } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function BouncePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    campaign: "",
    tenant: "",
    domain: "",
    routing_domain: "",
    reason: "No longer accepting mail",
    duration: "5m",
  });

  const bounces = useQuery({ queryKey: ["bounces"], queryFn: listBounces });

  const createMut = useMutation({
    mutationFn: createBounce,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bounces"] });
      toast.success("Bounce rule created");
      setShowForm(false);
      setForm({ campaign: "", tenant: "", domain: "", routing_domain: "", reason: "No longer accepting mail", duration: "5m" });
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const cancelMut = useMutation({
    mutationFn: cancelBounce,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bounces"] });
      toast.success("Bounce rule cancelled");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: BounceRequest = { reason: form.reason, duration: form.duration };
    if (form.campaign) body.campaign = form.campaign;
    if (form.tenant) body.tenant = form.tenant;
    if (form.domain) body.domain = form.domain;
    if (form.routing_domain) body.routing_domain = form.routing_domain;
    createMut.mutate(body);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bounce Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Administratively bounce messages matching specific criteria</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Bounce Rule
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Bounce Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign">Campaign (optional)</Label>
                <Input id="campaign" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="campaign-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant (optional)</Label>
                <Input id="tenant" value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })} placeholder="tenant-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain (optional)</Label>
                <Input id="domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routing_domain">Routing Domain (optional)</Label>
                <Input id="routing_domain" value={form.routing_domain} onChange={(e) => setForm({ ...form, routing_domain: e.target.value })} placeholder="routing.example.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="5m, 1h, 2d" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Bounce Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {bounces.isLoading && <p className="text-muted-foreground">Loading...</p>}
          {bounces.isError && <p className="text-destructive">Error: {bounces.error.message}</p>}
          {bounces.data && bounces.data.length === 0 && <p className="text-muted-foreground">No active bounce rules</p>}
          {bounces.data && bounces.data.length > 0 && (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Campaign</th>
                    <th className="px-4 py-2">Tenant</th>
                    <th className="px-4 py-2">Domain</th>
                    <th className="px-4 py-2">Reason</th>
                    <th className="px-4 py-2">Duration</th>
                    <th className="px-4 py-2">Bounced</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bounces.data.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{b.id.slice(0, 8)}...</td>
                      <td className="px-4 py-2">{b.campaign || <Badge variant="secondary">Any</Badge>}</td>
                      <td className="px-4 py-2">{b.tenant || <Badge variant="secondary">Any</Badge>}</td>
                      <td className="px-4 py-2">{b.domain || <Badge variant="secondary">Any</Badge>}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate">{b.reason}</td>
                      <td className="px-4 py-2">{b.duration}</td>
                      <td className="px-4 py-2 text-muted-foreground">{b.total_bounced} bounced</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => cancelMut.mutate({ id: b.id })} disabled={cancelMut.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
