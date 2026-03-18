import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { injectMessage, type InjectResponse } from "@/lib/api";
import { Send, Plus, X } from "lucide-react";
import { toast } from "sonner";

export function InjectPage() {
  const [envelopeSender, setEnvelopeSender] = useState("");
  const [content, setContent] = useState(
    "Subject: Test Message\r\nFrom: sender@example.com\r\nTo: recipient@example.com\r\n\r\nThis is a test message."
  );
  const [recipients, setRecipients] = useState<{ email: string }[]>([{ email: "" }]);
  const [result, setResult] = useState<InjectResponse | null>(null);

  const injectMut = useMutation({
    mutationFn: injectMessage,
    onSuccess: (data) => {
      setResult(data);
      toast.success("Message injected successfully");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredRecipients = recipients.filter((r) => r.email.trim());
    if (filteredRecipients.length === 0) {
      toast.error("At least one recipient is required");
      return;
    }
    injectMut.mutate({
      envelope_sender: envelopeSender,
      content,
      recipients: filteredRecipients,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Inject Message</h1>
        <p className="text-sm text-muted-foreground/70 mt-1">Inject a message via the HTTP injection API</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Compose Message</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sender">Envelope Sender</Label>
              <Input id="sender" value={envelopeSender} onChange={(e) => setEnvelopeSender(e.target.value)} placeholder="sender@example.com" required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recipients</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setRecipients([...recipients, { email: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {recipients.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r.email}
                    onChange={(e) => {
                      const next = [...recipients];
                      next[i] = { email: e.target.value };
                      setRecipients(next);
                    }}
                    placeholder="recipient@example.com"
                  />
                  {recipients.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRecipients(recipients.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message Content (RFC 5322)</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="font-mono text-sm" />
            </div>

            <Button type="submit" disabled={injectMut.isPending}>
              <Send className="h-4 w-4 mr-1" />
              {injectMut.isPending ? "Injecting..." : "Inject Message"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Injection Result <Badge>Success</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
