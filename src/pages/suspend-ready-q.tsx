import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { listSuspendReadyQ, createSuspendReadyQ, cancelSuspendReadyQ } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function SuspendReadyQPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    reason: "Administratively suspended",
    duration: "5m",
  });

  const items = useQuery({ queryKey: ["suspend-ready-q"], queryFn: listSuspendReadyQ });

  const createMut = useMutation({
    mutationFn: createSuspendReadyQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suspend-ready-q"] });
      toast.success("Ready-Q suspension created");
      setShowForm(false);
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const cancelMut = useMutation({
    mutationFn: cancelSuspendReadyQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suspend-ready-q"] });
      toast.success("Ready-Q suspension cancelled");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ name: form.name, reason: form.reason, duration: form.duration });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suspend Ready Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Suspend delivery from specific ready queues</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Suspension
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Suspend Ready Queue</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Queue Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="ready-queue-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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
        <CardHeader><CardTitle>Active Ready-Q Suspensions</CardTitle></CardHeader>
        <CardContent>
          {items.isLoading && <p className="text-muted-foreground">Loading...</p>}
          {items.isError && <p className="text-destructive">Error: {items.error.message}</p>}
          {items.data && items.data.length === 0 && <p className="text-muted-foreground">No active suspensions</p>}
          {items.data && items.data.length > 0 && (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Reason</th>
                    <th className="px-4 py-2">Expires</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.data.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{s.id.slice(0, 8)}...</td>
                      <td className="px-4 py-2">{s.name || <Badge variant="secondary">—</Badge>}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate">{s.reason}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.expires}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="sm" onClick={() => cancelMut.mutate({ id: s.id })} disabled={cancelMut.isPending}>
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
