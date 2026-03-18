import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inspectMessage } from "@/lib/api";
import { Search } from "lucide-react";
import { toast } from "sonner";

export function MessageInspectPage() {
  const [msgId, setMsgId] = useState("");
  const [searchedId, setSearchedId] = useState("");

  const message = useQuery({
    queryKey: ["message", searchedId],
    queryFn: () => inspectMessage(searchedId),
    enabled: !!searchedId,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgId.trim()) {
      toast.error("Enter a message ID");
      return;
    }
    setSearchedId(msgId.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Message Inspection</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Inspect message details by ID</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Look Up Message</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="msgId" className="sr-only">Message ID</Label>
              <Input id="msgId" value={msgId} onChange={(e) => setMsgId(e.target.value)} placeholder="Enter message ID" />
            </div>
            <Button type="submit" disabled={message.isFetching}>
              <Search className="h-4 w-4 mr-1" />
              Inspect
            </Button>
          </form>
        </CardContent>
      </Card>

      {message.isFetching && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      )}

      {message.isError && (
        <Card>
          <CardContent className="py-6">
            <p className="text-destructive">Error: {message.error.message}</p>
          </CardContent>
        </Card>
      )}

      {message.data && (
        <Card>
          <CardHeader><CardTitle>Message Details</CardTitle></CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono max-h-[600px]">
              {JSON.stringify(message.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
