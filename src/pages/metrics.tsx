import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMetricsJson, getMetricsPrometheus } from "@/lib/api";
import { RefreshCw, TrendingUp, BarChart3, Activity, Gauge } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface HistoryPoint {
  time: string;
  [key: string]: string | number;
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

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

const COLORS = [
  "#FFA724",
  "#22C55E",
  "#3B82F6",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#F97316",
];

const STAT_STYLES = [
  { gradient: "from-[#FFA724]/10 to-[#FFA724]/5", border: "border-[#FFA724]/20", iconBg: "bg-[#FFA724]/15", iconColor: "text-[#FFA724]" },
  { gradient: "from-blue-500/10 to-blue-500/5", border: "border-blue-500/20", iconBg: "bg-blue-500/15", iconColor: "text-blue-500" },
  { gradient: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/20", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-500" },
  { gradient: "from-purple-500/10 to-purple-500/5", border: "border-purple-500/20", iconBg: "bg-purple-500/15", iconColor: "text-purple-500" },
];

function categorizeMetrics(flat: Record<string, number>) {
  const counters: Record<string, number> = {};
  const gauges: Record<string, number> = {};

  for (const [key, value] of Object.entries(flat)) {
    const lower = key.toLowerCase();
    if (lower.includes("total") || lower.includes("count") || lower.includes("delivered") || lower.includes("fail") || lower.includes("received")) {
      counters[key] = value;
    } else {
      gauges[key] = value;
    }
  }
  return { counters, gauges };
}

export function MetricsPage() {
  const [tab, setTab] = useState("overview");
  const historyRef = useRef<HistoryPoint[]>([]);
  const prevRef = useRef<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const jsonMetrics = useQuery({
    queryKey: ["metrics-json"],
    queryFn: getMetricsJson,
    refetchInterval: 5000,
  });

  const promMetrics = useQuery({
    queryKey: ["metrics-prometheus"],
    queryFn: getMetricsPrometheus,
    enabled: tab === "raw",
  });

  const flat = jsonMetrics.data ? flattenMetrics(jsonMetrics.data) : {};
  const { counters, gauges } = categorizeMetrics(flat);

  // Build time-series history
  useEffect(() => {
    if (!jsonMetrics.data) return;
    const currentFlat = flattenMetrics(jsonMetrics.data);
    const now = new Date();
    const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    // Calculate deltas for counters
    const point: HistoryPoint = { time: timeLabel };
    const prev = prevRef.current;
    for (const [k, v] of Object.entries(currentFlat)) {
      const lower = k.toLowerCase();
      if (lower.includes("total") || lower.includes("count") || lower.includes("delivered") || lower.includes("fail")) {
        point[shortKey(k)] = prev[k] !== undefined ? Math.max(0, v - prev[k]) : 0;
      }
    }
    prevRef.current = { ...currentFlat };

    historyRef.current = [...historyRef.current.slice(-59), point];
    setHistory([...historyRef.current]);
  }, [jsonMetrics.data]);

  // Top counters sorted by value
  const topCounters = Object.entries(counters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Gauges for bar chart
  const gaugeData = Object.entries(gauges)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name: shortKey(name), value, fullName: name }));

  // Pie data from top counters
  const pieData = topCounters
    .filter(([, v]) => v > 0)
    .slice(0, 6)
    .map(([name, value]) => ({ name: shortKey(name), value }));

  // All keys that appear in history for the line chart
  const historyKeys = history.length > 0
    ? Object.keys(history[history.length - 1]).filter((k) => k !== "time")
    : [];

  // Top 5 non-zero history keys for the chart
  const chartKeys = historyKeys
    .filter((k) => history.some((h) => typeof h[k] === "number" && (h[k] as number) > 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metrics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time server performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs bg-success/10 border-success/20 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Auto-refresh 5s
          </Badge>
          <Button variant="outline" size="sm" onClick={() => jsonMetrics.refetch()} className="gap-1.5 hover:bg-[#FFA724]/10 hover:text-[#FFA724] hover:border-[#FFA724]/30">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="counters">Counters</TabsTrigger>
          <TabsTrigger value="gauges">Gauges</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Stat tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topCounters.slice(0, 4).map(([key, val], i) => {
              const s = STAT_STYLES[i % STAT_STYLES.length];
              return (
                <Card key={key} className={`group hover:shadow-lg transition-all duration-200 bg-gradient-to-br ${s.gradient} border ${s.border}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] text-muted-foreground font-semibold truncate capitalize">{shortKey(key).replace(/_/g, " ")}</span>
                      <div className={`p-2 rounded-lg ${s.iconBg} ${s.iconColor}`}>
                        <Activity className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight tabular-nums">{formatNum(val)}</div>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{key}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Throughput Line Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Throughput Over Time</CardTitle>
                  <CardDescription>Delta per 5-second interval</CardDescription>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartKeys.length > 0 && history.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        {chartKeys.map((k, i) => (
                          <linearGradient key={k} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      {chartKeys.map((k, i) => (
                        <Area
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          fill={`url(#grad_${i})`}
                          name={k.replace(/_/g, " ")}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Collecting data — charts appear after 2 intervals...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribution Pie */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Counter Distribution</CardTitle>
                    <CardDescription>Top counters by value</CardDescription>
                  </div>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatNum(value)}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            color: "hsl(var(--foreground))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No counter data
                    </div>
                  )}
                </div>
                {pieData.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{d.name.replace(/_/g, " ")}</span>
                        <span className="ml-auto font-medium tabular-nums">{formatNum(d.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gauge Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Gauge Values</CardTitle>
                    <CardDescription>Current state metrics</CardDescription>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {gaugeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gaugeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} className="text-muted-foreground" />
                        <Tooltip
                          formatter={(value: number) => formatNum(value)}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            color: "hsl(var(--foreground))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="value" fill="#22C55E" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No gauge data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COUNTERS TAB */}
        <TabsContent value="counters" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All Counters</CardTitle>
              <CardDescription>{Object.keys(counters).length} counter metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(counters).length === 0 && jsonMetrics.isLoading && (
                <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
              )}
              {Object.keys(counters).length > 0 && (
                <div className="grid gap-0 divide-y">
                  {Object.entries(counters).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-2.5 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{shortKey(key).replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{key}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums shrink-0">{formatNum(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GAUGES TAB */}
        <TabsContent value="gauges" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All Gauges</CardTitle>
              <CardDescription>{Object.keys(gauges).length} gauge metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] mb-6">
                {gaugeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gaugeData} margin={{ top: 5, right: 10, left: -15, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-muted-foreground" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        formatter={(value: number) => formatNum(value)}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {gaugeData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No gauge data
                  </div>
                )}
              </div>
              {Object.keys(gauges).length > 0 && (
                <div className="grid gap-0 divide-y">
                  {Object.entries(gauges).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-2.5 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{shortKey(key).replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{key}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums shrink-0">{formatNum(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAW TAB */}
        <TabsContent value="raw" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Prometheus Format</CardTitle>
              <CardDescription>Raw Prometheus exposition format</CardDescription>
            </CardHeader>
            <CardContent>
              {promMetrics.isLoading && <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>}
              {promMetrics.isError && <p className="text-destructive text-sm py-4">Error: {promMetrics.error.message}</p>}
              {promMetrics.data && (
                <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-xs font-mono max-h-[600px] whitespace-pre-wrap border">
                  {promMetrics.data}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function shortKey(key: string): string {
  const parts = key.split(".");
  return parts[parts.length - 1];
}
