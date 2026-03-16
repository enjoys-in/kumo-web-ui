import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  checkLiveness,
  getMachineInfo,
  getMemoryStats,
  listBounces,
  listSuspensions,
  getReadyQueueStates,
  getMetricsJson,
  bumpConfigEpoch,
  readyQueueToArray,
  createBounce,
  setDiagnosticLogFilter,
} from "@/lib/api";
import {
  Activity,
  Server,
  Ban,
  Pause,
  Layers,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  HardDrive,
  Zap,
  TrendingUp,
  Trash2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useEffect, useRef, useState } from "react";

interface MetricsSnapshot {
  timestamp: number;
  delivered?: number;
  bounced?: number;
  queued?: number;
}

function useMetricsHistory() {
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);
  const prevRef = useRef<Record<string, number>>({});
  const metrics = useQuery({ queryKey: ["metrics-json"], queryFn: getMetricsJson, refetchInterval: 5000 });

  useEffect(() => {
    if (!metrics.data) return;
    const flat = flattenMetrics(metrics.data);
    const delivered = extractCounter(flat, "delivered", "total_messages_delivered");
    const bounced = extractCounter(flat, "bounced", "total_messages_fail");
    const queued = extractCounter(flat, "queued", "message_count", "ready_count");
    const now = Date.now();
    const prev = prevRef.current;
    const snap: MetricsSnapshot = {
      timestamp: now,
      delivered: delivered - (prev.delivered ?? delivered),
      bounced: bounced - (prev.bounced ?? bounced),
      queued,
    };
    prevRef.current = { delivered, bounced, queued };
    setHistory((h) => [...h.slice(-29), snap]);
  }, [metrics.data]);

  return { history, raw: metrics.data, isLoading: metrics.isLoading };
}

function flattenMetrics(obj: Record<string, unknown>, prefix = ""): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "number") result[key] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenMetrics(v as Record<string, unknown>, key));
    }
  }
  return result;
}

function extractCounter(flat: Record<string, number>, ...keywords: string[]): number {
  for (const kw of keywords) {
    for (const [k, v] of Object.entries(flat)) {
      if (k.toLowerCase().includes(kw.toLowerCase())) return v;
    }
  }
  return 0;
}

