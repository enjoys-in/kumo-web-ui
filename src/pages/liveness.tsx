import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkLiveness } from "@/lib/api";
import { HeartPulse, RefreshCw } from "lucide-react";

export function LivenessPage() {
  const liveness = useQuery({
    queryKey: ["liveness"],
    queryFn: checkLiveness,
    refetchInterval: 10000,
    retry: false,
  });

  const isLive = liveness.isSuccess;
  const isDown = liveness.isError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Server Liveness</h1>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Check whether the KumoMTA server is live and ready to accept messages
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Liveness Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            {liveness.isLoading && (
              <>
                <div className="h-20 w-20 rounded-full bg-muted animate-pulse flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
                <p className="text-muted-foreground text-sm">Checking server status...</p>
              </>
            )}

            {isLive && (
              <>
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <HeartPulse className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-sm px-3 py-1">
                    Server is Live
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    The server is ready to accept messages (HTTP 200)
                  </p>
                </div>
              </>
            )}

            {isDown && (
              <>
                <div className="h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center">
                  <HeartPulse className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center">
                  <Badge variant="destructive" className="text-sm px-3 py-1">
                    Server Unavailable
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    The server is not available (HTTP 503 or unreachable)
                  </p>
                  <p className="text-xs text-destructive mt-1">
                    {liveness.error?.message}
                  </p>
                </div>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => liveness.refetch()}
              disabled={liveness.isFetching}
              className="mt-2"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${liveness.isFetching ? "animate-spin" : ""}`} />
              {liveness.isFetching ? "Checking..." : "Check Now"}
            </Button>

            <p className="text-xs text-muted-foreground">Auto-refreshes every 10 seconds</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
