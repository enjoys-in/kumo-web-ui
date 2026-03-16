const API_BASE = import.meta.env.VITE_KUMO_API_URL || "";

function getAuthHeaders(): HeadersInit {
  const username = localStorage.getItem("kumo_username") || "";
  const password = localStorage.getItem("kumo_password") || "";
  if (username && password) {
    return {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
    };
  }
  return {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return res.text() as unknown as T;
}

// === Liveness ===
export const checkLiveness = () => request<string>("/api/check-liveness/v1");

// === Machine Info ===
export interface MachineInfo {
  hostname: string;
  cpu_brand: string;
  distribution: string;
  fingerprint: string;
  kernel_version?: string | null;
  mac_address: string;
  node_id: string;
  num_cores: number;
  online_since: string;
  os_version: string;
  platform: string;
  process_kind: string;
  total_memory_bytes: number;
  version: string;
  container_runtime?: string | null;
}
export const getMachineInfo = () => request<MachineInfo>("/api/machine-info");

// === Memory Stats ===
export const getMemoryStats = () =>
  request<Record<string, unknown>>("/api/admin/memory/stats");

// === Bounce Management ===
export interface BounceListEntry {
  id: string;
  campaign?: string | null;
  domain?: string | null;
  tenant?: string | null;
  routing_domain?: string | null;
  reason: string;
  duration: string;
  bounced: Record<string, number>;
  total_bounced: number;
}
export const listBounces = () =>
  request<BounceListEntry[]>("/api/admin/bounce/v1");

export interface BounceRequest {
  reason: string;
  domain?: string;
  campaign?: string;
  tenant?: string;
  routing_domain?: string;
  duration?: string;
  suppress_logging?: boolean;
}
export interface BounceResponse {
  id: string;
  bounced: Record<string, number>;
  total_bounced: number;
}
export const createBounce = (data: BounceRequest) =>
  request<BounceResponse>("/api/admin/bounce/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface BounceCancelRequest {
  id: string;
}
export const cancelBounce = (data: BounceCancelRequest) =>
  request<unknown>("/api/admin/bounce/v1", {
    method: "DELETE",
    body: JSON.stringify(data),
  });

// === Suspend Management ===
export interface SuspendListEntry {
  id: string;
  campaign?: string;
  domain?: string;
  tenant?: string;
  reason: string;
  expires: string;
}
export const listSuspensions = () =>
  request<SuspendListEntry[]>("/api/admin/suspend/v1");

export interface SuspendRequest {
  reason: string;
  domain?: string;
  campaign?: string;
  tenant?: string;
  duration?: string;
}
export interface SuspendResponse {
  id: string;
}
export const createSuspension = (data: SuspendRequest) =>
  request<SuspendResponse>("/api/admin/suspend/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const cancelSuspension = (data: { id: string }) =>
  request<unknown>("/api/admin/suspend/v1", {
    method: "DELETE",
    body: JSON.stringify(data),
  });

// === Suspend Ready Queue ===
export interface SuspendReadyQListEntry {
  id: string;
  name: string;
  reason: string;
  expires: string;
}
export const listSuspendReadyQ = () =>
  request<SuspendReadyQListEntry[]>("/api/admin/suspend-ready-q/v1");

export interface SuspendReadyQRequest {
  name: string;
  reason: string;
  duration?: string;
  expires?: string;
}
export const createSuspendReadyQ = (data: SuspendReadyQRequest) =>
  request<SuspendResponse>("/api/admin/suspend-ready-q/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const cancelSuspendReadyQ = (data: { id: string }) =>
  request<unknown>("/api/admin/suspend-ready-q/v1", {
    method: "DELETE",
    body: JSON.stringify(data),
  });

// === Queue Inspection ===
export interface InspectQueueEntry {
  name: string;
  qty: number;
  [key: string]: unknown;
}
export const inspectScheduledQueue = (
  params: Record<string, string> = {}
) => {
  const qs = new URLSearchParams(params).toString();
  return request<InspectQueueEntry[]>(
    `/api/admin/inspect-sched-q/v1${qs ? `?${qs}` : ""}`
  );
};

// === Message Inspection ===
export interface MessageInfo {
  id: string;
  sender: string;
  recipient: string;
  queue: string;
  [key: string]: unknown;
}
export const inspectMessage = (id: string) =>
  request<MessageInfo[]>(`/api/admin/inspect-message/v1?id=${encodeURIComponent(id)}`);

// === Ready Queue States ===
export interface QueueState {
  context: string;
  since: string;
}
export interface ReadyQueueStateResponse {
  states_by_ready_queue: Record<string, QueueState>;
}
export const getReadyQueueStates = () =>
  request<ReadyQueueStateResponse>("/api/admin/ready-q-states/v1");

/** Helper: convert ready queue response to a flat array for UI rendering */
export function readyQueueToArray(resp: ReadyQueueStateResponse): { name: string; context: string; since: string }[] {
  return Object.entries(resp.states_by_ready_queue).map(([name, state]) => ({
    name,
    context: state.context,
    since: state.since,
  }));
}

// === Inject Message ===
export interface InjectRecipient {
  email: string;
  name?: string;
  substitutions?: Record<string, unknown>;
}
export interface InjectRequest {
  envelope_sender: string;
  content: string;
  recipients: InjectRecipient[];
  substitutions?: Record<string, unknown>;
}
export interface InjectResponse {
  success_count: number;
  fail_count: number;
  failed_recipients: string[];
  errors: string[];
}
export const injectMessage = (data: InjectRequest) =>
  request<InjectResponse>("/api/inject/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

// === Rebind ===
export interface RebindRequest {
  reason: string;
  data: Record<string, string>;
  domain?: string;
  campaign?: string;
  tenant?: string;
  routing_domain?: string;
  always_flush?: boolean;
  trigger_rebind_event?: boolean;
  suppress_logging?: boolean;
}
export const rebindMessages = (data: RebindRequest) =>
  request<Record<string, unknown>>("/api/admin/rebind/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

// === Config Epoch ===
export const bumpConfigEpoch = () =>
  request<unknown>("/api/admin/bump-config-epoch", { method: "POST" });

// === Diagnostic Log Filter ===
export interface SetDiagnosticFilterRequest {
  filter: string;
}
export const setDiagnosticLogFilter = (data: SetDiagnosticFilterRequest) =>
  request<unknown>("/api/admin/set_diagnostic_log_filter/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

// === Metrics ===
export const getMetricsJson = () =>
  request<Record<string, unknown>>("/metrics.json");

export const getMetricsPrometheus = () => request<string>("/metrics");

// === Task Dump ===
export const getTaskDump = () =>
  request<unknown[]>("/api/admin/task-dump");

// === Trace SMTP Client (Streaming) ===
export interface TraceSmtpClientFilter {
  source?: string;
  mx_addr?: string;
  mx_host?: string;
  domain?: string;
  routing_domain?: string;
  campaign?: string;
  tenant?: string;
  ready_queue?: string;
}

export function traceSmtpClient(
  filters: TraceSmtpClientFilter,
  onLine: (line: string) => void,
  signal?: AbortSignal
): WebSocket {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${proto}//${location.host}/api/admin/trace-smtp-client/v1${qs ? `?${qs}` : ""}`;
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    const data = typeof ev.data === "string" ? ev.data : "";
    for (const line of data.split("\n")) {
      if (line.trim()) onLine(line);
    }
  };
  signal?.addEventListener("abort", () => ws.close());
  return ws;
}

// === Trace SMTP Server (Streaming) ===
export interface TraceSmtpServerFilter {
  source?: string;
}

export function traceSmtpServer(
  filters: TraceSmtpServerFilter,
  onLine: (line: string) => void,
  signal?: AbortSignal
): WebSocket {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${proto}//${location.host}/api/admin/trace-smtp-server/v1${qs ? `?${qs}` : ""}`;
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    const data = typeof ev.data === "string" ? ev.data : "";
    for (const line of data.split("\n")) {
      if (line.trim()) onLine(line);
    }
  };
  signal?.addEventListener("abort", () => ws.close());
  return ws;
}

// === Transfer Messages (xfer) ===
export interface XferRequest {
  domain?: string;
  campaign?: string;
  tenant?: string;
  routing_domain?: string;
  target_node: string;
  queue_names?: string[];
}
export interface XferResponse {
  id: string;
  total_transferred: number;
}
export const xferMessages = (data: XferRequest) =>
  request<XferResponse>("/api/admin/xfer/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface XferCancelRequest {
  id: string;
}
export const cancelXfer = (data: XferCancelRequest) =>
  request<unknown>("/api/admin/xfer/cancel/v1", {
    method: "POST",
    body: JSON.stringify(data),
  });
