import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setDiagnosticLogFilter, bumpConfigEpoch } from "@/lib/api";
import { Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function LogFilterPage() {
  const [filter, setFilter] = useState("kumod=info");

  const filterMut = useMutation({
    mutationFn: (filter: string) => setDiagnosticLogFilter({ filter }),
    onSuccess: () => toast.success("Log filter updated"),
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const bumpMut = useMutation({
    mutationFn: bumpConfigEpoch,
    onSuccess: () => toast.success("Config epoch bumped"),
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    filterMut.mutate(filter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Diagnostic Log Filter</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Adjust runtime logging verbosity and reload configuration</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Set Log Filter</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter">Filter Expression</Label>
              <Input id="filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="kumod=info,kumod::smtp=debug" />
              <p className="text-sm text-muted-foreground">
                Uses Rust's <code className="text-xs bg-muted px-1 py-0.5 rounded">tracing-subscriber</code> env_filter syntax.
                Examples: <code className="text-xs bg-muted px-1 py-0.5 rounded">kumod=debug</code>,{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">kumod::smtp=trace</code>
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={filterMut.isPending}>
                <Filter className="h-4 w-4 mr-1" />
                {filterMut.isPending ? "Applying..." : "Apply Filter"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bump Config Epoch</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Force the server to reload its configuration. This increments the config epoch
            and triggers a re-evaluation of all routing and policy rules.
          </p>
          <Button variant="outline" onClick={() => bumpMut.mutate()} disabled={bumpMut.isPending}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {bumpMut.isPending ? "Bumping..." : "Bump Config Epoch"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
