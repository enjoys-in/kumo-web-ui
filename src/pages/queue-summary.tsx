import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMetricsPrometheus, getReadyQueueStates, readyQueueToArray } from "@/lib/api";
import { RefreshCw, ArrowUpDown, Layers } from "lucide-react";

/** Parse Prometheus text into { metric, labels, value } tuples */
function parsePrometheus(text: string): { metric: string; labels: Record<string, string>; value: number }[] {
  const results: { metric: string; labels: Record<string, string>; value: number }[] = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\{([^}]*)\}\s+([\d.eE+-]+)/);
    if (m) {
      const labels: Record<string, string> = {};
      for (const pair of m[2].split(",")) {
        const eq = pair.indexOf("=");
        if (eq > 0) {
          labels[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim().replace(/^"|"$/g, "");
        }
      }
      results.push({ metric: m[1], labels, value: parseFloat(m[3]) });
    } else {
      const m2 = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+([\d.eE+-]+)/);
      if (m2) results.push({ metric: m2[1], labels: {}, value: parseFloat(m2[2]) });
    }
  }
  return results;
}

interface ProviderRow {
  provider: string;
  delivered: number;
  transfail: number;
  fail: number;
  connections: number;
  queued: number;
  volume: number;
}

function buildProviderSummary(parsed: ReturnType<typeof parsePrometheus>): ProviderRow[] {
  const map = new Map<string, ProviderRow>();
  const getRow = (p: string) => {
    if (!map.has(p)) map.set(p, { provider: p, delivered: 0, transfail: 0, fail: 0, connections: 0, queued: 0, volume: 0 });
    return map.get(p)!;
  };
  for (const { metric, labels, value } of parsed) {
    const prov = labels.provider || labels.service;
    if (!prov) continue;
    if (metric === "total_messages_delivered_by_provider") getRow(prov).delivered += value;
    if (metric === "total_messages_transfail_by_provider") getRow(prov).transfail += value;
    if (metric === "total_messages_fail_by_provider") getRow(prov).fail += value;
    if (metric === "connection_count_by_provider") getRow(prov).connections += value;
    if (metric === "queued_count_by_provider") getRow(prov).queued += value;
  }
  for (const row of map.values()) {
    row.volume = row.delivered + row.transfail + row.fail + row.queued;
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume);
}

interface QueueRow {
  name: string;
  context: string;
  since: string;
}

interface SchedRow {
  name: string;
  count: number;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function QueueSummaryPage() {
  const [tab, setTab] = useState("ready");
  const [domainFilter, setDomainFilter] = useState("");
  const [sortByVolume, setSortByVolume] = useState(true);

  const promMetrics = useQuery({
    queryKey: ["metrics-prometheus-qs"],
    queryFn: getMetricsPrometheus,
    refetchInterval: 5000,
  });

  const readyQ = useQuery({
    queryKey: ["ready-q-states-qs"],
    queryFn: getReadyQueueStates,
    refetchInterval: 5000,
  });

  const parsed = promMetrics.data ? parsePrometheus(promMetrics.data) : [];
  const providerRows = buildProviderSummary(parsed);

  const readyRows: QueueRow[] = readyQ.data ? readyQueueToArray(readyQ.data) : [];

  // Build scheduled queue summary from metrics
  const schedRows: SchedRow[] = [];
  for (const { metric, labels, value } of parsed) {
    if (metric === "scheduled_by_domain" && labels.domain) {
      schedRows.push({ name: labels.domain, count: value });
    }
  }
  schedRows.sort((a, b) => b.count - a.count);

  const filteredReady = domainFilter
    ? readyRows.filter((r) => r.name.toLowerCase().includes(domainFilter.toLowerCase()))
    : readyRows;

  const filteredSched = domainFilter
    ? schedRows.filter((r) => r.name.toLowerCase().includes(domainFilter.toLowerCase()))
    : schedRows;

  const filteredProviders = domainFilter
    ? providerRows.filter((r) => r.provider.toLowerCase().includes(domainFilter.toLowerCase()))
    : providerRows;

  const sortedProviders = sortByVolume
    ? filteredProviders
    : [...filteredProviders].sort((a, b) => a.provider.localeCompare(b.provider));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Queue Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ready queues, scheduled queues, and provider delivery summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Auto-refresh 5s
          </Badge>
          <Button variant="outline" size="sm" onClick={() => { promMetrics.refetch(); readyQ.refetch(); }} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Domain Filter */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Filter by domain / provider name..."
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ready">Ready Queues</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Queues</TabsTrigger>
          <TabsTrigger value="provider">Provider Summary</TabsTrigger>
        </TabsList>

        {/* READY QUEUES */}
        <TabsContent value="ready" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Ready Queues</CardTitle>
                  <CardDescription>{filteredReady.length} active ready queues</CardDescription>
                </div>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {filteredReady.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {readyQ.isLoading ? "Loading..." : "No ready queues"}
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="py-2 pr-4 font-medium">Queue Name</th>
                        <th className="py-2 pr-4 font-medium">Context</th>
                        <th className="py-2 font-medium">Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReady.map((row) => (
                        <tr key={row.name} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline" className="text-xs">{row.context}</Badge>
                          </td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {new Date(row.since).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHEDULED QUEUES */}
        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Queues by Domain</CardTitle>
              <CardDescription>{filteredSched.length} domains with queued messages</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSched.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {promMetrics.isLoading ? "Loading..." : "No scheduled messages"}
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="py-2 pr-4 font-medium">Domain</th>
                        <th className="py-2 font-medium text-right">Messages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSched.map((row) => (
                        <tr key={row.name} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{formatNum(row.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROVIDER SUMMARY */}
        <TabsContent value="provider" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Provider Summary</CardTitle>
                  <CardDescription>
                    Aggregate delivery stats per provider/site — D=Delivered T=TransFail F=Failed C=Connections Q=Queued
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setSortByVolume(!sortByVolume)}
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {sortByVolume ? "By Volume" : "By Name"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedProviders.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {promMetrics.isLoading ? "Loading..." : "No provider data (metrics may not include per-provider breakdowns)"}
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                        <th className="py-2 pr-4 font-medium">Provider</th>
                        <th className="py-2 pr-3 font-medium text-right">D</th>
                        <th className="py-2 pr-3 font-medium text-right">T</th>
                        <th className="py-2 pr-3 font-medium text-right">F</th>
                        <th className="py-2 pr-3 font-medium text-right">C</th>
                        <th className="py-2 pr-3 font-medium text-right">Q</th>
                        <th className="py-2 font-medium text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProviders.map((row) => (
                        <tr key={row.provider} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-medium">{row.provider}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatNum(row.delivered)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-warning">{formatNum(row.transfail)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-destructive">{formatNum(row.fail)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatNum(row.connections)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatNum(row.queued)}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{formatNum(row.volume)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