function formatNum(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function Dashboard() {
  const liveness = useQuery({ queryKey: ["liveness"], queryFn: checkLiveness, refetchInterval: 10000 });
  const machineInfo = useQuery({ queryKey: ["machine-info"], queryFn: getMachineInfo });
  const memoryStats = useQuery({ queryKey: ["memory-stats"], queryFn: getMemoryStats });
  const bounces = useQuery({ queryKey: ["bounces"], queryFn: listBounces });
  const suspensions = useQuery({ queryKey: ["suspensions"], queryFn: listSuspensions });
  const readyQ = useQuery({ queryKey: ["ready-q-states"], queryFn: getReadyQueueStates });
  const { history, raw: rawMetrics } = useMetricsHistory();

  const readyQList = readyQ.data ? readyQueueToArray(readyQ.data) : [];
  const isAlive = liveness.isSuccess;
  const flat = rawMetrics ? flattenMetrics(rawMetrics) : {};
  const totalDelivered = extractCounter(flat, "delivered", "total_messages_delivered");
  const totalBounced = extractCounter(flat, "bounced", "total_messages_fail");

  const handleBumpConfig = async () => {
    try {
      await bumpConfigEpoch();
      toast.success("Config epoch bumped");
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  const handleBounceAll = async () => {
    try {
      await createBounce({ reason: "Admin flush via dashboard", duration: "1m" });
      toast.success("Bounce rule created for all queues (1m)");
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  const handleSetLogFilter = async () => {
    try {
      await setDiagnosticLogFilter({ filter: "kumod=info" });
      toast.success("Log filter set to kumod=info");
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  // Build memory data for pie chart
  const memData = memoryStats.data
    ? Object.entries(memoryStats.data)
        .filter(([, v]) => typeof v === "number" && (v as number) > 0)
        .slice(0, 5)
        .map(([name, value]) => ({ name: name.replace(/_/g, " "), value: Number(value) }))
    : [];

  // Chart data with labels
  const chartData = history.map((h, i) => ({
    label: `${i * 5}s`,
    delivered: h.delivered ?? 0,
    bounced: h.bounced ?? 0,
    queued: h.queued ?? 0,
  }));

  // Queue breakdown for bar chart
  const queueData = readyQList.slice(0, 8).map((q) => ({
    name: q.name.length > 20 ? q.name.slice(0, 20) + "..." : q.name,
    context: q.context,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time overview of your mail transfer agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isAlive ? "default" : "destructive"}
            className="gap-1.5"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isAlive ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {isAlive ? "Online" : "Offline"}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleBumpConfig} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Config
          </Button>
          <Button variant="outline" size="sm" onClick={handleBounceAll} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Flush All
          </Button>
          <Button variant="outline" size="sm" onClick={handleSetLogFilter} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Set Log Filter
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Messages Delivered"
          value={formatNum(totalDelivered)}
          icon={<Zap className="h-4 w-4" />}
          trend={history.length > 1 ? (history[history.length - 1]?.delivered ?? 0) : undefined}
          trendLabel="/5s"
          color="text-chart-1"
        />
        <StatCard
          title="Total Bounced"
          value={formatNum(totalBounced)}
          icon={<Ban className="h-4 w-4" />}
          trend={bounces.data?.length}
          trendLabel="rules active"
          color="text-destructive"
        />
        <StatCard
          title="Suspensions"
          value={String(suspensions.data?.length ?? "—")}
          icon={<Pause className="h-4 w-4" />}
          color="text-chart-3"
        />
        <StatCard
          title="Ready Queues"
          value={String(readyQList.length || "—")}
          icon={<Layers className="h-4 w-4" />}
          color="text-chart-2"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Throughput Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Throughput</CardTitle>
                <CardDescription>Messages per 5-second interval</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gBounced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fill="url(#gDelivered)"
                      name="Delivered"
                    />
                    <Area
                      type="monotone"
                      dataKey="bounced"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      fill="url(#gBounced)"
                      name="Bounced"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Collecting data...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Memory Pie Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Memory Allocation</CardTitle>
                <CardDescription>Current memory breakdown</CardDescription>
              </div>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              {memData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={memData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {memData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatBytes(value)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Loading memory stats...
                </div>
              )}
            </div>
            {memData.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {memData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{formatBytes(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Queue States Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Ready Queue States</CardTitle>
                <CardDescription>{readyQList.length} queues active</CardDescription>
              </div>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] overflow-auto">
              {queueData.length > 0 ? (
                <div className="space-y-2">
                  {queueData.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm font-mono truncate max-w-[50%]">{q.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{q.context}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No queue data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Server Info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Server Info</CardTitle>
                <CardDescription>Machine details</CardDescription>
              </div>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <InfoRow icon={<Activity className="h-4 w-4" />} label="Status" value={isAlive ? "Healthy" : "Unreachable"} valueClass={isAlive ? "text-success" : "text-destructive"} />
              <InfoRow icon={<Server className="h-4 w-4" />} label="Hostname" value={machineInfo.data?.hostname ?? "—"} />
              <InfoRow icon={<Cpu className="h-4 w-4" />} label="Version" value={machineInfo.data?.version ?? "—"} />
              <InfoRow icon={<Cpu className="h-4 w-4" />} label="Platform" value={machineInfo.data?.platform ?? "—"} />
              <InfoRow icon={<Cpu className="h-4 w-4" />} label="CPU" value={machineInfo.data?.cpu_brand ?? "—"} />
              <InfoRow icon={<Cpu className="h-4 w-4" />} label="Cores" value={String(machineInfo.data?.num_cores ?? "—")} />
              <InfoRow icon={<HardDrive className="h-4 w-4" />} label="Memory" value={machineInfo.data ? formatBytes(machineInfo.data.total_memory_bytes) : "—"} />
              <InfoRow icon={<Server className="h-4 w-4" />} label="OS" value={machineInfo.data?.os_version ?? "—"} />
              <InfoRow icon={<Activity className="h-4 w-4" />} label="Online Since" value={machineInfo.data?.online_since ? new Date(machineInfo.data.online_since).toLocaleString() : "—"} />
              <InfoRow icon={<Layers className="h-4 w-4" />} label="Ready Queues" value={String(readyQList.length || "—")} />
              <InfoRow icon={<Ban className="h-4 w-4" />} label="Active Bounces" value={String(bounces.data?.length ?? "—")} />
              <InfoRow icon={<Pause className="h-4 w-4" />} label="Active Suspensions" value={String(suspensions.data?.length ?? "—")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendLabel, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: string;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-muted-foreground font-medium">{title}</span>
          <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>{icon}</div>
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-success" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-muted-foreground" />
            )}
            <span>{trend} {trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        {icon}
        <span className="capitalize">{label}</span>
      </div>
      <span className={`text-sm font-medium tabular-nums ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
