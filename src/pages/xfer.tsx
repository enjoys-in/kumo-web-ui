import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  xferMessages,
  cancelXfer,
  type XferV1Request,
  type XferCancelV1Request,
} from "@/lib/api";
import { ArrowRightLeft, Plus, X, Ban } from "lucide-react";
import { toast } from "sonner";

export function XferPage() {
  // === Transfer form state ===
  const [xferForm, setXferForm] = useState({
    target: "",
    reason: "Scaling down",
    campaign: "",
    tenant: "",
    domain: "",
    routing_domain: "",
  });
  const [queueNames, setQueueNames] = useState<string[]>([]);
  const [newQueueName, setNewQueueName] = useState("");
  const [xferResult, setXferResult] = useState<Record<string, unknown> | null>(null);

  // === Cancel form state ===
  const [cancelForm, setCancelForm] = useState({
    queue_name: "",
    reason: "Cancelling transfer",
  });
  const [cancelResult, setCancelResult] = useState<Record<string, unknown> | null>(null);

  const xferMut = useMutation({
    mutationFn: xferMessages,
    onSuccess: (res) => {
      setXferResult(res);
      toast.success("Transfer initiated successfully");
    },
    onError: (e) => toast.error(`Transfer failed: ${e.message}`),
  });

  const cancelMut = useMutation({
    mutationFn: cancelXfer,
    onSuccess: (res) => {
      setCancelResult(res);
      toast.success("Transfer cancellation initiated");
    },
    onError: (e) => toast.error(`Cancel failed: ${e.message}`),
  });

  const handleXferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!xferForm.target.trim()) {
      toast.error("Target URL is required");
      return;
    }
    if (!xferForm.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const body: XferV1Request = {
      target: xferForm.target,
      reason: xferForm.reason,
    };
    if (queueNames.length > 0) {
      body.queue_names = queueNames;
    } else {
      if (xferForm.campaign) body.campaign = xferForm.campaign;
      if (xferForm.tenant) body.tenant = xferForm.tenant;
      if (xferForm.domain) body.domain = xferForm.domain;
      if (xferForm.routing_domain) body.routing_domain = xferForm.routing_domain;
    }
    xferMut.mutate(body);
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelForm.queue_name.trim()) {
      toast.error("Queue name is required");
      return;
    }
    if (!cancelForm.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const body: XferCancelV1Request = {
      queue_name: cancelForm.queue_name,
      reason: cancelForm.reason,
    };
    cancelMut.mutate(body);
  };

  const addQueueName = () => {
    const name = newQueueName.trim();
    if (name && !queueNames.includes(name)) {
      setQueueNames([...queueNames, name]);
      setNewQueueName("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfer Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Transfer messages from this node to another KumoMTA node, or cancel an ongoing transfer
        </p>
      </div>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Initiate Transfer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleXferSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="xfer-target">Target URL *</Label>
                <Input
                  id="xfer-target"
                  value={xferForm.target}
                  onChange={(e) => setXferForm({ ...xferForm, target: e.target.value })}
                  placeholder="http://127.0.0.1:8000"
                />
                <p className="text-xs text-muted-foreground">HTTP URL prefix of the destination node</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xfer-reason">Reason *</Label>
                <Input
                  id="xfer-reason"
                  value={xferForm.reason}
                  onChange={(e) => setXferForm({ ...xferForm, reason: e.target.value })}
                  placeholder="Scaling down"
                />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Queue Selection</p>
              <p className="text-xs text-muted-foreground mb-3">
                Specify queue names directly, or use campaign/tenant/domain filters. Queue names take precedence over filters.
              </p>
            </div>

            {/* Queue names */}
            <div className="space-y-2">
              <Label>Queue Names (optional, overrides filters below)</Label>
              <div className="flex gap-2">
                <Input
                  value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  placeholder="Enter queue name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addQueueName();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addQueueName}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {queueNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {queueNames.map((name) => (
                    <Badge key={name} variant="secondary" className="gap-1 pr-1">
                      {name}
                      <button
                        type="button"
                        onClick={() => setQueueNames(queueNames.filter((n) => n !== name))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="xfer-campaign">Campaign (optional)</Label>
                <Input
                  id="xfer-campaign"
                  value={xferForm.campaign}
                  onChange={(e) => setXferForm({ ...xferForm, campaign: e.target.value })}
                  placeholder="campaign-name"
                  disabled={queueNames.length > 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xfer-tenant">Tenant (optional)</Label>
                <Input
                  id="xfer-tenant"
                  value={xferForm.tenant}
                  onChange={(e) => setXferForm({ ...xferForm, tenant: e.target.value })}
                  placeholder="tenant-name"
                  disabled={queueNames.length > 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xfer-domain">Domain (optional)</Label>
                <Input
                  id="xfer-domain"
                  value={xferForm.domain}
                  onChange={(e) => setXferForm({ ...xferForm, domain: e.target.value })}
                  placeholder="example.com"
                  disabled={queueNames.length > 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xfer-routing-domain">Routing Domain (optional)</Label>
                <Input
                  id="xfer-routing-domain"
                  value={xferForm.routing_domain}
                  onChange={(e) => setXferForm({ ...xferForm, routing_domain: e.target.value })}
                  placeholder="routing.example.com"
                  disabled={queueNames.length > 0}
                />
              </div>
            </div>

            {queueNames.length > 0 && (
              <p className="text-xs text-muted-foreground italic">
                Filter fields are disabled because queue names are specified (they take precedence).
              </p>
            )}

            <Button type="submit" disabled={xferMut.isPending}>
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              {xferMut.isPending ? "Transferring..." : "Start Transfer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {xferResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Transfer Result <Badge>Initiated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono">
              {JSON.stringify(xferResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Cancel Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Cancel Transfer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cancel an ongoing transfer by specifying the xfer scheduled queue name. Cancellation completes asynchronously
            and may need to be triggered multiple times over a short time span.
          </p>
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cancel-queue-name">Queue Name *</Label>
                <Input
                  id="cancel-queue-name"
                  value={cancelForm.queue_name}
                  onChange={(e) => setCancelForm({ ...cancelForm, queue_name: e.target.value })}
                  placeholder="xfer queue name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason *</Label>
                <Input
                  id="cancel-reason"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  placeholder="Cancelling transfer"
                />
              </div>
            </div>
            <Button type="submit" variant="destructive" disabled={cancelMut.isPending}>
              <Ban className="h-4 w-4 mr-1" />
              {cancelMut.isPending ? "Cancelling..." : "Cancel Transfer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {cancelResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Cancel Result <Badge>Initiated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono">
              {JSON.stringify(cancelResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
