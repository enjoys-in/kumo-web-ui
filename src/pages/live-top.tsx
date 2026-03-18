import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getMachineInfo,
  getMetricsPrometheus,
  getReadyQueueStates,
  readyQueueToArray,
  checkLiveness,
} from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Layers,
  Zap,
  Ban,
  TrendingUp,
  Clock,
  Gauge,
  ArrowUpRight,
} from "lucide-react";

// ——— Prometheus parser ———
function parsePrometheus(text: string) {
  const results: { metric: string; labels: Record<string, string>; value: number }[] = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    // metric{labels} value
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\{([^}]*)\}\s+([\d.eE+-]+)/);
    if (m) {
      const labels: Record<string, string> = {};
      for (const pair of m[2].split(",")) {
        const eq = pair.indexOf("=");
        if (eq > 0) labels[pair.slice(0, eq)] = pair.slice(eq + 2, -1);
      }
      results.push({ metric: m[1], labels, value: parseFloat(m[3]) });
      continue;
    }
    // metric value (no labels)
    const m2 = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+([\d.eE+-]+)/);
    if (m2) {
      results.push({ metric: m2[1], labels: {}, value: parseFloat(m2[2]) });
    }
  }
  return results;
}

function findMetric(parsed: ReturnType<typeof parsePrometheus>, name: string): number {
  return parsed.find((p) => p.metric === name && Object.keys(p.labels).length === 0)?.value ?? 0;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

interface Snapshot {
  time: string;
  delivered: number;
  transfail: number;
  fail: number;
  received: number;
  connections: number;
  ready: number;
  scheduled: number;
}

export function LiveTopPage() {
  const [interval, setInterval_] = useState(1);
  const [paused, setPaused] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const prevRef = useRef<{ delivered: number; transfail: number; fail: number; received: number }>({
    delivered: 0, transfail: 0, fail: 0, received: 0,
  });
  const seenFirst = useRef(false);

  const refetchMs = paused ? false : (interval * 1000);

  const liveness = useQuery({ queryKey: ["top-liveness"], queryFn: checkLiveness, refetchInterval: refetchMs || undefined });
  const machineInfo = useQuery({ queryKey: ["top-machine-info"], queryFn: getMachineInfo });
  const metrics = useQuery({
    queryKey: ["top-metrics"],
    queryFn: getMetricsPrometheus,
    refetchInterval: refetchMs || undefined,
  });
  const readyQ = useQuery({
    queryKey: ["top-ready-q"],
    queryFn: getReadyQueueStates,
    refetchInterval: refetchMs || undefined,
  });

  const parsed = metrics.data ? parsePrometheus(metrics.data) : [];
  const readyQList = readyQ.data ? readyQueueToArray(readyQ.data) : [];

  // Counters (cumulative)
  const totalDelivered = findMetric(parsed, "total_messages_delivered");
  const totalTransfail = findMetric(parsed, "total_messages_transfail");
  const totalFail = findMetric(parsed, "total_messages_fail");
  const totalReceived = findMetric(parsed, "total_messages_received");

  // Gauges
  const connectionCount = findMetric(parsed, "connection_count");
  const readyCount = findMetric(parsed, "ready_count");
  const scheduledCount = findMetric(parsed, "scheduled_count");
  const messageCount = findMetric(parsed, "message_count");
  const scheduledQueueCount = findMetric(parsed, "scheduled_queue_count");

  // Memory
  const memoryUsage = findMetric(parsed, "memory_usage");
  const memoryLimit = findMetric(parsed, "memory_limit");
  const memoryUsageRust = findMetric(parsed, "memory_usage_rust");

  // CPU
  const cpuNorm = findMetric(parsed, "process_cpu_usage_normalized");
  const systemCpuNorm = findMetric(parsed, "system_cpu_usage_normalized");

  // Thread pool
  const threadPoolSize = findMetric(parsed, "thread_pool_size");
  const threadPoolParked = findMetric(parsed, "thread_pool_parked");

  // Lua
  const luaCount = findMetric(parsed, "lua_count");
  const luaSpare = findMetric(parsed, "lua_spare_count");

  // Top ready queues by connection count
  const readyQByConn = parsed
    .filter((p) => p.metric === "connection_count_by_provider" && p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Build rate history
  useEffect(() => {
    if (!metrics.data || paused) return;
    const prev = prevRef.current;
    if (!seenFirst.current) {
      prevRef.current = { delivered: totalDelivered, transfail: totalTransfail, fail: totalFail, received: totalReceived };
      seenFirst.current = true;
      return;
    }
    const now = new Date();
    const snap: Snapshot = {
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      delivered: totalDelivered - prev.delivered,
      transfail: totalTransfail - prev.transfail,
      fail: totalFail - prev.fail,
      received: totalReceived - prev.received,
      connections: connectionCount,
      ready: readyCount,
      scheduled: scheduledCount,
    };
    prevRef.current = { delivered: totalDelivered, transfail: totalTransfail, fail: totalFail, received: totalReceived };
    setHistory((h) => [...h.slice(-59), snap]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.data, paused]);

  const isAlive = liveness.isSuccess;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Live Top</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time system overview — like <code className="text-xs bg-[#FFA724]/10 text-[#FFA724] px-1.5 py-0.5 rounded font-semibold">kcli top</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isAlive ? "default" : "destructive"} className={`gap-1.5 ${isAlive ? "bg-success/10 text-success border-success/20" : ""}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isAlive ? "bg-success animate-pulse" : "bg-destructive"}`} />
            {isAlive ? "Online" : "Offline"}
          </Badge>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              max={60}
              value={interval}
              onChange={(e) => setInterval_(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              className="h-7 w-16 text-xs text-center"
            />
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
          <Button
            variant={paused ? "default" : "outline"}
            size="sm"
            className={`text-xs h-7 ${paused ? "bg-[#FFA724] hover:bg-[#FF8C00] text-white" : ""}`}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
        </div>
      </div>

      {/* Key Counters Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        <MiniStat label="Delivered" value={formatNum(totalDelivered)} icon={<Zap className="h-3.5 w-3.5" />} color="text-[#FFA724]" bg="bg-[#FFA724]/10" />
        <MiniStat label="Received" value={formatNum(totalReceived)} icon={<ArrowUpRight className="h-3.5 w-3.5" />} color="text-blue-500" bg="bg-blue-500/10" />
        <MiniStat label="Transfail" value={formatNum(totalTransfail)} icon={<Ban className="h-3.5 w-3.5" />} color="text-amber-500" bg="bg-amber-500/10" />
        <MiniStat label="Perm Fail" value={formatNum(totalFail)} icon={<Ban className="h-3.5 w-3.5" />} color="text-red-500" bg="bg-red-500/10" />
        <MiniStat label="Connections" value={formatNum(connectionCount)} icon={<Activity className="h-3.5 w-3.5" />} color="text-emerald-500" bg="bg-emerald-500/10" />
        <MiniStat label="Ready" value={formatNum(readyCount)} icon={<Layers className="h-3.5 w-3.5" />} color="text-purple-500" bg="bg-purple-500/10" />
        <MiniStat label="Scheduled" value={formatNum(scheduledCount)} icon={<Layers className="h-3.5 w-3.5" />} color="text-teal-500" bg="bg-teal-500/10" />
        <MiniStat label="Messages" value={formatNum(messageCount)} icon={<Gauge className="h-3.5 w-3.5" />} color="text-indigo-500" bg="bg-indigo-500/10" />
      </div>

      {/* Rate Chart + System Gauges */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Throughput Rate Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Throughput Rate</CardTitle>
                <CardDescription>Messages per {interval}s interval ({history.length} samples)</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gTopDel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFA724" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#FFA724" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gTopFail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                    <Area type="monotone" dataKey="delivered" stroke="#FFA724" strokeWidth={2.5} fill="url(#gTopDel)" name="Delivered" />
                    <Area type="monotone" dataKey="transfail" stroke="#3B82F6" strokeWidth={1.5} fillOpacity={0} name="Transfail" />
                    <Area type="monotone" dataKey="fail" stroke="#EF4444" strokeWidth={1.5} fill="url(#gTopFail)" name="Fail" />
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

        {/* System Gauges */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System</CardTitle>
            <CardDescription>CPU, memory, threads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <GaugeRow label="Process CPU" value={formatPct(cpuNorm)} pct={cpuNorm} />
            <GaugeRow label="System CPU" value={formatPct(systemCpuNorm)} pct={systemCpuNorm} />
            <GaugeRow
              label="Memory"
              value={`${formatBytes(memoryUsage)} / ${formatBytes(memoryLimit)}`}
              pct={memoryLimit > 0 ? memoryUsage / memoryLimit : 0}
            />
            <GaugeRow label="Rust Mem" value={formatBytes(memoryUsageRust)} />
            <div className="border-t border-border/50 pt-2 mt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Thread Pool</span>
                <span className="font-medium tabular-nums">{threadPoolSize - threadPoolParked} active / {threadPoolSize} total</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lua Contexts</span>
                <span className="font-medium tabular-nums">{luaCount - luaSpare} active / {luaCount} total</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sched Queues</span>
                <span className="font-medium tabular-nums">{formatNum(scheduledQueueCount)}</span>
              </div>
            </div>
            {machineInfo.data && (
              <div className="border-t border-border/50 pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Host</span><span className="font-medium text-foreground">{machineInfo.data.hostname}</span></div>
                <div className="flex justify-between"><span>Version</span><span className="font-medium text-foreground">{machineInfo.data.version}</span></div>
                <div className="flex justify-between"><span>Cores</span><span className="font-medium text-foreground">{machineInfo.data.num_cores}</span></div>
                <div className="flex justify-between"><span>Total RAM</span><span className="font-medium text-foreground">{formatBytes(machineInfo.data.total_memory_bytes)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Connections by Provider + Ready Queues */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Connections by Provider */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Connections by Provider</CardTitle>
                <CardDescription>Top providers by active connections</CardDescription>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {readyQByConn.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={readyQByConn.map((p) => ({
                      name: (p.labels.provider || "unknown").slice(0, 18),
                      connections: p.value,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="connections" fill="#FFA724" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No provider connections
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ready Queue States */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Ready Queues</CardTitle>
                <CardDescription>{readyQList.length} active</CardDescription>
              </div>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] overflow-auto text-xs font-mono">
              {readyQList.length > 0 ? (
                <table className="w-full">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-muted-foreground">
                      <th className="text-left pb-1.5 font-medium">Queue</th>
                      <th className="text-left pb-1.5 font-medium">State</th>
                      <th className="text-right pb-1.5 font-medium">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyQList.slice(0, 50).map((q) => (
                      <tr key={q.name} className="border-b border-border/30 last:border-0 hover:bg-muted/50">
                        <td className="py-1 pr-2 max-w-[200px] truncate">{q.name}</td>
                        <td className="py-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{q.context}</Badge>
                        </td>
                        <td className="py-1 text-right text-muted-foreground">{q.since}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No ready queues
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ——— Sub-components ———

function MiniStat({ label, value, icon, color, bg }: {
  label: string; value: string; icon: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <Card className="p-3 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`p-1 rounded ${bg || "bg-muted"} ${color || "text-muted-foreground"}`}>{icon}</div>
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="text-lg font-bold tracking-tight tabular-nums">{value}</div>
    </Card>
  );
}

function GaugeRow({ label, value, pct }: { label: string; value: string; pct?: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      {pct !== undefined && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct > 0.9 ? "bg-destructive" : pct > 0.7 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${Math.min(pct * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
