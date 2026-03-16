# Kumo UI

A modern web dashboard for [KumoMTA](https://kumomta.com/) — manage queues, trace SMTP sessions, view metrics, and control your mail server from a clean SaaS-style interface.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **shadcn/ui**, and **Recharts**.

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | Live stat cards and charts (delivered, failed, queued, connections) |
| **Metrics** | Detailed metrics with area/pie/bar charts, tabbed views |
| **Bounces** | View and manage bounce rules |
| **Suspensions** | Suspend deliveries by domain / campaign / tenant |
| **Ready Q Suspend** | Suspend specific ready queues |
| **Rebind** | Rebind messages to different queues |
| **Inject** | Inject test messages via the HTTP API |
| **Queue Inspect** | Inspect ready queue states with live refresh |
| **Queue Summary** | Ready queues, scheduled queues, and provider summary (D/T/F/C/Q) |
| **Message Inspect** | Look up individual messages by ID |
| **Trace SMTP Client** | Real-time WebSocket trace of outgoing SMTP sessions with 8 filters |
| **Trace SMTP Server** | Real-time WebSocket trace of incoming SMTP connections |
| **Log Filter** | Configure logging levels at runtime |

## Prerequisites

- [Bun](https://bun.sh/) (package manager & runtime)
- A running KumoMTA instance with the HTTP API enabled (default `localhost:8000`)

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server (proxies /api and /metrics to KumoMTA)
bun run dev

# Production build
bun run build
```

The dev server runs on `http://localhost:5173` by default and proxies all `/api` and `/metrics` requests (including WebSocket upgrades) to `http://localhost:8000`.

## Project Structure

```
src/
├── components/       # Layout, sidebar, shadcn/ui components
├── lib/
│   ├── api.ts        # KumoMTA API client (REST + WebSocket)
│   └── utils.ts      # Utility helpers
├── pages/            # Route pages (one per feature)
├── App.tsx           # React Router config
└── main.tsx          # Entry point
```

## Configuration

The API base URL defaults to the Vite dev proxy. To point at a different KumoMTA instance, set the `KUMOMTA_API` environment variable or update the proxy target in `vite.config.ts`.

## License

MIT
