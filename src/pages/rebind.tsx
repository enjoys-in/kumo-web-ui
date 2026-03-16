import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { rebindMessages, type RebindRequest } from "@/lib/api";
import { ArrowRightLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";

export function RebindPage() {
  const [form, setForm] = useState({
    campaign: "",
    tenant: "",
    domain: "",
    routing_domain: "",
    reason: "Administratively rebound",
    always_flush: false,
  });
  const [data, setData] = useState<{ key: string; value: string }[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const rebindMut = useMutation({
    mutationFn: rebindMessages,
    onSuccess: (res) => {
      setResult(res);
      toast.success("Rebind completed");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataObj: Record<string, string> = {};
    for (const d of data) {
      if (d.key) dataObj[d.key] = d.value;
    }
    const body: RebindRequest = {
      reason: form.reason,
      data: dataObj,
      ...(form.campaign && { campaign: form.campaign }),
      ...(form.tenant && { tenant: form.tenant }),
      ...(form.domain && { domain: form.domain }),
      ...(form.routing_domain && { routing_domain: form.routing_domain }),
      ...(form.always_flush && { always_flush: true }),
    };
    rebindMut.mutate(body);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rebind Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Re-evaluate message binding for matching messages</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Rebind Parameters</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign">Campaign (optional)</Label>
                <Input id="campaign" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant (optional)</Label>
                <Input id="tenant" value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain (optional)</Label>
                <Input id="domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routing_domain">Routing Domain (optional)</Label>
                <Input id="routing_domain" value={form.routing_domain} onChange={(e) => setForm({ ...form, routing_domain: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="always_flush"
                checked={form.always_flush}
                onChange={(e) => setForm({ ...form, always_flush: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="always_flush">Always Flush</Label>
            </div>

            {/* Data key-value pairs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data (optional key-value pairs)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setData([...data, { key: "", value: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {data.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={d.key}
                    onChange={(e) => { const next = [...data]; next[i] = { ...d, key: e.target.value }; setData(next); }}
                    placeholder="Key"
                  />
                  <Input
                    value={d.value}
                    onChange={(e) => { const next = [...data]; next[i] = { ...d, value: e.target.value }; setData(next); }}
                    placeholder="Value"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setData(data.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={rebindMut.isPending}>
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              {rebindMut.isPending ? "Rebinding..." : "Rebind Messages"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Rebind Result <Badge>Complete</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
