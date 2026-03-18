import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { inspectScheduledQueue, getReadyQueueStates, readyQueueToArray } from "@/lib/api";
import { Search, Layers } from "lucide-react";
import { toast } from "sonner";

export function QueueInspectPage() {
  const [queueName, setQueueName] = useState("");
  const [searchedQueue, setSearchedQueue] = useState("");

  const readyQ = useQuery({ queryKey: ["ready-q-states"], queryFn: getReadyQueueStates });
  const readyQList = readyQ.data ? readyQueueToArray(readyQ.data) : [];

  const schedQ = useQuery({
    queryKey: ["sched-q", searchedQueue],
    queryFn: () => inspectScheduledQueue({ name: searchedQueue }),
    enabled: !!searchedQueue,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueName.trim()) {
      toast.error("Enter a queue name");
      return;
    }
    setSearchedQueue(queueName.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Queue Inspection</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Inspect scheduled and ready queues</p>
      </div>

      {/* Scheduled Queue Inspector */}
      <Card>
        <CardHeader><CardTitle>Inspect Scheduled Queue</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="queue" className="sr-only">Queue Name</Label>
              <Input id="queue" value={queueName} onChange={(e) => setQueueName(e.target.value)} placeholder="campaign:tenant@domain" />
            </div>
            <Button type="submit" disabled={schedQ.isFetching}>
              <Search className="h-4 w-4 mr-1" />
              Inspect
            </Button>
          </form>

          {schedQ.isFetching && <p className="mt-4 text-muted-foreground">Loading...</p>}
          {schedQ.isError && <p className="mt-4 text-destructive">Error: {schedQ.error.message}</p>}
          {schedQ.data && (
            <div className="mt-4 relative overflow-x-auto">
              {Array.isArray(schedQ.data) && schedQ.data.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedQ.data.map((q, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{q.name}</td>
                        <td className="px-4 py-2">{q.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground">No matching queues found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ready Queue States */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Ready Queue States
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readyQ.isLoading && <p className="text-muted-foreground">Loading...</p>}
          {readyQ.isError && <p className="text-destructive">Error: {readyQ.error.message}</p>}
          {readyQ.data && readyQList.length === 0 && <p className="text-muted-foreground">No ready queues</p>}
          {readyQList.length > 0 && (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Context</th>
                    <th className="px-4 py-2">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {readyQList.map((q, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{q.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{q.context}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(q.since).toLocaleString()}</td>
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
