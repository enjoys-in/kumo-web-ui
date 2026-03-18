import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Ban,
  Pause,
  PauseCircle,
  Send,
  Search,
  Mail,
  BarChart3,
  FileText,
  ArrowRightLeft,
  Moon,
  Sun,
  Menu,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Gauge,
  Repeat2,
  HeartPulse,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { checkLiveness } from "@/lib/api";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/top", icon: Gauge, label: "Live Top" },
      { to: "/metrics", icon: BarChart3, label: "Metrics" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { to: "/bounce", icon: Ban, label: "Bounces" },
      { to: "/suspend", icon: Pause, label: "Suspensions" },
      { to: "/suspend-ready-q", icon: PauseCircle, label: "Ready Q Suspend" },
      { to: "/rebind", icon: ArrowRightLeft, label: "Rebind" },
      { to: "/xfer", icon: Repeat2, label: "Transfer (Xfer)" },
    ],
  },
  {
    label: "Messages",
    items: [
      { to: "/inject", icon: Send, label: "Inject" },
      { to: "/queues", icon: Search, label: "Queue Inspect" },
      { to: "/queue-summary", icon: Layers, label: "Queue Summary" },
      { to: "/messages", icon: Mail, label: "Message Inspect" },
    ],
  },
  {
    label: "Diagnostics",
    items: [
      { to: "/trace-smtp-client", icon: ArrowUpRight, label: "Trace Client" },
      { to: "/trace-smtp-server", icon: ArrowDownLeft, label: "Trace Server" },
      { to: "/log-filter", icon: FileText, label: "Log Filter" },
      { to: "/liveness", icon: HeartPulse, label: "Liveness" },
    ],
  },
];

export function Layout() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const liveRef = useRef(isLive);
  liveRef.current = isLive;
  const location = useLocation();

  const pollLiveness = useCallback(async () => {
    try {
      await checkLiveness();
      if (!liveRef.current) setIsLive(true);
    } catch {
      if (liveRef.current !== false) setIsLive(false);
    }
  }, []);

  useEffect(() => {
    pollLiveness();
    const id = setInterval(pollLiveness, 10_000);
    return () => clearInterval(id);
  }, [pollLiveness]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFA724] to-[#FF6B00] text-white shadow-lg shadow-[#FFA724]/25">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-[#FFA724] to-[#FF6B00] bg-clip-text text-transparent">KumoMTA</h1>
            <p className="text-[9px] text-muted-foreground/70 font-semibold tracking-widest uppercase">Admin Console</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#FFA724]/15 to-[#FFA724]/5 text-[#FFA724] shadow-sm ring-1 ring-[#FFA724]/15"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3.5 border-t border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : isLive === false ? "bg-red-400 shadow-sm shadow-red-400/50" : "bg-muted-foreground/50"} animate-pulse`} />
            <span className="text-[11px] text-muted-foreground/70 font-medium">v1.0.0</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent/60 transition-all" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">Made by <span className="font-semibold text-[#FFA724]/60">Enjoys</span></p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background gradient-mesh">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-col border-r border-border/40 glass shrink-0" style={{ boxShadow: 'var(--sidebar-shadow)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[280px] flex flex-col glass border-r border-border/40 shadow-2xl z-50 animate-fade-in">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center gap-3 h-14 px-4 lg:px-6 border-b border-border/40 glass-subtle shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 rounded-lg" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {/* Theme toggle in header */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8 rounded-lg hover:bg-accent/60"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </Button>

            {/* Liveness badge */}
            {isLive === null ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                <span className="text-[11px] text-muted-foreground font-medium">Checking...</span>
              </div>
            ) : isLive ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shadow-sm shadow-red-500/5">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-sm shadow-red-400/50 animate-pulse" />
                <span className="text-[11px] text-red-600 dark:text-red-400 font-semibold">Offline</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 lg:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
