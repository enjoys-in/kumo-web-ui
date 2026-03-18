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
  TrendingUp,
  Trash2,
  FileText,
  Send,
  Clock,
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
  "#FFA724",
  "#22C55E",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
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
  const totalReceived = extractCounter(flat, "received", "total_messages_received");

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

  const memData = memoryStats.data
    ? Object.entries(memoryStats.data)
        .filter(([, v]) => typeof v === "number" && (v as number) > 0)
        .slice(0, 6)
        .map(([name, value]) => ({ name: name.replace(/_/g, " "), value: Number(value) }))
    : [];

  const chartData = history.map((h, i) => ({
    label: `${i * 5}s`,
    delivered: h.delivered ?? 0,
    bounced: h.bounced ?? 0,
    queued: h.queued ?? 0,
  }));

  const queueData = readyQList.slice(0, 8).map((q) => ({
    name: q.name.length > 25 ? q.name.slice(0, 25) + "..." : q.name,
    context: q.context,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Real-time overview of your mail transfer agent
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={isAlive ? "default" : "destructive"}
            className={`gap-1.5 ${isAlive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15" : ""}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isAlive ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" : "bg-destructive"}`} />
            {isAlive ? "Online" : "Offline"}
          </Badge>
          {machineInfo.data && (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              {new Date(machineInfo.data.online_since).toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleBumpConfig} size="sm" className="gap-1.5 bg-gradient-to-r from-[#FFA724] to-[#FF8C00] hover:from-[#FF9B10] hover:to-[#FF7500] text-white shadow-md shadow-[#FFA724]/25 hover:shadow-lg hover:shadow-[#FFA724]/30">
          <RefreshCw className="h-3.5 w-3.5" />
          Reload Config
        </Button>
        <Button onClick={handleBounceAll} size="sm" variant="outline" className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/40">
          <Trash2 className="h-3.5 w-3.5" />
          Flush All Queues
        </Button>
        <Button onClick={handleSetLogFilter} size="sm" variant="outline" className="gap-1.5 hover:border-border">
          <FileText className="h-3.5 w-3.5" />
          Set Log Filter
        </Button>
      </div>

      {/* Stat Cards - Colorful with gradient accent */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Delivered"
          value={formatNum(totalDelivered)}
          icon={<Send className="h-4 w-4" />}
          trend={history.length > 1 ? (history[history.length - 1]?.delivered ?? 0) : undefined}
          trendLabel="/5s"
          gradient="from-[#FFA724]/10 to-[#FFA724]/5"
          iconBg="bg-[#FFA724]/15 text-[#FFA724]"
          borderColor="border-[#FFA724]/20"
        />
        <StatCard
          title="Received"
          value={formatNum(totalReceived)}
          icon={<ArrowDownRight className="h-4 w-4" />}
          gradient="from-blue-500/10 to-blue-500/5"
          iconBg="bg-blue-500/15 text-blue-500"
          borderColor="border-blue-500/20"
        />
        <StatCard
          title="Bounced"
          value={formatNum(totalBounced)}
          icon={<Ban className="h-4 w-4" />}
          trend={bounces.data?.length}
          trendLabel="rules"
          gradient="from-red-500/10 to-red-500/5"
          iconBg="bg-red-500/15 text-red-500"
          borderColor="border-red-500/20"
        />
        <StatCard
          title="Suspensions"
          value={String(suspensions.data?.length ?? "—")}
          icon={<Pause className="h-4 w-4" />}
          gradient="from-purple-500/10 to-purple-500/5"
          iconBg="bg-purple-500/15 text-purple-500"
          borderColor="border-purple-500/20"
        />
        <StatCard
          title="Ready Queues"
          value={String(readyQList.length || "—")}
          icon={<Layers className="h-4 w-4" />}
          gradient="from-emerald-500/10 to-emerald-500/5"
          iconBg="bg-emerald-500/15 text-emerald-500"
          borderColor="border-emerald-500/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Throughput</CardTitle>
                <CardDescription>Messages per 5-second interval</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FFA724]" /> Delivered</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Bounced</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFA724" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FFA724" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gBounced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="delivered" stroke="#FFA724" strokeWidth={2.5} fill="url(#gDelivered)" name="Delivered" />
                    <Area type="monotone" dataKey="bounced" stroke="#EF4444" strokeWidth={2} fill="url(#gBounced)" name="Bounced" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-[#FFA724]/40" />
                    <p>Collecting data...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Memory Allocation</CardTitle>
                <CardDescription>Current memory breakdown</CardDescription>
              </div>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {memData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={memData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                      {memData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatBytes(value)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                {memData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="ml-auto font-semibold tabular-nums">{formatBytes(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Ready Queue States</CardTitle>
                <CardDescription>{readyQList.length} queues active</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] bg-[#FFA724]/10 text-[#FFA724] border-[#FFA724]/20 shadow-sm shadow-[#FFA724]/5">LIVE</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] overflow-auto">
              {queueData.length > 0 ? (
                <div className="space-y-1">
                  {queueData.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-accent/40 transition-all duration-200">
                      <span className="text-sm font-mono truncate max-w-[55%]">{q.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{q.context}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <div className="text-center">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p>No queue data</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Server Info</CardTitle>
                <CardDescription>Machine details</CardDescription>
              </div>
              <Server className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              <InfoRow icon={<Activity className="h-3.5 w-3.5" />} label="Status" value={isAlive ? "Healthy" : "Unreachable"} valueClass={isAlive ? "text-success font-semibold" : "text-destructive font-semibold"} />
              <InfoRow icon={<Server className="h-3.5 w-3.5" />} label="Hostname" value={machineInfo.data?.hostname ?? "—"} />
              <InfoRow icon={<Cpu className="h-3.5 w-3.5" />} label="Version" value={machineInfo.data?.version ?? "—"} highlight />
              <InfoRow icon={<Cpu className="h-3.5 w-3.5" />} label="CPU" value={machineInfo.data?.cpu_brand ?? "—"} />
              <InfoRow icon={<Cpu className="h-3.5 w-3.5" />} label="Cores" value={String(machineInfo.data?.num_cores ?? "—")} />
              <InfoRow icon={<HardDrive className="h-3.5 w-3.5" />} label="Memory" value={machineInfo.data ? formatBytes(machineInfo.data.total_memory_bytes) : "—"} />
              <InfoRow icon={<Server className="h-3.5 w-3.5" />} label="OS" value={machineInfo.data?.os_version ?? "—"} />
              <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Online Since" value={machineInfo.data?.online_since ? new Date(machineInfo.data.online_since).toLocaleString() : "—"} />
              <InfoRow icon={<Layers className="h-3.5 w-3.5" />} label="Ready Queues" value={String(readyQList.length || "—")} />
              <InfoRow icon={<Ban className="h-3.5 w-3.5" />} label="Active Bounces" value={String(bounces.data?.length ?? "—")} />
              <InfoRow icon={<Pause className="h-3.5 w-3.5" />} label="Suspensions" value={String(suspensions.data?.length ?? "—")} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendLabel, gradient, iconBg, borderColor }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  gradient: string;
  iconBg: string;
  borderColor: string;
}) {
  return (
    <Card className={`group hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300 border ${borderColor} bg-gradient-to-br ${gradient} overflow-hidden backdrop-blur-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground/70 font-semibold uppercase tracking-widest">{title}</span>
          <div className={`p-1.5 rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>{icon}</div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/60">
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-muted-foreground/50" />
            )}
            <span className="font-medium">{trend} {trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value, valueClass, highlight }: { icon: React.ReactNode; label: string; value: string; valueClass?: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg ${highlight ? "bg-[#FFA724]/5 ring-1 ring-[#FFA724]/10" : "hover:bg-accent/40"} transition-all duration-200`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-xs font-medium tabular-nums ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}
