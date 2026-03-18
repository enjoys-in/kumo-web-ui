import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { traceSmtpServer, type TraceSmtpServerFilter } from "@/lib/api";
import { Play, Square, Trash2, ArrowDownLeft } from "lucide-react";

const MAX_LINES = 2000;

export function TraceSmtpServerPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [filters, setFilters] = useState<TraceSmtpServerFilter>({});
  const abortRef = useRef<AbortController | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const start = useCallback(() => {
    if (running) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    setLines([]);
    const ws = traceSmtpServer(
      filters,
      (line) => {
        setLines((prev) => {
          const next = [...prev, line];
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
      ctrl.signal
    );
    wsRef.current = ws;
    ws.onclose = () => setRunning(false);
    ws.onerror = () => setRunning(false);
  }, [filters, running]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setRunning(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Trace SMTP Server</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trace incoming SMTP connections in real time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <Badge variant="outline" className="gap-1.5 text-xs bg-success/10 border-success/20 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Streaming
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLines([])}
            disabled={running}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
          <CardDescription>Filter by source IP (CIDR). Leave blank for all connections.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source (CIDR)</label>
              <Input
                placeholder="e.g. 10.0.0.1 or 192.168.1.0/24"
                value={filters.source || ""}
                onChange={(e) => setFilters({ source: e.target.value || undefined })}
                disabled={running}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {!running ? (
              <Button size="sm" className="gap-1.5 bg-[#FFA724] hover:bg-[#FF8C00] text-white shadow-md shadow-[#FFA724]/20" onClick={start}>
                <Play className="h-3.5 w-3.5" />
                Start Tracing
              </Button>
            ) : (
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={stop}>
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trace Output */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Connection Log</CardTitle>
              <CardDescription>{lines.length} lines captured</CardDescription>
            </div>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg border p-3 h-[500px] overflow-auto font-mono text-xs leading-relaxed">
            {lines.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {running ? "Waiting for incoming SMTP connections..." : "Press Start Tracing to begin"}
              </div>
            ) : (
              <>
                {lines.map((line, i) => (
                  <div key={i} className="hover:bg-muted/80 px-1 -mx-1 rounded whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
